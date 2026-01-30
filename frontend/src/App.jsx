import React from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { Video, PhoneOff, Phone, PhoneIncoming } from 'lucide-react';

function App() {
  const roomId = "main-room";

  const {
    localVideoRef,
    remoteVideoRef,
    endCall,
    callUser,
    acceptCall,
    rejectCall,
    isJoined,
    isCalling,
    isRinging,
    incomingCall,
  } = useWebRTC(roomId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <Video className="text-blue-500" /> P2P Video Chat
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-sm text-white">
            You
          </div>
        </div>

        <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-sm text-white">
            Remote User
          </div>
        </div>
      </div>

      <div className="mt-6 text-lg font-medium text-gray-700">
        {isCalling && "Calling… 📞"}
        {isRinging && "Incoming Call… 🔔"}
        {isJoined && !isCalling && !isRinging && "In Call"}
      </div>

      <div className="mt-8 flex gap-4">
        {!isJoined && !isCalling && !isRinging && (
          <button
            onClick={callUser}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
          >
            <Phone size={20} /> Call
          </button>
        )}

        {isCalling && (
          <button
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
          >
            <PhoneOff size={20} /> Cancel
          </button>
        )}

        {isRinging && incomingCall && (
          <>
            <button
              onClick={acceptCall}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
            >
              <PhoneIncoming size={20} /> Accept
            </button>

            <button
              onClick={rejectCall}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
            >
              <PhoneOff size={20} /> Reject
            </button>
          </>
        )}

        {isJoined && !isCalling && !isRinging && (
          <button
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-colors"
          >
            <PhoneOff size={20} /> End Call
          </button>
        )}
      </div>
    </div>
  );
}

export default App;