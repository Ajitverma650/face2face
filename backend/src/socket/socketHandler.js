const User = require('../models/User'); 

const CALL_TIMEOUT_MS = 30000; // 30 seconds
const pendingCalls = new Map();  // roomId → timeoutId
const callReceivers = new Map(); // roomId → receiver socketId


const socketHandler = (io) => {

  // Fired every time a new client connects via Socket.IO
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    /* =========================================================
       1. IDENTIFY USER
       - Link application user (MongoDB userId) with socket.id
       - Mark user as online
       - Fetch username for caller display
    */
    socket.on('identify', async (userId) => {
      try {
        const user = await User.findByIdAndUpdate(userId, { 
          socketId: socket.id,
          status: 'online'      
        }, { new: true });

        socket.userId = userId; 
        socket.username = user?.username || 'Anonymous'; 

        console.log(`User ${userId} (${socket.username}) is now online with socket ${socket.id}`);
      } catch (err) {
        console.error('Identification Error:', err);
      }
    });

    /* =========================================================
       2. JOIN ROOM (SIGNALING ONLY)
    */
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
    });

    /* =========================================================
       3. CALL USER (PRIVATE CALL)
    */
    socket.on('call-user', async ({ roomId, targetUserId }) => {
      try {
        const target = await User.findById(targetUserId);

        if (!target || target.status === 'offline') {
          return socket.emit('call-error', { message: 'User is offline' });
        }

        if (target.status === 'busy') {
          return socket.emit('call-error', { message: 'User is in another call' });
        }

        //Mark caller as busy when initiating call
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
        }

        // Track receiver for cleanup when caller cancels
        callReceivers.set(roomId, target.socketId);

        socket.to(target.socketId).emit('incoming-call', { 
          from: socket.id,
          roomId,
          callerName: socket.username || 'Anonymous'
        });

        // Auto-timeout: if callee doesn't respond within 30s, revert both to online
        const timeoutId = setTimeout(async () => {
          try {
            pendingCalls.delete(roomId);
            callReceivers.delete(roomId);
            if (socket.userId) {
              await User.findByIdAndUpdate(socket.userId, { status: 'online' });
            }
            socket.emit('call-error', { message: 'No answer — call timed out' });
            socket.to(target.socketId).emit('call-ended', { from: socket.id });
          } catch (err) {
            console.error('Call Timeout Error:', err);
          }
        }, CALL_TIMEOUT_MS);
        pendingCalls.set(roomId, timeoutId);

      } catch (err) {
        console.error('Call User Error:', err);
      }
    });

    /* =========================================================
       4. ACCEPT CALL — 
    */
    socket.on('accept-call', async ({ roomId }) => {
      try {
        // Clear call timeout
        if (pendingCalls.has(roomId)) {
          clearTimeout(pendingCalls.get(roomId));
          pendingCalls.delete(roomId);
        }

        // Clear receiver tracking (no longer needed once accepted)
        callReceivers.delete(roomId);

        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
        }

        socket.to(roomId).emit('call-accepted', { from: socket.id });
      } catch (err) {
        console.error('Accept Call Error:', err);
      }
    });

    /* =========================================================
       5. REJECT CALL — revert both users to online
    */
    socket.on('reject-call', async ({ roomId }) => {
      try {
        // Clear call timeout
        if (pendingCalls.has(roomId)) {
          clearTimeout(pendingCalls.get(roomId));
          pendingCalls.delete(roomId);
        }

        // Clear receiver tracking
        callReceivers.delete(roomId);

        // Revert rejector's status to online
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'online' });
        }

        // Revert all other users in the room to online
        const socketsInRoom = await io.in(roomId).fetchSockets();
        for (const s of socketsInRoom) {
          if (s.userId && s.userId !== socket.userId) {
            await User.findByIdAndUpdate(s.userId, { status: 'online' });
          }
        }

        socket.to(roomId).emit('call-rejected', { from: socket.id });
        socket.leave(roomId);
      } catch (err) {
        console.error('Reject Call Error:', err);
      }
    });

    /* =========================================================
       6. END CALL — reset both users to online + leave room
    */
    socket.on('end-call', async ({ roomId }) => {
      try {
        // Clear call timeout (if still pending)
        if (pendingCalls.has(roomId)) {
          clearTimeout(pendingCalls.get(roomId));
          pendingCalls.delete(roomId);
        }

        // Get receiver socket ID for direct notification
        const receiverSocketId = callReceivers.get(roomId);
        callReceivers.delete(roomId);

        // Revert ender's status to online
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'online' });
        }

        // Revert all other users in the room to online
        const socketsInRoom = await io.in(roomId).fetchSockets();
        for (const s of socketsInRoom) {
          if (s.userId && s.userId !== socket.userId) {
            await User.findByIdAndUpdate(s.userId, { status: 'online' });
          }
        }

        // Notify receiver directly (if they haven't joined room yet)
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call-ended', { from: socket.id });
        }
        // Also emit to room (for active calls)
        socket.to(roomId).emit('call-ended', { from: socket.id });
        socket.leave(roomId);
      } catch (err) {
        console.error('End Call Error:', err);
      }
    });

    /* =========================================================
       7. WEBRTC SIGNALING EVENTS
    */
    socket.on('offer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('offer', { sdp, from: socket.id });
    });

    socket.on('answer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('answer', { sdp, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    /* =========================================================
       8. DISCONNECT CLEANUP
       - Notify any active call rooms so the other user isn't stuck
       - Reset all participants in those rooms back to online
    */
    socket.on('disconnect', async () => {
      try {
        // Clean up pending calls where this socket was the caller
        for (const [roomId, receiverSocketId] of callReceivers.entries()) {
          // Check if disconnected socket was part of this call setup
          const callerRoom = Array.from(socket.rooms).find(r => r === roomId);
          if (callerRoom) {
            io.to(receiverSocketId).emit('call-ended', { from: socket.id });
            callReceivers.delete(roomId);
            if (pendingCalls.has(roomId)) {
              clearTimeout(pendingCalls.get(roomId));
              pendingCalls.delete(roomId);
            }
          }
        }

        // Notify all rooms this socket was in (skip its own socket.id room)
        for (const roomId of socket.rooms) {
          if (roomId === socket.id) continue;

          // Reset other participants in the room to online
          const socketsInRoom = await io.in(roomId).fetchSockets();
          for (const s of socketsInRoom) {
            if (s.userId && s.userId !== socket.userId) {
              await User.findByIdAndUpdate(s.userId, { status: 'online' });
            }
          }

          socket.to(roomId).emit('call-ended', { from: socket.id });
        }

        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { 
            status: 'offline',
            socketId: null
          });
        }
        console.log('User disconnected:', socket.id);
      } catch (err) {
        console.error('Disconnect Cleanup Error:', err);
      }
    });
  });
};

module.exports = socketHandler;
