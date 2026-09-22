import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, User, Bell, Menu, X, Compass, PartyPopper, Utensils, LogOut, PackageSearch, Clock, MapPin } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { useNavigate, Link } from 'react-router-dom';
import { useSystemStore } from '../store/systemStore';
import { useAuthStore } from '../store/authStore';
import AuthModal from './AuthModal';

export default function Header() {
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const navigate = useNavigate();
  const settings = useSystemStore(state => state.settings);
  const { user, profile } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const formatTime12h = (time24: string) => {
    try {
      const [hStr, mStr] = time24.split(':');
      const h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHours = h % 12 || 12;
      return `${displayHours}:${mStr} ${ampm}`;
    } catch (e) {
      return time24;
    }
  };

  const isStoreOpen = () => { return true; };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Location Mobile View */}
          <div className="flex items-center gap-4 flex-1">
            <Link to="/" className="text-xl md:text-2xl font-bold tracking-tighter text-black flex items-center gap-1">
              <span className="bg-black text-white px-2 py-1 rounded-lg text-sm">M</span>agic
            </Link>
            
            <div className="hidden md:flex flex-col text-left pl-4 border-l border-gray-200">
              <button 
                onClick={openLocationPicker}
                className="flex items-center gap-1.5 text-xs font-extrabold text-gray-900 hover:text-emerald-600 transition-colors outline-none group"
              >
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="truncate max-w-[220px] font-extrabold text-xs text-gray-900 group-hover:text-emerald-600">
                    {deliveryLocation ? deliveryLocation.name : '16th Main Rd, BTM 2nd Stage'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold">
                    {deliveryLocation?.distance !== undefined ? `${deliveryLocation.distance} km from BTM Metro Gate B` : 'BTM Metro Station Gate B'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-colors ml-1" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/food" className="text-sm font-semibold text-gray-600 hover:text-black transition-colors flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Food
            </Link>
            <Link to="/bulk" className="text-sm font-semibold text-gray-600 hover:text-black transition-colors flex items-center gap-2">
              <PartyPopper className="w-4 h-4" /> Cakes
            </Link>
          </nav>

          {/* Right Side Auth/Profile */}
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-2 rounded-full text-sm font-semibold text-gray-900 transition-colors cursor-pointer shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-xs text-white uppercase font-bold shrink-0">
                  {profile?.name?.charAt(0) || user.displayName?.charAt(0) || 'U'}
                </div>
                <span className="max-w-[120px] truncate">
                  {profile?.name?.split(' ')[0] || user.displayName?.split(' ')[0] || 'Profile'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-black hover:bg-gray-800 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all shadow-sm cursor-pointer"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
