import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, PackageSearch, Loader2, XCircle, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface OrderItem {
  name: string;
  price: number;
  quantity?: number;
  finalQuantity?: number;
}

interface Order {
  id: string;
  createdAt: any;
  grandTotal: number;
  status: string;
  items: OrderItem[];
  orderType: string;
  trackingLink?: string;
  userId?: string;
  userPhone?: string;
  cancelReason?: string;
  returnRequested?: boolean;
  returnReason?: string;
  returnStatus?: string;
}

export default function OrdersPage() {
  useSEO("My Orders", "View your past orders from Mintoo.");
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user, profile } = useAuthStore();
  const localPhone = localStorage.getItem('moms_magic_user_phone');
  
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Changed my mind / Placed by mistake');
  
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState<string>('Quality / Taste Issue');
  const [returnNote, setReturnNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsSubmitting(true);
    try {
      try {
        const orderRef = doc(db, 'orders', cancellingOrder.id);
        await updateDoc(orderRef, {
          status: 'Cancelled',
          cancelReason: cancelReason,
          cancelledAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore cancel sync warning:', err);
      }

      const stored: Order[] = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      const updatedStored = stored.map(o => o.id === cancellingOrder.id ? { ...o, status: 'Cancelled', cancelReason } : o);
      localStorage.setItem('moms_magic_orders', JSON.stringify(updatedStored));

      setOrders(prev => prev.map(o => o.id === cancellingOrder.id ? { ...o, status: 'Cancelled', cancelReason } : o));

      toast.success('Order cancelled successfully.');
      setCancellingOrder(null);
    } catch (error) {
      toast.error('Failed to cancel order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returningOrder) return;
    setIsSubmitting(true);
    try {
      try {
        const orderRef = doc(db, 'orders', returningOrder.id);
        await updateDoc(orderRef, {
          returnRequested: true,
          returnReason: returnReason,
          returnNote: returnNote,
          returnStatus: 'Pending',
          returnedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore return sync warning:', err);
      }

      const stored: Order[] = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      const updatedStored = stored.map(o => o.id === returningOrder.id ? { ...o, returnRequested: true, returnReason, returnStatus: 'Pending' } : o);
      localStorage.setItem('moms_magic_orders', JSON.stringify(updatedStored));

      setOrders(prev => prev.map(o => o.id === returningOrder.id ? { ...o, returnRequested: true, returnReason, returnStatus: 'Pending' } : o));

      toast.success('Return / Refund request submitted! Our team will contact you.');
      setReturningOrder(null);
      setReturnNote('');
    } catch (error) {
      toast.error('Failed to submit return request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const normalizePhone = (p: string) => p ? p.replace(/\D/g, '').slice(-10) : '';
    const userPhoneToMatch = normalizePhone(profile?.phone || user?.phoneNumber || localPhone || '');

    // Always load local orders first as instant fallback
    const loadLocalOrders = () => {
      try {
        const stored: Order[] = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
        return stored.filter(o => {
          if (user?.uid && o.userId === user.uid) return true;
          if (userPhoneToMatch && o.userPhone && normalizePhone(o.userPhone) === userPhoneToMatch) return true;
          if (!user?.uid && !userPhoneToMatch) return true; // show all local if no auth
          return false;
        });
      } catch { return []; }
    };

    const localOrders = loadLocalOrders();
    if (localOrders.length > 0) {
      localOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(localOrders);
      setLoading(false);
    }

    if (!userPhoneToMatch && (!user || !user.uid)) {
      setLoading(false);
      return;
    }

    let unsubUser: (() => void) | null = null;
    let unsubPhone: (() => void) | null = null;

    let userOrdersList: Order[] = [];
    let phoneOrdersList: Order[] = [];

    const combineAndSet = () => {
      const firestoreOrders = [...userOrdersList, ...phoneOrdersList];
      const allOrders = [...firestoreOrders, ...localOrders];
      const unique = allOrders.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(unique);
      setLoading(false);
    };

    if (user && user.uid) {
      const qUser = query(collection(db, 'orders'), where('userId', '==', user.uid));
      unsubUser = onSnapshot(qUser, (snapshot) => {
        const arr: Order[] = [];
        snapshot.forEach(d => arr.push({ id: d.id, ...d.data() } as Order));
        userOrdersList = arr;
        combineAndSet();
      }, (error) => {
        console.warn("Firestore orders blocked, using local cache:", error.message);
        combineAndSet();
      });
    }

    if (userPhoneToMatch) {
      const qPhone = query(collection(db, 'orders'), where('userPhone', '==', userPhoneToMatch));
      unsubPhone = onSnapshot(qPhone, (snapshot) => {
        const arr: Order[] = [];
        snapshot.forEach(d => arr.push({ id: d.id, ...d.data() } as Order));
        phoneOrdersList = arr;
        combineAndSet();
      }, (error) => {
        console.warn("Phone orders fetch blocked, using local cache:", error.message);
        combineAndSet();
      });
    }

    return () => {
      if (unsubUser) unsubUser();
      if (unsubPhone) unsubPhone();
    };
  }, [user, profile, localPhone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user && !localPhone) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/5">
          <PackageSearch className="w-10 h-10 animate-bounce text-emerald-400" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
            OOPS BOSS FORGET TO ORDER
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm font-semibold">
            No order history found for this device yet. Place your first order to start tracking live delivery!
          </p>
        </div>
        <button 
          onClick={() => navigate('/home')} 
          className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          Explore Yummy Menu 
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 pb-32">
      <div className="max-w-3xl mx-auto space-y-10 mt-6">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ x: -5 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 hover:border-orange-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-black italic uppercase text-gray-900 tracking-tighter">My Orders</h1>
            <p className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">{orders.length} Past Order(s)</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-[40px] border border-gray-200 p-8 space-y-4">
            <PackageSearch className="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />
            <h3 className="text-2xl font-black italic uppercase tracking-tight text-gray-900">
              OOPS BOSS FORGET TO ORDER
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm font-bold max-w-sm mx-auto">
              You haven't placed any food orders yet! Treat yourself to something delicious from Mintoo.
            </p>
            <button 
              onClick={() => navigate('/home')} 
              className="mt-4 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-xs rounded-2xl shadow-md transition-all cursor-pointer"
            >
              Order Delicious Food Now 
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const isCancelled = order.status?.toLowerCase() === 'cancelled';
              const isDelivered = order.status?.toLowerCase() === 'delivered';
              const isCanCancel = !isCancelled && !isDelivered && order.status?.toLowerCase() !== 'out for delivery';

              return (
                <div key={order.id} className="bg-white border border-gray-200 rounded-[30px] p-6 hover:border-orange-200 transition-colors">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                    <div>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Order ID: {order.id.slice(0, 8)}</p>
                      <p className="text-gray-900 text-sm font-bold mt-1">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-500 font-black italic text-xl">₹{order.grandTotal}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mt-2 border ${
                        isCancelled ? 'bg-red-50 text-red-600 border-red-200' :
                        order.returnRequested ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        order.status === 'Preparing' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        order.status === 'Out For Delivery' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        isDelivered ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        'bg-gray-100 text-gray-900 border-gray-200'
                      }`}>
                        {isCancelled ? 'Cancelled' : order.returnRequested ? 'Return Requested' : (order.status || 'Pending')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">{item.quantity || item.finalQuantity || 1}x {item.name}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-orange-500/70 text-[10px] font-bold italic mt-2">+ {order.items.length - 3} more items</p>
                    )}
                  </div>

                  {/* Actions Section */}
                  <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                    {/* Live Track Button */}
                    {!isCancelled && !isDelivered && (
                      <button
                        onClick={() => navigate(`/track/${order.id}`)}
                        className="w-full text-center py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
 Track Order Live
                      </button>
                    )}

                    {/* Action buttons row */}
                    <div className="flex gap-2">
                      {/* Cancel Order Button */}
                      {isCanCancel && (
                        <button
                          onClick={() => setCancellingOrder(order)}
                          className="flex-1 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel Order
                        </button>
                      )}

                      {/* Return / Refund Order Button */}
                      {(isDelivered || order.status?.toLowerCase() === 'out for delivery') && !order.returnRequested && !isCancelled && (
                        <button
                          onClick={() => setReturningOrder(order)}
                          className="flex-1 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Return / Refund Order
                        </button>
                      )}
                    </div>

                    {/* Return Requested status info */}
                    {order.returnRequested && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-[10px] font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Return request under review. Status: {order.returnStatus || 'Pending'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CANCEL ORDER MODAL */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600 border-b border-gray-100 pb-3">
                <XCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-black uppercase tracking-wider">Cancel Order</h3>
              </div>

              <p className="text-gray-600 text-xs font-semibold">
                Are you sure you want to cancel order <span className="font-bold text-gray-900">#{cancellingOrder.id.slice(0, 8)}</span>?
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Select Reason for Cancellation:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-red-500"
                >
                  <option value="Changed my mind / Placed by mistake">Changed my mind / Placed by mistake</option>
                  <option value="Order is taking too long">Order is taking too long</option>
                  <option value="Need to change delivery address">Need to change delivery address</option>
                  <option value="Need to modify item selection">Need to modify item selection</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCancellingOrder(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Keep Order
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleConfirmCancel}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RETURN / REFUND ORDER MODAL */}
      <AnimatePresence>
        {returningOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600 border-b border-gray-100 pb-3">
                <RotateCcw className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-black uppercase tracking-wider">Return / Refund Order</h3>
              </div>

              <p className="text-gray-600 text-xs font-semibold">
                Submit a return/refund request for order <span className="font-bold text-gray-900">#{returningOrder.id.slice(0, 8)}</span>.
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Reason for Return / Refund:
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-amber-500 mb-3"
                >
                  <option value="Quality / Taste Issue">Quality / Taste Issue</option>
                  <option value="Damaged or Spilled Packaging">Damaged or Spilled Packaging</option>
                  <option value="Incorrect or Missing Items">Incorrect or Missing Items</option>
                  <option value="Food Delivered Cold">Food Delivered Cold</option>
                  <option value="Other Issue">Other Issue</option>
                </select>

                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Additional Details (Optional):
                </label>
                <textarea
                  rows={3}
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Describe what went wrong..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReturningOrder(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleConfirmReturn}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
