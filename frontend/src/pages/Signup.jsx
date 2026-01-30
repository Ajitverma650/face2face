import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';

const Signup = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Register user in backend
      await axios.post('http://localhost:5000/api/users/register', formData);
      // 2. Automatically log them in after signup
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-emerald-600/10 rounded-2xl mb-4">
            <UserPlus className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Create Account</h2>
          <p className="text-zinc-500 text-sm mt-2">Join Kagazi Connect for secure video calls</p>
        </div>

        {error && <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                type="text" required 
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                placeholder="johndoe"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                type="email" required 
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                placeholder="name@company.com"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                type="password" required 
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-4 text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                placeholder="••••••••"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] mt-4">
            Create Secure Account
          </button>
        </form>

        <p className="text-center mt-8 text-zinc-500 text-sm">
          Already have an account? <Link to="/login" className="text-emerald-500 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;