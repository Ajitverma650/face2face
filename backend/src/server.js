const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const socketHandler = require('./socket/socketHandler');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());

const server = http.createServer(app);

// 2. Initialize Socket.io with CORS (Critical for React to connect)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});


// Use the modular socket handler
socketHandler(io);


const PORT = process.env.PORT || 5000;



// Start Server
server.listen(PORT, () => {
  console.log(`Signaling Server running on http://localhost:${PORT}`);
});