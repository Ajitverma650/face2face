import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import Navbar from '../components/Navbar';
import VideoGrid from '../components/VideoGrid';
import Controls from '../components/Controls';
import UserList from '../components/UserList';
import { Monitor, Clock } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  
  // Initialize WebRTC hook with the logged-in user's ID
  const webrtc = useWebRTC(user?.id);

  const {
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
    endCall,
    rejectCall,
    toggleAudio,
    toggleVideo,
    socket
  } = webrtc;

  // Poll for online users
  useEffect(() => {
    if (user) {
      const fetchUsers = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/online`);
          setOnlineUsers(res.data.filter(u => u._id !== user.id));
        } catch (err) {
          console.error("Error fetching online users:", err);
          toast.error(err.response?.data?.message || "Failed to fetch online users");
        }
      };

      fetchUsers();
      const interval = setInterval(fetchUsers, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Show media error as toast
  useEffect(() => {
    if (mediaError) {
      toast.error(mediaError);
    }
  }, [mediaError]);

  // Call timer
  useEffect(() => {
    if (isJoined) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isJoined]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <Navbar onLogout={() => socket?.disconnect()} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* User Directory Sidebar */}
          <UserList 
            users={onlineUsers} 
            onCall={startPrivateCall} 
            disabled={isJoined || isCalling} 
          />

          {/* Remote Video Display */}
          <div className="lg:col-span-6 space-y-8">
            <VideoGrid 
              remoteVideoRef={remoteVideoRef} 
              isJoined={isJoined} 
            />

            {(isCalling || isRinging || isJoined) && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-center gap-4 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${isJoined && !isCalling ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                  <span className={`h-2.5 w-2.5 rounded-full ${isJoined && !isCalling ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                </span>
                <span className={`text-xs font-bold uppercase tracking-[0.15em] ${isJoined && !isCalling ? 'text-emerald-500' : 'text-zinc-400'}`}>
                  {isCalling && "Requesting call..."}
                  {isRinging && "Incoming secure connection..."}
                  {isJoined && !isCalling && !isRinging && "Secure Session Active"}
                </span>
                {isJoined && !isCalling && !isRinging && (
                  <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-zinc-800/50 rounded-full">
                    <Clock size={12} className="text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatTime(callDuration)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Local Preview & Controls */}
          <div className="lg:col-span-3 space-y-8">
            <div className="relative aspect-square bg-zinc-900 rounded-4xl overflow-hidden border border-zinc-800 shadow-2xl ring-1 ring-white/5">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover brightness-[1.05] contrast-[1.05]"
              />
              <div className="absolute top-6 right-6 bg-zinc-950/60 backdrop-blur-md p-2.5 rounded-xl border border-zinc-800">
                <Monitor size={14} className="text-zinc-400" />
              </div>
              <div className="absolute bottom-6 left-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 bg-zinc-950/40 px-3 py-1 rounded-full text-center">
                you
              </div>
            </div>

            <Controls
              states={{ isJoined, isCalling, isRinging, incomingCall, isAudioMuted, isVideoMuted }}
              actions={{ endCall, acceptCall, rejectCall, toggleAudio, toggleVideo }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;