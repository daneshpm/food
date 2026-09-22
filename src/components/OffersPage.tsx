import React from 'react';
import { motion } from 'framer-motion';
import { Tag, Sparkles, Truck, Flame, ArrowRight, Gift, Percent, Zap, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function OffersPage() {
  const navigate = useNavigate();

  const offers: Array<{
    id: number;
    title: string;
    description: string;
    oldPrice?: number;
    newPrice?: number;
    badge: string;
    icon: any;
    color: string;
    image: string;
    code?: string;
  }> = [
    {
      id: 1,
      title: "CHICKEN CRISPY MEAL",
      description: "Our signature high-conversion crispy chicken at an unbeatable price!",
      oldPrice: 320,
      newPrice: 220,
      badge: "STEAL DEAL",
      icon: Flame,
      color: "from-[#EA580C] to-red-600",
      image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80"
    },
    {
      id: 3,
      title: "REFRESHMENT DEAL",
      description: "Add a chilled Coca-Cola or Sprite to any main dish order for just ₹25.",
      badge: "BEST SELLER",
      icon: Sparkles,
      color: "from-blue-600 to-indigo-600",
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80"
    }
  ];

  return (
    <div className="relative min-h-screen bg-dark-bg pt-24 pb-40">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,77,0,0.05)_0%,transparent_50%)]" />
        <div className="scanline" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 space-y-12 relative z-10">
        {/* Header */}
        <div className="space-y-4">
          <motion.button 
            whileHover={{ x: -5 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 font-black uppercase tracking-[3px] text-[10px] hover:text-brand transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </motion.button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase text-gray-900 leading-none">
              Magic <br/><span className="text-brand text-glow">Deals</span>
            </h1>
            <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-3">
              <Zap className="w-5 h-5 text-brand" />
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Offers updating daily</span>
            </div>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="space-y-10">
          {offers.map((offer, idx) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group perspective-1000"
            >
              <motion.div
                whileHover={{ rotateY: 5, rotateX: -2 }}
                className="relative glass-card rounded-[50px] overflow-hidden border-gray-200 flex flex-col md:flex-row items-center gap-10 p-10 md:p-0 preserve-3d"
              >
                {/* Image Side */}
                <div className="w-full md:w-1/2 h-[300px] md:h-[500px] relative overflow-hidden rounded-[40px] md:rounded-none">
                  <img src={offer.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                  <div className={`absolute inset-0 bg-gradient-to-r ${offer.color} opacity-40 mix-blend-overlay`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute top-8 left-8">
                    <div className="glass-panel px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-900 border-gray-200">
                      {offer.badge}
                    </div>
                  </div>
                </div>

                {/* Content Side */}
                <div className="flex-1 space-y-8 pr-0 md:pr-16 text-center md:text-left">
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-gray-900 leading-none">
                      {offer.title}
                    </h2>
                    <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                      {offer.description}
                    </p>
                  </div>

                  {offer.newPrice && (
                    <div className="flex items-baseline justify-center md:justify-start gap-6">
                      <span className="text-7xl font-black italic text-brand text-glow tracking-tighter">₹{offer.newPrice}</span>
                      <span className="text-3xl font-black text-gray-500 line-through">₹{offer.oldPrice}</span>
                    </div>
                  )}

                  {offer.code ? (
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        navigator.clipboard.writeText(offer.code!);
                        toast.success(`Coupon "${offer.code}" copied to clipboard!`);
                      }}
                      className="btn-premium px-12 flex items-center gap-3 justify-center md:justify-start"
                    >
                      Copy Code: {offer.code} <Gift className="w-5 h-5 text-brand" />
                    </motion.button>
                  ) : (
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/home')}
                      className="btn-premium px-12"
                    >
                      Claim Offer <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Global CTA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="relative glass-card rounded-[60px] p-20 text-center overflow-hidden group"
        >
          <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter text-gray-900 uppercase leading-none">
              Ready to <br/> <span className="text-brand text-glow">Save Big?</span>
            </h2>
            <p className="text-gray-500 font-black uppercase tracking-[6px] text-xs">New experiences added every week</p>
            <button 
              onClick={() => navigate('/home')}
              className="btn-premium px-16 py-8 rounded-[32px] text-xl"
            >
              Order Now <Zap className="w-8 h-8 fill-white" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
