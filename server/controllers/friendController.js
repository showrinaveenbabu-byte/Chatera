const User = require('../models/User');

exports.sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(userId);

    if (!targetUser) return res.status(404).json({ msg: 'User not found' });
    if (targetUser.friendRequests.includes(req.user.id) || targetUser.friends.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Request already sent or already friends' });
    }

    targetUser.friendRequests.push(req.user.id);
    await targetUser.save();

    res.json({ msg: 'Friend request sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.body; // User who sent the request
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(userId);

    if (!currentUser.friendRequests.includes(userId)) {
      return res.status(400).json({ msg: 'No friend request from this user' });
    }

    // Remove from requests, add to friends
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== userId);
    currentUser.friends.push(userId);
    targetUser.friends.push(req.user.id);

    await currentUser.save();
    await targetUser.save();

    res.json({ msg: 'Friend request accepted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username email phoneNumber avatar status').populate('friendRequests', 'username email avatar');
    res.json({ friends: user.friends, requests: user.friendRequests });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
