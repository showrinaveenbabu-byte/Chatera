const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id?.toString();

    if (!userId || !currentUserId) {
      return res.json([]);
    }

    const uObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    const cObjId = mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : null;

    if (!uObjId || !cObjId) {
      return res.json([]);
    }

    const messages = await Message.find({
      $or: [
        { sender: cObjId, receiver: uObjId },
        { sender: uObjId, receiver: cObjId }
      ]
    }).sort('createdAt');

    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id?.toString();
    if (!currentUserId) return res.json([]);

    const cObjId = mongoose.Types.ObjectId.isValid(currentUserId) ? new mongoose.Types.ObjectId(currentUserId) : null;
    if (!cObjId) return res.json([]);

    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: cObjId }, { receiver: cObjId }]
    }).sort({ createdAt: -1 });

    const conversationMap = new Map();

    for (const msg of messages) {
      const sId = (msg.sender?._id || msg.sender)?.toString();
      const rId = (msg.receiver?._id || msg.receiver)?.toString();
      const partnerId = sId === currentUserId ? rId : sId;
      if (!partnerId) continue;

      if (!conversationMap.has(partnerId)) {
        let snippet = msg.text || '';
        if (msg.type === 'image') snippet = '📷 Photo';
        if (msg.type === 'sticker') snippet = '🎨 Sticker';
        if (msg.type === 'emoji') snippet = msg.text || '😊 Emoji';

        conversationMap.set(partnerId, {
          lastMessage: snippet,
          lastMessageTime: msg.createdAt,
          lastMessageType: msg.type,
          unread: rId === currentUserId,
        });
      }
    }

    const partnerIds = Array.from(conversationMap.keys());
    const partnerObjIds = partnerIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const users = await User.find({ _id: { $in: partnerObjIds } }).select('-password');

    const currentUser = await User.findById(cObjId);
    const friendIds = (currentUser?.friends || []).map(f => f.toString());

    const conversations = users.map(u => {
      const conv = conversationMap.get(u._id.toString()) || {};
      return {
        ...u.toObject(),
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        lastMessageType: conv.lastMessageType,
        unread: conv.unread || false,
        isFriend: friendIds.includes(u._id.toString()),
      };
    });

    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err.message);
    res.status(500).send('Server Error');
  }
};
