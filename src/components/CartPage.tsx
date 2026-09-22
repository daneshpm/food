import React from 'react';
import { useCartStore } from '../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, Truck, ChevronLeft, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocationStore } from '../store/locationStore';
import { calculateDeliveryCharge } from '../types';
import { useSystemStore } from '../store/systemStore';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { isBTMServiceable } from '../lib/location';

export default function CartPage() {
  useSEO("Your Cart", "Review your selected items and complete your order at Mintoo.");
  const { items, updateQuantity, removeItem, total } = useCartStore();
  const navigate = useNavigate();
  const { deliveryLocation } = useLocationStore();
  const settings = useSystemStore(state => state.settings);
  const distanceKm = deliveryLocation?.distance ?? 0;
  const deliveryCharge = calculateDeliveryCharge(distanceKm);
  const grandTotal = total + deliveryCharge;

  const isNonBTM = deliveryLocation ? (!deliveryLocation.isDeliverable || !isBTMServiceable(deliveryLocation.address, deliveryLocation.lat, deliveryLocation.lng)) : false;

  const adminToken = localStorage.getItem('moms_magic_admin_token');
  const userPhone = localStorage.getItem('moms_magic_user_phone');
  const isAdmin = Boolean(adminToken && adminToken.length > 5) || 
                  (userPhone && (settings.adminPhones || []).includes(userPhone));

  const isOrderingPaused = (settings.websiteStatus === 'OFF' || settings.emergencyStop) && !isAdmin;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center space-y-6 pt-20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/10 relative"
        >
          <ShoppingBag className="w-12 h-12 text-emerald-400 animate-bounce" />
          <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            Empty
          </div>
        </motion.div>

        <div className="space-y-3 max-w-sm">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight">
            OOPS BOSS FORGET TO ORDER
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-gray-400 leading-relaxed">
            Your cart is currently empty! Add some delicious biryanis, pizzas, burgers & refreshing drinks to get started.
          </p>
        </div>

        <button 
          onClick={() => navigate('/home')}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Explore Yummy Menu</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-36">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/60 pb-4">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Menu
          </button>
          <div className="text-right">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 justify-end">
              <span>Your Cart</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </h1>
            <p className="text-xs text-gray-400 font-medium">{items.length} Item{items.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cart Items List */}
          <div className="lg:col-span-7 space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#141414] border border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xl flex items-center gap-3.5 sm:gap-4 hover:border-gray-700/80 transition-all"
                >
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-gray-800 shrink-0" 
                      referrerPolicy="no-referrer" 
                    />
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          {item.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                          {item.name}
                        </h3>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id!)}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors shrink-0"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.items && item.items.length > 0 && (
                      <p className="text-xs text-gray-400 font-medium truncate">
                        {item.items.join(', ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-sm sm:text-base font-bold text-emerald-400">
                        ₹{item.price * item.quantity}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-[#222] p-1 rounded-lg border border-gray-700/60">
                        <button 
                          onClick={() => updateQuantity(item.id!, item.quantity - 1)}
                          className="w-7 h-7 rounded-md bg-[#333] text-gray-200 hover:bg-[#444] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                          className="w-7 h-7 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Bill Summary Column */}
          <div className="lg:col-span-5">
            <div className="bg-[#141414] border border-gray-800/80 rounded-2xl p-5 shadow-2xl space-y-4 sticky top-24">
              <h3 className="text-base font-bold text-white border-b border-gray-800/80 pb-3">
                Bill Summary
              </h3>

              <div className="space-y-2.5 text-xs text-gray-300 font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Item Subtotal</span>
                  <span className="font-semibold text-white">₹{total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Delivery Fee</span>
                  </div>
                  <span className="font-semibold text-white">₹{deliveryCharge}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Hotel Charges</span>
                  <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Platform Fee</span>
                  <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Handling Charges</span>
                  <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Payment Gateway Charges</span>
                  <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">FREE</span>
                </div>

                <div className="border-t border-gray-800/80 pt-3 flex justify-between items-center text-sm font-bold text-white">
                  <span>To Pay</span>
                  <span className="text-lg font-bold text-emerald-400">₹{grandTotal}</span>
                </div>
              </div>

              {isNonBTM && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
                  <Truck className="w-5 h-5 text-amber-400 mx-auto" />
                  <h4 className="text-xs font-extrabold text-amber-400">Just wait... We are coming to your area soon!</h4>
                  <p className="text-[10px] text-gray-300 font-medium">Currently, Mintoo is only delivering in <b>BTM Layout</b>.</p>
                </div>
              )}

              <button 
                disabled={isOrderingPaused || isNonBTM}
                onClick={() => {
                  if (isOrderingPaused) {
                    toast.error("Ordering is temporarily closed! Please check operating hours.");
                    return;
                  }
                  if (isNonBTM) {
                    toast.error("Just wait... We are coming to your area soon! Currently serving BTM Layout only.");
                    return;
                  }
                  navigate('/checkout');
                }}
                className={`w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isOrderingPaused || isNonBTM
                    ? 'bg-gray-800 border border-amber-500/40 text-amber-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                }`}
              >
                <span>{isOrderingPaused ? 'Ordering Paused' : isNonBTM ? 'Just wait... We are coming to your area soon!' : 'Proceed to Checkout'}</span>
                {!isOrderingPaused && !isNonBTM && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-gray-500 text-[10px] font-semibold pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Safe & Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
