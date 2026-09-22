import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, MapPin, Clock, IndianRupee, Utensils, AlertCircle } from 'lucide-react';
import { playSiren, stopSiren, triggerVibration, triggerBrowserNotification } from '../utils/notifications';

interface IncomingOrderPopupProps {
  order: any;
  mode: 'hotel' | 'rider';
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  autoRejectTimeSeconds?: number;
}

export default function IncomingOrderPopup({ 
  order, 
  mode, 
  onAccept, 
  onReject,
  autoRejectTimeSeconds = 20 
}: IncomingOrderPopupProps) {
  const [timeLeft, setTimeLeft] = useState(autoRejectTimeSeconds);

  useEffect(() => {
    // Start Audio and Vibration
    playSiren();
    triggerVibration();
    
    let title = mode === 'hotel' ? `New Order: ₹${order.totalAmount}` : `Delivery Request: ₹${order.deliveryFee || 40}`;
    let body = mode === 'hotel' 
      ? `From ${order.customerName || 'Customer'} - ${order.items?.length || 0} items` 
      : `Pickup from Kitchen - Drop at ${order.address?.street || 'Customer Location'}`;
      
    triggerBrowserNotification(title, body);

    return () => {
      stopSiren();
    };
  }, [order, mode]);

  useEffect(() => {
    if (mode !== 'rider') return; // Only rider has auto-reject

    if (timeLeft <= 0) {
      handleReject();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, mode]);

  const handleAccept = () => {
    stopSiren();
    onAccept(order.id);
  };

  const handleReject = () => {
    stopSiren();
    onReject(order.id);
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white/95 backdrop-blur-xl border border-white/20 w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Glow */}
        <div className="bg-gradient-to-r from-[#F97316] to-red-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
          <h2 className="text-2xl font-black uppercase tracking-widest relative z-10 flex items-center justify-center gap-2">
 {mode === 'hotel' ? 'New Order' : 'Delivery Request'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'rider' ? (
            <>
              {/* Rapido Style Rider Info */}
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Est. Earnings</span>
                  <span className="text-3xl font-black text-green-600">₹{order.deliveryFee || 40}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Distance</span>
                  <span className="text-xl font-bold text-gray-900">~2.5 km</span>
                </div>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    <Utensils className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pickup</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">Mintoo Kitchen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Drop</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">{order.address?.street || 'Customer Location'}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">{order.customerName}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Hotel Info */}
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs text-orange-800 font-black uppercase tracking-widest">Order #{order.id?.slice(-5)}</p>
                  <p className="text-lg font-black text-orange-900">₹{order.totalAmount}</p>
                </div>
                <div className="space-y-1">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm font-bold text-orange-900">
                      <span>{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {order.specialInstructions && (
                <div className="flex gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">{order.specialInstructions}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">{order.customerName}</p>
                    <p className="text-[10px] font-semibold text-gray-500">{order.address?.street}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleReject}
              className="h-14 rounded-[16px] bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="h-14 rounded-[16px] bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
            >
              <CheckCircle2 className="w-5 h-5" />
              Accept {mode === 'rider' && `(${timeLeft}s)`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
