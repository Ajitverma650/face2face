const User = require('../models/User'); 


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
        socket.username = user?.username || 'Anonymous'; // Bug #6 fix

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

        // Bug #4 fix: Mark caller as busy when initiating call
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
        }

        socket.to(target.socketId).emit('incoming-call', { 
          from: socket.id,
          roomId,
          callerName: socket.username || 'Anonymous'
        });

      } catch (err) {
        console.error('Call User Error:', err);
      }
    });

    /* =========================================================
       4. ACCEPT CALL — Bug #7 fix: wrap in try-catch
    */
    socket.on('accept-call', async ({ roomId }) => {
      try {
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'busy' });
        }

        socket.to(roomId).emit('call-accepted', { from: socket.id });
      } catch (err) {
        console.error('Accept Call Error:', err);
      }
    });

    /* =========================================================
       5. REJECT CALL — also revert caller to online
    */
    socket.on('reject-call', ({ roomId }) => {
      socket.to(roomId).emit('call-rejected', { from: socket.id });
    });

    /* =========================================================
       6. END CALL — Bug #7 & #15 fix: try-catch + leave room
    */
    socket.on('end-call', async ({ roomId }) => {
      try {
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { status: 'online' });
        }

        socket.to(roomId).emit('call-ended', { from: socket.id });
        socket.leave(roomId); // Bug #15 fix: clean up room
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
       8. DISCONNECT CLEANUP — Bug #7 fix: try-catch
    */
    socket.on('disconnect', async () => {
      try {
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
