import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Star, ChevronRight, ShieldCheck } from 'lucide-react';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const CATEGORY_HEROES: Record<string, string> = {
  "Biryani": "/images/chicken_biryani_new.jpg",
  "Fast Food": "/images/masala_papad.jpg",
  "Rice & Noodles": "/images/chicken_fried_rice.jpg",
  "Starters": "/images/chicken_65.jpg",
  "Veg / Gravy": "/images/palak_paneer.jpg",
  "Roti": "/images/butter_naan.jpg",
  "Burgers & Rolls": "/images/mini_burger_combo.jpg",
  "Pizzas & Momos": "/images/fried_momos.jpg",
  "Drinks": "/images/butterscotch_shake_user.jpg"
};

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const { menuItems, isLoading } = useMenuStore();
  const { items: cartItems, addItem, removeItem, updateQuantity } = useCartStore();

  const [dietPreference, setDietPreference] = useState<'both' | 'veg' | 'non-veg'>('both');

  // Auto-scroll to top on categoryId change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categoryId]);

  // SEO Optimization
  useSEO(
    categoryId ? `${categoryId} Menu - Mintoo` : 'Menu Category - Mintoo',
    `Explore delicious ${categoryId} options freshly prepared at Mintoo.`
  );

  // Filter items in this category
  const filteredItems = useMemo(() => {
    if (!categoryId) return [];
    let items = menuItems.filter(
      (item) => item.category.toLowerCase() === categoryId.toLowerCase()
    );

    if (dietPreference === 'veg') {
      items = items.filter((item) => item.isVeg === true);
    } else if (dietPreference === 'non-veg') {
      items = items.filter((item) => item.isVeg === false);
    }
    return items;
  }, [menuItems, categoryId, dietPreference]);

  const getQuantity = (id: string) => {
    return cartItems.find((item) => item.id === id)?.quantity || 0;
  };

  const handleAdd = (item: any) => {
    addItem(item);
    playSound(SOUNDS.ADD_TO_CART);
    toast.success(`${item.name} added! 🛒`);
  };

  const heroImage = useMemo(() => {
    if (!categoryId) return '';
    return CATEGORY_HEROES[categoryId] || "/images/chicken_biryani_new.jpg";
  }, [categoryId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center text-white">
        <span className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh pb-28 text-white select-none text-left">
      {/* Category Hero Banner */}
      <div className="relative w-full h-[180px] bg-neutral-900 overflow-hidden">
        <img
          src={heroImage}
          alt={categoryId}
          className="w-full h-full object-cover brightness-[0.4]"
        />

        {/* Floating Back Button */}
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            navigate('/home');
          }}
          className="absolute top-4 left-4 z-20 w-10 h-10 bg-[#12121f]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 z-10 text-left">
          <h1 
            className="text-2xl font-black uppercase tracking-wider text-white font-clash"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {categoryId}
          </h1>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm">
            {filteredItems.length} options available
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-4 pt-4">
        {/* Diet Toggles (Veg/Non-Veg/Both) */}
        <div className="flex items-center gap-3 px-4">
          {/* Both */}
          <button
            onClick={() => {
              setDietPreference('both');
              playSound(SOUNDS.CLICK);
            }}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-300 cursor-pointer ${
              dietPreference === 'both'
                ? 'bg-white text-black border-white shadow-[0_4px_15px_rgba(255,255,255,0.15)] scale-[1.02]'
                : 'bg-[#12121f] text-gray-400 border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex gap-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39B54A]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E53E3E]" />
            </div>
            Both
          </button>

          {/* Veg Only */}
          <button
            onClick={() => {
              setDietPreference('veg');
              playSound(SOUNDS.CLICK);
            }}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-300 cursor-pointer ${
              dietPreference === 'veg'
                ? 'bg-[#39B54A] text-white border-[#39B54A] shadow-[0_4px_15px_rgba(57,181,74,0.3)] scale-[1.02]'
                : 'bg-[#12121f] text-[#39B54A] border-[#39B54A]/20 hover:bg-[#39B54A]/5'
            }`}
          >
            <div className="w-3.5 h-3.5 border-2 border-[#39B54A] flex items-center justify-center rounded shrink-0 p-[2px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#39B54A]" />
            </div>
            Veg Only
          </button>

          {/* Non Veg Only */}
          <button
            onClick={() => {
              setDietPreference('non-veg');
              playSound(SOUNDS.CLICK);
            }}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-300 cursor-pointer ${
              dietPreference === 'non-veg'
                ? 'bg-[#E53E3E] text-white border-[#E53E3E] shadow-[0_4px_15px_rgba(229,62,62,0.3)] scale-[1.02]'
                : 'bg-[#12121f] text-[#E53E3E] border-[#E53E3E]/20 hover:bg-[#E53E3E]/5'
            }`}
          >
            <div className="w-3.5 h-3.5 border-2 border-[#E53E3E] flex items-center justify-center rounded shrink-0 p-[2px]">
              <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[7px] border-b-[#E53E3E]" />
            </div>
            Non-Veg
          </button>
        </div>

        {/* Category Items List */}
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3.5 md:gap-4 mt-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  playSound(SOUNDS.CLICK);
                  navigate(`/food/${item.id}`);
                }}
                className="relative bg-[#12121f] border border-white/5 rounded-[24px] overflow-hidden flex flex-col group transition-all duration-300 hover:border-white/10 cursor-pointer"
              >
                {/* Image Container with Badges */}
                <div className="w-full aspect-[4/3] relative overflow-hidden bg-neutral-900 shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Fast Delivery & Fresh & Hot Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                    <span className="bg-[#12121f]/95 text-accent text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-accent/25">
                      ⚡ Fast
                    </span>
                    <span className="bg-[#12121f]/95 text-[#E53E3E] text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-[#E53E3E]/25">
                      🔥 Hot
                    </span>
                  </div>

                  {/* Veg/Non-Veg Badge */}
                  <div className="absolute top-2 right-2 z-10 pointer-events-none bg-[#12121f]/95 p-1 rounded-md border border-white/10 shadow-md">
                    <div className={`w-2.5 h-2.5 border flex items-center justify-center rounded-[2px] p-[1px] ${
                      item.isVeg ? 'border-[#39B54A]' : 'border-[#E53E3E]'
                    }`}>
                      {item.isVeg ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#39B54A]" />
                      ) : (
                        <div className="w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-b-[4px] border-b-[#E53E3E]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 flex flex-col justify-between flex-1 gap-2.5 text-left">
                  <div>
                    <h4 className="font-bold text-white leading-tight text-xs line-clamp-2 min-h-[32px]">
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black text-[#39B54A] tracking-tight leading-none truncate">
                      ₹{item.price}
                    </span>

                    {/* Quantity add/remove controls */}
                    <div
                      className="shrink-0 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getQuantity(item.id) === 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdd(item);
                          }}
                          className="gradient-brand text-white w-7 h-7 rounded-lg flex items-center justify-center hover:brightness-110 active:scale-90 transition-all cursor-pointer shadow-md border-none"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      ) : (
                        <div className="flex items-center gradient-brand text-white rounded-lg shadow-md overflow-hidden h-7">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSound(SOUNDS.CLICK);
                              updateQuantity(item.id, getQuantity(item.id) - 1);
                            }}
                            className="px-1.5 h-full hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer border-none"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-3 text-center font-black text-[10px]">
                            {getQuantity(item.id)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSound(SOUNDS.CLICK);
                              updateQuantity(item.id, getQuantity(item.id) + 1);
                            }}
                            className="px-1.5 h-full hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer border-none"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <ShieldCheck className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-white font-black text-base">No items found</p>
              <p className="text-gray-500 text-xs mt-1">Try changing your veg / non-veg filter preference.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
