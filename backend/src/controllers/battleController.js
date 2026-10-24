const crypto = require('crypto');
const BattleMatch = require('../models/BattleMatch');
const { problemsBank } = require('../data/problemsBank');
const { fetchLeetCodeSolvedProblems } = require('../services/platforms/leetcodeService');

const BATTLE_DURATION_SECONDS = 45 * 60;
const QUEUE_MAX_AGE_MS = 15 * 60 * 1000;
const FRIEND_ROOM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_INTERVAL_MS = 30 * 1000;
const POINTS_PER_PROBLEM = 10;
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

const getLeetCodeProblems = ({ topic, difficulty }) => {
  const candidates = Object.entries(problemsBank).flatMap(([problemTopic, topicProblems]) =>
    topicProblems
      .filter(problem => problem.platform === 'leetcode')
      .filter(problem => !topic || topic === problemTopic)
      .filter(problem => !difficulty || problem.difficulty.toLowerCase() === difficulty)
      .map(problem => ({ ...problem, title: problem.name, topic: problemTopic }))
  );
  const uniqueProblems = [...new Map(candidates.map(problem => [problem.slug, problem])).values()];

  for (let index = uniqueProblems.length - 1; index > 0; index--) {
    const swapIndex = crypto.randomInt(index + 1);
    [uniqueProblems[index], uniqueProblems[swapIndex]] = [uniqueProblems[swapIndex], uniqueProblems[index]];
  }

  return uniqueProblems.slice(0, 3);
};

const normalizeOptions = body => ({
  topic: typeof body.topic === 'string' ? body.topic.trim().slice(0, 60) : '',
  difficulty: ALLOWED_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'medium'
});

const getLinkedLeetCodeUsername = user =>
  typeof user.platforms?.leetcode === 'string' ? user.platforms.leetcode.trim() : '';

const requireLeetCodeAccount = (req, res) => {
  const username = getLinkedLeetCodeUsername(req.user);
  if (username) return username;

  res.status(400).json({
    success: false,
    error: 'Link your LeetCode username in Platforms before joining a battle.'
  });
  return null;
};

const serializeBattle = battle => ({
  _id: battle._id,
  inviteCode: battle.inviteCode,
  mode: battle.mode,
  status: battle.status,
  topic: battle.topic,
  difficulty: battle.difficulty,
  durationSeconds: battle.durationSeconds,
  pointsPerProblem: POINTS_PER_PROBLEM,
  startsAt: battle.startsAt,
  endsAt: battle.endsAt,
  finishedAt: battle.finishedAt,
  winner: battle.winner?._id || battle.winner || null,
  problems: (battle.leetcodeProblems || []).map(problem => ({
    title: problem.title,
    slug: problem.slug,
    link: problem.link,
    difficulty: problem.difficulty,
    topic: problem.topic
  })),
  players: (battle.players || []).map(player => {
    const user = player.user?._id ? player.user : { _id: player.user };
    return {
      user: {
        _id: user._id,
        username: user.username || 'Coder',
        fullName: user.fullName || '',
        avatar: user.avatar || ''
      },
      score: player.score,
      solvedProblems: (player.solvedProblems || []).map(solved => ({
        slug: solved.slug,
        solvedAt: solved.solvedAt,
        points: solved.points
      })),
      verificationStatus: player.verificationStatus
    };
  })
});

const loadBattle = id => BattleMatch.findById(id)
  .populate('players.user', 'username fullName avatar')
  .populate('winner', 'username fullName avatar');

const emitBattleUpdate = (req, battle) => {
  const io = req.app.get('io');
  if (!io || !battle) return;
  io.to(`battle:${battle._id}`).emit('battle:updated', {
    battleId: battle._id.toString(),
    status: battle.status,
    players: battle.players.map(player => ({
      userId: player.user._id?.toString?.() || player.user.toString(),
      score: player.score,
      solvedProblems: player.solvedProblems,
      verificationStatus: player.verificationStatus
    })),
    winner: battle.winner?._id?.toString?.() || battle.winner?.toString?.() || null,
    endsAt: battle.endsAt
  });
};

const getCompletionTime = player => {
  const solves = [...(player.solvedProblems || [])].sort(
    (first, second) => new Date(first.solvedAt) - new Date(second.solvedAt)
  );
  return solves[player.score / POINTS_PER_PROBLEM - 1]?.solvedAt || null;
};

const getPlayerUserId = player => player.user?._id || player.user;

