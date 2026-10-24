const crypto = require('crypto');
const BattleMatch = require('../models/BattleMatch');
const ProblemSet = require('../models/ProblemSet');
const codeExecutionService = require('../services/codeExecutionService');

const BATTLE_DURATION_SECONDS = 15 * 60;
const QUEUE_MAX_AGE_MS = 15 * 60 * 1000;
const FRIEND_ROOM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const ALLOWED_LANGUAGES = ['cpp20', 'c', 'java', 'python3', 'pypy3'];

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeOptions = body => {
  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 60) : '';
  const difficulty = ALLOWED_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'medium';
  return { topic, difficulty };
};

const getBattleProblem = async ({ topic, difficulty }) => {
  const query = {
    visibility: 'public',
    difficulty,
    'testCases.0': { $exists: true }
  };
  if (topic) query.tags = new RegExp(`^${escapeRegex(topic)}$`, 'i');

  const problems = await ProblemSet.find(query)
    .select('_id title problemCode slug description inputFormat outputFormat constraints explanation difficulty tags sampleInput sampleOutput testCases maxScore timeLimit memoryLimit allowedLanguages')
    .limit(250)
    .lean();

  if (!problems.length) return null;
  return problems[crypto.randomInt(problems.length)];
};

const getSampleCases = problem => {
  const samples = (problem.testCases || []).filter(testCase => testCase.isSample);
  if (samples.length) return samples;
  if (problem.sampleInput !== undefined && problem.sampleOutput !== undefined) {
    return [{ input: problem.sampleInput, expectedOutput: problem.sampleOutput, isSample: true }];
  }
  return [];
};

const serializeProblem = problem => {
  if (!problem) return null;
  return {
    _id: problem._id,
    title: problem.title,
    problemCode: problem.problemCode,
    slug: problem.slug,
    description: problem.description,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    constraints: problem.constraints,
    explanation: problem.explanation,
    difficulty: problem.difficulty,
    tags: problem.tags,
    sampleCases: getSampleCases(problem).map(({ input, expectedOutput }) => ({ input, expectedOutput })),
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    allowedLanguages: problem.allowedLanguages
  };
};

const serializeBattle = (battle, currentUserId) => {
  const currentId = currentUserId.toString();
  return {
    _id: battle._id,
    inviteCode: battle.inviteCode,
    mode: battle.mode,
    status: battle.status,
    topic: battle.topic,
    difficulty: battle.difficulty,
    durationSeconds: battle.durationSeconds,
    startsAt: battle.startsAt,
    endsAt: battle.endsAt,
    finishedAt: battle.finishedAt,
    winner: battle.winner?._id || battle.winner || null,
    problem: serializeProblem(battle.problem),
    players: (battle.players || []).map(player => {
      const user = player.user?._id ? player.user : { _id: player.user };
      const ownPlayer = user._id.toString() === currentId;
      return {
        user: {
          _id: user._id,
          username: user.username || 'Coder',
          fullName: user.fullName || '',
          avatar: user.avatar || ''
        },
        status: player.status,
        score: player.score,
        testCasesPassed: player.testCasesPassed,
        totalTestCases: player.totalTestCases,
        executionTime: player.executionTime,
        memoryUsed: player.memoryUsed,
        verdict: player.verdict,
        submittedAt: player.submittedAt,
        ...(ownPlayer ? { code: player.code, language: player.language } : {})
      };
    })
  };
};

const loadBattle = id => BattleMatch.findById(id)
  .populate('players.user', 'username fullName avatar')
  .populate('problem');

const emitBattleUpdate = (req, battle) => {
  const io = req.app.get('io');
  if (!io || !battle) return;
  io.to(`battle:${battle._id}`).emit('battle:updated', {
    battleId: battle._id.toString(),
    status: battle.status,
    players: battle.players.map(player => ({
      userId: player.user._id?.toString?.() || player.user.toString(),
      status: player.status,
      score: player.score,
      testCasesPassed: player.testCasesPassed,
      totalTestCases: player.totalTestCases,
      verdict: player.verdict,
      executionTime: player.executionTime,
      memoryUsed: player.memoryUsed,
      submittedAt: player.submittedAt
    })),
    winner: battle.winner?._id?.toString?.() || battle.winner?.toString?.() || null,
    endsAt: battle.endsAt
  });
};

