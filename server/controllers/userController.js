const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, displayName, bio, avatar, status, statusMessage, location, occupation, theme, phoneNumber } = req.body;
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (username) user.username = username.trim();
    if (displayName !== undefined) user.displayName = displayName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (status !== undefined) user.status = status;
    if (statusMessage !== undefined) user.statusMessage = statusMessage.trim();
    if (location !== undefined) user.location = location.trim();
    if (occupation !== undefined) user.occupation = occupation.trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();
    if (theme !== undefined) user.theme = theme;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    let filter = { _id: { $ne: currentUserId } };

    if (query && query.trim()) {
      const q = query.trim();
      filter.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phoneNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('-password').limit(50);

    const currentUser = await User.findById(currentUserId);
    const friendIds = (currentUser?.friends || []).map(f => f.toString());
    const requestIds = (currentUser?.friendRequests || []).map(r => r.toString());

    const enrichedUsers = users.map(u => ({
      ...u.toObject(),
      isFriend: friendIds.includes(u._id.toString()),
      hasPendingRequest: requestIds.includes(u._id.toString()),
    }));

    res.json(enrichedUsers);
  } catch (err) {
    console.error('Error searching users:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.discoverUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    // Return all other users on the platform up to 50
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(50);

    const currentUser = await User.findById(currentUserId);
    const friendIds = (currentUser?.friends || []).map(f => f.toString());
    const requestIds = (currentUser?.friendRequests || []).map(r => r.toString());

    const enrichedUsers = users.map(u => ({
      ...u.toObject(),
      isFriend: friendIds.includes(u._id.toString()),
      hasPendingRequest: requestIds.includes(u._id.toString()),
    }));

    res.json(enrichedUsers);
  } catch (err) {
    console.error('Error discovering users:', err.message);
    res.status(500).send('Server Error');
  }
};
