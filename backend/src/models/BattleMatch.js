const mongoose = require('mongoose');

const battlePlayerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['coding', 'submitted'], default: 'coding' },
  leetcodeUsername: { type: String, default: '' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'unavailable'],
    default: 'pending'
  },
  solvedProblems: [{
    slug: { type: String, required: true },
    solvedAt: { type: Date, required: true },
    points: { type: Number, required: true }
  }],
  code: { type: String, default: '', maxlength: 65536 },
  language: { type: String, default: 'cpp20' },
  verdict: { type: String, default: '' },
  score: { type: Number, default: 0 },
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  executionTime: { type: Number, default: 0 },
  memoryUsed: { type: Number, default: 0 },
  submittedAt: { type: Date, default: null }
}, { _id: false });

const battleMatchSchema = new mongoose.Schema({
  inviteCode: { type: String, unique: true, sparse: true, uppercase: true },
  mode: { type: String, enum: ['quick', 'friend'], required: true },
  status: { type: String, enum: ['waiting', 'active', 'completed', 'cancelled'], default: 'waiting' },
  topic: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'medium' },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProblemSet',
    default: null
  },
  leetcodeProblems: [{
    title: { type: String, required: true },
    slug: { type: String, required: true },
    link: { type: String, required: true },
    difficulty: { type: String, required: true },
    topic: { type: String, required: true }
  }],
  players: {
    type: [battlePlayerSchema],
    validate: {
      validator: players => players.length >= 1 && players.length <= 2,
      message: 'A battle must have one or two players'
    }
  },
  durationSeconds: { type: Number, default: 2700 },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  lastVerificationAttemptAt: { type: Date, default: null },
  finalVerificationAttemptAt: { type: Date, default: null },
  finalVerificationCompletedAt: { type: Date, default: null },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

battleMatchSchema.index({ status: 1, mode: 1, topic: 1, difficulty: 1, createdAt: 1 });
battleMatchSchema.index({ 'players.user': 1, status: 1 });

module.exports = mongoose.model('BattleMatch', battleMatchSchema);
