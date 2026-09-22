import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

const FloatingFood = ({ src, delay, className, size = "w-24 h-24" }: { src: string, delay: number, className: string, size?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 30 }}
    animate={{ 
      opacity: [0, 0.85, 0.85], 
      scale: [0.8, 1, 1], 
      y: [30, 0, -15, 0],
      rotate: [0, 8, -4, 0]
    }}
    transition={{
      opacity: { delay, duration: 2, ease: "easeOut" },
      scale: { delay, duration: 2, ease: "easeOut" },
      y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: delay + 1 },
      rotate: { duration: 12, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }
    }}
    style={{ willChange: 'transform, opacity' }}
    className={`absolute rounded-full overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)] border border-white/5 ${className} ${size}`}
  >
    <img src={src} alt="Premium Gourmet Food" className="w-full h-full object-cover" />
    {/* Soft inner shadow for spherical feel */}
    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none" />
  </motion.div>
);

const GoldenParticles = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1, duration: 2 }}
    className="absolute inset-0 overflow-hidden pointer-events-none z-10"
  >
    {[...Array(15)].map((_, i) => {
      const size = Math.random() * 3 + 1;
      const color = Math.random() > 0.5 ? '#D4AF37' : '#FFD86B';
      return (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size + 'px',
            height: size + 'px',
            backgroundColor: color,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            boxShadow: `0 0 ${size * 2}px ${color}`,
            willChange: 'transform, opacity'
          }}
          initial={{ opacity: 0, y: 0, x: 0 }}
          animate={{
            y: [0, Math.random() * -200 - 100],
            x: [0, (Math.random() - 0.5) * 50],
            opacity: [0, Math.random() * 0.6 + 0.2, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: 1 + Math.random() * 5
          }}
        />
      );
    })}
  </motion.div>
);

