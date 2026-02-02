import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Create a single socket connection to the backend
// This socket is used ONLY for signaling (no media data)
const socket = io(
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
);

export const useWebRTC = (currentUserId) => {

  /* =========================================================
     REFS (persistent across renders, do not trigger re-render)
     ========================================================= */

  // Local camera video element
  const localVideoRef = useRef(null);

  // Remote peer video element
  const remoteVideoRef = useRef(null);

  // RTCPeerConnection instance (WebRTC core)
  const peerConnection = useRef(null);

  // MediaStream from getUserMedia
  const localStream = useRef(null);

  /* =========================================================
     STATE (controls UI + call flow)
     ========================================================= */

  const [isJoined, setIsJoined] = useState(false);
  // true when both peers have accepted and joined the call

  const [isCalling, setIsCalling] = useState(false);
  // true when current user initiated a call and is waiting

  const [isRinging, setIsRinging] = useState(false);
  // true when an incoming call is ringing

  const [incomingCall, setIncomingCall] = useState(null);
  // stores caller socketId (used only for UI)

  const [activeRoomId, setActiveRoomId] = useState(null);
  // unique room for signaling between two peers

  /* =========================================================
     ICE SERVERS
     =========================================================
     Used by WebRTC to discover network paths (NAT traversal)
  */
  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  /* =========================================================
     SOCKET EVENT LISTENERS
     =========================================================
     Handles all incoming signaling events from server
  */
  useEffect(() => {
    if (!currentUserId) return;

    // Identify this socket with the logged-in user
    socket.emit('identify', currentUserId);

    /* ---------- Incoming call ---------- */
    socket.on('incoming-call', ({ from, roomId }) => {
      setIncomingCall(from);   // caller socketId (UI only)
      setActiveRoomId(roomId); // room to join if accepted
      setIsRinging(true);      // show incoming call UI
    });

    /* ---------- Call accepted ---------- */
    socket.on('call-accepted', () => {
      setIsCalling(false); // stop "calling" state
      setIsJoined(true);   // trigger WebRTC initialization
    });

    /* ---------- Call rejected / ended ---------- */
    socket.on('call-rejected', () => cleanup());
    socket.on('call-ended', () => cleanup());

    /* ---------- WebRTC OFFER ---------- */
    socket.on('offer', async ({ sdp }) => {
      // Offer received by call receiver
      if (!peerConnection.current) return;

      // Set caller's offer as remote description
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );

      // Create answer
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      // Send answer back to caller
      socket.emit('answer', { 
        roomId: activeRoomId, 
        sdp: answer 
      });
    });

    /* ---------- WebRTC ANSWER ---------- */
    socket.on('answer', async ({ sdp }) => {
      // Answer received by caller
      if (peerConnection.current?.signalingState !== 'stable') {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
      }
    });

    /* ---------- ICE CANDIDATES ---------- */
    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate && peerConnection.current) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    });

    // Cleanup listeners on unmount or dependency change
    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-ended');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [currentUserId, activeRoomId]);

  /* =========================================================
     INITIALIZE WEBRTC
     =========================================================
     Runs when:
     - user is calling
     - OR user has joined a call
  */
  useEffect(() => {
    if (!isJoined && !isCalling) return;

    const init = async () => {
      try {
        /* ---------- Get camera & mic ---------- */
        if (!localStream.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          localStream.current = stream;

          // Attach local stream to video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

        /* ---------- Create PeerConnection ---------- */
        if (!peerConnection.current) {
          peerConnection.current = new RTCPeerConnection(servers);

          // Send local tracks to peer
          localStream.current.getTracks().forEach(track =>
            peerConnection.current.addTrack(
              track, 
              localStream.current
            )
          );

          // Receive remote tracks
          peerConnection.current.ontrack = (e) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = e.streams[0];
            }
          };

          // Send ICE candidates to other peer
          peerConnection.current.onicecandidate = (e) => {
            if (e.candidate) {
              socket.emit('ice-candidate', {
                roomId: activeRoomId,
                candidate: e.candidate,
              });
            }
          };
        }

        /* ---------- Caller creates OFFER ---------- */
        if (isJoined && !isCalling) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);

          socket.emit('offer', { 
            roomId: activeRoomId, 
            sdp: offer 
          });
        }
      } catch (err) {
        console.error('Media Error:', err);
      }
    };

    init();
  }, [isJoined, isCalling, activeRoomId]);

  /* =========================================================
     ACTIONS (exposed to UI)
     ========================================================= */

  // Start a private call
  const startPrivateCall = (targetUserId) => {
    const roomId = `room-${currentUserId}-${targetUserId}-${Date.now()}`;

    setActiveRoomId(roomId);
    setIsCalling(true);

    socket.emit('join-room', roomId);
    socket.emit('call-user', { roomId, targetUserId });
  };

  // Accept incoming call
  const acceptCall = () => {
    setIsRinging(false);

    socket.emit('join-room', activeRoomId);
    socket.emit('accept-call', { roomId: activeRoomId });

    setIsJoined(true);
  };

  // Reject incoming call
  const rejectCall = () => {
    socket.emit('reject-call', { roomId: activeRoomId });
    cleanup();
  };

  // End active call
  const endCall = () => {
    socket.emit('end-call', { roomId: activeRoomId });
    cleanup();
  };

  /* =========================================================
     CLEANUP (reset everything)
     ========================================================= */
  const cleanup = () => {
    setIsJoined(false);
    setIsCalling(false);
    setIsRinging(false);
    setIncomingCall(null);
    setActiveRoomId(null);

    // Stop camera & mic
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  /* =========================================================
     EXPOSE API TO COMPONENTS
     ========================================================= */
  return {
    localVideoRef,
    remoteVideoRef,
    isJoined,
    isCalling,
    isRinging,
    incomingCall,
    startPrivateCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};
