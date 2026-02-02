
import { Users, Circle } from 'lucide-react';

const UserList = ({ users, onCall, disabled }) => (
  <div className="lg:col-span-3 space-y-6">
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-sm h-150 flex flex-col">
      <div className="flex items-center gap-2 mb-6 px-2 text-zinc-500">
        <Users size={18} />
        <h3 className="text-xs font-black uppercase tracking-widest">Online Contacts</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {users.length > 0 ? (
          users.map((u) => (
            <div key={u._id} className="group flex items-center justify-between p-3 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl border border-transparent hover:border-zinc-700 transition-all">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-zinc-300">
                    {u.username[0].toUpperCase()}
                  </div>
                  <Circle size={10} className="absolute bottom-0 right-0 text-emerald-500 fill-emerald-500 border-2 border-[#09090b] rounded-full" />
                </div>
                <span className="text-sm font-medium text-zinc-300">{u.username}</span>
              </div>
              <button
                onClick={() => onCall(u._id)}
                disabled={disabled}
                className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white text-[10px] font-bold rounded-lg transition-all disabled:hidden"
              >
                CALL
              </button>
            </div>
          ))
        ) : (
          <>
            <p className="text-zinc-600 text-xs text-center mt-10 italic">No other users online  </p>
            <h1 className="text-zinc-600 text-xs text-center mt-2 italic">refresh page after few second if call is not connecting</h1>
            <br></br>
            <br></br>

            <p className="text-sm font-semibold text-indigo-600">
               Accept call From Control Panel
            </p>

          </>
        )}
      </div>
    </div>
  </div>
);

export default UserList;