const comparePlayers = players => {
  const [first, second] = players;
  if (!first || !second || first.score === second.score && first.score === 0) return null;
  if (!second || first.score > second.score) return first.user._id || first.user;
  if (second.score > first.score) return second.user._id || second.user;
  if (first.executionTime !== second.executionTime) {
    return first.executionTime < second.executionTime ? (first.user._id || first.user) : (second.user._id || second.user);
  }
  if (first.memoryUsed !== second.memoryUsed) {
    return first.memoryUsed < second.memoryUsed ? (first.user._id || first.user) : (second.user._id || second.user);
  }
  return first.submittedAt <= second.submittedAt ? (first.user._id || first.user) : (second.user._id || second.user);
};

const finishBattle = async battle => {
  const winner = comparePlayers(battle.players);
  await BattleMatch.updateOne(
    { _id: battle._id, status: 'active' },
    { $set: { status: 'completed', winner, finishedAt: new Date() } }
  );
  return loadBattle(battle._id);
};

const ensureBattleTime = async battle => {
  if (battle.status === 'active' && battle.endsAt && battle.endsAt <= new Date()) {
    return finishBattle(battle);
  }
  if (battle.status === 'waiting') {
    const maxAge = battle.mode === 'quick' ? QUEUE_MAX_AGE_MS : FRIEND_ROOM_MAX_AGE_MS;
    if (battle.createdAt.getTime() + maxAge <= Date.now()) {
      await BattleMatch.updateOne(
        { _id: battle._id, status: 'waiting' },
        { $set: { status: 'cancelled', finishedAt: new Date() } }
      );
      return loadBattle(battle._id);
    }
  }
  return battle;
};

const findWaitingMatch = async ({ mode, topic, difficulty, userId }) => {
  const filter = {
    status: 'waiting',
    mode,
    topic,
    difficulty,
    players: { $size: 1 },
    'players.user': { $ne: userId }
  };

  const waiting = await BattleMatch.findOne(filter).sort({ createdAt: 1 });
  return waiting;
};

const startBattle = async (battle, userId, problemId) => {
  const now = new Date();
  return BattleMatch.findOneAndUpdate(
    { _id: battle._id, status: 'waiting', players: { $size: 1 }, 'players.user': { $ne: userId } },
    {
      $push: { players: { user: userId } },
      $set: {
        status: 'active',
        problem: problemId || battle.problem,
        startsAt: now,
        endsAt: new Date(now.getTime() + BATTLE_DURATION_SECONDS * 1000)
      }
    },
    { new: true }
  );
};

const respondWithBattle = async (res, battle, userId, status = 200) => {
  const populated = await loadBattle(battle._id);
  res.status(status).json({ success: true, data: serializeBattle(populated, userId) });
};

exports.getOptions = async (req, res) => {
  try {
    const query = { visibility: 'public', 'testCases.0': { $exists: true } };
    const [topics, problemCount] = await Promise.all([
      ProblemSet.distinct('tags', query),
      ProblemSet.countDocuments(query)
    ]);
    res.json({
      success: true,
      data: {
        topics: topics.filter(Boolean).sort((a, b) => a.localeCompare(b)),
        difficulties: ALLOWED_DIFFICULTIES,
        problemCount
      }
    });
  } catch (error) {
    console.error('Get battle options error:', error);
    res.status(500).json({ success: false, error: 'Could not load battle options' });
  }
};

