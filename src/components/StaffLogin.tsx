import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, ShieldCheck, Settings } from 'lucide-react';
import { signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

export default function StaffLogin() {
  useSEO('Admin Login', 'Login portal for admin.');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only a real Firebase Auth session gets a returning admin skipped
    // straight to /admin - AdminPage.tsx verifies the staff role itself
    // regardless, this is just a UX shortcut, not the security boundary.
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/admin');
    });
    return unsub;
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Invalid admin credentials.');
        return;
      }

      if (!data.customToken) {
        toast.error('Admin login is not fully configured on the server yet (Firebase Admin credentials missing) - contact the system administrator.');
        return;
      }

      // Establishes a real, verifiable Firebase Auth session - AdminPage.tsx
      // checks staff/{uid}.role === 'admin' against this, rather than the
      // previous approach of trusting an unverified localStorage flag that
      // anyone could set themselves from the browser console.
      await signInWithCustomToken(auth, data.customToken);
      if (data.token) {
        localStorage.setItem('moms_magic_admin_token', data.token);
      }
      toast.success(`Welcome back, Admin! Redirecting...`);
      setTimeout(() => navigate('/admin'), 800);
    } catch (err: any) {
      toast.error('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-300">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900">
            ADMIN <span className="text-gray-500">PORTAL</span>
          </h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
            Mintoo Restaurant System
          </p>
        </div>

        <div className="bg-white rounded-[35px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-gray-800 to-black transition-all duration-300" />

          <div className="p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="admin@mintoo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 outline-none focus:border-gray-500 transition-all font-bold text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 pr-12 outline-none focus:border-gray-500 transition-all font-bold text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-gray-800 to-black text-white font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-95"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Login to Panel
                    <LogIn className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 text-gray-400 text-[9px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
              Secured Login
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 font-semibold mt-6">
          Authorized staff only. Contact system administrator.
        </p>
      </motion.div>
    </div>
  );
}
