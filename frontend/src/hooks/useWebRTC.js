import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

//connect only after auth
const socket = io(
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  { autoConnect: false }
);

export const useWebRTC = (currentUserId) => {

  /* =========================================================
     REFS (persistent across renders, do not trigger re-render)
     ========================================================= */

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  // Use ref for activeRoomId to avoid stale closures in socket listeners
  const activeRoomIdRef = useRef(null);

  // Track caller vs receiver role
  const roleRef = useRef(null); // 'caller' | 'receiver'

  /* =========================================================
     STATE (controls UI + call flow)
     ========================================================= */

  const [isJoined, setIsJoined] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false); 

  // Keep ref in sync with state
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  /* =========================================================
     ICE SERVERS
     ========================================================= */
  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  /* =========================================================
     CLEANUP (reset everything)
     ========================================================= */
  const cleanup = useCallback(() => {
    setIsJoined(false);
    setIsCalling(false);
    setIsRinging(false);
    setIncomingCall(null);
    setActiveRoomId(null);
    setMediaError(null);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    roleRef.current = null;

    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clear video elements so last frame doesn't stay frozen
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  /* =========================================================
     SOCKET EVENT LISTENERS
     ========================================================= */
  useEffect(() => {
    if (!currentUserId) return;

    //  Connect socket only when user is authenticated
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('identify', currentUserId);

    /* ---------- Incoming call ---------- */
    socket.on('incoming-call', ({ from, roomId }) => {
      setIncomingCall(from);
      setActiveRoomId(roomId);
      setIsRinging(true);
    });

    /* ---------- Call accepted ---------- */
    socket.on('call-accepted', () => {
      setIsCalling(false);
      setIsJoined(true);
    });

    /* ---------- Call rejected / ended / errors ---------- */
    socket.on('call-rejected', () => {
      toast.info('Call was rejected');
      cleanup();
    });
    socket.on('call-ended', () => {
      toast.info('Call ended');
      cleanup();
    });
    socket.on('call-error', ({ message }) => {
      console.error('Call Error:', message);
      toast.error(message || 'Call error occurred');
      cleanup();
    });

    /* ---------- WebRTC OFFER ---------- */
    socket.on('offer', async ({ sdp }) => {
      try {
        if (!peerConnection.current) return;

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        // Use ref instead of stale closure
        socket.emit('answer', { 
          roomId: activeRoomIdRef.current, 
          sdp: answer 
        });
      } catch (err) {
        console.error('Offer handling error:', err);
        toast.error('Failed to process call offer');
      }
    });

    /* ---------- WebRTC ANSWER ---------- */
    socket.on('answer', async ({ sdp }) => {
      try {
        //  Only accept answer in 'have-local-offer' state
        if (peerConnection.current?.signalingState === 'have-local-offer') {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
        }
      } catch (err) {
        console.error('Answer handling error:', err);
        toast.error('Failed to process call answer');
      }
    });

    /* ---------- ICE CANDIDATES ---------- */
    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        if (candidate && peerConnection.current) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (err) {
        console.error('ICE candidate error:', err);
        toast.error('Network connection error');
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-ended');
      socket.off('call-error');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [currentUserId, cleanup]);

  /* =========================================================
     INITIALIZE WEBRTC
     ========================================================= */
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
          setMediaError(null);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

        /* ---------- Create PeerConnection ---------- */
        if (!peerConnection.current) {
          peerConnection.current = new RTCPeerConnection(servers);

          localStream.current.getTracks().forEach(track =>
            peerConnection.current.addTrack(track, localStream.current)
          );

          peerConnection.current.ontrack = (e) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = e.streams[0];
            }
          };

          peerConnection.current.onicecandidate = (e) => {
            if (e.candidate) {
              socket.emit('ice-candidate', {
                roomId: activeRoomIdRef.current, 
                candidate: e.candidate,
              });
            }
          };
        }

        /* ---------- Only receiver creates the OFFER ---------- */
        if (isJoined && roleRef.current === 'receiver') {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);

          socket.emit('offer', { 
            roomId: activeRoomIdRef.current,
            sdp: offer 
          });
        }
      } catch (err) {
        console.error('Media Error:', err);
        // Surface media errors to UI
        if (err.name === 'NotAllowedError') {
          setMediaError('Camera/microphone permission denied. Please allow access and try again.');
        } else if (err.name === 'NotFoundError') {
          setMediaError('No camera or microphone found on this device.');
        } else {
          setMediaError('Failed to access media devices: ' + err.message);
        }
      }
    };

    init();
  }, [isJoined, isCalling]);

  /* =========================================================
     ACTIONS (exposed to UI)
     ========================================================= */

  const startPrivateCall = (targetUserId) => {
    const roomId = `room-${currentUserId}-${targetUserId}-${Date.now()}`;

    setActiveRoomId(roomId);
    setIsCalling(true);
    roleRef.current = 'caller';

    socket.emit('join-room', roomId);
    socket.emit('call-user', { roomId, targetUserId });
  };

  const acceptCall = () => {
    setIsRinging(false);
    roleRef.current = 'receiver'; 

    socket.emit('join-room', activeRoomIdRef.current);
    socket.emit('accept-call', { roomId: activeRoomIdRef.current });

    setIsJoined(true);
  };

  const rejectCall = () => {
    socket.emit('reject-call', { roomId: activeRoomIdRef.current });
    cleanup();
  };

  const endCall = () => {
    socket.emit('end-call', { roomId: activeRoomIdRef.current });
    cleanup();
  };

  // Toggle audio (mute/unmute microphone)
  const toggleAudio = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video (turn camera on/off)
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  }, []);

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
    mediaError,
    isAudioMuted,
    isVideoMuted,
    startPrivateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    socket,
  };
};