exports.joinQuickQueue = async (req, res) => {
  try {
    const { topic, difficulty } = normalizeOptions(req.body);
    const userId = req.user._id;
    const queueCutoff = new Date(Date.now() - QUEUE_MAX_AGE_MS);
    await BattleMatch.updateMany(
      { mode: 'quick', status: 'waiting', createdAt: { $lt: queueCutoff } },
      { $set: { status: 'cancelled', finishedAt: new Date() } }
    );
    const existingQueue = await BattleMatch.findOne({
      mode: 'quick',
      status: 'waiting',
      createdAt: { $gte: queueCutoff },
      'players.user': userId
    });
    if (existingQueue) return respondWithBattle(res, existingQueue, userId);

    const waiting = await findWaitingMatch({ mode: 'quick', topic, difficulty, userId });
    if (waiting) {
      const matched = await startBattle(waiting, userId);
      if (matched) {
        emitBattleUpdate(req, matched);
        return respondWithBattle(res, matched, userId, 200);
      }
    }

    const problem = await getBattleProblem({ topic, difficulty });
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: 'No public problems with test cases match these filters yet. Try another topic or difficulty.'
      });
    }

    const match = await BattleMatch.create({
      mode: 'quick',
      topic,
      difficulty,
      problem: problem._id,
      durationSeconds: BATTLE_DURATION_SECONDS,
      players: [{ user: userId }]
    });
    return respondWithBattle(res, match, userId, 201);
  } catch (error) {
    console.error('Join quick battle queue error:', error);
    res.status(500).json({ success: false, error: 'Could not join the battle queue' });
  }
};

exports.leaveQuickQueue = async (req, res) => {
  try {
    const result = await BattleMatch.findOneAndUpdate(
      { mode: 'quick', status: 'waiting', 'players.user': req.user._id },
      { $set: { status: 'cancelled', finishedAt: new Date() } },
      { new: true }
    );
    if (result) emitBattleUpdate(req, result);
    res.json({ success: true });
  } catch (error) {
    console.error('Leave quick battle queue error:', error);
    res.status(500).json({ success: false, error: 'Could not leave the battle queue' });
  }
};

exports.createFriendRoom = async (req, res) => {
  try {
    const { topic, difficulty } = normalizeOptions(req.body);
    const problem = await getBattleProblem({ topic, difficulty });
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: 'No public problems with test cases match these filters yet. Try another topic or difficulty.'
      });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const battle = await BattleMatch.create({
      inviteCode,
      mode: 'friend',
      topic,
      difficulty,
      problem: problem._id,
      durationSeconds: BATTLE_DURATION_SECONDS,
      players: [{ user: req.user._id }]
    });
    return respondWithBattle(res, battle, req.user._id, 201);
  } catch (error) {
    console.error('Create friend battle room error:', error);
    res.status(500).json({ success: false, error: 'Could not create a friend battle room' });
  }
};

exports.joinFriendRoom = async (req, res) => {
  try {
    const inviteCode = req.params.inviteCode.trim().toUpperCase();
    const roomCutoff = new Date(Date.now() - FRIEND_ROOM_MAX_AGE_MS);
    const waiting = await BattleMatch.findOne({
      inviteCode,
      mode: 'friend',
      status: 'waiting',
      createdAt: { $gte: roomCutoff }
    });
    if (!waiting) {
      return res.status(404).json({ success: false, error: 'Room not found or the battle has already started' });
    }
    if (waiting.players.some(player => player.user.equals(req.user._id))) {
      return res.status(400).json({ success: false, error: 'You cannot join your own room with the same account' });
    }
    const match = await startBattle(waiting, req.user._id);
    if (!match) {
      return res.status(409).json({ success: false, error: 'This room has already been joined' });
    }
    emitBattleUpdate(req, match);
    return respondWithBattle(res, match, req.user._id);
  } catch (error) {
    console.error('Join friend battle room error:', error);
    res.status(500).json({ success: false, error: 'Could not join the friend battle room' });
  }
};

exports.getBattle = async (req, res) => {
  try {
    let battle = await loadBattle(req.params.battleId);
    if (!battle) return res.status(404).json({ success: false, error: 'Battle not found' });
    if (!battle.players.some(player => player.user._id.equals(req.user._id))) {
      return res.status(403).json({ success: false, error: 'You are not a player in this battle' });
    }
    const previousStatus = battle.status;
    battle = await ensureBattleTime(battle);
    if (battle.status !== previousStatus) emitBattleUpdate(req, battle);
    return res.json({ success: true, data: serializeBattle(battle, req.user._id) });
  } catch (error) {
    console.error('Get battle error:', error);
    res.status(500).json({ success: false, error: 'Could not load this battle' });
  }
};

