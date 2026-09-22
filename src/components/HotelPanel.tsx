import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, CheckCircle, AlertCircle, Package, Power, EyeOff, RotateCcw } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { motion, AnimatePresence } from 'framer-motion';
import IncomingOrderPopup from './IncomingOrderPopup';
import InstallBanner from './InstallBanner';
import OfflineBanner from './OfflineBanner';
import { requestNotificationPermission } from '../utils/notifications';
import { sendHotelStatusNotification } from '../utils/telegram';

export default function HotelPanel() {
  useSEO("Kitchen Portal", "Hotel/Restaurant dashboard for managing live orders.");
  const navigate = useNavigate();

  const [hotelId, setHotelId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState<string>("Kitchen Partner");
  const [assignedFood, setAssignedFood] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  // Dismissed/Cleared Orders State
  const [clearedOrderIds, setClearedOrderIds] = useState<string[]>([]);
  const [acknowledgedOrderIds, setAcknowledgedOrderIds] = useState<string[]>([]);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);

  // Load Cleared Orders list from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('moms_magic_cleared_kitchen_orders');
      if (stored) setClearedOrderIds(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Check for incoming orders
  useEffect(() => {
    if (incomingOrder) return;
    const newPending = activeOrders.find(
      (o) => o.status === 'pending' && !clearedOrderIds.includes(o.id) && !acknowledgedOrderIds.includes(o.id)
    );
    if (newPending) {
      setIncomingOrder(newPending);
    }
  }, [activeOrders, clearedOrderIds, acknowledgedOrderIds, incomingOrder]);

  // Request notifications on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Firebase Auth check + role verification. Trusts only a real, server-
  // verified Firebase Auth session (established by api/hotel-auth.cjs after
  // password verification) - no client-side localStorage bypass, and no
  // longer fails open on a lookup error.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        navigate('/hotel-login', { replace: true });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'staff', user.uid));
        if (snap.exists() && snap.data().role === 'hotel') {
          setHotelId(user.uid);
          setHotelName(snap.data().name || snap.data().email?.split('@')[0] || "Kitchen Partner");
        } else {
          toast.error('Access denied. Kitchen role required.');
          await signOut(auth);
          navigate('/hotel-login', { replace: true });
        }
      } catch (err) {
        console.error('Kitchen role verification failed:', err);
        toast.error('Could not verify access. Please log in again.');
        await signOut(auth);
        navigate('/hotel-login', { replace: true });
      }
      setChecking(false);
    });
    return () => unsub();
  }, [navigate]);

  // Load orders (realtime Firestore + local cache fallback)
  useEffect(() => {
    if (!hotelId) return;

    const loadOrdersFromSnapshot = (snapshotDocs: any[]) => {
      const remoteOrders: any[] = snapshotDocs.map(d => ({ id: d.id, ...d.data() }));
      
      let localOrders: any[] = [];
      try {
        localOrders = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      } catch (_) {}

      // Merge remote and local orders by ID
      const orderMap = new Map<string, any>();
      localOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
      remoteOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });

      const allOrders = Array.from(orderMap.values());

      // Filter active non-completed orders
      const activeList = allOrders.filter((o: any) => {
        const st = (o.status || '').toLowerCase();
        return st !== 'delivered' && st !== 'cancelled' && st !== 'completed';
      });

      activeList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      if (assignedFood) {
        const filtered = activeList.filter((order: any) => {
          return order.items?.some((item: any) =>
            item.name.toLowerCase().trim() === assignedFood.toLowerCase().trim()
          );
        }).map((order: any) => ({
          ...order,
          items: order.items?.filter((item: any) => item.name.toLowerCase().trim() === assignedFood.toLowerCase().trim())
        }));
        setActiveOrders(filtered);
      } else {
        setActiveOrders(activeList);
      }
    };

    const ordersCol = collection(db, 'orders');
    const unsubscribe = onSnapshot(
      ordersCol,
      (snapshot) => {
        loadOrdersFromSnapshot(snapshot.docs);
      },
      (error) => {
        console.warn('Firestore orders snapshot fallback to local:', error);
        loadOrdersFromSnapshot([]);
      }
    );

    // Initial check from local storage immediately
    loadOrdersFromSnapshot([]);

    return () => unsubscribe();
  }, [hotelId, assignedFood]);

  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Signed out successfully.");
    setHotelId(null);
  };

  const updateLocalOrderStatus = (orderId: string, status: string) => {
    try {
      const stored: any[] = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      const idx = stored.findIndex(o => o.id === orderId);
      if (idx !== -1) { stored[idx].status = status; localStorage.setItem('moms_magic_orders', JSON.stringify(stored)); }
    } catch (_) {}
  };

  const acceptOrder = async (orderId: string) => {
    const targetOrder = activeOrders.find(o => o.id === orderId);
    updateLocalOrderStatus(orderId, 'Preparing');
    setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Preparing' } : o));
    toast.success("Order accepted. Kitchen is preparing!");
    try { 
      await updateDoc(doc(db, 'orders', orderId), { status: 'Preparing' }); 
      if (targetOrder) sendHotelStatusNotification(targetOrder, 'Preparing');
    } catch (_) {}
  };

  const handlePopupAccept = async (orderId: string) => {
    setAcknowledgedOrderIds(prev => [...prev, orderId]);
    setIncomingOrder(null);
    await acceptOrder(orderId);
  };

  const handlePopupReject = (orderId: string) => {
    setAcknowledgedOrderIds(prev => [...prev, orderId]);
    setIncomingOrder(null);
    // Locally hide it. If we want it fully rejected, we can update firestore, but typically another kitchen might take it.
    dismissOrder(orderId);
  };

  const markReadyForDelivery = async (orderId: string) => {
    const targetOrder = activeOrders.find(o => o.id === orderId);
    updateLocalOrderStatus(orderId, 'Ready for Delivery');
    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success("Order marked as Ready! Awaiting Rider.");
    try { 
      await updateDoc(doc(db, 'orders', orderId), { status: 'Ready for Delivery' }); 
      if (targetOrder) sendHotelStatusNotification(targetOrder, 'Ready for Delivery');
    } catch (_) {}
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    const targetOrder = activeOrders.find(o => o.id === orderId);
    updateLocalOrderStatus(orderId, 'Cancelled');
    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success("Order cancelled.");
    try { 
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'Cancelled',
        cancelReason: 'Cancelled by Kitchen',
        cancelledAt: new Date().toISOString()
      }); 
      if (targetOrder) sendHotelStatusNotification(targetOrder, 'Cancelled', 'Cancelled by Kitchen');
    } catch (_) {}
  };

  // Clear/Dismiss Order locally
  const dismissOrder = (orderId: string) => {
    const updated = [...clearedOrderIds, orderId];
    setClearedOrderIds(updated);
    localStorage.setItem('moms_magic_cleared_kitchen_orders', JSON.stringify(updated));
    toast.success("Order dismissed from view.");
  };

  // Restore cleared orders
  const restoreClearedOrders = () => {
    setClearedOrderIds([]);
    localStorage.removeItem('moms_magic_cleared_kitchen_orders');
    toast.success("Cleared orders restored!");
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated - the useEffect above already redirects to
  // /hotel-login; this is just the brief placeholder shown until that
  // navigation completes. (Previously this rendered a second, redundant
  // login form here with its own plaintext-password Firestore query AND a
  // hardcoded backdoor of 16 guessable email/password combinations that
  // granted full kitchen panel access - removed entirely, not just hidden.)
  if (!hotelId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter out locally cleared/dismissed orders
  const visibleOrders = activeOrders.filter(order => !clearedOrderIds.includes(order.id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pt-24 pb-32 px-4 md:px-6">
      <OfflineBanner />
      <InstallBanner />
      <AnimatePresence>
        {incomingOrder && (
          <IncomingOrderPopup
            order={incomingOrder}
            mode="hotel"
            onAccept={handlePopupAccept}
            onReject={handlePopupReject}
          />
        )}
      </AnimatePresence>
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="bg-white rounded-[35px] p-6 sm:p-8 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 text-orange-500 flex items-center justify-center shadow-sm text-xl">
              👨‍🍳
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">{hotelName} Dashboard</h2>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mt-0.5">
                {assignedFood ? `Cooking: ${assignedFood}` : "Manage Live Orders"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/rider')}
              className="bg-blue-50 border border-blue-200 hover:border-blue-300 text-blue-600 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              🛵 Switch to Rider Portal
            </button>
            {clearedOrderIds.length > 0 && (
              <button
                onClick={restoreClearedOrders}
                className="bg-orange-50 border border-orange-200 hover:border-orange-300 text-orange-600 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Restore ({clearedOrderIds.length})
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              <Power className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" /> Action Required ({visibleOrders.length})
            </h3>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-200">
              <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No active orders right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleOrders.map(order => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-3xl p-6 flex flex-col space-y-4 shadow-sm text-left relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order #{order.id.slice(0,6)}</p>
                      <h4 className="font-bold text-gray-900 text-sm mt-1">{order.userName}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                        order.status === 'pending' ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 'bg-orange-50 text-orange-500 border-orange-200'
                      }`}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => dismissOrder(order.id)}
                        className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        title="Dismiss Order"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <ul className="space-y-2.5">
                      {order.items?.map((item: any, idx: number) => {
                        const isKitchenItem = assignedFood ? item.name.toLowerCase().trim() === assignedFood.toLowerCase().trim() : true;
                        if (!isKitchenItem) return null;
                        return (
                          <li key={idx} className="text-xs font-semibold flex items-center justify-between gap-4 text-gray-900 font-bold">
                            <span>
                              {item.quantity || item.finalQuantity || 1}x {item.name}
                            </span>
                            {assignedFood && (
                              <span className="bg-orange-100 text-orange-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">Your Item</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {order.instructions && (
                      <p className="mt-3 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                        📝 {order.instructions}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="flex-1 bg-orange-500 text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept & Prepare
                      </button>
                    )}
                    {order.status === 'Preparing' && (
                      <button
                        onClick={() => markReadyForDelivery(order.id)}
                        className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 cursor-pointer"
                      >
                        <Package className="w-4 h-4" /> Mark as Ready
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
