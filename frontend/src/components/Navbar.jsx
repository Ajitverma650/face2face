
import React from 'react';
import { Video, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

const Navbar = ({ onLogout }) => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout(onLogout); // Bug #17 fix: disconnect socket, then clear auth state
  };

  return (
    <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Video className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-100">
            Face2Face <span className="text-indigo-400">Connect</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-slate-800/40 px-4 py-1.5 rounded-full border border-slate-700/50">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Secure Line</span>
          </div>
          {user && (
            <span className="text-sm font-medium text-slate-300">
              Hi, {user.username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-800/40 px-4 py-1.5 rounded-full border border-slate-700/50 hover:bg-slate-700/40 transition-colors"
          >
            <LogOut size={16} className="text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;