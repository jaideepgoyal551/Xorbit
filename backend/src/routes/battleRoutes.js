const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const battleController = require('../controllers/battleController');

router.use(protect);

router.get('/options', battleController.getOptions);
router.post('/queue', battleController.joinQuickQueue);
router.delete('/queue', battleController.leaveQuickQueue);
router.post('/rooms', battleController.createFriendRoom);
router.post('/rooms/:inviteCode/join', battleController.joinFriendRoom);
router.get('/:battleId', battleController.getBattle);

module.exports = router;
