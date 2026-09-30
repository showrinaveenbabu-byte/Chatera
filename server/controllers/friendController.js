const User = require('../models/User');
const mongoose = require('mongoose');

exports.sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Please provide a valid user ID.' });
    }

    if (userId.toString() === currentUserId.toString()) {
      return res.status(400).json({ msg: 'You cannot send a friend request to yourself.' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ msg: 'Your account was not found.' });
    }

    if (!targetUser) {
      return res.status(404).json({ msg: 'Target user not found.' });
    }

    const currentIdStr = currentUserId.toString();
    const isAlreadyFriend = targetUser.friends.some(f => f.toString() === currentIdStr);
    const hasPending = targetUser.friendRequests.some(r => r.toString() === currentIdStr);

    if (isAlreadyFriend) {
      return res.status(400).json({ msg: 'You are already friends with this user.' });
    }
    if (hasPending) {
      return res.status(400).json({ msg: 'Friend request is already pending.' });
    }

    targetUser.friendRequests.push(currentUserId);
    await targetUser.save();

    res.json({ msg: 'Friend request sent successfully.' });
  } catch (err) {
    console.error('[sendFriendRequest Error]:', err.message);
    res.status(500).json({ msg: 'Unable to send friend request. Please try again.' });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body; // The user who sent the request
    const currentUserId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Please provide a valid user ID.' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ msg: 'Your account was not found.' });
    }

    if (!targetUser) {
      // If target user no longer exists, remove stale request
      currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== userId.toString());
      await currentUser.save();
      return res.status(404).json({ msg: 'The user who sent this request no longer exists.' });
    }

    const hasRequest = currentUser.friendRequests.some(id => id.toString() === userId.toString());
    if (!hasRequest) {
      return res.status(400).json({ msg: 'No pending friend request found from this user.' });
    }

    // Remove from incoming requests
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== userId.toString());

    // Add to friends avoiding duplicates
    if (!currentUser.friends.some(id => id.toString() === userId.toString())) {
      currentUser.friends.push(userId);
    }
    if (!targetUser.friends.some(id => id.toString() === currentUserId.toString())) {
      targetUser.friends.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ msg: 'Friend request accepted.' });
  } catch (err) {
    console.error('[acceptFriendRequest Error]:', err.message);
    res.status(500).json({ msg: 'Unable to accept friend request. Please try again.' });
  }
};

exports.rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: 'Please provide a valid user ID.' });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ msg: 'User account not found.' });
    }

    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== userId.toString());
    await currentUser.save();

    res.json({ msg: 'Friend request declined.' });
  } catch (err) {
    console.error('[rejectFriendRequest Error]:', err.message);
    res.status(500).json({ msg: 'Unable to decline friend request. Please try again.' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user?.id;

    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ msg: 'Please provide a valid friend ID.' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(friendId);

    if (currentUser) {
      currentUser.friends = currentUser.friends.filter(id => id.toString() !== friendId.toString());
      await currentUser.save();
    }

    if (targetUser) {
      targetUser.friends = targetUser.friends.filter(id => id.toString() !== currentUserId.toString());
      await targetUser.save();
    }

    res.json({ msg: 'Friend removed successfully.' });
  } catch (err) {
    console.error('[removeFriend Error]:', err.message);
    res.status(500).json({ msg: 'Unable to remove friend. Please try again.' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username displayName email phoneNumber avatar status statusMessage')
      .populate('friendRequests', 'username displayName email phoneNumber avatar status');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Filter out null references if any user was deleted
    const safeFriends = (user.friends || []).filter(f => f !== null);
    const safeRequests = (user.friendRequests || []).filter(r => r !== null);

    res.json({ friends: safeFriends, requests: safeRequests });
  } catch (err) {
    console.error('[getFriends Error]:', err.message);
    res.status(500).json({ msg: 'Unable to fetch friends list. Please try again.' });
  }
};
