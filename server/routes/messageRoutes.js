const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

router.get('/conversations', auth, messageController.getConversations);
router.get('/conversations/list', auth, messageController.getConversations);
router.get('/:userId', auth, messageController.getMessages);

module.exports = router;