const comparePlayers = players => {
  const [first, second] = players;
  if (!first || !second || first.score === second.score && first.score === 0) return null;
  if (first.score !== second.score) {
    return getPlayerUserId(first.score > second.score ? first : second);
  }

  const firstCompletedAt = getCompletionTime(first);
  const secondCompletedAt = getCompletionTime(second);
  if (!firstCompletedAt || !secondCompletedAt || new Date(firstCompletedAt).getTime() === new Date(secondCompletedAt).getTime()) return null;
  return new Date(firstCompletedAt) < new Date(secondCompletedAt)
    ? getPlayerUserId(first)
    : getPlayerUserId(second);
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
  if (
    battle.status === 'active' &&
    battle.endsAt &&
    battle.endsAt <= new Date() &&
    battle.finalVerificationCompletedAt
  ) {
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

const verifyLeetCodeResults = async (battleId, isFinalAttempt = false) => {
  const now = new Date();
  const attemptCutoff = new Date(now.getTime() - VERIFICATION_INTERVAL_MS);
  const claimFilter = { _id: battleId, status: 'active' };
  if (isFinalAttempt) {
    claimFilter.finalVerificationCompletedAt = null;
    claimFilter.$or = [
      { finalVerificationAttemptAt: null },
      { finalVerificationAttemptAt: { $lte: attemptCutoff } }
    ];
  } else {
    claimFilter.endsAt = { $gt: now };
    claimFilter.$or = [
      { lastVerificationAttemptAt: null },
      { lastVerificationAttemptAt: { $lte: attemptCutoff } }
    ];
  }
  const battle = await BattleMatch.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        lastVerificationAttemptAt: now,
        ...(isFinalAttempt ? { finalVerificationAttemptAt: now } : {})
      }
    },
    { new: true }
  ).populate('players.user', 'platforms');
  if (!battle) return;

  const verificationResults = await Promise.all(battle.players.map(async player => {
    const username = player.leetcodeUsername || getLinkedLeetCodeUsername(player.user);
    if (!username) return { success: false, data: [] };
    return fetchLeetCodeSolvedProblems(username);
  }));

  const problemSlugs = new Set(battle.leetcodeProblems.map(problem => problem.slug));
  const startTime = new Date(battle.startsAt).getTime();
  const endTime = new Date(battle.endsAt).getTime();
  const updates = battle.players.map((player, index) => {
    const result = verificationResults[index];
    const solvedBySlug = new Map((player.solvedProblems || []).map(solved => [solved.slug, solved]));
    if (result.success) {
      result.data.forEach(submission => {
        const validSolveTimes = (submission.submissionTimestamps || [submission.lastSolvedAt])
          .map(timestamp => new Date(timestamp).getTime())
          .filter(timestamp => timestamp >= startTime && timestamp <= endTime);
        if (problemSlugs.has(submission.titleSlug) && validSolveTimes.length && !solvedBySlug.has(submission.titleSlug)) {
          solvedBySlug.set(submission.titleSlug, {
            slug: submission.titleSlug,
            solvedAt: new Date(Math.min(...validSolveTimes)),
            points: POINTS_PER_PROBLEM
          });
        }
      });
    }

    return {
      [`players.${index}.solvedProblems`]: [...solvedBySlug.values()],
      [`players.${index}.score`]: solvedBySlug.size * POINTS_PER_PROBLEM,
      [`players.${index}.verificationStatus`]: result.success ? 'verified' : 'unavailable'
    };
  });
  if (isFinalAttempt) {
    updates.push({ finalVerificationCompletedAt: new Date() });
  }

  await BattleMatch.updateOne(
    { _id: battle._id, status: 'active' },
    { $set: Object.assign({}, ...updates) }
  );
};

const findWaitingMatch = ({ mode, topic, difficulty, userId }) => BattleMatch.findOne({
  status: 'waiting',
  mode,
  topic,
  difficulty,
  leetcodeProblems: { $size: 3 },
  players: { $size: 1 },
  'players.user': { $ne: userId }
}).sort({ createdAt: 1 });

const startBattle = async (battle, user) => {
  const now = new Date();
  return BattleMatch.findOneAndUpdate(
    { _id: battle._id, status: 'waiting', players: { $size: 1 }, 'players.user': { $ne: user._id } },
    {
      $push: {
        players: {
          user: user._id,
          leetcodeUsername: getLinkedLeetCodeUsername(user)
        }
      },
      $set: {
        status: 'active',
        startsAt: now,
        endsAt: new Date(now.getTime() + BATTLE_DURATION_SECONDS * 1000),
        lastVerificationAttemptAt: null,
        finalVerificationAttemptAt: null,
        finalVerificationCompletedAt: null
      }
    },
    { new: true }
  );
};

const respondWithBattle = async (res, battle, status = 200) => {
  const populated = await loadBattle(battle._id);
  res.status(status).json({ success: true, data: serializeBattle(populated) });
};

