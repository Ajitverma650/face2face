const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose'); // Added for MongoDB connection
const socketHandler = require('./socket/socketHandler');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); // Essential for parsing login/signup data


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));


app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));

const server = http.createServer(app);

// 3. Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

// Use the modular socket handler
// Note: You should update socketHandler.js next to use User models
socketHandler(io);

const PORT = process.env.PORT || 5000;

// Start Server
server.listen(PORT, () => {
  console.log(`Signaling Server running on http://localhost:${PORT}`);
});