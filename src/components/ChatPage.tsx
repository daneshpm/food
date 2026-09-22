// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Send, Phone, MessageSquare, ShieldAlert, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

interface Message {
  id: string;
  senderId: string;
  senderRole: 'customer' | 'rider' | 'admin';
  senderName: string;
  text: string;
  timestamp: any;
}

export default function ChatPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  useSEO("Chat", "Live chat with delivery partner.");

  const [order, setOrder] = useState<any>(null);
  const [userRole, setUserRole] = useState<'customer' | 'rider' | 'admin' | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Identify currently logged in User's Role (customer, rider, admin)
  useEffect(() => {
    const checkRole = async () => {
      const localPhone = localStorage.getItem('moms_magic_user_phone');
      const isGuest = localStorage.getItem('moms_magic_guest') === 'true';

      if (!user) {
        if (localPhone || isGuest) {
          setUserRole('customer');
        } else {
          setAuthError(true);
        }
        setLoading(false);
        return;
      }

      try {
        // 1. Check staff collection
        const staffSnap = await getDoc(doc(db, 'staff', user.uid));
        if (staffSnap.exists()) {
          const role = staffSnap.data().role;
          if (role === 'admin') {
            setUserRole('admin');
            setLoading(false);
            return;
          } else if (role === 'rider') {
            setUserRole('rider');
            setLoading(false);
            return;
          }
        }

        // 2. Check riders collection directly as fallback
        const riderSnap = await getDoc(doc(db, 'riders', user.uid));
        if (riderSnap.exists()) {
          setUserRole('rider');
          setLoading(false);
          return;
        }

        // 3. Default to customer
        setUserRole('customer');
      } catch (err) {
        setUserRole('customer');
      }
      setLoading(false);
    };
    checkRole();
  }, [user]);

  // 2. Fetch Order Details & Enforce Permission Controls
  useEffect(() => {
    if (!orderId || !userRole) return;

    const localPhone = localStorage.getItem('moms_magic_user_phone');
    const isGuest = localStorage.getItem('moms_magic_guest') === 'true';

    if (userRole !== 'admin' && !user && !localPhone && !isGuest) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    const orderDocRef = doc(db, 'orders', orderId);
    const unsubscribeOrder = onSnapshot(orderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = docSnap.data();
        setOrder(orderData);

        // Security check: must be admin, order customer, or order rider
        const isAdmin = userRole === 'admin';
        const clean = (p: string) => p.replace(/\D/g, '').slice(-10);
        const localClean = localPhone ? clean(localPhone) : '';

        const isCustomer = userRole === 'customer' && (
          (user && orderData.userId === user.uid) ||
          (localPhone && orderData.userPhone && clean(orderData.userPhone) === localClean) ||
          isGuest
        );
        const isRider = userRole === 'rider' && user && orderData.riderId === user.uid;

        if (!isAdmin && !isCustomer && !isRider) {
          setAuthError(true);
        }
      } else {
        setAuthError(true); // Order does not exist
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore order subscription error:", error);
      setAuthError(true);
      setLoading(false);
    });

    return () => unsubscribeOrder();
  }, [orderId, userRole, user]);

  // 3. Listen to Chat Messages in Real-time
  useEffect(() => {
    if (!orderId || authError || loading) return;

    const messagesQuery = query(
      collection(db, 'chats', orderId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Firestore messages subscription error:", error);
    });

    return () => unsubscribeMessages();
  }, [orderId, authError, loading]);

  // 4. Auto-Scroll to Latest Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !orderId || !userRole) return;

    const localPhone = localStorage.getItem('moms_magic_user_phone');
    const isGuest = localStorage.getItem('moms_magic_guest') === 'true';

    if (userRole !== 'admin' && !user && !localPhone && !isGuest) return;

    const textToSend = inputText.trim();
    setInputText('');

    const savedName = localStorage.getItem('moms_magic_user_name') || 'Customer';

    try {
      const messagesCollection = collection(db, 'chats', orderId, 'messages');
      await addDoc(messagesCollection, {
        senderId: user?.uid || localPhone || 'guest',
        senderRole: userRole,
        senderName: user?.displayName || user?.email?.split('@')[0] || (userRole === 'admin' ? 'Admin' : savedName),
        text: textToSend,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      toast.error("Failed to send message.");
      setInputText(textToSend); // Restore text
    }
  };

  // 6. Direct phone call logic
  const handleCall = () => {
    if (!order) return;
    const phoneToCall = userRole === 'customer' ? order.riderPhone : order.userPhone;
    if (phoneToCall) {
      window.location.href = `tel:${phoneToCall}`;
    } else {
      toast.error("Contact number unavailable.");
    }
  };

  // Render Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">Initializing chat...</span>
      </div>
    );
  }

  // Render Permission/Auth Error Screen
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black uppercase text-gray-900 tracking-tight">Access Denied</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          You do not have permission to view the communication channel for this order.
        </p>
        <button 
          onClick={() => navigate('/orders')}
          className="bg-gray-900 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-md cursor-pointer active:scale-95"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Calculate chat partner display details
  const isUserCustomer = userRole === 'customer';
  const partnerName = isUserCustomer ? (order?.riderName || 'Rider') : (order?.userName || 'Customer');
  const partnerRole = isUserCustomer ? 'Delivery Partner' : 'Customer';
  const partnerPhone = isUserCustomer ? order?.riderPhone : order?.userPhone;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative h-screen">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-900 active:scale-95 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h3 className="text-sm font-black text-gray-900 leading-none">{partnerName}</h3>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-1">{partnerRole}</p>
          </div>
        </div>

        {/* Display Phone Action */}
        {partnerPhone && (
          <button 
            onClick={handleCall}
            className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 hover:bg-emerald-500 hover:text-white flex items-center justify-center text-emerald-600 transition-colors shrink-0 active:scale-95"
          >
            <Phone className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-24">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8 space-y-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider">No messages yet</p>
            <p className="text-[10px] max-w-xs font-medium leading-relaxed">Send a message to coordinate the delivery instructions or address details.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const localPhone = localStorage.getItem('moms_magic_user_phone');
            const isMe = msg.senderId === (user?.uid || (userRole === 'admin' ? 'admin' : (localPhone || 'guest')));
            return (
              <div 
                key={msg.id} 
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] px-4 py-3 rounded-[22px] text-left shadow-sm ${
                    isMe 
                      ? 'bg-emerald-500 text-white rounded-tr-none' 
                      : 'bg-white text-gray-900 border border-gray-100 rounded-tl-none'
                  }`}
                >
                  <p className="text-xs font-medium leading-relaxed break-words">{msg.text}</p>
                  <div className="flex justify-between items-center gap-4 mt-1.5">
                    {msg.senderRole !== 'customer' && !isMe && (
                      <span className="text-[7px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        {msg.senderRole}
                      </span>
                    )}
                    <span className={`text-[7px] font-bold block ${isMe ? 'text-white/60 ml-auto' : 'text-gray-400'}`}>
                      {msg.timestamp ? new Date(msg.timestamp.toDate ? msg.timestamp.toDate() : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Footer */}
      <div className="bg-white border-t border-gray-100 p-4 fixed bottom-0 left-0 right-0 z-20">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto items-center">
          <input
            type="text"
            placeholder="Type your message here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl py-3.5 px-5 text-xs font-semibold outline-none focus:border-emerald-300 transition-colors placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
