const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('call-user', ({ roomId }) => {
      socket.to(roomId).emit('incoming-call', { from: socket.id });
    });

    socket.on('accept-call', ({ roomId }) => {
      socket.to(roomId).emit('call-accepted', { from: socket.id });
    });

    socket.on('reject-call', ({ roomId }) => {
      socket.to(roomId).emit('call-rejected', { from: socket.id });
    });

    socket.on('end-call', ({ roomId }) => {
      // Broadcast to everyone else in the room that the call is over
      socket.to(roomId).emit('call-ended', { from: socket.id });
    });

    socket.on('offer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('offer', { sdp, from: socket.id });
    });

    socket.on('answer', ({ roomId, sdp }) => {
      socket.to(roomId).emit('answer', { sdp, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;