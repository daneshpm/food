import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, ShieldCheck, Bike } from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatAuthError } from '../utils/firebaseErrors';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

export default function RiderLogin() {
  useSEO('Rider Login', 'Login portal for delivery partners.');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const riderSnap = await getDoc(doc(db, 'riders', user.uid));
          if (riderSnap.exists()) {
            navigate('/delivery');
          } else {
            // Might be another type of user logged in
            const staffSnap = await getDoc(doc(db, 'staff', user.uid));
            if (staffSnap.exists() && staffSnap.data().role === 'rider') {
               navigate('/delivery');
            }
          }
        } catch (_) {}
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      
      let isRider = false;
      const riderSnap = await getDoc(doc(db, 'riders', cred.user.uid));
      if (riderSnap.exists()) {
        isRider = true;
      } else {
        const staffSnap = await getDoc(doc(db, 'staff', cred.user.uid));
        if (staffSnap.exists() && staffSnap.data().role === 'rider') {
          isRider = true;
        }
      }

      if (isRider) {
        toast.success(`Welcome back! Redirecting to Rider panel...`);
        setTimeout(() => navigate('/delivery'), 800);
      } else {
        await signOut(auth);
        toast.error('Account not found in rider records. Contact admin.');
      }
    } catch (err: any) {
      toast.error(formatAuthError(err));
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-300">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900">
            RIDER <span className="text-blue-500">PORTAL</span>
          </h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
            Mintoo Restaurant System
          </p>
        </div>

        <div className="bg-white rounded-[35px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" />

          <div className="p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="rider@mintoo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 outline-none focus:border-blue-300 transition-all font-bold text-sm text-gray-900 placeholder:text-gray-400"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 pr-12 outline-none focus:border-blue-300 transition-all font-bold text-sm text-gray-900 placeholder:text-gray-400"
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
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-95"
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
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              Secured with Firebase Auth
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 font-semibold mt-6">
          Authorized staff only. Contact admin for credentials.
        </p>
      </motion.div>
    </div>
  );
}