export default function AuthPage() {
  useSEO("MINTOO - Luxury Dining", "Freshly crafted. Delivered beautifully.");
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const { loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } = useAuthStore();

  useEffect(() => {
    if (!showLogin) {
      setIsForgotPassword(false);
      setIsSignUp(false);
    }
  }, [showLogin]);

  useEffect(() => {
    const checkAuthAndApp = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { App: CapApp } = await import('@capacitor/app');
          const info = await CapApp.getInfo();
          if (info.id === 'com.minto.admin' || info.id === 'com.minto.hotel' || info.id === 'com.minto.rider') {
            navigate('/staff', { replace: true });
            return;
          }
        } catch (e) {
          console.warn('Failed to get Capacitor app info:', e);
        }
      }

      const isGuest = localStorage.getItem('moms_magic_guest');
      const userPhone = localStorage.getItem('moms_magic_user_phone');
      if (isGuest || userPhone) {
        navigate('/home', { replace: true });
      }
    };
    checkAuthAndApp();
  }, [navigate]);

  const handleEmailAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all credentials.');
      return;
    }
    if (isSignUp && !name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password.trim(), name.trim());
        toast.success(`Welcome to Mintoo, ${name.trim()}! 🎁`);
      } else {
        await loginWithEmail(email.trim(), password.trim());
        toast.success('Login successful! 🍳');
      }
      localStorage.setItem('moms_magic_user_phone', email.trim());
      localStorage.removeItem('moms_magic_guest');
      navigate('/home');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      toast.success('Password reset email sent! Please check your Gmail/inbox and Spam folder. ✉️');
      setIsForgotPassword(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    localStorage.setItem('moms_magic_guest', 'true');
    localStorage.removeItem('moms_magic_user_phone');
    navigate('/home');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      const userObj = useAuthStore.getState().user;
      if (userObj) {
        localStorage.setItem('moms_magic_user_phone', userObj.email || userObj.uid);
      } else {
        localStorage.setItem('moms_magic_user_phone', 'google_user');
      }
      localStorage.removeItem('moms_magic_guest');
      toast.success(`Welcome back! 🍽️`);
      navigate('/home');
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!showLogin) {
      const timer = setTimeout(() => {
        setShowLogin(true);
      }, 2500); // Auto transition after 2.5 seconds
      return () => clearTimeout(timer);
    }
  }, [showLogin]);

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center relative overflow-hidden px-6">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500&family=Poppins:wght@600&family=Pinyon+Script&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@700&display=swap');
        
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}} />

      {/* Spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] max-w-[800px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.16),transparent_70%)] pointer-events-none" />

      {/* Cinematic vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#07070d_90%)] pointer-events-none z-20" />

      <AnimatePresence mode="wait">
        {!showLogin ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -40, filter: "blur(12px)", transition: { duration: 0.8, ease: "easeInOut" } }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center justify-center z-10 w-full"
          >
            <motion.h1 
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "0.05em", opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="text-white text-6xl md:text-8xl text-center select-none"
              style={{ fontFamily: "'Pinyon Script', cursive" }}
            >
              <span className="text-gradient-brand drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                Mintoo
              </span>
            </motion.h1>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md glass-card rounded-[40px] p-8 relative z-10"
          >
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-[0_10px_30px_rgba(99,102,241,0.25)] border border-brand/30 bg-gradient-to-br from-brand/20 to-transparent mb-8">
              <span className="text-accent text-3xl font-black italic" style={{ fontFamily: "'Clash Display', sans-serif" }}>M</span>
            </div>

            <h1 className="text-3xl font-bold text-white text-center mb-2 tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {isForgotPassword ? 'Reset Password' : 'Mintoo'}
            </h1>
            <p className="text-center text-[#A5A5A5] text-sm font-medium mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
              {isForgotPassword 
                ? 'Enter your email to receive a password reset link' 
                : (isSignUp ? 'Create your account' : 'Welcome back to Mintoo')}
            </p>
            <div className="space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              <form onSubmit={isForgotPassword ? handlePasswordReset : handleEmailAuth} className="space-y-4">
              {!isForgotPassword && (
                <div className="flex bg-[#07070d] p-1 rounded-xl border border-white/10 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                      !isSignUp ? 'gradient-brand text-white' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                      isSignUp ? 'gradient-brand text-white' : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {isSignUp && !isForgotPassword && (
                <div className="relative group">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-5 py-4 bg-[#07070d] border border-white/10 rounded-2xl focus:outline-none focus:bg-[#0d0d1a] focus:border-brand transition-all font-bold text-white placeholder:text-gray-600 text-sm shadow-inner"
                  />
                </div>
              )}

              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full px-5 py-4 bg-[#07070d] border border-white/10 rounded-2xl focus:outline-none focus:bg-[#0d0d1a] focus:border-brand transition-all font-bold text-white placeholder:text-gray-600 text-sm shadow-inner"
                  required
                />
              </div>

              {!isForgotPassword && (
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-5 py-4 pr-12 bg-[#07070d] border border-white/10 rounded-2xl focus:outline-none focus:bg-[#0d0d1a] focus:border-brand transition-all font-bold text-white placeholder:text-gray-600 text-sm shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {!isSignUp && !isForgotPassword && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-accent hover:underline font-medium focus:outline-none transition-all cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading || !email.trim() || (!isForgotPassword && !password.trim())}
                className="w-full h-14 gradient-brand text-white rounded-2xl font-bold text-[13px] uppercase tracking-[2px] hover:shadow-[0_10px_30px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center cursor-pointer"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Login')
                )}
              </button>

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full h-14 bg-transparent border border-white/10 text-white rounded-2xl font-bold text-[12px] uppercase tracking-[2px] hover:border-brand/50 hover:bg-white/5 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Back to Login
                </button>
              )}
            </form>
              
              {!isForgotPassword && (
                <>
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center"><span className="px-4 text-[10px] text-[#A5A5A5] font-bold uppercase tracking-widest bg-[#12121f]">Or Continue With</span></div>
                  </div>
                  
                  {/* Google Sign-In Button */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full h-14 bg-white hover:bg-gray-50 active:scale-95 text-gray-800 rounded-2xl font-bold text-[13px] uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 cursor-pointer"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <button
                    onClick={handleGuest}
                    className="w-full h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-[12px] uppercase tracking-[2px] hover:border-brand/50 hover:bg-white/10 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    <User className="w-4 h-4 text-accent" /> Guest
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

