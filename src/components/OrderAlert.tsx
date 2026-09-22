import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ShoppingBag, Clock, MapPin, CheckCircle2 } from 'lucide-react';

interface OrderAlertProps {
  isVisible: boolean;
  orderData?: {
    name: string;
    items: string[];
    total: number;
    address: string;
  };
  onDismiss: () => void;
  onAccept?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// ORDER ALERT - FULL SCREEN INCOMING ORDER POPUP WITH SOUND
// ═══════════════════════════════════════════════════════════════
export default function OrderAlert({ isVisible, orderData, onDismiss, onAccept }: OrderAlertProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    if (isVisible) {
      // Create and play alert sound using Web Audio API
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        // Ring pattern: ascending tone sequence repeated
        const now = audioCtx.currentTime;
        for (let repeat = 0; repeat < 3; repeat++) {
          const offset = repeat * 1.2;
          playTone(523, now + offset, 0.15);        // C5
          playTone(659, now + offset + 0.15, 0.15); // E5
          playTone(784, now + offset + 0.3, 0.15);  // G5
          playTone(1047, now + offset + 0.45, 0.3); // C6 (longer)
        }

        // Cleanup
        setTimeout(() => audioCtx.close(), 5000);
      } catch (e) {
        console.warn('Audio alert failed:', e);
      }

      // Pulse animation
      const pulseInterval = setInterval(() => {
        setPulsing((p) => !p);
      }, 800);

      return () => clearInterval(pulseInterval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-200 backdrop-blur-xl" />

        {/* Pulsing Background Ring */}
        <motion.div
          animate={{
            scale: pulsing ? [1, 1.3, 1] : [1, 1.2, 1],
            opacity: pulsing ? [0.3, 0, 0.3] : [0.2, 0, 0.2],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute w-80 h-80 rounded-full border-4 border-brand"
        />
        <motion.div
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.15, 0, 0.15],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          className="absolute w-96 h-96 rounded-full border-2 border-brand/50"
        />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative z-10 w-[90%] max-w-md bg-white rounded-[32px] border border-gray-200 shadow-2xl shadow-brand/20 overflow-hidden"
        >
          {/* Glow top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-brand/30 blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="relative px-8 pt-10 pb-6 text-center">
            <motion.div
              animate={{ rotate: [0, -15, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-brand/30"
            >
              <Bell className="w-10 h-10 text-brand" />
            </motion.div>
            
            <h2 className="text-3xl font-black italic tracking-tight text-gray-900">
              New Order! 
            </h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
              Incoming delivery request
            </p>
          </div>

          {/* Order Details */}
          {orderData && (
            <div className="px-8 pb-6 space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-200">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-brand shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer</p>
                    <p className="text-gray-900 font-bold">{orderData.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Delivery to</p>
                    <p className="text-gray-500 font-medium text-sm">{orderData.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-brand shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Items</p>
                    <p className="text-gray-500 font-medium text-sm">
                      {orderData.items.join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-brand/5 rounded-2xl border border-brand/20">
                <span className="text-gray-500 font-black text-xs uppercase tracking-widest">Total</span>
                <span className="text-brand font-black text-2xl italic">₹{orderData.total}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-8 pb-8 flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
            <button
              onClick={onAccept || onDismiss}
              className="flex-[2] py-4 rounded-2xl bg-brand text-gray-900 font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/30 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept Order
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
