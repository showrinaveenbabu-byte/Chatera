const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'supersecret_jwt_key_communication_app_2026_dev';
};

const getJwtExpiry = () => {
  return process.env.JWT_EXPIRES_IN || '7d';
};

exports.register = async (req, res) => {
  try {
    const { username, email, phoneNumber, password, displayName, avatar } = req.body;

    // Field presence validation
    if (!username || !username.trim()) {
      return res.status(400).json({ msg: 'Username is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ msg: 'Email is required.' });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ msg: 'Phone number is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters long.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ msg: 'Please provide a valid email address.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: cleanUsername },
        { email: cleanEmail },
        { phoneNumber: cleanPhone }
      ]
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === cleanUsername) {
        return res.status(400).json({ msg: 'Username is already taken. Please choose another.' });
      }
      if (existingUser.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({ msg: 'An account with this email address already exists.' });
      }
      if (existingUser.phoneNumber === cleanPhone) {
        return res.status(400).json({ msg: 'An account with this phone number already exists.' });
      }
      return res.status(400).json({ msg: 'User with this username, email, or phone number already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username: cleanUsername,
      displayName: (displayName && displayName.trim()) || cleanUsername,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      password: hashedPassword,
      avatar: avatar || '',
      status: 'online',
      statusMessage: 'Available to chat',
      theme: 'dark'
    });

    await user.save();

    // Create JWT
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        theme: user.theme
      }
    };

    jwt.sign(
      payload,
      getJwtSecret(),
      { expiresIn: getJwtExpiry() },
      (err, token) => {
        if (err) {
          console.error('[JWT Sign Error]:', err.message);
          return res.status(500).json({ msg: 'Security token generation failed. Please try again.' });
        }
        res.status(201).json({
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            avatar: user.avatar || '',
            status: user.status || 'online',
            statusMessage: user.statusMessage || '',
            theme: user.theme || 'dark'
          }
        });
      }
    );
  } catch (err) {
    if (err.code === 11000) {
      // MongoDB duplicate key error race condition
      const field = Object.keys(err.keyValue || {})[0] || 'Field';
      return res.status(400).json({ msg: `An account with this ${field} already exists.` });
    }
    console.error('[Register Error]:', err.message);
    res.status(500).json({ msg: 'Unable to complete registration. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !username.trim() || !password) {
      return res.status(400).json({ msg: 'Please provide both identifier and password.' });
    }

    const cleanIdentifier = username.trim().toLowerCase();

    // Check if user exists (by username, email, or phone)
    const user = await User.findOne({
      $or: [
        { username: cleanIdentifier },
        { email: cleanIdentifier },
        { phoneNumber: username.trim() }
      ]
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Create JWT
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        theme: user.theme
      }
    };

    jwt.sign(
      payload,
      getJwtSecret(),
      { expiresIn: getJwtExpiry() },
      (err, token) => {
        if (err) {
          console.error('[JWT Sign Error]:', err.message);
          return res.status(500).json({ msg: 'Security token generation failed. Please try again.' });
        }
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
            statusMessage: user.statusMessage || '',
            theme: user.theme || 'dark'
          }
        });
      }
    );
  } catch (err) {
    console.error('[Login Error]:', err.message);
    res.status(500).json({ msg: 'Unable to log in. Please try again.' });
  }
};
