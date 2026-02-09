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

    if (!callId || !status) {
      return res.status(400).json({ msg: 'callId and status are required' });
    }

    if (!['missed', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }

    // Only allow caller or receiver to update their own call
    const call = await Call.findOneAndUpdate(
      { _id: callId, $or: [{ caller: req.user.id }, { receiver: req.user.id }] },
      { status, endTime: Date.now() },
      { new: true }
    );

    if (!call) return res.status(404).json({ msg: 'Call not found or unauthorized' });

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