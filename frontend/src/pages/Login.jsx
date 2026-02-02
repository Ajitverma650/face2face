import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600/10 rounded-2xl mb-4">
            <LogIn className="text-indigo-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Welcome Back</h2>
          <p className="text-zinc-500 text-sm mt-2">Sign in </p>
        </div>

        {error && <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                type="email" required 
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                type="password" required 
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] mt-2">
            Authorize Access
          </button>
        </form>

        <p className="text-center mt-8 text-zinc-500 text-sm">
          Don't have an account? <Link to="/signup" className="text-indigo-500 font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;