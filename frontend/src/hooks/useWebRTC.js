import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export const useWebRTC = (currentUserId) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const [isJoined, setIsJoined] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  /* -------------------- SOCKET LISTENERS -------------------- */
  useEffect(() => {
    if (!currentUserId) return;

    socket.emit('identify', currentUserId);

    socket.on('incoming-call', ({ from, roomId }) => {
      setIncomingCall(from);
      setActiveRoomId(roomId);
      setIsRinging(true);
    });

    socket.on('call-accepted', () => {
      setIsCalling(false);
      setIsJoined(true);
    });

    socket.on('call-rejected', () => cleanup());
    socket.on('call-ended', () => cleanup());

    socket.on('offer', async ({ sdp }) => {
      if (!peerConnection.current) return;

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit('answer', { roomId: activeRoomId, sdp: answer });
    });

    socket.on('answer', async ({ sdp }) => {
      if (peerConnection.current?.signalingState !== 'stable') {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate && peerConnection.current) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
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
  }, [currentUserId, activeRoomId]);

  /* -------------------- INIT WEBRTC -------------------- */
  useEffect(() => {
    if (!isJoined && !isCalling) return;

    const init = async () => {
      try {
        if (!localStream.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          localStream.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

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
                roomId: activeRoomId,
                candidate: e.candidate,
              });
            }
          };
        }

        if (isJoined && !isCalling) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit('offer', { roomId: activeRoomId, sdp: offer });
        }
      } catch (err) {
        console.error('Media Error:', err);
      }
    };

    init();
  }, [isJoined, isCalling, activeRoomId]);

  /* -------------------- ACTIONS -------------------- */
  const startPrivateCall = (targetUserId) => {
    const roomId = `room-${currentUserId}-${targetUserId}-${Date.now()}`;
    setActiveRoomId(roomId);
    setIsCalling(true);
    socket.emit('join-room', roomId);
    socket.emit('call-user', { roomId, targetUserId });
  };

  const acceptCall = () => {
    setIsRinging(false);
    socket.emit('join-room', activeRoomId);
    socket.emit('accept-call', { roomId: activeRoomId });
    setIsJoined(true);
  };

  const rejectCall = () => {
    socket.emit('reject-call', { roomId: activeRoomId });
    cleanup();
  };

  const endCall = () => {
    socket.emit('end-call', { roomId: activeRoomId });
    cleanup();
  };

  const cleanup = () => {
    setIsJoined(false);
    setIsCalling(false);
    setIsRinging(false);
    setIncomingCall(null);
    setActiveRoomId(null);

    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

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
