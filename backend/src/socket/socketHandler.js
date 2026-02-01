const User = require('../models/User'); // Import User model for status persistence

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Identify User: Link Socket ID to MongoDB User ID
    socket.on('identify', async (userId) => {
      try {
        await User.findByIdAndUpdate(userId, { 
          socketId: socket.id, 
          status: 'online' 
        });
        socket.userId = userId; // Store for disconnect cleanup
        console.log(`User ${userId} is now online with socket ${socket.id}`);
      } catch (err) {
        console.error('Identification Error:', err);
      }
    });

    // 2. Secure Join Room
        socket.on('join-room', (roomId) => {
        socket.join(roomId);
      });


    // 3. Private Signaling: Only signal to specific socketId
    socket.on('call-user', async ({ roomId, targetUserId }) => {
      try {
        const target = await User.findById(targetUserId);
        
        // Handle Security/Persistence checks
        if (!target || target.status === 'offline') {
          return socket.emit('call-error', { message: 'User is offline' });
        }
        if (target.status === 'busy') {
          return socket.emit('call-error', { message: 'User is in another call' });
        }

        // Send signal only to target user's specific socket
        socket.to(target.socketId).emit('incoming-call', { 
          from: socket.id, 
          roomId,
          callerName: socket.username || 'Anonymous' 
        });
      } catch (err) {
        console.error('Call User Error:', err);
      }
    });

    socket.on('accept-call', async ({ roomId }) => {
      // Update status to Busy in MongoDB during active call
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
      }
      socket.to(roomId).emit('call-accepted', { from: socket.id });
    });

    socket.on('reject-call', ({ roomId }) => {
      socket.to(roomId).emit('call-rejected', { from: socket.id });
    });

    socket.on('end-call', async ({ roomId }) => {
      // Set status back to Online after call ends
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { status: 'online' });
      }
      socket.to(roomId).emit('call-ended', { from: socket.id });
    });

    /* ---------------- WEBRTC SIGNALING ---------------- */
    socket.on('offer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('offer', { sdp, from: socket.id });
    });

    socket.on('answer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('answer', { sdp, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    /* ---------------- CLEANUP ---------------- */
    socket.on('disconnect', async () => {
      if (socket.userId) {
        // Reset status to Offline and remove socketId association
        await User.findByIdAndUpdate(socket.userId, { 
          status: 'offline', 
          socketId: null 
        });
      }
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;