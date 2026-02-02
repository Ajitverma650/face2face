const User = require('../models/User'); 


const socketHandler = (io) => {

  // Fired every time a new client connects via Socket.IO
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
  
    // - We DO NOT know which application user this socket belongs to

    /* =========================================================
       1. IDENTIFY USER
  

       - Link application user (MongoDB userId) with socket.id
       - Mark user as online
       - Required for private calling
    */
    socket.on('identify', async (userId) => {
      try {
        await User.findByIdAndUpdate(userId, { 
          socketId: socket.id,   // store current socket id
          status: 'online'      
        });

        socket.userId = userId; 
        
        // Used later for cleanup on disconnect

        console.log(`User ${userId} is now online with socket ${socket.id}`);
      } catch (err) {
        console.error('Identification Error:', err);
      }
    });

    /* =========================================================
       2. JOIN ROOM (SIGNALING ONLY)
    
       Purpose:
       - Join a temporary room used only for WebRTC signaling
       - No media flows through Socket.IO
    */
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      // Both caller and receiver must join same room
      // so offer/answer/ICE can be exchanged
    });

    /* =========================================================
       3. CALL USER (PRIVATE CALL)
    
       Purpose:
       - Caller requests to call a specific user
       - Server validates user state
       - Server sends incoming-call ONLY to target socket
    */
    socket.on('call-user', async ({ roomId, targetUserId }) => {
      try {
        const target = await User.findById(targetUserId);

        // If user does not exist or is offline
        if (!target || target.status === 'offline') {
          return socket.emit('call-error', { message: 'User is offline' });
        }

        // If user is already in another call
        if (target.status === 'busy') {
          return socket.emit('call-error', { message: 'User is in another call' });
        }

        // Send incoming call notification ONLY to target user's socket
        socket.to(target.socketId).emit('incoming-call', { 
          from: socket.id,     // caller's socket id
          roomId,              // room to join if accepted
          callerName: socket.username || 'Anonymous'
        });

      } catch (err) {
        console.error('Call User Error:', err);
      }
    });

    /* =========================================================
       4. ACCEPT CALL
       =========================================================
       Purpose:
       - Receiver accepts the call
       - Mark receiver as busy
       - Notify caller to start WebRTC
    */
    socket.on('accept-call', async ({ roomId }) => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          status: 'busy' 
        });
      }

      // Notify the other peer in the room
      socket.to(roomId).emit('call-accepted', { 
        from: socket.id 
      });
    });

    /* =========================================================
       5. REJECT CALL
       =========================================================
       Purpose:
       - Receiver rejects incoming call
       - Notify caller to cleanup UI
    */
    socket.on('reject-call', ({ roomId }) => {
      socket.to(roomId).emit('call-rejected', { 
        from: socket.id 
      });
    });

    /* =========================================================
       6. END CALL
       =========================================================
       Purpose:
       - Either user ends the call
       - Mark user back to online
       - Notify other peer to cleanup
    */
    socket.on('end-call', async ({ roomId }) => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          status: 'online' 
        });
      }

      socket.to(roomId).emit('call-ended', { 
        from: socket.id 
      });
    });

    /* =========================================================
       7. WEBRTC SIGNALING EVENTS
       =========================================================
       NOTE:
       - Server does NOT inspect SDP or ICE
       - It only forwards messages to the other peer
    */

    // Offer from caller → receiver
    socket.on('offer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('offer', { 
        sdp, 
        from: socket.id 
      });
    });

    // Answer from receiver → caller
    socket.on('answer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('answer', { 
        sdp, 
        from: socket.id 
      });
    });

    // ICE candidates exchanged between peers
    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { 
        candidate, 
        from: socket.id 
      });
    });

    /* =========================================================
       8. DISCONNECT CLEANUP
       =========================================================
       Purpose:
       - Handle tab close / refresh / network drop
       - Prevent stale socketId in DB
    */
    socket.on('disconnect', async () => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { 
          status: 'offline',   // mark user offline
          socketId: null       // remove socket mapping
        });
      }

      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;
