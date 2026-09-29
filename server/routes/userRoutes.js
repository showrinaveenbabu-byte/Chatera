const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, userController.getProfile);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, userController.updateProfile);

// @route   GET api/users/search
// @desc    Search for users by username, email, or phone
// @access  Private
router.get('/search', auth, userController.searchUsers);

// @route   GET api/users/discover
// @desc    Discover other/unknown users on Chatera
// @access  Private
router.get('/discover', auth, userController.discoverUsers);

module.exports = router;