exports.runBattleCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    if (typeof code !== 'string' || !code.trim() || code.length > 65536 || !ALLOWED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, error: 'Provide code (up to 64 KB) and a supported language' });
    }
    const battle = await BattleMatch.findById(req.params.battleId).populate('problem');
    if (!battle || !battle.players.some(player => player.user.equals(req.user._id))) {
      return res.status(404).json({ success: false, error: 'Battle not found' });
    }
    if (battle.status !== 'active' || battle.endsAt <= new Date()) {
      return res.status(409).json({ success: false, error: 'This battle is no longer active' });
    }
    const sampleCases = getSampleCases(battle.problem);
    if (!sampleCases.length) {
      return res.status(400).json({ success: false, error: 'This problem has no sample tests to run' });
    }
    const result = await codeExecutionService.executeCode(
      code,
      language,
      sampleCases,
      (battle.problem.timeLimit || 2) * 1000,
      battle.problem.memoryLimit || 256
    );
    return res.json({
      success: true,
      data: {
        status: result.status || 'internal_error',
        testCasesPassed: result.testCasesPassed || 0,
        totalTestCases: result.totalTestCases || sampleCases.length,
        executionTime: result.totalExecutionTime || 0,
        memoryUsed: result.maxMemoryUsed || 0,
        output: (result.testCaseResults || []).map(testCase => ({
          passed: testCase.passed,
          status: testCase.status,
          output: testCase.isSample ? testCase.output : undefined
        }))
      }
    });
  } catch (error) {
    console.error('Run battle code error:', error);
    res.status(500).json({ success: false, error: 'Could not run code against the sample tests' });
  }
};

exports.submitBattleCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    if (typeof code !== 'string' || !code.trim() || code.length > 65536 || !ALLOWED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, error: 'Provide code (up to 64 KB) and a supported language' });
    }
    const battle = await BattleMatch.findById(req.params.battleId).populate('problem');
    if (!battle || !battle.players.some(player => player.user.equals(req.user._id))) {
      return res.status(404).json({ success: false, error: 'Battle not found' });
    }
    if (battle.status !== 'active' || battle.endsAt <= new Date()) {
      return res.status(409).json({ success: false, error: 'This battle is no longer accepting submissions' });
    }
    if (battle.players.find(player => player.user.equals(req.user._id)).status === 'submitted') {
      return res.status(409).json({ success: false, error: 'You have already submitted for this battle' });
    }
    if (battle.problem.allowedLanguages?.length && !battle.problem.allowedLanguages.includes(language)) {
      return res.status(400).json({ success: false, error: `Language ${language} is not allowed for this problem` });
    }

    const testCases = battle.problem.testCases || [];
    if (!testCases.length) return res.status(409).json({ success: false, error: 'This problem has no judge test cases' });

    const result = await codeExecutionService.executeCode(
      code,
      language,
      testCases,
      (battle.problem.timeLimit || 2) * 1000,
      battle.problem.memoryLimit || 256
    );
    const passed = result.testCasesPassed || 0;
    const verdict = result.status || 'internal_error';
    const now = new Date();
    const submission = {
      code,
      language,
      verdict,
      score: passed,
      testCasesPassed: passed,
      totalTestCases: testCases.length,
      executionTime: result.totalExecutionTime || 0,
      memoryUsed: result.maxMemoryUsed || 0,
      submittedAt: now,
      status: 'submitted'
    };

    const update = await BattleMatch.updateOne(
      { _id: battle._id, status: 'active', endsAt: { $gt: now }, 'players.user': req.user._id },
      { $set: Object.fromEntries(Object.entries(submission).map(([key, value]) => [`players.$.${key}`, value])) }
    );
    if (!update.modifiedCount) {
      return res.status(409).json({ success: false, error: 'Battle ended before your submission was saved' });
    }

    let latest = await loadBattle(battle._id);
    if (latest.players.length === 2 && latest.players.every(player => player.status === 'submitted')) {
      latest = await finishBattle(latest);
    }
    emitBattleUpdate(req, latest);
    return res.json({
      success: true,
      data: {
        battle: serializeBattle(latest, req.user._id),
        submission: {
          verdict,
          testCasesPassed: passed,
          totalTestCases: testCases.length,
          executionTime: submission.executionTime
        }
      }
    });
  } catch (error) {
    console.error('Submit battle code error:', error);
    res.status(500).json({ success: false, error: 'Could not submit your battle solution' });
  }
};
