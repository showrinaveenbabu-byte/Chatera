const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { username, email, phoneNumber, password, displayName, avatar } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ username }, { email }, { phoneNumber }] });
    if (user) {
      return res.status(400).json({ msg: 'User with this username, email, or phone number already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      username: username.trim(),
      displayName: (displayName && displayName.trim()) || username.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      avatar: avatar || ''
    });
    await user.save();

    // Create JWT
    const payload = { user: { id: user.id, username: user.username, email: user.email, phoneNumber: user.phoneNumber, theme: user.theme } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretkey_change_in_production',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            avatar: user.avatar || '',
            status: user.status || 'online',
            theme: user.theme
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists (by username, email, or phone)
    let user = await User.findOne({ $or: [{ username }, { email: username }, { phoneNumber: username }] });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Create JWT
    const payload = { user: { id: user.id, username: user.username, email: user.email, phoneNumber: user.phoneNumber, theme: user.theme } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretkey_change_in_production',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            avatar: user.avatar || '',
            status: user.status || 'online',
            theme: user.theme
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
