import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, Sparkles, Clock, Hourglass, ShieldAlert } from 'lucide-react';
import { useSystemStore } from '../store/systemStore';

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const settings = useSystemStore(state => state.settings);

  // Target reopening date: May 29, 2026 00:00:00 Local Time
  const targetDate = new Date('2026-05-29T00:00:00');
  
  const [isTimeMaintenanceActive, setIsTimeMaintenanceActive] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = +targetDate - +now;

      if (difference <= 0) {
        setIsTimeMaintenanceActive(false);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
      setIsTimeMaintenanceActive(true);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const adminToken = localStorage.getItem('moms_magic_admin_token');
  const userPhone = localStorage.getItem('moms_magic_user_phone');
  const isAdmin = Boolean(adminToken && adminToken.length > 5) || (settings.adminPhones || []).includes(userPhone || '');

  const isBypassed = location.pathname.startsWith('/admin') || isAdmin;
  const isMaintenanceActive = false; // Removed temporary closed restriction

  // Render original application routes if bypassed or not in maintenance
  if (isBypassed || !isMaintenanceActive) {
    return <>{children}</>;
  }

  // Format numbers to have a leading zero if they are single digits
  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#FF4B2B]/10 rounded-full blur-[200px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#F4B400]/10 rounded-full blur-[200px] animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl text-center space-y-8 relative z-10"
      >
        {/* Animated Upgrade Badge & Icon */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-[48px] bg-gradient-to-tr from-[#FF4B2B] to-[#F4B400] opacity-20 blur-md"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 180 }}
            className="w-24 h-24 rounded-[36px] bg-gradient-to-br from-[#FF4B2B] to-[#F4B400] flex items-center justify-center border border-gray-200 shadow-2xl relative rotate-6"
          >
            {settings.emergencyStop ? (
              <ShieldAlert className="w-10 h-10 text-gray-900 animate-bounce" />
            ) : (
              <Wrench className="w-10 h-10 text-gray-900 animate-bounce" />
            )}
            <Sparkles className="w-5 h-5 text-gray-900 absolute top-4 right-4 animate-ping" />
          </motion.div>
        </div>

        {/* Messaging */}
        <div className="space-y-4 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-black uppercase tracking-wider ${settings.emergencyStop ? 'text-red-500' : 'text-[#F4B400]'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            {settings.emergencyStop ? 'Emergency Lockdown' : 'Temporarily Closed'}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none"
          >
            Mintoo <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] to-[#F4B400]">
              Closed For Today
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 text-sm md:text-base font-medium max-w-md mx-auto leading-relaxed"
          >
            Sorry, we are off today. Come tomorrow!
            <br />
            <span className="text-gray-500 text-xs block mt-4 font-normal italic">
              Thank you so much for your kind patience and support! 
            </span>
          </motion.p>
        </div>

        {/* Live Countdown Timer Grid Removed for now */}

        {/* Branded Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-2.5 pt-4 text-gray-500"
        >
          <img src="/logo.png" alt="Logo" className="w-7 h-7 rounded-full border border-gray-200 opacity-70" />
          <span className="text-base font-black italic tracking-tighter">
            Moms <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] to-[#F4B400]">Magic</span>
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
