const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  displayName: { type: String, default: '' },
  bio: { type: String, default: 'Hey there! I am using Chatera.' },
  location: { type: String, default: '' },
  occupation: { type: String, default: '' },
  status: { type: String, enum: ['online', 'offline', 'busy', 'away'], default: 'online' },
  statusMessage: { type: String, default: 'Available to chat' },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
