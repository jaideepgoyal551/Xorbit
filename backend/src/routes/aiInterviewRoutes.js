const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const aiInterviewController = require('../controllers/aiInterviewController');

const router = express.Router();
const liveTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many Gemini Live sessions were started. Wait a few minutes before starting another.' }
});

router.use(protect);
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many interview requests. Please wait a few minutes and try again.' }
}));

router.post('/start', aiInterviewController.startInterview);
router.post('/:sessionId/live-token', liveTokenLimiter, aiInterviewController.createLiveToken);
router.post('/:sessionId/answer', aiInterviewController.submitAnswer);
router.post('/:sessionId/finish', aiInterviewController.finishInterview);

module.exports = router;
