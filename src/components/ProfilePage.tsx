import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  LogOut, 
  ChevronRight, 
  Trash2, 
  Plus, 
  PackageSearch,
  FileText,
  Headphones,
  ShieldCheck,
  Crown,
  Smartphone,
  Mail,
  Crosshair,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { reverseGeocode } from '../lib/location';

export default function ProfilePage() {
  useSEO("My Profile", "Manage your profile and saved addresses at Mintoo.");
  const navigate = useNavigate();
  const { user, profile, loading, logout, addAddress, deleteAddress } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'menu' | 'addresses' | 'terms'>('menu');
  const [orders, setOrders] = useState<any[]>([]);

  // Address Form State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressText, setAddressText] = useState('');
  const [addressLat, setAddressLat] = useState('12.9165'); // Default BTM Layout
  const [addressLng, setAddressLng] = useState('77.6101');
  const [isDetectingProfileLocation, setIsDetectingProfileLocation] = useState(false);

  const handleAutoDetectProfileAddress = () => {
    if (!navigator.geolocation) {
      setAddressText('16th Main Road, BTM 2nd Stage, BTM Layout, Bengaluru');
      toast.success('Pre-filled address for BTM Layout 📍');
      return;
    }

    setIsDetectingProfileLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const fullAddress = await reverseGeocode(latitude, longitude);
          setAddressText(fullAddress);
          setAddressLat(latitude.toString());
          setAddressLng(longitude.toString());
          toast.success('Exact GPS location detected & pre-filled! 📍');
        } catch (err) {
          setAddressText('16th Main Road, BTM 2nd Stage, BTM Layout, Bengaluru');
          toast.success('Location set to BTM Layout 📍');
        } finally {
          setIsDetectingProfileLocation(false);
        }
      },
      (err) => {
        console.warn('Profile geolocation fallback:', err);
        setAddressText('16th Main Road, BTM 2nd Stage, BTM Layout, Bengaluru');
        setIsDetectingProfileLocation(false);
        toast.success('Location set to BTM Layout 📍');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const localPhone = localStorage.getItem('moms_magic_user_phone');
  const isGuest = localStorage.getItem('moms_magic_guest');

  // Re-route if user is not authenticated
  useEffect(() => {
    if (!loading && !user && !localPhone && !isGuest) {
      navigate('/');
    }
  }, [user, loading, localPhone, isGuest, navigate]);

  // Load local order history
  useEffect(() => {
    const loadOrders = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
        const phone = profile?.phone || user?.phoneNumber || localPhone || '';
        const clean = (p: string) => p.replace(/\D/g, '').slice(-10);
        
        const userOrders = stored.filter((o: any) => {
          const isPhoneMatch = (phone && typeof o.userPhone === 'string') ? clean(o.userPhone) === clean(phone) : false;
          const isUserMatch = user ? o.userId === user.uid : false;
          return isPhoneMatch || isUserMatch;
        });

        userOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(userOrders);
      } catch (err) {
        console.error('Error loading local orders:', err);
      }
    };

    loadOrders();
  }, [user, profile, localPhone]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('moms_magic_user_phone');
      localStorage.removeItem('moms_magic_guest');
      await logout();
      toast.success('Logged out successfully.');
      navigate('/');
    } catch (e) {
      localStorage.removeItem('moms_magic_user_phone');
      localStorage.removeItem('moms_magic_guest');
      toast.error('Logout failed.');
      navigate('/');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressText.trim() || !addressLabel.trim()) {
      toast.error('Please enter address details.');
      return;
    }
    const lat = parseFloat(addressLat);
    const lng = parseFloat(addressLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates.');
      return;
    }

    try {
      await addAddress(addressLabel.trim(), addressText.trim(), lat, lng);
      toast.success('Address saved successfully! 📍');
      setAddressText('');
      setShowAddressForm(false);
    } catch (err) {
      toast.error('Failed to save address.');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddress(id);
      toast.success('Address deleted.');
    } catch (err) {
      toast.error('Failed to delete address.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <span className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 mt-4 font-bold uppercase tracking-wider text-xs">Loading Profile...</p>
      </div>
    );
  }

  if (!user && !localPhone && !isGuest) return null;

  const displayProfile = profile || {
    name: user?.displayName || 'Valued Foodie',
    email: user?.email || '',
    phone: localPhone || user?.phoneNumber || '',
    addresses: []
  };

  const userInitial = (displayProfile.name && displayProfile.name.trim().length > 0)
    ? displayProfile.name.trim().charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-gray-50/70 pt-20 pb-36 font-sans">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        
        {/* Swiggy/Zomato Style User Card Header with High Contrast White & Gold Text */}
        <div className="bg-gradient-to-br from-gray-950 via-zinc-900 to-black text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-gray-800">
          {/* Decorative Crown Badge */}
          <div className="absolute top-0 right-0 p-6 opacity-15 pointer-events-none">
            <Crown className="w-36 h-36 text-amber-400" />
          </div>

          <div className="flex items-center gap-4 relative z-10">
            {/* Avatar Circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-[#F97316] to-amber-500 p-0.5 shadow-lg shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-2xl sm:text-3xl uppercase">
                {userInitial}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">
                  {displayProfile.name}
                </h1>
                <span className="bg-amber-400 text-gray-950 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-xs">
                  <Crown className="w-3 h-3 text-gray-950 fill-gray-950" /> VIP Foodie
                </span>
              </div>

              {displayProfile.phone && (
                <p className="text-xs text-amber-300 flex items-center gap-1.5 font-bold">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{displayProfile.phone}</span>
                </p>
              )}

              {displayProfile.email && (
                <p className="text-xs text-gray-200 flex items-center gap-1.5 font-medium truncate">
                  <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{displayProfile.email}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selector Pill Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'menu', label: 'Overview', icon: User },
            { id: 'addresses', label: 'Addresses', icon: MapPin },
            { id: 'terms', label: 'Terms & Privacy', icon: FileText }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Content */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW / MENU TAB */}
            {activeTab === 'menu' && (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Main Swiggy-Style Quick Cards Grid */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-2 shadow-xs space-y-1">
                  {/* My Orders */}
                  <button 
                    onClick={() => navigate('/orders')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                        <PackageSearch className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">My Orders</h3>
                        <p className="text-xs text-gray-500 font-medium">Track live orders & view past history ({orders.length})</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Saved Addresses */}
                  <button 
                    onClick={() => setActiveTab('addresses')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">Saved Addresses</h3>
                        <p className="text-xs text-gray-500 font-medium">{displayProfile.addresses?.length || 0} Saved Locations (Home, Work, Other)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Help & Support */}
                  <button 
                    onClick={() => navigate('/support')}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                        <Headphones className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Help & Customer Support</h3>
                        <p className="text-xs text-gray-500 font-medium">24/7 Live chat & instant order resolution</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Account Security & Sign Out Section */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Actions</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-gray-600" />
                      <span>Sign Out</span>
                    </button>

                    <button 
                      onClick={() => navigate('/delete-account')}
                      className="w-full h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-red-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <motion.div 
                key="addresses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Saved Addresses</h3>
                    <p className="text-xs text-gray-500 font-medium">Manage your delivery locations</p>
                  </div>
                  <button 
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New</span>
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Address Label</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Home / Work / Flat 302" 
                        value={addressLabel} 
                        onChange={(e) => setAddressLabel(e.target.value)} 
                        required 
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 block">Full Address Details</label>
                        <button
                          type="button"
                          onClick={handleAutoDetectProfileAddress}
                          disabled={isDetectingProfileLocation}
                          className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 cursor-pointer shadow-xs"
                        >
                          {isDetectingProfileLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                          <span>{isDetectingProfileLocation ? 'Detecting...' : 'Auto-Detect GPS'}</span>
                        </button>
                      </div>
                      <textarea 
                        placeholder="Enter building name, street, main, road & landmark or click Auto-Detect GPS" 
                        value={addressText} 
                        onChange={(e) => setAddressText(e.target.value)} 
                        required 
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-medium h-20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer">Save Address</button>
                      <button type="button" onClick={() => setShowAddressForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-lg cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}

                {(!displayProfile.addresses || displayProfile.addresses.length === 0) ? (
                  <div className="py-8 text-center space-y-2">
                    <MapPin className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-500 font-medium">No saved addresses yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayProfile.addresses.map((addr: any) => (
                      <div key={addr.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                            {addr.label}
                          </span>
                          <p className="text-xs font-bold text-gray-900 pt-1">{addr.address}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteAddress(addr.id)} 
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors shrink-0"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TERMS & PRIVACY TAB */}
            {activeTab === 'terms' && (
              <motion.div 
                key="terms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-900">Terms & Privacy Policy</h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="space-y-4 text-xs text-gray-600 font-medium max-h-[350px] overflow-y-auto pr-1">
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900">1. Acceptance of Terms</h4>
                    <p className="leading-relaxed">By accessing Mintoo, you agree to comply with our terms of service and delivery guidelines.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900">2. Privacy & Data Protection</h4>
                    <p className="leading-relaxed">We respect your privacy. User contact information and saved delivery addresses are encrypted and used solely for fulfilling orders.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-900">3. Cancellation & Refunds</h4>
                    <p className="leading-relaxed">Orders can be cancelled before kitchen confirmation. Refunds will be credited to your original payment mode within 5-7 working days.</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Brand Info */}
        <div className="text-center pt-4 space-y-1">
          <p className="text-[10px] text-gray-400 font-medium">Crafted with ❤️ for Foodies</p>
        </div>

      </div>
    </div>
  );
}
