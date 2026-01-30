const Call = require('../models/Call');

// Log the start of a call
exports.startCall = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const newCall = new Call({
      caller: req.user.id,
      receiver: receiverId,
      status: 'missed' // Default until updated
    });
    const call = await newCall.save();
    res.json(call);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// Update call status (completed/rejected)
exports.updateCallStatus = async (req, res) => {
  try {
    const { callId, status } = req.body;
    const call = await Call.findByIdAndUpdate(
      callId,
      { status, endTime: Date.now() },
      { new: true }
    );
    res.json(call);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// Get user call history
exports.getCallHistory = async (req, res) => {
  try {
    const history = await Call.find({
      $or: [{ caller: req.user.id }, { receiver: req.user.id }]
    })
    .populate('caller receiver', 'username')
    .sort({ startTime: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};