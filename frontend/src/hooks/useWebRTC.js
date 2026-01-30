import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export const useWebRTC = (roomId) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const [isJoined, setIsJoined] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  /* -------------------- SOCKET LISTENERS -------------------- */
  useEffect(() => {
    socket.emit('join-room', roomId);

    socket.on('incoming-call', ({ from }) => {
      setIncomingCall(from);
      setIsRinging(true);
    });

    socket.on('call-accepted', () => {
      setIsCalling(false);
      setIsJoined(true);
    });

    socket.on('call-rejected', () => {
      cleanup();
    });

    socket.on('call-ended', () => {
      cleanup();
    });

    socket.on('offer', async ({ sdp }) => {
      if (!peerConnection.current) return;
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('answer', { roomId, sdp: answer });
      } catch (e) { console.error(e); }
    });

    socket.on('answer', async ({ sdp }) => {
      if (peerConnection.current && peerConnection.current.signalingState !== "stable") {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate && peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) { console.error(e); }
      }
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-ended');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [roomId]);

  /* -------------------- INIT WEBRTC -------------------- */
  useEffect(() => {
    if (!isJoined && !isCalling) return;

    const init = async () => {
      try {
        // Only get media if we don't already have it
        if (!localStream.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStream.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }

        // Always create a fresh PeerConnection for a new call
        if (!peerConnection.current) {
          peerConnection.current = new RTCPeerConnection(servers);

          localStream.current.getTracks().forEach(track => {
            peerConnection.current.addTrack(track, localStream.current);
          });

          peerConnection.current.ontrack = (e) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
          };

          peerConnection.current.onicecandidate = (e) => {
            if (e.candidate) {
              socket.emit('ice-candidate', { roomId, candidate: e.candidate });
            }
          };
        }

        // signaling: the one who accepts the call sends the offer
        if (isJoined && !isCalling) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit('offer', { roomId, sdp: offer });
        }
      } catch (err) {
        console.error("Media Error:", err);
      }
    };

    init();
  }, [isJoined, isCalling, roomId]);

  /* -------------------- ACTIONS -------------------- */
  const callUser = () => {
    setIsCalling(true);
    socket.emit('call-user', { roomId });
  };

  const acceptCall = () => {
    setIsRinging(false);
    setIncomingCall(null);
    socket.emit('accept-call', { roomId });
    setIsJoined(true);
  };

  const rejectCall = () => {
    socket.emit('reject-call', { roomId });
    cleanup();
  };

  const endCall = () => {
    socket.emit('end-call', { roomId });
    cleanup();
  };

  const cleanup = () => {
    setIsJoined(false);
    setIsCalling(false);
    setIsRinging(false);
    setIncomingCall(null);

    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  return { localVideoRef, remoteVideoRef, callUser, acceptCall, rejectCall, endCall, isJoined, isCalling, isRinging, incomingCall };
};