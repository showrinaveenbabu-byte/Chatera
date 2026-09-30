const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/auth');

router.post('/request', auth, friendController.sendFriendRequest);
router.post('/accept', auth, friendController.acceptFriendRequest);
router.post('/reject', auth, friendController.rejectFriendRequest);
router.delete('/:friendId', auth, friendController.removeFriend);
router.get('/', auth, friendController.getFriends);

module.exports = router;
