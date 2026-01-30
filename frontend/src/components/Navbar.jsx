
import { Video, ShieldCheck } from 'lucide-react';

const Navbar = () => (
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
      <div className="flex items-center gap-4 bg-slate-800/40 px-4 py-1.5 rounded-full border border-slate-700/50">
        <ShieldCheck size={16} className="text-emerald-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Secure Line</span>
      </div>
    </div>
  </nav>
);

export default Navbar;