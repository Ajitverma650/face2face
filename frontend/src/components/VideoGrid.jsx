
import { User } from 'lucide-react';

const VideoGrid = ({ remoteVideoRef, isJoined }) => (
  <div className="lg:col-span-6">
    <div className="relative aspect-video bg-[#1e293b] rounded-4xl overflow-hidden border border-slate-800 shadow-2xl ring-1 ring-white/5">
      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
      
      {!isJoined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a]/90">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700">
            <User size={48} className="text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium tracking-wide">Ready for encrypted connection</p>
        </div>
      )}
      
      <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Remote Peer</span>
      </div>
    </div>
  </div>
);

export default VideoGrid;