import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

interface OfflineGateProps {
  children: React.ReactNode;
}

export default function OfflineGate({ children }: OfflineGateProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualRecheck = async () => {
    setIsChecking(true);
    try {
      // Ping lightweight endpoint to verify internet connectivity
      const response = await fetch(`./index.html?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
      if (response.ok) {
        setIsOffline(false);
        toast.success('Back online! Mintoo is ready');
      } else {
        setIsOffline(true);
        toast.error('Still offline. Please enable Wi-Fi or Mobile Data.');
      }
    } catch (err) {
      setIsOffline(true);
      toast.error('Connection failed. Please turn on your Internet!');
    } finally {
      setIsChecking(false);
    }
  };

  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[100000] bg-[#090a0f] text-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        {/* Ambient Pulsing Background Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative z-10 max-w-md w-full space-y-6 flex flex-col items-center"
        >
          {/* Animated Mintoo Mascot & Wifi Off Badge */}
          <div className="relative">
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 p-0.5 shadow-2xl shadow-rose-500/30 flex items-center justify-center"
            >
              <div className="w-full h-full bg-[#12131a] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                <WifiOff className="w-12 h-12 text-rose-500 animate-pulse" />
                <div className="absolute inset-0 bg-rose-500/10 animate-ping rounded-[22px]" />
              </div>
            </motion.div>

            {/* Mintoo Brand Pill */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg border border-white/20">
              Mintoo Delivery
            </div>
          </div>

          {/* Main Error Heading */}
          <div className="space-y-3 pt-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase italic leading-tight drop-shadow-md">
              OOPS BOSS FORGET TO ON INTERNET
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-400 leading-relaxed max-w-sm mx-auto">
              Mintoo needs an active internet connection to track live orders, show nearby kitchens, and deliver hot food.
            </p>
          </div>

          {/* Feature highlights badge */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-left space-y-2 text-xs font-bold text-gray-300">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Internet Required for:</span>
            </div>
            <ul className="list-disc list-inside text-gray-400 font-medium space-y-1 pl-1 text-[11px]">
              <li>Live 15-minute GPS food delivery tracking</li>
              <li>Hot menu items & instant price discounts</li>
              <li>Secure Razorpay & UPI payment gateways</li>
            </ul>
          </div>

          {/* Reconnect Action Button */}
          <button
            onClick={handleManualRecheck}
            disabled={isChecking}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking Internet Connection...' : 'Try Reconnecting'}
          </button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
