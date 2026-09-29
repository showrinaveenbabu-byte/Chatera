const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const auth = require('../middleware/auth');

router.post('/request', auth, friendController.sendFriendRequest);
router.post('/accept', auth, friendController.acceptFriendRequest);
router.get('/', auth, friendController.getFriends);

module.exports = router;
