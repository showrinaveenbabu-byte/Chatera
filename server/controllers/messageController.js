const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id?.toString();

    if (!userId || !currentUserId) {
      return res.status(400).json({ msg: 'Missing user parameters' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.json([]);
    }

    const uObjId = new mongoose.Types.ObjectId(userId);
    const cObjId = new mongoose.Types.ObjectId(currentUserId);

    const messages = await Message.find({
      $or: [
        { sender: cObjId, receiver: uObjId },
        { sender: uObjId, receiver: cObjId }
      ]
    }).sort('createdAt');

    res.json(messages);
  } catch (err) {
    console.error('[getMessages Error]:', err.message);
    res.status(500).json({ msg: 'Unable to retrieve messages. Please try again.' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user?.id?.toString();
    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.json([]);
    }

    const cObjId = new mongoose.Types.ObjectId(currentUserId);

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
    const partnerObjIds = partnerIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

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
    console.error('[getConversations Error]:', err.message);
    res.status(500).json({ msg: 'Unable to retrieve conversations. Please try again.' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user?.id?.toString();
    const { receiver, text, type = 'text', image, sticker } = req.body;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    if (!receiver || !mongoose.Types.ObjectId.isValid(receiver)) {
      return res.status(400).json({ msg: 'Please provide a valid receiver ID.' });
    }

    if (!text && !image && !sticker) {
      return res.status(400).json({ msg: 'Message content cannot be empty.' });
    }

    // Verify receiver exists
    const targetUser = await User.findById(receiver);
    if (!targetUser) {
      return res.status(404).json({ msg: 'Recipient user does not exist.' });
    }

    const newMsg = new Message({
      sender: new mongoose.Types.ObjectId(currentUserId),
      receiver: new mongoose.Types.ObjectId(receiver),
      text: text || '',
      type,
      image: image || null,
      sticker: sticker || null,
      createdAt: new Date()
    });

    await newMsg.save();

    // Broadcast through socket.io if server instance is active
    const io = req.app.get('io');
    if (io) {
      const msgPayload = {
        _id: newMsg._id.toString(),
        sender: currentUserId,
        receiver: receiver.toString(),
        text: newMsg.text,
        type: newMsg.type,
        image: newMsg.image,
        sticker: newMsg.sticker,
        createdAt: newMsg.createdAt.toISOString()
      };
      io.to(`user_${receiver}`).emit('receive-direct-message', msgPayload);
      io.to(`user_${currentUserId}`).emit('message-sent', msgPayload);
    }

    res.status(201).json(newMsg);
  } catch (err) {
    console.error('[sendMessage Error]:', err.message);
    res.status(500).json({ msg: 'Unable to send message. Please try again.' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id?.toString();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid message ID.' });
    }

    const msg = await Message.findById(id);
    if (!msg) {
      return res.status(404).json({ msg: 'Message not found.' });
    }

    // Security check: Only the sender can delete their message
    if (msg.sender.toString() !== currentUserId) {
      return res.status(403).json({ msg: 'You are not authorized to delete this message.' });
    }

    const receiverId = msg.receiver.toString();
    await Message.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('message-deleted', { messageId: id });
      io.to(`user_${currentUserId}`).emit('message-deleted', { messageId: id });
    }

    res.json({ msg: 'Message deleted successfully.', messageId: id });
  } catch (err) {
    console.error('[deleteMessage Error]:', err.message);
    res.status(500).json({ msg: 'Unable to delete message. Please try again.' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const currentUserId = req.user?.id?.toString();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid message ID.' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Message text cannot be empty.' });
    }

    const msg = await Message.findById(id);
    if (!msg) {
      return res.status(404).json({ msg: 'Message not found.' });
    }

    // Security check: Only the sender can edit their message
    if (msg.sender.toString() !== currentUserId) {
      return res.status(403).json({ msg: 'You are not authorized to edit this message.' });
    }

    msg.text = text.trim();
    await msg.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${msg.receiver.toString()}`).emit('message-edited', { messageId: id, text: msg.text });
      io.to(`user_${currentUserId}`).emit('message-edited', { messageId: id, text: msg.text });
    }

    res.json(msg);
  } catch (err) {
    console.error('[editMessage Error]:', err.message);
    res.status(500).json({ msg: 'Unable to update message. Please try again.' });
  }
};
