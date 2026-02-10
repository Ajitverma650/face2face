const User = require('../models/User');

const CALL_TIMEOUT = 30000;
const pendingCalls = new Map(); // roomId → timeoutId

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    // Identify user
    socket.on('identify', async (userId) => {
      try {
        const user = await User.findByIdAndUpdate(
          userId,
          { socketId: socket.id, status: 'online' },
          { new: true }
        );
        socket.userId = userId;
        socket.username = user?.username || 'Anonymous';
        console.log(`${socket.username} online`);
      } catch (err) {
        console.error('Identify error:', err);
      }
    });

    // Join room
    socket.on('join-room', (roomId) => socket.join(roomId));

    // Call user
    socket.on('call-user', async ({ roomId, targetUserId }) => {
      try {
        const target = await User.findById(targetUserId);

        if (!target || target.status === 'offline') {
          return socket.emit('call-error', { message: 'User is offline' });
        }
        if (target.status === 'busy') {
          return socket.emit('call-error', { message: 'User is busy' });
        }

        // Mark caller busy
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
        }

        // Auto-join receiver to room (so room emits work for cancel/timeout)
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) targetSocket.join(roomId);

        // Notify receiver
        io.to(target.socketId).emit('incoming-call', {
          from: socket.id,
          roomId,
          callerName: socket.username,
        });

        // Timeout
        const timeoutId = setTimeout(async () => {
          pendingCalls.delete(roomId);
          if (socket.userId) {
            await User.findByIdAndUpdate(socket.userId, { status: 'online' });
          }
          socket.emit('call-error', { message: 'No answer' });
          socket.to(roomId).emit('call-ended');
        }, CALL_TIMEOUT);
        pendingCalls.set(roomId, timeoutId);
      } catch (err) {
        console.error('Call error:', err);
      }
    });

    // Accept call
    socket.on('accept-call', async ({ roomId }) => {
      try {
        if (pendingCalls.has(roomId)) {
          clearTimeout(pendingCalls.get(roomId));
          pendingCalls.delete(roomId);
        }

        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
        }

        socket.to(roomId).emit('call-accepted');
      } catch (err) {
        console.error('Accept error:', err);
      }
    });

    // Reject call
    socket.on('reject-call', async ({ roomId }) => {
      try {
        if (pendingCalls.has(roomId)) {
          clearTimeout(pendingCalls.get(roomId));
          pendingCalls.delete(roomId);
        }

        await resetRoomUsers(io, roomId);
        socket.to(roomId).emit('call-rejected');
        socket.leave(roomId);
      } catch (err) {
        console.error('Reject error:', err);
      }
    });

    // End call
    socket.on('end-call', async ({ roomId }) => {
      try {
        if (pendingCalls.has(roomId)) {
          clearTimeout(pendingCalls.get(roomId));
          pendingCalls.delete(roomId);
        }

        await resetRoomUsers(io, roomId);
        socket.to(roomId).emit('call-ended');
        socket.leave(roomId);
      } catch (err) {
        console.error('End call error:', err);
      }
    });

    // WebRTC signaling
    socket.on('offer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('offer', { sdp, from: socket.id });
    });

    socket.on('answer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('answer', { sdp, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        for (const roomId of socket.rooms) {
          if (roomId === socket.id) continue;
          await resetRoomUsers(io, roomId);
          socket.to(roomId).emit('call-ended');
        }

        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, {
            status: 'offline',
            socketId: null,
          });
        }
        console.log('Disconnected:', socket.id);
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    });
  });
};

// Reset all users in room to online
async function resetRoomUsers(io, roomId) {
  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    if (s.userId) {
      await User.findByIdAndUpdate(s.userId, { status: 'online' });
    }
  }
}

module.exports = socketHandler;
