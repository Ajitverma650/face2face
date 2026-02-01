import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../store/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import Navbar from '../components/Navbar';
import VideoGrid from '../components/VideoGrid';
import Controls from '../components/Controls';
import UserList from '../components/UserList';
import { Monitor } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Initialize WebRTC hook with the logged-in user's ID
  const webrtc = useWebRTC(user?.id);

  const {
    localVideoRef,
    remoteVideoRef,
    isJoined,
    isCalling,
    isRinging,
    incomingCall,
    startPrivateCall,
    acceptCall,
    endCall,
    rejectCall
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
        }
      };

      fetchUsers();
      const interval = setInterval(fetchUsers, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased">
      <Navbar />

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
              states={{ isJoined, isCalling, isRinging, incomingCall }}
              actions={{ endCall, acceptCall, rejectCall }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;