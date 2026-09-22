import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { ShoppingBag, ArrowRight, Zap, Sparkles, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSystemStore } from '../store/systemStore';

export default function BottomCartBar() {
  const { items, total, clearCart } = useCartStore();
  const { deliveryLocation } = useLocationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSystemStore(state => state.settings);
  
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const distanceKm = deliveryLocation?.distance ?? 999;
  const isOrderingPaused = settings.websiteStatus === 'OFF' || settings.emergencyStop;

  if (itemCount === 0 || location.pathname === '/' || location.pathname === '/checkout' || isOrderingPaused) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        className="fixed bottom-[80px] md:bottom-[80px] left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-[90] pointer-events-none"
      >
        <div className="relative group pointer-events-auto">
          {/* Luxury Ambient Glow */}
          <div className="absolute inset-0 bg-[#39B54A]/5 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative bg-[#121212]/95 rounded-3xl md:rounded-[40px] p-3 md:p-5 flex items-center justify-between border border-white/10 shadow-lg overflow-hidden">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#39B54A]/5 to-transparent -translate-x-full animate-[shimmer_4s_infinite]" />
            
            <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: -5 }}
                className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-[#39B54A] flex items-center justify-center relative shadow-xl shadow-[#39B54A]/10 border border-white/5 shrink-0"
              >
                <ShoppingBag className="w-5 h-5 md:w-8 md:h-8 text-white" />
                <AnimatePresence>
                  <motion.span 
                    key={itemCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-[#39B54A] text-white text-[9px] md:text-[10px] font-black w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full shadow-lg border-2 border-[#121212]"
                  >
                    {itemCount}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
 
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 md:gap-2">
                  <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#39B54A]" />
                  <span className="text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-[2px] truncate">{itemCount} Item{itemCount > 1 ? "s" : ""} | Total</span>
                </div>
                
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className="text-white text-xl md:text-3xl font-black tracking-tighter">₹{total}</span>
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-400 font-medium truncate w-full">
                  {[...items].reverse().map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
 
              </div>
            </div>
 
            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2 md:ml-4">
              <motion.button 
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/cart')}
                className="h-10 md:h-14 px-3 md:px-6 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[1px] md:tracking-[2px] text-white flex items-center justify-center gap-1 md:gap-2 relative overflow-hidden group/btn shadow-[0_0_15px_rgba(57,181,74,0.3)] shrink-0 whitespace-nowrap cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #39B54A, #2e9d3d)'
                }}
              >
                <div className="absolute inset-0 bg-[#248131] -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10 hidden sm:inline">View Cart</span>
                <span className="relative z-10 sm:hidden">Cart</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
              </motion.button>
 
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearCart();
                }}
                className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-[#222] border border-white/5 flex items-center justify-center hover:bg-red-950/40 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                title="Clear Cart"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