exports.getOptions = async (req, res) => {
  try {
    const topicOptions = Object.entries(problemsBank).flatMap(([topic, topicProblems]) =>
      ALLOWED_DIFFICULTIES.map(difficulty => ({
        topic,
        difficulty,
        count: new Set(topicProblems
          .filter(problem => problem.platform === 'leetcode' && problem.difficulty.toLowerCase() === difficulty)
          .map(problem => problem.slug)).size
      })).filter(option => option.count >= 3)
    );
    res.json({
      success: true,
      data: {
        topics: [...new Set(topicOptions.map(option => option.topic))].sort((a, b) => a.localeCompare(b)),
        topicOptions,
        difficulties: ALLOWED_DIFFICULTIES,
        problemCount: new Set(Object.values(problemsBank).flat()
          .filter(problem => problem.platform === 'leetcode')
          .map(problem => problem.slug)).size
      }
    });
  } catch (error) {
    console.error('Get battle options error:', error);
    res.status(500).json({ success: false, error: 'Could not load battle options' });
  }
};

exports.joinQuickQueue = async (req, res) => {
  try {
    const leetcodeUsername = requireLeetCodeAccount(req, res);
    if (!leetcodeUsername) return;

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
      leetcodeProblems: { $size: 3 },
      'players.user': userId
    });
    if (existingQueue) return respondWithBattle(res, existingQueue);

    const waiting = await findWaitingMatch({ mode: 'quick', topic, difficulty, userId });
    if (waiting) {
      const matched = await startBattle(waiting, req.user);
      if (matched) {
        emitBattleUpdate(req, matched);
        return respondWithBattle(res, matched);
      }
    }

    const problems = getLeetCodeProblems({ topic, difficulty });
    if (problems.length !== 3) {
      return res.status(404).json({
        success: false,
        error: 'There are not three LeetCode problems for this topic and difficulty. Try another selection.'
      });
    }

    const match = await BattleMatch.create({
      mode: 'quick',
      topic,
      difficulty,
      leetcodeProblems: problems,
      durationSeconds: BATTLE_DURATION_SECONDS,
      players: [{ user: userId, leetcodeUsername }]
    });
    return respondWithBattle(res, match, 201);
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
    const leetcodeUsername = requireLeetCodeAccount(req, res);
    if (!leetcodeUsername) return;

    const { topic, difficulty } = normalizeOptions(req.body);
    const problems = getLeetCodeProblems({ topic, difficulty });
    if (problems.length !== 3) {
      return res.status(404).json({
        success: false,
        error: 'There are not three LeetCode problems for this topic and difficulty. Try another selection.'
      });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const battle = await BattleMatch.create({
      inviteCode,
      mode: 'friend',
      topic,
      difficulty,
      leetcodeProblems: problems,
      durationSeconds: BATTLE_DURATION_SECONDS,
      players: [{ user: req.user._id, leetcodeUsername }]
    });
    return respondWithBattle(res, battle, 201);
  } catch (error) {
    console.error('Create friend battle room error:', error);
    res.status(500).json({ success: false, error: 'Could not create a friend battle room' });
  }
};

exports.joinFriendRoom = async (req, res) => {
  try {
    const leetcodeUsername = requireLeetCodeAccount(req, res);
    if (!leetcodeUsername) return;

    const inviteCode = req.params.inviteCode.trim().toUpperCase();
    const roomCutoff = new Date(Date.now() - FRIEND_ROOM_MAX_AGE_MS);
    const waiting = await BattleMatch.findOne({
      inviteCode,
      mode: 'friend',
      status: 'waiting',
      leetcodeProblems: { $size: 3 },
      createdAt: { $gte: roomCutoff }
    });
    if (!waiting) {
      return res.status(404).json({ success: false, error: 'Room not found or the battle has already started' });
    }
    if (waiting.players.some(player => player.user.equals(req.user._id))) {
      return res.status(400).json({ success: false, error: 'You cannot join your own room with the same account' });
    }
    const match = await startBattle(waiting, req.user);
    if (!match) {
      return res.status(409).json({ success: false, error: 'This room has already been joined' });
    }
    emitBattleUpdate(req, match);
    return respondWithBattle(res, match);
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

    if ((battle.leetcodeProblems || []).length !== 3) {
      if (battle.status === 'waiting' || battle.status === 'active') {
        await BattleMatch.updateOne(
          { _id: battle._id, status: battle.status },
          { $set: { status: 'cancelled', finishedAt: new Date() } }
        );
        battle = await loadBattle(battle._id);
      }
      return res.json({ success: true, data: serializeBattle(battle) });
    }

    if (battle.status === 'active') {
      await verifyLeetCodeResults(battle._id, battle.endsAt <= new Date());
      battle = await loadBattle(battle._id);
    }
    battle = await ensureBattleTime(battle);
    return res.json({ success: true, data: serializeBattle(battle) });
  } catch (error) {
    console.error('Get battle error:', error);
    res.status(500).json({ success: false, error: 'Could not load this battle' });
  }
};
