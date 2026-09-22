import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Zap, ArrowRight, Star, ShoppingCart, Gift, Sparkles } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import { useMenuStore } from '../store/menuStore';

export default function SpecialOfferBanner() {
  const { addItem } = useCartStore();
  const [timeLeft, setTimeLeft] = useState({ hours: '00', minutes: '00', seconds: '00' });
  const [isVisible, setIsVisible] = useState(true);

  // Today's Special Item
  const { menuItems } = useMenuStore();
  const specialItem = menuItems.find(item => item.id === 'special-today');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(21, 0, 0, 0); // 9:00 PM

      // Remove time restriction for now, keep counting down to next 9 PM if past
      if (now > target) {
        target.setDate(target.getDate() + 1);
      }
      
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAddToCart = () => {
    if (specialItem) {
      addItem(specialItem);
      toast.success(`${specialItem.name} added to your plate!`, {
        style: {
          background: '#161A22',
          color: '#fff',
          border: '1px solid #FF4D00'
        }
      });
    }
  };

  if (!isVisible || !specialItem) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20"
    >
      <div className="relative group overflow-hidden bg-dark-surface rounded-[40px] md:rounded-[60px] border border-gray-200 shadow-2xl">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-red-600/10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 blur-[120px] rounded-full animate-pulse" />
        
        <div className="flex flex-col lg:flex-row items-center relative z-10">
          {/* Image Section */}
          <div className="w-full lg:w-1/2 aspect-[4/3] lg:aspect-auto lg:h-[500px] relative overflow-hidden">
            <motion.img 
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.8 }}
              src={specialItem.image} 
              className="w-full h-full object-cover object-center"
              alt={specialItem.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-transparent to-transparent lg:hidden" />
            
            {/* Badge */}
            <div className="absolute top-8 left-8 flex flex-col gap-2">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-brand text-gray-900 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/40 flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 fill-current" /> LIMITED OFFER
              </motion.div>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full lg:w-1/2 p-8 md:p-16 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand">
                <span className="text-[10px] font-black uppercase tracking-[3px] text-gray-500">Today's Special Pick</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black italic tracking-tighter leading-none uppercase">
                {specialItem.name.split(' ')[0]} <br />
                <span className="text-brand">{specialItem.name.split(' ').slice(1).join(' ')}</span>
              </h2>
              
              <p className="text-gray-500 text-sm md:text-lg font-bold leading-relaxed max-w-md italic">
                "{specialItem.description}"
              </p>
            </div>

            {/* Timer Block */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 py-8 border-y border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <Timer className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Offer Ends In</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black italic text-brand">{timeLeft.hours}</span>
                    <span className="text-gray-500 font-black">:</span>
                    <span className="text-2xl font-black italic text-brand">{timeLeft.minutes}</span>
                    <span className="text-gray-500 font-black">:</span>
                    <span className="text-2xl font-black italic text-brand">{timeLeft.seconds}</span>
                  </div>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-12 bg-gray-50" />
              
              <div className="flex flex-col">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Special Price</p>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black italic text-gray-900 tracking-tighter">₹{specialItem.price}</span>
                  <span className="text-xl font-black italic text-gray-500 line-through tracking-tighter">₹{specialItem.originalPrice}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-brand text-gray-900 py-6 rounded-[24px] font-black text-lg uppercase tracking-[4px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand/30 flex items-center justify-center gap-4 group/btn"
              >
                CLAIM OFFER <ShoppingCart className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
              </button>
              
              <button 
                onClick={() => window.location.href = '#food'}
                className="px-10 py-6 bg-gray-50 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200 flex items-center justify-center gap-3"
              >
                VIEW MENU <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <p className="flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-[3px] animate-pulse">
              <Sparkles className="w-3 h-3" /> 9 people already ordered this
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
