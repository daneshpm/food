import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Truck, 
  TrendingUp, 
  History, 
  Power, 
  Phone, 
  AlertCircle,
  Clock,
  Compass,
  PhoneCall,
  MessageSquare,
  Plus,
  EyeOff,
  RotateCcw,
  ChefHat
} from 'lucide-react';
import AnimatedCounter from './ui/AnimatedCounter';
import { 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc,
  serverTimestamp,
  runTransaction 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import IncomingOrderPopup from './IncomingOrderPopup';
import InstallBanner from './InstallBanner';
import OfflineBanner from './OfflineBanner';
import { requestNotificationPermission } from '../utils/notifications';

export default function DeliveryDashboard() {
  useSEO("Rider Portal", "Delivery Partner dashboard for live tracking, routing, and earnings updates.");
  const navigate = useNavigate();

  // Auth Tab config
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);

  // Registration States
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Status Toggles
  const [isOnline, setIsOnline] = useState(false);

  // Phone config prompt
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  // Active / History Orders State
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [pastDeliveries, setPastDeliveries] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'assigned' | 'available' | 'history'>('available');

  // Dismissed orders locally
  const [clearedOrderIds, setClearedOrderIds] = useState<string[]>([]);

  // Load Cleared Orders list from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('moms_magic_cleared_rider_orders');
      if (stored) setClearedOrderIds(JSON.parse(stored));
    } catch (_) {}
    requestNotificationPermission();
  }, []);

  const [acknowledgedAvailableOrders, setAcknowledgedAvailableOrders] = useState<string[]>([]);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);

  // Check for incoming Rapido-style orders
  useEffect(() => {
    if (!isOnline) {
      setIncomingOrder(null);
      return;
    }
    
    if (incomingOrder) {
      // If the currently shown incoming order is no longer in availableOrders (e.g. someone else accepted it), dismiss the popup!
      const stillAvailable = availableOrders.some(o => o.id === incomingOrder.id);
      if (!stillAvailable) {
        setIncomingOrder(null);
        toast.error("Order was accepted by another rider.");
      }
      return;
    }

    const newPending = availableOrders.find(
      (o) => !clearedOrderIds.includes(o.id) && !acknowledgedAvailableOrders.includes(o.id)
    );
    if (newPending) {
      setIncomingOrder(newPending);
    }
  }, [availableOrders, clearedOrderIds, acknowledgedAvailableOrders, incomingOrder, isOnline]);

  // Verify Auth State on mount with local storage fallback
  useEffect(() => {
    const cachedRider = localStorage.getItem('rider_auth');
    if (cachedRider) {
      try {
        const rData = JSON.parse(cachedRider);
        setRiderId(rData.id || 'rider-partner-1');
        setRiderProfile(rData);
        setIsOnline(true);
        return;
      } catch (_) {}
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        if (!localStorage.getItem('rider_auth')) {
          setRiderId(null);
          setRiderProfile(null);
        }
        return;
      }

      // First check staff collection for 'rider' role
      try {
        const staffSnap = await getDoc(doc(db, 'staff', user.uid));
        if (staffSnap.exists() && staffSnap.data().role === 'rider') {
          setRiderId(user.uid);
          const riderSnap = await getDoc(doc(db, 'riders', user.uid));
          if (riderSnap.exists()) {
            const data = riderSnap.data();
            setRiderProfile(data);
            setIsOnline(true);
            if (!data.phone || data.phone.trim() === '') {
              setShowPhonePrompt(true);
            }
          } else {
            const staffData = staffSnap.data();
            const initialProfile = { 
              name: staffData.email?.split('@')[0] || 'Rider Partner', 
              earnings: 0, 
              status: 'online', 
              phone: staffData.phone || '9999999999' 
            };
            setRiderProfile(initialProfile);
            setIsOnline(true);
            await setDoc(doc(db, 'riders', user.uid), initialProfile);
          }
          return;
        }
      } catch (_) {}

      // Fallback: check riders collection directly
      try {
        const riderRef = doc(db, 'riders', user.uid);
        const riderSnap = await getDoc(riderRef);
        if (riderSnap.exists()) {
          setRiderId(user.uid);
          const data = riderSnap.data();
          setRiderProfile(data);
          setIsOnline(true);
        } else {
          setRiderId(user.uid);
          const initialProfile = { name: user.displayName || user.email?.split('@')[0] || 'Rider Partner', earnings: 0, status: 'online', phone: '' };
          setRiderProfile(initialProfile);
          setIsOnline(true);
          setShowPhonePrompt(true);
        }
      } catch (_) {
        setRiderId(user.uid);
        const initialProfile = { name: user.displayName || user.email?.split('@')[0] || 'Rider Partner', earnings: 0, status: 'online', phone: '' };
        setRiderProfile(initialProfile);
        setIsOnline(true);
        setShowPhonePrompt(true);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    
    try {
      const riderRef = doc(db, 'riders', riderId!);
      await setDoc(riderRef, { phone: newPhone }, { merge: true });
      setRiderProfile((prev: any) => ({ ...prev, phone: newPhone }));
      setShowPhonePrompt(false);
      toast.success("Phone number saved successfully! 📱");
    } catch (err) {
      toast.error("Failed to save phone number.");
    }
  };

  // 1. Live Geolocation GPS Tracking while Online + Simulation Fallback
  useEffect(() => {
    if (!isOnline || !riderId) return;

    let watchId: number | null = null;
    let simIntervalId: any = null;

    const updateLocation = async (lat: number, lng: number) => {
      try {
        const riderRef = doc(db, 'riders', riderId);
        await setDoc(riderRef, {
          currentLocation: {
            lat,
            lng,
            lastUpdated: new Date().toISOString()
          }
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update location in Firestore:", err);
      }
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
        },
        (error) => {
          console.warn("GPS watch failed, launching simulation fallback:", error.message);
          startSimulation();
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    } else {
      startSimulation();
    }

    function startSimulation() {
      let step = 0;
      const totalSteps = 20;
      const startLat = 12.9165;
      const startLng = 77.6101;
      
      let destLat = 12.9200;
      let destLng = 77.6150;

      simIntervalId = setInterval(() => {
        const activeOrder = assignedOrders.find(o => o.status === 'Out For Delivery');
        if (activeOrder && activeOrder.deliveryLocation) {
          destLat = activeOrder.deliveryLocation.lat || 12.9200;
          destLng = activeOrder.deliveryLocation.lng || 77.6150;
        }

        if (step <= totalSteps) {
          const progress = step / totalSteps;
          const currentLat = startLat + (destLat - startLat) * progress;
          const currentLng = startLng + (destLng - startLng) * progress;
          updateLocation(currentLat, currentLng);
          step++;
        } else {
          updateLocation(destLat, destLng);
        }
      }, 3000);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (simIntervalId) clearInterval(simIntervalId);
    };
  }, [isOnline, riderId, assignedOrders]);

  // 2. Real-Time Listeners for Assigned Orders + Available (Firestore + Local Merge)
  useEffect(() => {
    if (!riderId) return;

    const loadOrdersFromSnapshot = (docs: any[]) => {
      const remoteOrders: any[] = docs.map(d => ({ id: d.id, ...d.data() }));

      let localOrders: any[] = [];
      try {
        localOrders = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      } catch (_) {}

      const orderMap = new Map<string, any>();
      localOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
      remoteOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });

      const allOrders = Array.from(orderMap.values());

      // Filter assigned orders
      const assigned = allOrders.filter(o => o.riderId === riderId || o.assignedDeliveryPartnerId === riderId);
      const activeAssigned = assigned.filter(o => {
        const st = (o.status || '').toLowerCase();
        return st !== 'delivered' && st !== 'completed' && st !== 'cancelled';
      });
      const pastAssigned = assigned.filter(o => {
        const st = (o.status || '').toLowerCase();
        return st === 'delivered' || st === 'completed' || st === 'cancelled';
      });

      activeAssigned.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      pastAssigned.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setAssignedOrders(activeAssigned);
      setPastDeliveries(pastAssigned);

      // Filter available orders ready for delivery pickup
      const available = allOrders.filter(o => {
        const st = (o.status || '').toLowerCase().trim();
        const isReady = st === 'ready for delivery' || st === 'ready' || st === 'preparing' || st === 'pending';
        const notAssigned = !o.riderId || o.riderId === '';
        return isReady && notAssigned;
      });

      available.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setAvailableOrders(available);
    };

    const ordersCol = collection(db, 'orders');
    const unsubscribe = onSnapshot(
      ordersCol,
      (snapshot) => {
        loadOrdersFromSnapshot(snapshot.docs);
      },
      (error) => {
        console.warn('Rider orders fallback to local storage:', error);
        loadOrdersFromSnapshot([]);
      }
    );

    // Initial check from local storage immediately
    loadOrdersFromSnapshot([]);

    return () => unsubscribe();
  }, [riderId]);

  // Login handler
  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoginLoading(true);

    const em = email.trim().toLowerCase();
    const pw = password.trim();

    if (
      (em === 'rider@mintoo.com' || em === 'partner@minto.com' || em === 'rider@minto.com') &&
      (pw === 'rider123' || pw === '123456' || pw === 'minto@2026')
    ) {
      const riderData = {
        id: 'rider-partner-1',
        name: 'Mintoo Delivery Partner',
        email: em,
        earnings: 180,
        status: 'online',
        phone: '9999999999'
      };
      localStorage.setItem('rider_auth', JSON.stringify(riderData));
      setRiderId(riderData.id);
      setRiderProfile(riderData);
      setIsOnline(true);
      toast.success("Rider session initialized! 🛵");
      setLoginLoading(false);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const riderData = {
        id: cred.user.uid,
        name: cred.user.displayName || cred.user.email?.split('@')[0] || 'Rider Partner',
        email: cred.user.email || '',
        earnings: 0,
        status: 'online',
        phone: cred.user.phoneNumber || '9999999999'
      };
      localStorage.setItem('rider_auth', JSON.stringify(riderData));
      setRiderId(cred.user.uid);
      setRiderProfile(riderData);
      setIsOnline(true);
      toast.success("Rider session initialized! 🛵");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Google Login Handler
  const handleRiderGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const riderRef = doc(db, 'riders', user.uid);
      const riderSnap = await getDoc(riderRef);
      
      if (riderSnap.exists()) {
        setRiderId(user.uid);
        const data = riderSnap.data();
        setRiderProfile(data);
        setIsOnline(data.status === 'online');
        toast.success(`Welcome back, ${data.name || 'Partner'}! 🛵`);
      } else {
        const initialProfile = {
          name: user.displayName || user.email?.split('@')[0] || 'Rider Partner',
          email: user.email || '',
          earnings: 0,
          status: 'offline',
          phone: user.phoneNumber || '',
          createdAt: new Date().toISOString()
        };
        await setDoc(riderRef, initialProfile);
        setRiderId(user.uid);
        setRiderProfile(initialProfile);
        toast.success("Rider profile created successfully! 🎉");
        if (!initialProfile.phone) {
          setShowPhonePrompt(true);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Google login cancelled.");
      } else {
        toast.error(err.message || "Google login failed.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Register Handler
  const handleRiderRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerPhone.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      toast.error("All fields are required.");
      return;
    }
    if (registerPhone.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    setLoginLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword.trim());
      const user = cred.user;

      const initialProfile = {
        name: registerName.trim(),
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        earnings: 0,
        status: 'offline',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'riders', user.uid), initialProfile);
      
      setRiderId(user.uid);
      setRiderProfile(initialProfile);
      toast.success("Rider account registered successfully! 🛵");
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRiderLogout = async () => {
    if (riderId && riderId !== 'mock-rider-id-12345') {
      try {
        const riderRef = doc(db, 'riders', riderId);
        await setDoc(riderRef, { status: 'offline' }, { merge: true });
      } catch (_) {}
    }
    localStorage.removeItem('rider_auth');
    await signOut(auth);
    setRiderId(null);
    setRiderProfile(null);
    toast.success("Signed out successfully.");
    navigate('/staff', { replace: true });
  };

  // Toggle Online/Offline State
  const toggleOnlineStatus = async () => {
    if (!riderId) return;
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    try {
      const riderRef = doc(db, 'riders', riderId);
      await setDoc(riderRef, { 
        status: nextStatus ? 'online' : 'offline',
        name: riderProfile?.name || 'Rider',
        phone: riderProfile?.phone || ''
      }, { merge: true });
      toast.success(`You are now ${nextStatus ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    } catch (err) {
      toast.error("Failed to update status.");
      setIsOnline(isOnline); // revert
    }
  };

  // Helper: update a local order field
  const updateLocalOrder = (orderId: string, fields: Record<string, any>) => {
    try {
      const stored: any[] = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      const idx = stored.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...fields };
        localStorage.setItem('moms_magic_orders', JSON.stringify(stored));
      }
    } catch (e) { /* ignore */ }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);

      // Perform atomic database transaction to prevent 2 riders accepting the same order
      const success = await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error("Order no longer exists.");
        }

        const data = orderSnap.data();
        // Concurrency Check: Abort if already claimed by any other rider!
        if (data.riderId || (data.assignedDeliveryPartnerId && data.assignedDeliveryPartnerId !== riderId)) {
          return false;
        }

        transaction.update(orderRef, {
          riderId: riderId,
          assignedDeliveryPartnerId: riderId,
          assignedDeliveryPartnerName: riderProfile?.name || 'Rider Partner',
          assignedDeliveryPartnerPhone: riderProfile?.phone || '',
          riderName: riderProfile?.name || 'Rider Partner',
          riderPhone: riderProfile?.phone || '',
          riderStatus: 'accepted',
          updatedAt: serverTimestamp()
        });
        return true;
      });

      if (success) {
        updateLocalOrder(orderId, { riderId: riderId, riderStatus: 'accepted' });
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
        toast.success("Delivery accepted! 🛵");
      } else {
        toast.error("Order was already accepted by another rider.");
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (err: any) {
      console.error("Atomic accept transaction failed:", err);
      toast.error(err.message || "Failed to assign order.");
    }
  };

  const handlePopupAccept = async (orderId: string) => {
    setAcknowledgedAvailableOrders(prev => [...prev, orderId]);
    setIncomingOrder(null);
    await handleAcceptOrder(orderId);
  };

  const handlePopupReject = async (orderId: string) => {
    setAcknowledgedAvailableOrders(prev => [...prev, orderId]);
    setIncomingOrder(null);
    dismissRiderOrder(orderId);
    toast.error("Order rejected. Next rider will be notified.");
  };

  const handleRejectOrder = async (orderId: string) => {
    updateLocalOrder(orderId, { riderId: '', riderStatus: 'rejected' });
    setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success("Order rejected.");
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { riderId: '', riderStatus: 'rejected' });
    } catch (err) { /* silently ignore */ }
  };

  // Start Delivery
  const handleStartDelivery = async (orderId: string) => {
    updateLocalOrder(orderId, { status: 'Out For Delivery', riderStatus: 'delivering' });
    setAssignedOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Out For Delivery', riderStatus: 'delivering' } : o));
    toast.success("Delivery run started! Drive safe. 🛵");
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: 'Out For Delivery', riderStatus: 'delivering' });
    } catch (err) { /* silently ignore */ }
  };

  // Complete Delivery (Dynamic payout ₹15/km calculation)
  const handleCompleteDelivery = async (orderId: string) => {
    if (!riderId) return;
    const order = assignedOrders.find(o => o.id === orderId);
    const distanceVal = order?.deliveryLocation?.distance || 3;
    const payout = Math.round(distanceVal * 15);
    const newEarnings = (riderProfile?.earnings || 0) + payout;

    updateLocalOrder(orderId, { status: 'delivered', riderStatus: 'delivered', deliveredAt: new Date().toISOString() });
    setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
    setRiderProfile((prev: any) => ({ ...prev, earnings: newEarnings }));
    toast.success(`Order Delivered successfully! +₹${payout} earned. 💵`);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: 'delivered', riderStatus: 'delivered', deliveredAt: new Date().toISOString() });
      const riderRef = doc(db, 'riders', riderId);
      await setDoc(riderRef, { earnings: newEarnings }, { merge: true });
    } catch (err) { /* silently ignore */ }
  };

  // Dismiss/Clear order locally
  const dismissRiderOrder = (orderId: string) => {
    const updated = [...clearedOrderIds, orderId];
    setClearedOrderIds(updated);
    localStorage.setItem('moms_magic_cleared_rider_orders', JSON.stringify(updated));
    toast.success("Order dismissed from view.");
  };

  // Restore cleared orders
  const restoreRiderOrders = () => {
    setClearedOrderIds([]);
    localStorage.removeItem('moms_magic_cleared_rider_orders');
    toast.success("Cleared orders restored!");
  };

  // Render Login Panel
  if (!riderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white border border-gray-200 rounded-[35px] w-full max-w-md p-8 shadow-sm space-y-6 relative overflow-hidden text-left"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 to-orange-500" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="space-y-2 mt-4 text-center">
            <Truck className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 mt-4">
              RIDER <span className="text-orange-500">PORTAL</span>
            </h2>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
              Delivery Partner Portal Access
            </p>
          </div>

          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setAuthTab('login')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                authTab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('register')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                authTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Register
            </button>
          </div>

          {authTab === 'login' ? (
            <div className="space-y-4">
              {/* Instant 1-Click Demo Access Button */}
              <button
                type="button"
                onClick={() => {
                  const riderData = {
                    id: 'rider-partner-1',
                    name: 'Mintoo Delivery Partner',
                    email: 'rider@mintoo.com',
                    earnings: 250,
                    status: 'online',
                    phone: '9999999999'
                  };
                  localStorage.setItem('rider_auth', JSON.stringify(riderData));
                  setRiderId(riderData.id);
                  setRiderProfile(riderData);
                  setIsOnline(true);
                  toast.success("Rider Dashboard Active! 🛵");
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
              >
                <span>⚡ Instant Rider Login (1-Click Demo)</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-gray-400 text-[9px] font-black uppercase tracking-widest">Or Enter Credentials</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <form onSubmit={handleRiderLogin} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Rider Email</label>
                  <input
                    type="email"
                    placeholder="rider@mintoo.com"
                    value={email || 'rider@mintoo.com'}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password || 'rider123'}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:brightness-105 active:scale-95 text-white font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Log In Partner <LogIn className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleRiderRegister} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  maxLength={10}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="partner@minto.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 outline-none focus:border-orange-200 transition-all font-bold text-xs text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:brightness-105 active:scale-95 text-white font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Register Partner <Plus className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[9px] font-black uppercase tracking-widest">Or Continue With</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            type="button"
            onClick={handleRiderGoogleLogin}
            disabled={loginLoading}
            className="w-full border border-gray-200 hover:border-orange-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.513 0-6.386-2.87-6.386-6.39 0-3.52 2.873-6.39 6.386-6.39 1.637 0 3.125.617 4.266 1.624l3.053-3.05C19.262 2.378 15.932 1 12.241 1 6.033 1 1 6.033 1 12.24c0 6.208 5.033 11.24 11.24 11.24 5.86 0 10.74-4.21 10.74-10.24 0-.64-.078-1.258-.22-1.956H12.24z"
              />
            </svg>
            Sign In with Google
          </button>
        </motion.div>
      </div>
    );
  }

  // Filter out locally cleared/dismissed orders
  const visibleAvailable = availableOrders.filter(o => !clearedOrderIds.includes(o.id));
  const visibleAssigned = assignedOrders.filter(o => !clearedOrderIds.includes(o.id));

  // Calculate earnings
  const completedCount = pastDeliveries.filter(o => (o as any).status === 'delivered').length;

  return (
    <div className="min-h-screen bg-white text-gray-900 pt-24 pb-48 px-4 md:px-6">
      <OfflineBanner />
      <InstallBanner />
      <AnimatePresence>
        {incomingOrder && (
          <IncomingOrderPopup
            order={incomingOrder}
            mode="rider"
            onAccept={handlePopupAccept}
            onReject={handlePopupReject}
            autoRejectTimeSeconds={20}
          />
        )}
      </AnimatePresence>
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Dashboard Info */}
        <div className="luxury-card rounded-[35px] p-6 sm:p-10 border border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-lg text-lg font-black shrink-0 ${
              isOnline ? 'bg-orange-50 border-orange-200 text-orange-500 shadow-brand/20' : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}>
              {isOnline ? '🟢' : '🔴'}
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">{riderProfile?.name}</h2>
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mt-0.5">Delivery Partner Active Session</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate('/hotel')}
              className="bg-orange-50 border border-orange-200 hover:border-orange-300 text-orange-600 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" /> Switch to Kitchen Portal
            </button>
            {clearedOrderIds.length > 0 && (
              <button
                onClick={restoreRiderOrders}
                className="bg-orange-50 border border-orange-200 hover:border-orange-300 text-orange-600 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Restore ({clearedOrderIds.length})
              </button>
            )}
            
            {/* Status Switcher */}
            <button
              onClick={toggleOnlineStatus}
              className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isOnline 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-gray-900' 
                  : 'bg-orange-500 text-black hover:brightness-105 shadow-brand/10'
              }`}
            >
              <Power className="w-4 h-4" />
              {isOnline ? "Go Offline" : "Go Online"}
            </button>

            {/* Logout button */}
            <button
              onClick={handleRiderLogout}
              className="bg-gray-50 border border-gray-200 hover:border-gray-200 text-gray-500 hover:text-gray-900 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Earning Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left">
            <TrendingUp className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Earnings</p>
            <AnimatedCounter value={riderProfile?.earnings || 0} format={(n) => `₹${Math.round(n)}`} className="block text-3xl font-black italic text-gray-900 mt-1" />
          </div>
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left">
            <CheckCircle className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Deliveries Done</p>
            <AnimatedCounter value={completedCount} format={(n) => `${Math.round(n)} Orders`} className="block text-3xl font-black italic text-gray-900 mt-1" />
          </div>
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left col-span-2 sm:col-span-1">
            <Clock className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Commission Rate</p>
            <h3 className="text-xl font-black italic text-orange-500 mt-2">₹15 / km</h3>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3.5 text-center text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'available' ? 'bg-orange-500 text-black shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Available ({visibleAvailable.length})
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`flex-1 py-3.5 text-center text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'assigned' ? 'bg-orange-500 text-black shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Assigned ({visibleAssigned.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3.5 text-center text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-orange-500 text-black shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            History
          </button>
        </div>

        {/* Dynamic tabs content */}
        <div>
          {activeTab === 'available' ? (
            <div className="space-y-6">
              {!isOnline && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  Please toggle status to ONLINE to receive order assignments.
                </div>
              )}
              {visibleAvailable.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
                  <Truck className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No available deliveries</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleAvailable.map((order) => {
                    const distance = order.deliveryLocation?.distance || 3;
                    const payout = Math.round(distance * 15);
                    return (
                      <div key={order.id} className="bg-white border border-gray-200 rounded-3xl p-6 text-left space-y-4 hover:border-orange-200 transition-all shadow-sm relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">#{order.id.slice(0, 8)}</p>
                            <h4 className="font-bold text-gray-900 text-sm mt-1">{order.deliveryLocation?.address.slice(0, 30)}...</h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-[8px] font-black uppercase border border-green-200">
                              Ready for Delivery
                            </span>
                            <button
                              onClick={() => dismissRiderOrder(order.id)}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer"
                              title="Dismiss Order"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Distance</p>
                            <p className="text-gray-900 font-bold text-sm">{distance} km</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Earn</p>
                            <p className="text-orange-500 font-black text-sm">₹{payout}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={!isOnline}
                          className="w-full bg-orange-500 text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Claim Delivery
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'assigned' ? (
            <div className="space-y-6">
              {!isOnline && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  Please toggle status to ONLINE to activate Geolocation GPS tracking and receive order assignments.
                </div>
              )}

              {visibleAssigned.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
                  <Truck className="w-12 h-12 text-gray-500 mx-auto mb-4 animate-bounce" />
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No active deliveries assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleAssigned.map((order) => {
                    const customerLoc = order.deliveryLocation;
                    const hotelLat = order.hotelLocation?.lat || 12.9165;
                    const hotelLng = order.hotelLocation?.lng || 77.6101;
                    const custLat = customerLoc?.lat || 12.9200;
                    const custLng = customerLoc?.lng || 77.6150;

                    const distance = customerLoc?.distance || 3;
                    const payout = Math.round(distance * 15);
                    const mapLink = `https://www.google.com/maps/dir/?api=1&origin=${hotelLat},${hotelLng}&destination=${custLat},${custLng}`;
                    
                    return (
                      <div key={order.id} className="bg-white border border-gray-200 rounded-3xl p-6 text-left space-y-6 hover:border-orange-200 transition-all relative">
                        {/* Status bar */}
                        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                          <div>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Order ID: #{order.id.slice(0, 8)}</p>
                            <p className="text-gray-900 text-xs font-semibold mt-1">Items: {order.items.map((i: any) => `${i.quantity || i.finalQuantity || 1}x ${i.name}`).join(', ')}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="bg-orange-50 border border-orange-200 text-orange-500 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
                              {(order as any).status}
                            </span>
                            <button
                              onClick={() => dismissRiderOrder(order.id)}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer"
                              title="Dismiss Order"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Customer & address details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Customer Details</p>
                            <h4 className="text-base font-extrabold text-gray-900">{order.userName}</h4>
                            <p className="text-xs text-gray-500 font-semibold">{order.userPhone}</p>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Delivery Address</p>
                            <h4 className="text-xs font-bold text-gray-900 uppercase leading-relaxed">{customerLoc?.address}</h4>
                            <p className="text-[10px] text-orange-500 font-black uppercase tracking-wider">Distance: {distance} km (Earn: ₹{payout})</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                          {/* Unconfirmed riderStatus: Accept/Reject */}
                          {(!order.riderStatus || order.riderStatus === 'assigned') && (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(order.id)}
                                className="flex-1 bg-orange-500 text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                              >
                                Accept Order
                              </button>
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                className="flex-1 bg-gray-50 border border-gray-200 text-red-500 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl hover:bg-red-500 hover:text-gray-900 transition-all cursor-pointer"
                              >
                                Reject Order
                              </button>
                            </>
                          )}

                          {/* Accepted (order as any).status: Start Delivery */}
                          {order.riderStatus === 'accepted' && (
                            <button
                              onClick={() => handleStartDelivery(order.id)}
                              className="flex-1 bg-orange-500 text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Navigation className="w-4 h-4" /> Start Delivery Run
                            </button>
                          )}

                          {/* Out for Delivery status: Complete Delivery */}
                          {order.riderStatus === 'delivering' && (
                            <button
                              onClick={() => handleCompleteDelivery(order.id)}
                              className="flex-1 gradient-brand text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Complete Delivery
                            </button>
                          )}

                          {/* Navigation Link Launchers — Hotel Pickup + Customer Delivery */}
                          {order.riderStatus !== 'delivered' && (
                            <div className="flex flex-col gap-2 w-full">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${hotelLat},${hotelLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-amber-50 border border-amber-300 hover:border-amber-500 text-amber-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                              >
                                <Compass className="w-4 h-4" /> 🍽️ Navigate to Hotel (Pickup)
                              </a>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&origin=${hotelLat},${hotelLng}&destination=${custLat},${custLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-blue-50 border border-blue-300 hover:border-blue-500 text-blue-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                              >
                                <Compass className="w-4 h-4" /> 🏠 Navigate to Customer (Delivery)
                              </a>
                            </div>
                          )}

                           <div className="flex gap-2">
                            <a
                              href={`tel:${order.userPhone}`}
                              className="bg-gray-50 border border-gray-200 hover:border-orange-500 text-gray-900 px-4 py-4 rounded-xl flex items-center justify-center transition-all"
                            >
                              <PhoneCall className="w-4 h-4 text-orange-500" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* History and Completed Deliveries list */
            <div className="space-y-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900 text-left">Completed Deliveries</h3>
              
              {pastDeliveries.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No delivery history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastDeliveries.map((order) => {
                    const payout = Math.round((order.deliveryLocation?.distance || 3) * 15);
                    return (
                      <div key={order.id} className="bg-white/40 border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4 text-left">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 text-sm font-bold">{order.userName}</p>
                            <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[7px] font-black uppercase px-2 py-0.5 rounded">
                              {(order as any).status}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1">ID: #{order.id.slice(0, 8)} • Completed: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'Just now'}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-orange-500 font-black italic text-lg">+₹{payout}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Phone Number Prompt Modal */}
      <AnimatePresence>
        {showPhonePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-[30px] w-full max-w-sm p-6 shadow-2xl space-y-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6 text-orange-500" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Enter Phone Number</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  Customers need your phone number to contact you for deliveries.
                </p>
              </div>

              <form onSubmit={handleSavePhone} className="space-y-4">
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10-DIGIT MOBILE NUMBER"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 outline-none focus:border-orange-300 transition-all font-bold text-center text-sm text-gray-900 tracking-[2px]"
                />
                
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Save & Continue
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
