
import React from 'react';
import { 
  Phone, 
  PhoneOff, 
  PhoneIncoming 
} from 'lucide-react';

const Controls = ({ states, actions }) => {
  const { 
    isJoined, 
    isCalling, 
    isRinging, 
    incomingCall 
  } = states;

  const { 
    callUser, 
    endCall, 
    acceptCall, 
    rejectCall 
  } = actions;

  return (
    <div className="bg-[#1e293b]/50 border border-slate-800 rounded-4xl p-8 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
          Control Center
        </h3>
      </div>

      <div className="space-y-4">
       

        {isCalling && (
          <button
            onClick={endCall}
            className="w-full py-4 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-300 border border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
          >
            <PhoneOff size={20} /> Cancel Request
          </button>
        )}

        {isRinging && incomingCall && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={acceptCall}
              className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
            >
              <PhoneIncoming size={18} /> Accept
            </button>

            <button
              onClick={rejectCall}
              className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <PhoneOff size={18} /> Decline
            </button>
          </div>
        )}

        {isJoined && (
          <button
            onClick={endCall}
            className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98]"
          >
            <PhoneOff size={20} /> Terminate Call
          </button>
        )}
      </div>
    </div>
  );
};

export default Controls;
