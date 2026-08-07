import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Plus, Minus, ChevronRight, Star, Bell, SlidersHorizontal, ShieldCheck, Wallet, Clipboard, Bike, Utensils, X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { playSound, SOUNDS } from '../utils/audio';
import { useMenuStore } from '../store/menuStore';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import FunGreetingBanner from './FunGreetingBanner';

const SEARCH_PLACEHOLDERS = [
  "Search for 'Burger'",
  "Search for 'Pizza'",
  "Search for 'Biryani'",
  "Search for 'Noodles'",
  "Search for 'Paneer Tikka'",
  "What are you craving today?"
];

const BANNER_SLIDES = [
  {
    image: "/hero_banner1.jpg",
    search: "Burger",
    category: "Burgers"
  },
  {
    image: "/hero_banner2.jpg",
    search: "Paneer",
    category: "Main Course"
  },
  {
    image: "/hero_banner3.jpg",
    search: "Noodle",
    category: "Noodles"
  }
];

export default function HomePage() {
  const { menuItems, isLoading } = useMenuStore();
  const [activeCategory, setActiveCategory] = useState("All Dishes");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [dietPreference, setDietPreference] = useState<'both' | 'veg' | 'non-veg'>('both');

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleBannerClick = (slide: typeof BANNER_SLIDES[0]) => {
    playSound(SOUNDS.CLICK);
    
    // Check if the category exists in CATEGORIES
    const categoryExists = CATEGORIES.some(cat => cat.id.toLowerCase() === slide.category.toLowerCase());
    if (categoryExists) {
      navigate(`/category/${slide.category}`);
    } else {
      setActiveCategory("All Dishes");
      setSearchQuery(slide.search);
      // Scroll to the list
      const firstFoodItem = document.getElementById('food-list-container');
      if (firstFoodItem) {
        firstFoodItem.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Dynamic Categories Memoized from Firestore menuItems with high quality local fallbacks
  const CATEGORIES = useMemo(() => {
    const CATEGORY_IMAGES: Record<string, string> = {
      "All Dishes": "/chicken_biryani_new.png",
      "Fast Food": "/masala_papad.png",
      "Rice & Noodles": "/chicken_fried_rice.png",
      "Biryani": "/chicken_biryani_new.png",
      "Starters": "/chicken_65.png",
      "Veg / Gravy": "/palak_paneer.jpg",
      "Roti": "/butter_naan.png",
      "Burgers & Rolls": "/mini_burger_combo.jpg",
      "Pizzas & Momos": "/fried_momos.png",
      "Drinks": "/butterscotch_shake_user.png"
    };

    const uniqueCats = Array.from(new Set(menuItems.map(item => item.category)));
    const list = uniqueCats.map(cat => {
      const firstItem = menuItems.find(item => item.category === cat && item.image);
      return {
        name: cat,
        id: cat,
        image: CATEGORY_IMAGES[cat] || firstItem?.image || "/chicken_biryani_new.png"
      };
    });
    return [
      { name: "All", id: "All Dishes", image: CATEGORY_IMAGES["All Dishes"] },
      ...list
    ];
  }, [menuItems]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { items: cartItems, addItem, removeItem, updateQuantity } = useCartStore();
  const { deliveryLocation, openLocationPicker, detectLocation } = useLocationStore();
  const { profile, addWalletBalance } = useAuthStore();
  const navigate = useNavigate();

  // Redirect to Auth if no guest or phone, and intercept staff apps
  useEffect(() => {
    const checkAuthAndApp = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { App: CapApp } = await import('@capacitor/app');
          const info = await CapApp.getInfo();
          if (info.id === 'com.minto.admin' || info.id === 'com.minto.hotel' || info.id === 'com.minto.rider') {
            navigate('/staff', { replace: true });
            return;
          }
        } catch (e) {}
      }

      const isGuest = localStorage.getItem('moms_magic_guest');
      const userPhone = localStorage.getItem('moms_magic_user_phone');
      if (!isGuest && !userPhone) {
        navigate('/', { replace: true });
      }
    };
    checkAuthAndApp();
  }, [navigate]);

  // Auto-detect location on mount
  useEffect(() => {
    const hasRequested = sessionStorage.getItem('has_requested_location');
    if (!deliveryLocation && !hasRequested) {
      sessionStorage.setItem('has_requested_location', 'true');
      detectLocation().catch((err) => {
        console.error("Auto location failed:", err);
      });
    }
  }, [deliveryLocation, detectLocation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('search') === 'true') {
      setTimeout(() => {
        const input = document.getElementById('home-search-input');
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }, []);

  const handleFilterToggle = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handlePerformSearch = () => {
    playSound(SOUNDS.CLICK);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      // Find matching category from menu items
      const matchedItem = menuItems.find(item => 
        item.name.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q)
      );
      if (matchedItem) {
        setActiveCategory(matchedItem.category);
      }
    }
    const section = document.getElementById('dishes-section-top');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredItems = useMemo(() => {
    let items = menuItems;
    const query = searchQuery.trim().toLowerCase();

    if (query !== "") {
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
      
      // Sort to prioritize exact/prefix name matches over category/description matches
      items.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName === query && bName !== query) return -1;
        if (bName === query && aName !== query) return 1;
        if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
        if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
        if (aName.includes(query) && !bName.includes(query)) return -1;
        if (!aName.includes(query) && bName.includes(query)) return 1;
        return 0;
      });
    } else if (activeCategory !== "All Dishes") {
      items = items.filter(item => item.category === activeCategory);
    }
    
    // Diet preference filter
    if (dietPreference === 'veg') {
      items = items.filter(item => item.isVeg === true);
    } else if (dietPreference === 'non-veg') {
      items = items.filter(item => item.isVeg === false);
    }

    // Quick Filters
    if (activeFilters.includes('Veg Only')) {
      items = items.filter(item => item.isVeg === true);
    }
    if (activeFilters.includes('Non Veg')) {
      items = items.filter(item => item.isVeg === false);
    }
    if (activeFilters.includes('Bestsellers')) {
      items = items.filter(item => item.fires && item.fires > 0);
    }
    if (activeFilters.includes('Offers')) {
      items = items.filter(item => item.price < 99);
    }
    if (activeFilters.includes('Under ₹99')) {
      items = items.filter(item => item.price < 99);
    }

    return items;
  }, [menuItems, activeCategory, searchQuery, activeFilters, dietPreference]);

  const getQuantity = (id: string) => {
    return cartItems.find(item => item.id === id)?.quantity || 0;
  };

  const handleAdd = (item: any) => {
    playSound(SOUNDS.ADD_TO_CART);
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category,
      isVeg: item.isVeg,
      type: item.type || 'food'
    });
  };

  const handleAddPromoMoney = async () => {
    try {
      await addWalletBalance(50, 'Claimed promo ₹50 bonus! 🎁');
      toast.success('₹50 Promo Bonus added to your wallet! 💰');
      playSound(SOUNDS.CLICK);
    } catch (error) {
      toast.error('Failed to claim bonus.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-white">
        <span className="w-10 h-10 border-4 border-[#39B54A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] pb-28 text-left text-white select-none">
      
      <div className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div className="flex flex-col gap-2.5">
          {/* Customized MINTOO Logo with green O's and smile arc */}
          <div className="flex items-center gap-0.5 cursor-pointer" onClick={() => navigate('/home')}>
            <span className="text-white text-3xl font-black tracking-tight uppercase" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              MINT
            </span>
            <div className="relative flex flex-col items-center">
              <span className="text-[#39B54A] text-3xl font-black tracking-tight uppercase flex gap-0" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                OO
              </span>
              {/* Smile curve underneath the two O's */}
              <div className="absolute -bottom-2 left-[3px] right-[3px] h-2.5 border-b-[3px] border-l-[1px] border-r-[1px] border-[#39B54A] rounded-b-full" />
            </div>
          </div>

          {/* Location Row */}
          <div 
            onClick={() => openLocationPicker()}
            className="flex items-center gap-2 cursor-pointer w-max mt-1 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full transition-all border border-white/15"
          >
            <MapPin className="w-4 h-4 text-[#39B54A] fill-[#39B54A]/25 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-white truncate max-w-[200px] flex items-center gap-1">
                {deliveryLocation ? deliveryLocation.name : '16th Main Rd, BTM 2nd Stage'}
                <ChevronRight className="w-3.5 h-3.5 text-white/80 rotate-90 shrink-0" />
              </span>
              <span className="text-[9px] text-[#39B54A] font-extrabold">
                {deliveryLocation?.distance !== undefined ? `${deliveryLocation.distance} km from BTM Metro Gate B` : 'BTM Metro Gate B'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Pic Icon redirecting to Profile Page */}
        <div 
          onClick={() => {
            playSound(SOUNDS.CLICK);
            navigate('/profile');
          }}
          className="relative w-10 h-10 rounded-full border-2 border-[#39B54A]/30 hover:border-[#39B54A] transition-colors cursor-pointer overflow-hidden shadow-lg bg-[#121212] flex items-center justify-center shrink-0 mt-1 active:scale-95 duration-200"
        >
          {profile && (profile as any)?.photoURL ? (
            <img 
              src={(profile as any).photoURL} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#39B54A]/10 to-[#121212] text-white">
              <span className="text-xs font-black uppercase text-[#39B54A]">
                {profile?.name ? profile.name.slice(0, 2) : 'ME'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2">
        <div className="relative flex items-center bg-[#141414] border border-white/5 rounded-full pl-4 pr-1.5 py-1.5 shadow-inner">
          <Search className="w-5 h-5 text-[#39B54A] shrink-0" />
          <input
            id="home-search-input"
            type="text"
            placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePerformSearch();
              }
            }}
            className="w-full bg-transparent border-none outline-none ml-2.5 text-sm font-semibold text-white placeholder:text-gray-500 text-left"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')} 
              className="p-1 hover:text-white text-gray-400 transition-colors cursor-pointer mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* SEARCH BUTTON */}
          <button
            type="button"
            onClick={handlePerformSearch}
            className="px-4 py-2 bg-[#39B54A] hover:bg-[#2e9d3d] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            Search
          </button>
        </div>
      </div>

      {/* Veg/Non-Veg preference selection buttons */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Both */}
        <button
          onClick={() => {
            setDietPreference('both');
            playSound(SOUNDS.CLICK);
          }}
          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all duration-300 cursor-pointer ${
            dietPreference === 'both'
              ? 'bg-white text-black border-white shadow-[0_4px_15px_rgba(255,255,255,0.15)] scale-[1.02]'
              : 'bg-[#121212] text-gray-400 border-white/5 hover:border-white/10'
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
              : 'bg-[#121212] text-[#39B54A] border-[#39B54A]/20 hover:bg-[#39B54A]/5'
          }`}
        >
          {/* Standard Green Veg Icon */}
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
              : 'bg-[#121212] text-[#E53E3E] border-[#E53E3E]/20 hover:bg-[#E53E3E]/5'
          }`}
        >
          {/* Standard Red Non-Veg Icon */}
          <div className="w-3.5 h-3.5 border-2 border-[#E53E3E] flex items-center justify-center rounded shrink-0 p-[2px]">
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[7px] border-b-[#E53E3E]" />
          </div>
          Non-Veg
        </button>
      </div>

      {/* Fun Personalized Onboarding & Greeting Banner */}
      <div className="px-4 pt-1 pb-1">
        <FunGreetingBanner />
      </div>

      {/* Hero Promo Banner (Carousel) */}
      <div className="px-4 py-3">
        <div className="relative w-full aspect-[3/2] overflow-hidden rounded-[28px] border border-white/5 bg-[#121212] shadow-xl group">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 w-full h-full"
            >
              <img 
                src={BANNER_SLIDES[activeSlide].image} 
                alt={`Promo Banner ${activeSlide + 1}`} 
                className="w-full h-full object-cover" 
              />
              
              {/* Absolute positioned Order Now button overlaying the banner button area */}
              <button
                onClick={() => handleBannerClick(BANNER_SLIDES[activeSlide])}
                className="absolute bottom-[8.5%] left-[4.5%] bg-[#39B54A] hover:bg-[#34a242] text-white text-[8px] xs:text-[10px] sm:text-xs font-black uppercase tracking-wider px-5 sm:px-7 py-2 sm:py-2.5 rounded-full flex items-center justify-center gap-1.5 active:scale-95 hover:scale-102 transition-all cursor-pointer border-none z-10"
                style={{
                  boxShadow: '0 4px 14px rgba(57, 181, 74, 0.4)'
                }}
              >
                ORDER NOW <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 stroke-[4]" />
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Carousel dots indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {BANNER_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide(idx);
                  playSound(SOUNDS.CLICK);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === activeSlide ? 'bg-[#39B54A] w-5' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Categories Horizontal Row */}
      <div id="dishes-section-top" className="px-4 py-4 overflow-x-auto no-scrollbar scroll-mt-6">
        <div className="flex gap-4 min-w-max pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  playSound(SOUNDS.CLICK);
                  if (cat.id === "All Dishes") {
                    setActiveCategory("All Dishes");
                    setSearchQuery("");
                  } else {
                    navigate(`/category/${cat.id}`);
                  }
                }}
                className="flex flex-col items-center gap-2 cursor-pointer group shrink-0"
              >
                <div 
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: isSelected ? '#39B54A' : '#e2e8f0',
                    borderWidth: isSelected ? '3.5px' : '1px'
                  }}
                  className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shadow-md transition-all duration-300 relative border ${
                    isSelected 
                      ? 'shadow-[0_0_15px_rgba(57,181,74,0.4)] scale-105' 
                      : 'group-hover:scale-105'
                  }`}
                >
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="w-full h-full object-cover transition-transform duration-500" 
                  />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider text-center transition-colors ${
                  isSelected ? 'text-[#39B54A]' : 'text-gray-400 group-hover:text-white'
                }`}>
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Near You Section */}
      <div className="px-4 py-4" id="food-list-container">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white tracking-tight uppercase font-clash">
            Popular Near You
          </h3>
          <span 
            onClick={() => {
              setActiveCategory("All Dishes");
              setSearchQuery("");
              setDietPreference("both");
              toast.success('Showing all delicious items! 🍔');
              playSound(SOUNDS.CLICK);
            }}
            className="text-xs font-semibold text-[#39B54A] hover:underline cursor-pointer flex items-center gap-0.5"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar flex gap-4 pb-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                playSound(SOUNDS.CLICK);
                navigate(`/food/${item.id}`);
              }}
              className="relative w-[140px] bg-[#121212] border border-white/5 rounded-[24px] overflow-hidden flex flex-col shrink-0 group transition-all duration-300 hover:border-white/10 cursor-pointer"
            >
              {/* Square Image container */}
              <div className="w-full aspect-square relative overflow-hidden bg-neutral-900 shrink-0">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />

                {/* Fast Delivery & Fresh & Hot Badge Overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                  <span className="bg-[#121212]/85 backdrop-blur-md text-[#39B54A] text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-[#39B54A]/25">
                    ⚡ Fast
                  </span>
                  <span className="bg-[#121212]/85 backdrop-blur-md text-[#E53E3E] text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-[#E53E3E]/25">
                    🔥 Hot
                  </span>
                </div>

                {/* Veg/Non-Veg Indicator at Top-Right */}
                <div className="absolute top-2 right-2 z-10 pointer-events-none bg-[#121212]/85 backdrop-blur-sm p-1 rounded-md border border-white/10 shadow-md">
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

              {/* Title & Price & Plus button */}
              <div className="p-3.5 flex flex-col justify-between flex-1 gap-2 text-left">
                <h4 className="font-bold text-white leading-tight text-[13px] line-clamp-1 truncate">{item.name}</h4>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-black text-[#39B54A] tracking-tight leading-none truncate">
                    ₹{item.price}
                  </span>
                  
                  {/* Quantity add/remove controls */}
                  <div className="shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                    {getQuantity(item.id) === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(item);
                        }}
                        className="bg-[#39B54A] text-white w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#2e9d3d] active:scale-90 transition-all cursor-pointer shadow-md border-none"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    ) : (
                      <div className="flex items-center bg-[#39B54A] text-white rounded-lg shadow-md overflow-hidden h-7">
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
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Items Section */}
      <div className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-tight uppercase font-clash">
            {searchQuery ? 'Search Results' : activeCategory === 'All Dishes' ? 'All Dishes' : `Explore ${activeCategory}`}
          </h3>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{filteredItems.length} items</span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                playSound(SOUNDS.CLICK);
                navigate(`/food/${item.id}`);
              }}
              className="relative bg-[#121212] border border-white/5 rounded-[24px] overflow-hidden flex flex-col group transition-all duration-300 hover:border-white/10 cursor-pointer"
            >
              {/* Image Container with Badges */}
              <div className="w-full aspect-[4/3] relative overflow-hidden bg-neutral-900 shrink-0">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />

                {/* Veg/Non-Veg Badge */}
                <div className="absolute top-2.5 left-2.5 z-10 animate-fadeIn">
                  {item.isVeg ? (
                    <div className="w-4.5 h-4.5 bg-black/60 backdrop-blur-md rounded-md flex items-center justify-center border border-green-500/30">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  ) : (
                    <div className="w-4.5 h-4.5 bg-black/60 backdrop-blur-md rounded-md flex items-center justify-center border border-red-500/30">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-3 flex flex-col justify-between flex-1 gap-2.5 text-left">
                <div>
                  <h4 className="font-bold text-white leading-tight text-xs line-clamp-2 min-h-[32px]">{item.name}</h4>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-black text-[#39B54A] tracking-tight leading-none truncate">
                    ₹{item.price}
                  </span>
                  
                  {/* Quantity add/remove controls */}
                  <div className="shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                    {getQuantity(item.id) === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(item);
                        }}
                        className="bg-[#39B54A] text-white w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#2e9d3d] active:scale-90 transition-all cursor-pointer shadow-md border-none"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    ) : (
                      <div className="flex items-center bg-[#39B54A] text-white rounded-lg shadow-md overflow-hidden h-7">
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
              <Search className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-white font-black text-base">No items found</p>
            <p className="text-gray-500 text-xs mt-1">Try another search or category.</p>
          </div>
        )}
      </div>

    </div>
  );
}
