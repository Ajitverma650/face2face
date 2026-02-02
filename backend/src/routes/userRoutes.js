const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth'); // Middleware to verify JWT

// @route   POST api/users/register
// @desc    Register a new user
router.post('/register', userController.register);

// @route   POST api/users/login
// @desc    Authenticate user & get token
router.post('/login', userController.login);

// @route   GET api/users/online
// @desc    Get all online users
// @access  Private
router.get('/online', auth, userController.getOnlineUsers);


module.exports = router;