import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Star, Heart, Flame, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function FoodInfoPage() {
  const { foodId } = useParams<{ foodId: string }>();
  const navigate = useNavigate();

  const { menuItems, isLoading } = useMenuStore();
  const { items: cartItems, addItem, removeItem, updateQuantity } = useCartStore();

  const [isLiked, setIsLiked] = useState(false);

  // Auto-scroll to top when foodId changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [foodId]);

  // Find current food item
  const item = useMemo(() => {
    return menuItems.find((p) => p.id === foodId);
  }, [menuItems, foodId]);

  // SEO Optimization
  useSEO(
    item ? `${item.name} - Mintoo` : 'Food Details - Mintoo',
    item ? item.description : 'View delicious freshly prepared meals at Mintoo.'
  );

  // Get current quantity in cart
  const quantity = useMemo(() => {
    if (!item) return 0;
    return cartItems.find((ci) => ci.id === item.id)?.quantity || 0;
  }, [cartItems, item]);

  // Calculate similar recommendations (same category, excluding current item)
  const recommendations = useMemo(() => {
    if (!item) return [];
    return menuItems
      .filter((p) => p.category === item.category && p.id !== item.id)
      .slice(0, 6); // Cap at 6 items
  }, [menuItems, item]);

  const handleAdd = () => {
    if (!item) return;
    addItem(item);
    playSound(SOUNDS.ADD_TO_CART);
    toast.success(`${item.name} added to cart!`);
  };

  const handleIncrement = () => {
    if (!item) return;
    updateQuantity(item.id, quantity + 1);
    playSound(SOUNDS.CLICK);
  };

  const handleDecrement = () => {
    if (!item) return;
    if (quantity === 1) {
      removeItem(item.id);
      toast.success(`${item.name} removed from cart`);
    } else {
      updateQuantity(item.id, quantity - 1);
    }
    playSound(SOUNDS.CLICK);
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    playSound(SOUNDS.CLICK);
    if (!isLiked) {
      toast.success('Added to your Favourites!');
    } else {
      toast.error('Removed from Favourites');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center text-white">
        <span className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-mesh text-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-lg">
          <ShieldCheck className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-wider">Dish Not Found</h3>
        <p className="text-gray-500 text-xs mt-2 max-w-xs">
          The dish you are looking for might have been temporarily removed or renamed.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="mt-6 gradient-brand text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-full shadow-lg active:scale-95 transition-all cursor-pointer border-none"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh pb-28 text-white select-none text-left animate-fadeIn">
      {/* Top Floating Navbar */}
      <div className="sticky top-0 z-40 bg-[#0a0a12]/98 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            navigate(-1);
          }}
          className="w-10 h-10 bg-[#14141f] border border-white/5 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-wider text-white truncate max-w-[200px]">
          {item.name}
        </h2>
        <div className="w-10 h-10" />
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-6">
        {/* Cover Photo Card */}
        <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden border border-white/5 bg-[#14141f] shadow-xl group">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
          />

          {/* Quick Badges Overlay */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
            <span className="bg-[#14141f]/85 backdrop-blur-md text-accent text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-md border border-accent/25">
 Fast Delivery
            </span>
            <span className="bg-[#14141f]/85 backdrop-blur-md text-[#E53E3E] text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-md border border-[#E53E3E]/25">
 Hot & Fresh
            </span>
          </div>

          {/* Diet Preference Circle Badge */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none bg-[#14141f]/85 backdrop-blur-sm p-1.5 rounded-xl border border-white/10 shadow-md">
            <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-[3px] p-[1.5px] ${
              item.isVeg ? 'border-[#39B54A]' : 'border-[#E53E3E]'
            }`}>
              {item.isVeg ? (
                <div className="w-2 h-2 rounded-full bg-[#39B54A]" />
              ) : (
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-[#E53E3E]" />
              )}
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="bg-[#14141f] border border-white/5 rounded-[28px] p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-black text-white leading-tight">
                {item.name}
              </h1>
              <div className="flex items-center gap-2.5 mt-1 text-[11px] font-semibold text-gray-400">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3.5 h-3.5 text-brand" /> 25-30 mins
                </span>
                {item.fires && item.fires > 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-accent flex items-center gap-0.5 font-bold">
                      <Flame className="w-3.5 h-3.5 fill-accent/10" /> Bestseller
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <span className="text-2xl font-black text-[#39B54A] tracking-tight leading-none shrink-0 mt-1">
              ₹{item.price}
            </span>
          </div>

          <hr className="border-white/5 my-1" />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Description
            </h3>
            <p className="text-xs text-[#b5b5b5] font-medium leading-relaxed">
              {item.description || 'Deliciously prepared using authentic spices and freshly picked ingredients to deliver the perfect luxury taste straight to your doorstep.'}
            </p>
          </div>

          <hr className="border-white/5 my-1" />

          {/* Add / Quantity Area */}
          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Total Price</span>
              <span className="text-lg font-black text-white">
                ₹{item.price * Math.max(1, quantity)}
              </span>
            </div>

            {quantity === 0 ? (
              <button
                onClick={handleAdd}
                className="gradient-brand hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg transition-all cursor-pointer border-none"
              >
                Add To Cart <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <div className="flex items-center gradient-brand text-white rounded-2xl shadow-lg overflow-hidden h-11 border border-brand">
                <button
                  onClick={handleDecrement}
                  className="px-4 h-full hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                <span className="w-8 text-center font-black text-sm">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="px-4 h-full hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Similar Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              You Might Also Like
            </h3>

            {/* Horizontal Scroll list */}
            <div className="-mx-4 px-4 overflow-x-auto no-scrollbar flex gap-4 pb-2">
              {recommendations.map((recItem) => (
                <div
                  key={recItem.id}
                  onClick={() => {
                    playSound(SOUNDS.CLICK);
                    navigate(`/food/${recItem.id}`);
                  }}
                  className="relative w-[140px] bg-[#14141f] border border-white/5 rounded-[24px] overflow-hidden flex flex-col shrink-0 group transition-all duration-300 hover:border-white/10 cursor-pointer"
                >
                  {/* Image container */}
                  <div className="w-full aspect-square relative overflow-hidden bg-neutral-900 shrink-0">
                    <img
                      src={recItem.image}
                      alt={recItem.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Mini Diet Badge Overlay */}
                    <div className="absolute top-2 right-2 z-10 pointer-events-none bg-[#14141f]/80 p-0.5 rounded border border-white/5">
                      <div className={`w-2 h-2 border flex items-center justify-center rounded-[1.5px] p-[0.5px] ${
                        recItem.isVeg ? 'border-[#39B54A]' : 'border-[#E53E3E]'
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${
                          recItem.isVeg ? 'bg-[#39B54A]' : 'bg-[#E53E3E]'
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2 text-left">
                    <h4 className="font-bold text-white leading-tight text-[12px] line-clamp-1 truncate">
                      {recItem.name}
                    </h4>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[13px] font-black text-[#39B54A] tracking-tight leading-none">
                        ₹{recItem.price}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(recItem);
                          playSound(SOUNDS.ADD_TO_CART);
                          toast.success(`${recItem.name} added!`);
                        }}
                        className="gradient-brand text-white w-6 h-6 rounded-md flex items-center justify-center hover:brightness-110 active:scale-90 transition-all cursor-pointer shadow-md border-none"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
