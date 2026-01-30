const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  socketId: { type: String, default: null }, // Critical for direct signaling
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);