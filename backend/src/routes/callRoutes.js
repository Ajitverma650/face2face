const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const auth = require('../middleware/auth');

// @route   POST api/calls/start
// @desc    Log the start of a call
// @access  Private
router.post('/start', auth, callController.startCall);

// @route   PUT api/calls/status
// @desc    Update call status (completed/rejected)
// @access  Private
router.put('/status', auth, callController.updateCallStatus);

// @route   GET api/calls/history
// @desc    Get user call history
// @access  Private
router.get('/history', auth, callController.getCallHistory);

module.exports = router;