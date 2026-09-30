const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('[getProfile Error]:', err.message);
    res.status(500).json({ msg: 'Unable to load profile. Please try again.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    const {
      username,
      displayName,
      bio,
      avatar,
      status,
      statusMessage,
      location,
      occupation,
      theme,
      phoneNumber
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check username uniqueness if changed
    if (username && username.trim().toLowerCase() !== user.username.toLowerCase()) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        return res.status(400).json({ msg: 'Username must be at least 3 characters long.' });
      }
      const existing = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ msg: 'Username is already taken by another user.' });
      }
      user.username = cleanUsername;
    }

    // Check phone uniqueness if changed
    if (phoneNumber && phoneNumber.trim() !== user.phoneNumber) {
      const cleanPhone = phoneNumber.trim();
      const existingPhone = await User.findOne({ phoneNumber: cleanPhone, _id: { $ne: user._id } });
      if (existingPhone) {
        return res.status(400).json({ msg: 'Phone number is already registered to another account.' });
      }
      user.phoneNumber = cleanPhone;
    }

    if (displayName !== undefined) user.displayName = displayName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (location !== undefined) user.location = location.trim();
    if (occupation !== undefined) user.occupation = occupation.trim();
    if (statusMessage !== undefined) user.statusMessage = statusMessage.trim();

    if (status !== undefined) {
      const validStatuses = ['online', 'offline', 'busy', 'away'];
      if (validStatuses.includes(status)) {
        user.status = status;
      }
    }

    if (theme !== undefined) {
      const validThemes = ['dark', 'light'];
      if (validThemes.includes(theme)) {
        user.theme = theme;
      }
    }

    await user.save();
    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'Field';
      return res.status(400).json({ msg: `This ${field} is already in use by another user.` });
    }
    console.error('[updateProfile Error]:', err.message);
    res.status(500).json({ msg: 'Unable to update profile. Please try again.' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user?.id;

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    let filter = { _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } };

    if (query && query.trim()) {
      const safeQuery = escapeRegex(query.trim());
      filter.$or = [
        { username: { $regex: safeQuery, $options: 'i' } },
        { displayName: { $regex: safeQuery, $options: 'i' } },
        { email: { $regex: safeQuery, $options: 'i' } },
        { phoneNumber: { $regex: safeQuery, $options: 'i' } }
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
    console.error('[searchUsers Error]:', err.message);
    res.status(500).json({ msg: 'Unable to search users. Please try again.' });
  }
};

exports.discoverUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return res.status(401).json({ msg: 'Unauthorized access' });
    }

    const users = await User.find({ _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } })
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
    console.error('[discoverUsers Error]:', err.message);
    res.status(500).json({ msg: 'Unable to discover users. Please try again.' });
  }
};
