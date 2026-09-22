import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, LogIn, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const { loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } = useAuthStore();

  useEffect(() => {
    if (!isOpen) {
      setIsForgotPassword(false);
      setIsSignUp(false);
    }
  }, [isOpen]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setSubmitLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password.trim(), name.trim());
        toast.success(`Welcome to Mintoo, ${name.trim()}!`);
      } else {
        await loginWithEmail(email.trim(), password.trim());
        toast.success('Welcome back!');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    setSubmitLoading(true);
    try {
      await resetPassword(email.trim());
      toast.success('Password reset email sent! Please check your Gmail/inbox and Spam folder.');
      setIsForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google!');
      onClose();
    } catch (err: any) {
      toast.error('Google Sign-In failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-200 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-gray-50 border border-gray-200 rounded-[35px] w-full max-w-md shadow-sm relative overflow-hidden"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 left-0 right-0 h-[3px] gradient-brand" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-50 blur-[80px] rounded-full pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 hover:border-gray-200 transition-all text-gray-500 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 space-y-8">
            {/* Header info */}
            <div className="space-y-2 mt-4">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900">
                {isForgotPassword ? "Reset" : (isSignUp ? "Create" : "Welcome")}{' '}
                <span className="text-orange-500">Account</span>
              </h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                {isForgotPassword 
                  ? "Enter your email to receive a reset link" 
                  : (isSignUp ? "Sign up to claim welcome bonuses" : "Access your account")}
              </p>
            </div>

            {/* Toggle tabs */}
            {!isForgotPassword && (
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                    !isSignUp ? 'bg-white text-black shadow-md font-bold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                    isSignUp ? 'bg-white text-black shadow-md font-bold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={isForgotPassword ? handlePasswordReset : handleEmailAuth} className="space-y-4">
              {isSignUp && !isForgotPassword && (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="YOUR FULL NAME"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-500 uppercase tracking-[1px]"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-500 tracking-[1px]"
                />
              </div>

              {!isForgotPassword && (
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-500 tracking-[1px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
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
                    className="text-xs text-brand hover:underline font-bold focus:outline-none transition-all cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full gradient-brand hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100"
              >
                {submitLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isForgotPassword ? "Send Reset Link" : (isSignUp ? "Create Account" : "Access Account")}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full bg-gray-50 border border-gray-200 hover:border-gray-200 active:scale-95 text-gray-900 font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  Back to Login
                </button>
              )}
            </form>

            {!isForgotPassword && (
              <>
                {/* Separator */}
                <div className="flex items-center justify-center gap-4 text-gray-500">
                  <div className="h-px bg-gray-100 flex-1" />
                  <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500 whitespace-nowrap">OR CONTINUE WITH</span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>

                {/* Google Sign-in */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full bg-gray-50 border border-gray-200 hover:border-gray-200 active:scale-95 text-gray-900 font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              Google Account
            </button>
          </>
        )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
