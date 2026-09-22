import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useBulkOrderStore } from '../store/bulkOrderStore';
import { useLocationStore } from '../store/locationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, Ticket, Calendar, ShieldCheck, Truck, ChevronLeft, ChevronRight, Loader2, Compass, Search, X, CreditCard, QrCode, Wallet, Banknote, Smartphone, CheckCircle2, Sparkles, Zap, WifiOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCityStore } from '../store/cityStore';
import { calculateDeliveryCharge } from '../types';
import { useSystemStore } from '../store/systemStore';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { haversineDistance, isBTMServiceable } from '../lib/location';
import { Capacitor } from '@capacitor/core';
import { checkIsOnline, useNetworkStatus } from '../utils/network';

import { sendTelegramOrderNotification } from '../utils/telegram';

const WHATSAPP_BULK_NUMBER = '917483187572';
const WHATSAPP_FOOD_NUMBER = '919606001790';

const escHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Sends a Telegram message. Tries server proxy first, falls back to direct API call.
async function sendTelegramMessage(text: string): Promise<void> {
  const proxyWithTimeout = (): Promise<boolean> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        keepalive: true,
      })
        .then((r) => { clearTimeout(timer); resolve(r.ok); })
        .catch(() => { clearTimeout(timer); resolve(false); });
    });

  const sendDirect = async () => {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatIdsStr = import.meta.env.VITE_TELEGRAM_CHAT_IDS;
    if (botToken && chatIdsStr) {
      const chatIds = chatIdsStr.split(',');
      for (const chatId of chatIds) {
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId.trim(), text, parse_mode: 'HTML' }),
          });
        } catch (e) {
          console.error(`Telegram direct error for ${chatId}:`, e);
        }
      }
    }
  };

  try {
    const proxyOk = await proxyWithTimeout();
    if (!proxyOk) {
      console.warn('⚠️ Proxy failed, using direct Telegram call');
      await sendDirect();
    } else {
      console.log('✅ Telegram sent via proxy');
    }
  } catch {
    await sendDirect();
  }
}

const DECORATION_PRICES = { balloons: 150, spray: 50, candles: 30 };

export default function Checkout() {
  useSEO('Checkout', 'Finalize delivery details and confirm your order at Mintoo.');
  const navigate = useNavigate();
  const isBulkOrder = localStorage.getItem('moms_magic_order_type') === 'bulk';

  const { isOffline, setIsOffline } = useNetworkStatus();
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);

  const { items: cartItems, total: cartTotal, clearCart, removeItem } = useCartStore();
  const bulkStore = useBulkOrderStore();
  const { bulkItems, getGrandTotal: getBulkTotal, cake, decoration, additionalServices, resetBulkOrder } = bulkStore;

  const { selectedCity } = useCityStore();
  const { 
    deliveryLocation, 
    openLocationPicker, 
    isLoading, 
    detectLocation, 
    setDeliveryLocation, 
    restaurantLocation, 
    maxDeliveryRange 
  } = useLocationStore();

  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [isManualSearching, setIsManualSearching] = useState(false);

  const handleManualSearch = async (query: string) => {
    setManualSearchQuery(query);
    if (query.trim().length < 3) {
      setManualSearchResults([]);
      return;
    }
    setIsManualSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setManualSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsManualSearching(false);
    }
  };

  const selectManualSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    const dist = haversineDistance(restaurantLocation.lat, restaurantLocation.lng, lat, lon);
    
    setDeliveryLocation({ 
      lat, 
      lng: lon, 
      address: result.display_name, 
      distance: parseFloat(dist.toFixed(1)), 
      isDeliverable: dist <= maxDeliveryRange 
    });
    
    toast.success('Location updated!');
    setIsManualInputOpen(false);
    setManualSearchQuery('');
    setManualSearchResults([]);
  };

  const useCustomTypedAddress = () => {
    if (!manualSearchQuery.trim()) return;
    setDeliveryLocation({
      lat: restaurantLocation.lat,
      lng: restaurantLocation.lng,
      address: manualSearchQuery,
      distance: 2.0, // standard default deliverable distance
      isDeliverable: true
    });
    toast.success('Custom address saved!');
    setIsManualInputOpen(false);
    setManualSearchQuery('');
    setManualSearchResults([]);
  };

  const [formData, setFormData] = useState({ name: '', phone: '', additionalMessage: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settings = useSystemStore((s) => s.settings);

  const { user, profile, deductWalletBalance } = useAuthStore();
  const [useWallet, setUseWallet] = useState(false);
  const [customWalletAmount, setCustomWalletAmount] = useState('');

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
  const [paymentMethod, setPaymentMethod] = useState<'gpay' | 'phonepe' | 'online' | 'cod'>(razorpayKeyId ? 'online' : 'cod');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const activeItems = isBulkOrder
    ? [...bulkItems, ...cartItems.map((item) => ({ ...item, finalQuantity: item.quantity } as any))]
    : cartItems;
  const subtotal = isBulkOrder ? getBulkTotal() + cartTotal : cartTotal;

  const handleApplyCoupon = () => {
    const inputUpper = couponInput.trim().toUpperCase();
    const activeCoupons = settings.coupons || [];
    const matchedCoupon = activeCoupons.find(c => c.code.toUpperCase() === inputUpper && c.isActive);

    if (matchedCoupon) {
      if (subtotal >= matchedCoupon.minOrderValue) {
        setAppliedCoupon(matchedCoupon.code.toUpperCase());
        let msg = `${matchedCoupon.code} applied! `;
        if (matchedCoupon.type === 'free_delivery') msg += 'Free Delivery!';
        else if (matchedCoupon.type === 'fixed_discount') msg += `₹${matchedCoupon.value} off!`;
        else if (matchedCoupon.type === 'percent_discount') msg += `${matchedCoupon.value}% off!`;
        toast.success(msg);
      } else {
        toast.error(`${matchedCoupon.code} is valid only for orders above ₹${matchedCoupon.minOrderValue}`);
      }
    } else {
      setAppliedCoupon('');
      toast.error('Invalid or expired promo code');
    }
  };

  React.useEffect(() => { window.scrollTo(0, 0); }, []);

  // Check store open / restore saved user info
  React.useEffect(() => {
    const adminToken = localStorage.getItem('moms_magic_admin_token');
    const userPhone  = localStorage.getItem('moms_magic_user_phone');
    const isGuest = localStorage.getItem('moms_magic_guest') === 'true';

    if (!isGuest && !userPhone && !user) {
      toast.error('Please log in or continue as guest to checkout.', { id: 'checkout-auth-required' });
      navigate('/');
      return;
    }

    const isAdmin = Boolean(adminToken && adminToken.length > 5) || (settings.adminPhones || []).includes(userPhone || '');

    const isStoreOpen = () => { return true; };
    if (!isStoreOpen() && !isAdmin) {
      toast.error('Ordering is closed! Redirecting to menu.', { id: 'ordering-closed' });
      navigate('/home');
      return;
    }
    const savedName  = localStorage.getItem('moms_magic_user_name');
    const savedPhone = localStorage.getItem('moms_magic_user_phone');
    if (savedName || savedPhone) {
      setFormData((prev) => ({ ...prev, name: savedName || '', phone: savedPhone || '' }));
    }
  }, [settings, navigate, user]);

  React.useEffect(() => {
    if (!isBulkOrder && cartItems.length === 0) {
      navigate('/home');
    }
  }, [isBulkOrder, cartItems, navigate]);


  const distanceKm      = deliveryLocation?.distance ?? 0;
  const baseDeliveryCharge = calculateDeliveryCharge(distanceKm);
  const isNonBTM = deliveryLocation ? (!deliveryLocation.isDeliverable || !isBTMServiceable(deliveryLocation.address, deliveryLocation.lat, deliveryLocation.lng)) : false;

  // Free delivery before 2:00 PM every day
  const now = new Date();
  const isBeforeTwo = now.getHours() < 14;
  const activeCoupons = settings.coupons || [];
  const appliedCouponDetails = appliedCoupon ? activeCoupons.find(c => c.code.toUpperCase() === appliedCoupon) : null;

  const isTillJuly1st = new Date() < new Date('2026-07-02T00:00:00');
  const isFreeDelivery  = (appliedCouponDetails?.type === 'free_delivery') || isBeforeTwo || isTillJuly1st;
  const freeDeliveryReason = appliedCouponDetails?.type === 'free_delivery' ? `${appliedCouponDetails.code} Promo` : isTillJuly1st ? 'Free Delivery till July 1st 🎉' : isBeforeTwo ? 'Free Before 2 PM 🎉' : '';
  const deliveryCharge  = isFreeDelivery ? 0 : baseDeliveryCharge;
  const rainySeasonFee = 5;

  let couponDiscount = 0;
  if (appliedCouponDetails) {
    if (appliedCouponDetails.type === 'fixed_discount') {
      couponDiscount = appliedCouponDetails.value;
    } else if (appliedCouponDetails.type === 'percent_discount') {
      couponDiscount = (subtotal * appliedCouponDetails.value) / 100;
    }
  }

  const grandTotal      = Math.max(0, subtotal + deliveryCharge - couponDiscount);

  const maxWalletDeduction = user && profile ? Math.min(profile.walletBalance, grandTotal) : 0;
  
  // Calculate final wallet deduction used
  let walletDeduction = 0;
  if (user && profile && useWallet) {
    const inputAmount = parseFloat(customWalletAmount);
    if (!isNaN(inputAmount) && inputAmount > 0) {
      walletDeduction = Math.min(inputAmount, maxWalletDeduction);
    } else if (customWalletAmount === '') {
      walletDeduction = maxWalletDeduction;
    }
  }

  const payableAmount = Math.max(0, grandTotal - walletDeduction);

  const handleUseWalletToggle = (checked: boolean) => {
    setUseWallet(checked);
    if (checked && profile) {
      const maxPossible = Math.min(profile.walletBalance, grandTotal);
      setCustomWalletAmount(maxPossible.toString());
    } else {
      setCustomWalletAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // STRICT OFFLINE CHECK BEFORE ANY ACTION
    const online = await checkIsOnline();
    if (!online || !navigator.onLine) {
      setIsOffline(true);
      setShowOfflineDialog(true);
      toast.error('BOSS No internet connection. Please connect to the internet to place your order.', {
        id: 'no-internet-toast',
        duration: 6000,
      });
      return;
    }

    // Validate store open
    const isStoreOpen = () => { return true; };
    const adminToken = localStorage.getItem('moms_magic_admin_token');
    const isAdmin = adminToken === 'mock-jwt-admin-token-123456';

    if (!isStoreOpen() && !isAdmin) {
      toast.error('Ordering is temporarily closed!');
      return;
    }
    if (!formData.name.trim())                      { toast.error('Please enter your name'); return; }
    if (!formData.phone.trim() || formData.phone.length < 10) { toast.error('Please enter a valid phone number'); return; }
    if (!deliveryLocation)                          { toast.error('Please select a delivery location'); openLocationPicker(); return; }
    if (deliveryLocation.distance > 12)             { toast.error('Sorry, not deliverable (location is >12km)'); return; }
    
    localStorage.setItem('moms_magic_user_name',  formData.name.trim());
    localStorage.setItem('moms_magic_user_phone', formData.phone.trim());

    const mapsViewLink = `https://www.google.com/maps?q=${deliveryLocation.lat},${deliveryLocation.lng}`;
    const mapsNavLink  = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation.lat},${deliveryLocation.lng}`;

    const buildWaMessage = (paymentId?: string) => {
      let orderDetails = '';
      if (isBulkOrder) {
        const decos = [
          decoration.balloons > 0 && `${decoration.balloons}x Balloons`,
          decoration.spray    > 0 && `${decoration.spray}x Spray`,
          decoration.candles  > 0 && `${decoration.candles}x Candles`,
        ].filter(Boolean).join(', ');
        orderDetails = [
          `🛒 *FOOD ITEMS:*`,
          bulkItems.map((i) => `• ${i.name} (${i.finalQuantity} units)`).join('\n'),
          cake.required ? `🎂 *Cake:* ${cake.size} - "${cake.text}"` : '',
          decos         ? `🎈 *Decorations:* ${decos}` : '',
          additionalServices.disposablePlates ? `🍽️ Disposable plates added` : '',
          additionalServices.setupServing     ? `👨‍🍳 Setup & Serving team added` : '',
        ].filter(Boolean).join('\n');
      } else {
        orderDetails = `🛒 *ITEMS:*\n` + cartItems.map((item) => {
          let line = `• ${item.quantity}x ${item.name}`;
          if (item.items?.length) line += `\n  (${item.items.join(', ')})`;
          return line;
        }).join('\n');
      }
      return [
        isBulkOrder ? `🎉 *NEW BULK / PARTY ORDER!* 🎉` : `📦 *NEW ORDER!* 📦`,
        ``,
        `👤 *Name:* ${formData.name.trim()}`,
        `📞 *Phone:* ${formData.phone.trim()}`,
        `📍 *City:* ${selectedCity?.name || 'Unknown'}`,
        `🏠 *Address:* ${deliveryLocation.address}`,
        `📏 *Distance:* ${distanceKm}km`,
        ``,
        orderDetails,
        ``,
        `💰 *Subtotal:* ₹${subtotal}`,
        `🌧️ *Rainy Season Fee:* ₹${rainySeasonFee}`,
        `🚚 *Delivery:* ${isFreeDelivery ? `₹0 (${freeDeliveryReason})` : `₹${deliveryCharge}`}`,
        couponDiscount > 0 ? `🎟️ *Coupon Discount:* -₹${couponDiscount}` : '',
        walletDeduction > 0 ? `🎁 *Wallet Used:* -₹${walletDeduction.toFixed(2)}` : '',
        `💵 *GRAND TOTAL:* ₹${payableAmount.toFixed(2)}`,
        paymentId ? `✅ *PAYMENT DONE:* ${paymentId}` : `⚠️ *PAYMENT:* Cash on Delivery`,
        ``,
        `🗺️ *View Map:* ${mapsViewLink}`,
        `🚗 *Navigate:* ${mapsNavLink}`,
        formData.additionalMessage.trim() ? `📝 *Note:* ${formData.additionalMessage.trim()}` : '',
        ``,
        `━━━━━━━━━━━━━━━━`,
        `🚀 *WANT TO ORDER AGAIN?*`,
        `👉 https://momsmagic.shop`,
        `━━━━━━━━━━━━━━━━`,
      ].filter((l) => l !== '').join('\n');
    };

    const buildTgMessage = (paymentId?: string) => {
      let tgDetails = '';
      if (isBulkOrder) {
        const decos = [
          decoration.balloons > 0 && `${decoration.balloons}x Balloons`,
          decoration.spray    > 0 && `${decoration.spray}x Spray`,
          decoration.candles  > 0 && `${decoration.candles}x Candles`,
        ].filter(Boolean).join(', ');
        tgDetails = [
          `🛒 <b>FOOD ITEMS:</b>`,
          bulkItems.map((i) => `• ${escHtml(i.name)} (${i.finalQuantity} units)`).join('\n'),
          cake.required ? `🎂 <b>Cake:</b> ${escHtml(cake.size)} - "${escHtml(cake.text)}"` : '',
          decos         ? `🎈 <b>Decorations:</b> ${escHtml(decos)}` : '',
          additionalServices.disposablePlates ? `🍽️ Disposable plates added` : '',
          additionalServices.setupServing     ? `👨‍🍳 Setup &amp; Serving team added` : '',
        ].filter(Boolean).join('\n');
      } else {
        tgDetails = `🛒 <b>ITEMS:</b>\n` + cartItems.map((item) => {
          let line = `• ${item.quantity}x ${escHtml(item.name)}`;
          if (item.hotelId) line += ` <b>[Kitchen: ${escHtml(item.hotelId)}]</b>`;
          if (item.items?.length) line += `\n  (${item.items.map(escHtml).join(', ')})`;
          return line;
        }).join('\n');
      }
      return [
        isBulkOrder ? `🎉 <b>NEW BULK / PARTY ORDER!</b> 🎉` : `📦 <b>NEW ORDER!</b> 📦`,
        ``,
        `👤 <b>Name:</b> ${escHtml(formData.name.trim())}`,
        `📞 <b>Phone:</b> ${escHtml(formData.phone.trim())}`,
        `📍 <b>City:</b> ${escHtml(selectedCity?.name || 'Unknown')}`,
        `🏠 <b>Address:</b> ${escHtml(deliveryLocation.address)}`,
        `📏 <b>Distance:</b> ${distanceKm}km`,
        ``,
        tgDetails,
        ``,
        `💰 <b>Subtotal:</b> ₹${subtotal}`,
        `🌧️ <b>Rainy Season Fee:</b> ₹${rainySeasonFee}`,
        `${isFreeDelivery ? `<b>Delivery Fee:</b> ₹0 (${freeDeliveryReason})` : `<b>Delivery Fee:</b> ₹${deliveryCharge}`}`,
        `${couponDiscount ? `<b>Coupon Discount:</b> -₹${couponDiscount}` : ''}`,
        `${walletDeduction ? `<b>Wallet Used:</b> -₹${walletDeduction.toFixed(2)}` : ''}`,
        `💵 <b>GRAND TOTAL:</b> ₹${payableAmount.toFixed(2)}`,
        paymentId ? `✅ <b>PAYMENT DONE:</b> ${escHtml(paymentId)}` : `⚠️ <b>PAYMENT:</b> Cash on Delivery`,
        ``,
        `🗺️ <b>View Map:</b> ${escHtml(mapsViewLink)}`,
        `🚗 <b>Navigate:</b> ${escHtml(mapsNavLink)}`,
        formData.additionalMessage.trim() ? `📝 <b>Note:</b> ${escHtml(formData.additionalMessage.trim())}` : '',
        ``,
        `━━━━━━━━━━━━━━━━`,
        `🚀 <b>WANT TO ORDER AGAIN?</b>`,
        `👉 https://momsmagic.shop`,
        `━━━━━━━━━━━━━━━━`,
      ].filter((l) => l !== '').join('\n');
    };

    const completeOrder = async (paymentId?: string) => {
      const orderId = Date.now().toString();

      // Double-check connectivity right before upload
      const onlineNow = await checkIsOnline();
      if (!onlineNow || !navigator.onLine) {
        setIsOffline(true);
        setShowOfflineDialog(true);
        toast.error('BOSS No internet connection. Please connect to the internet to place your order.', {
          id: 'no-internet-toast',
          duration: 6000,
        });
        throw new Error('OFFLINE_ORDER_BLOCKED');
      }

      // Deduct from wallet if logged in and using wallet
      if (user && walletDeduction > 0) {
        await deductWalletBalance(walletDeduction, orderId);
      }

      const waMsg    = buildWaMessage(paymentId);
      const tgMsg    = buildTgMessage(paymentId);

      const itemHotelLocStr = activeItems.find((i: any) => i.hotelLocation || i.location)?.hotelLocation || 
                              activeItems.find((i: any) => i.hotelLocation || i.location)?.location;

      let parsedHotelLocation = { lat: 12.9165, lng: 77.6101, address: 'BTM Layout Kitchen' };
      if (itemHotelLocStr) {
        const match = String(itemHotelLocStr).match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
          parsedHotelLocation = {
            lat: parseFloat(match[1]),
            lng: parseFloat(match[2]),
            address: String(itemHotelLocStr)
          };
        } else {
          parsedHotelLocation = {
            lat: 12.9165,
            lng: 77.6101,
            address: String(itemHotelLocStr)
          };
        }
      }

      const order = {
        id: orderId,
        userId: user?.uid || null,
        userName: formData.name.trim(),
        userPhone: formData.phone.trim().replace(/\D/g, '').slice(-10),
        orderType: isBulkOrder ? 'bulk' : 'regular',
        items: activeItems,
        subtotal,
        rainySeasonFee,
        deliveryCharge,
        grandTotal,
        walletAmountUsed: walletDeduction,
        payableAmount,
        paymentMethod: payableAmount === 0 ? 'wallet' : paymentMethod,
        paymentId: paymentId || null,
        deliveryLocation,
        hotelLocation: parsedHotelLocation,
        status: 'pending',
        createdAt: new Date().toISOString(),
        instructions: formData.additionalMessage.trim(),
      };

      // Mandatory online upload to Firestore (NO fallback timeout race that creates offline orders!)
      try {
        await setDoc(doc(db, 'orders', orderId), order);
      } catch (err: any) {
        console.error('Failed to upload order to server:', err);
        setIsOffline(true);
        setShowOfflineDialog(true);
        toast.error('BOSS No internet connection. Please connect to the internet to place your order.', {
          id: 'no-internet-toast',
          duration: 6000,
        });
        // DO NOT save to local storage, DO NOT clear cart, DO NOT show success toast!
        throw err;
      }

      // ONLY after successful server upload:
      const existing = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
      existing.push(order);
      localStorage.setItem('moms_magic_orders', JSON.stringify(existing));

      // Send Telegram notification
      sendTelegramMessage(tgMsg).catch(console.error);

      // Clear cart / bulk order
      if (isBulkOrder) {
        resetBulkOrder();
        localStorage.removeItem('moms_magic_order_type');
      } else {
        clearCart();
      }

      playSound(SOUNDS.ORDER_SUCCESS);
      toast.success('🎉 Order placed successfully!');
      setTimeout(() => navigate('/track/' + orderId), 500);
    };

    if (payableAmount > 0 && paymentMethod !== 'cod') {
      if (!razorpayKeyId) {
        toast.error('Online payment is not configured yet. Please choose Cash on Delivery.');
        return;
      }

      // Load Razorpay
      const loadRazorpay = () =>
        new Promise<boolean>((resolve) => {
          const script  = document.createElement('script');
          script.src    = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

      setIsSubmitting(true);

      // Create the order server-side first, so the payment signature can
      // later be verified against an order_id/amount pair the client (web
      // or native) never had the chance to tamper with.
      let razorpayOrderId: string;
      try {
        const orderRes = await fetch('/api/create-razorpay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: payableAmount }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.success) {
          throw new Error(orderData.error || 'Failed to start payment');
        }
        razorpayOrderId = orderData.orderId;
      } catch (err) {
        console.error(err);
        toast.error('Could not start payment. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Failed to load Razorpay. Check your connection.');
        setIsSubmitting(false);
        return;
      }

      // Verifies the signature server-side before trusting a payment as
      // real - shared by both the web handler and the native
      // payment.success listener below, since both hand back the same
      // three fields once order_id is set on the checkout options.
      const verifyAndComplete = async (paymentId: string, orderId: string, signature: string) => {
        try {
          const verifyRes = await fetch('/api/verify-razorpay-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.valid) {
            toast.error('Payment could not be verified. If money was deducted, contact support.');
            setIsSubmitting(false);
            return;
          }
          await completeOrder(paymentId);
        } catch (err) {
          console.error(err);
          toast.error('Payment verification failed. If money was deducted, contact support.');
        } finally {
          setIsSubmitting(false);
        }
      };

      const baseOptions: any = {
        key: razorpayKeyId,
        amount: Math.round(payableAmount * 100),
        currency: 'INR',
        name: 'Mintoo',
        description: 'Food Order',
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          await verifyAndComplete(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
        },
        prefill: { name: formData.name, contact: formData.phone },
        theme: { color: '#10B981' },
        modal: { ondismiss: () => setIsSubmitting(false) },
      };

      if (paymentMethod === 'gpay') {
        baseOptions.method = 'upi';
        baseOptions.upi = {
          flow: 'intent',
          app: 'google_pay'
        };
      } else if (paymentMethod === 'phonepe') {
        baseOptions.method = 'upi';
        baseOptions.upi = {
          flow: 'intent',
          app: 'phonepe'
        };
      } else {
        // Standard Checkout / Cards & Other UPI
        baseOptions.config = {
          display: {
            blocks: {
              upi: {
                name: 'Pay using Google Pay, PhonePe or UPI',
                instruments: [
                  { method: 'upi' },
                  { method: 'upi', application: 'google_pay' },
                  { method: 'upi', application: 'phonepe' },
                  { method: 'upi', application: 'paytm' }
                ]
              },
              other: {
                name: 'Other Payment Modes',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' }
                ]
              }
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: false
            }
          }
        };
      }

      const triggerRazorpay = (opts: any) => {
        if (Capacitor.isNativePlatform() && (window as any).RazorpayCheckout) {
          // Native Razorpay Flow for Capacitor - the Cordova/Capacitor
          // plugin returns the same three fields as the web SDK once
          // order_id is set on the options, per Razorpay's own docs, but
          // this hasn't been exercised against a real native build in this
          // environment (no device/emulator available) - if a real device
          // test shows razorpay_signature missing here, that needs
          // investigating before trusting this path, not silently
          // completing the order unverified.
          (window as any).RazorpayCheckout.on('payment.success', async (successCallback: any) => {
            if (!successCallback.razorpay_order_id || !successCallback.razorpay_signature) {
              console.error('Native Razorpay success callback missing order_id/signature - cannot verify:', successCallback);
              toast.error('Payment could not be verified. If money was deducted, contact support.');
              setIsSubmitting(false);
              return;
            }
            await verifyAndComplete(successCallback.razorpay_payment_id, successCallback.razorpay_order_id, successCallback.razorpay_signature);
          });
          (window as any).RazorpayCheckout.on('payment.cancel', () => {
            toast.error('Payment Cancelled');
            setIsSubmitting(false);
          });
          (window as any).RazorpayCheckout.on('payment.failed', (errorCallback: any) => {
            if (opts.method) {
              const fallbackOpts = { ...opts };
              delete fallbackOpts.method;
              delete fallbackOpts.upi;
              triggerRazorpay(fallbackOpts);
            } else {
              toast.error('Payment Failed: ' + (errorCallback?.description || 'Unknown error'));
              setIsSubmitting(false);
            }
          });
          
          (window as any).RazorpayCheckout.open(opts);
        } else {
          // Standard Web Razorpay Flow
          const rzp = new (window as any).Razorpay(opts);
          rzp.on('payment.failed', (r: any) => {
            if (opts.method) {
              toast.error('Direct app launch unavailable. Opening all payment options...');
              const fallbackOpts = { ...opts };
              delete fallbackOpts.method;
              delete fallbackOpts.upi;
              triggerRazorpay(fallbackOpts);
            } else {
              toast.error('Payment Failed: ' + (r?.error?.description || 'Payment error'));
              setIsSubmitting(false);
            }
          });
          rzp.open();
        }
      };

      triggerRazorpay(baseOptions);
    } else {
      setIsSubmitting(true);
      try {
        await completeOrder(undefined);
      } catch (err) {
        console.error(err);
        toast.error('Failed to place order. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 font-black uppercase tracking-[3px] text-[10px] hover:text-orange-500 transition-colors"
          style={{ color: '#000000' }}
        >
          <ChevronLeft className="w-4 h-4" /> Back to Menu
        </motion.button>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none" style={{ color: '#000000' }}>
          {isBulkOrder ? 'Bulk ' : ''}Checkout
        </h1>
        <p className="font-bold uppercase tracking-[2px] text-[10px]" style={{ color: '#000000' }}>
          Confirm your order details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── User Info ── */}
        <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Your Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Name</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-orange-500/40 outline-none font-bold text-gray-900 text-sm transition-all placeholder:text-gray-500"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-[3px]">Contact Number</label>
              <input
                required
                type="tel"
                inputMode="numeric"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-orange-500/40 outline-none font-bold text-gray-900 text-sm transition-all placeholder:text-gray-500"
                placeholder="+91 XXXXXXXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Delivery Location */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-[3px]">Delivery Location</label>
            {deliveryLocation ? (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-sm text-gray-900">{deliveryLocation.name}</span>
                    <p className="text-gray-600 font-medium text-xs leading-relaxed mt-0.5">{deliveryLocation.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-black uppercase border border-emerald-200">
                    📍 {distanceKm} KM from BTM Metro Gate B
                  </div>
                  <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border bg-orange-500/10 text-orange-500 border-orange-500/20">
                    ₹{deliveryCharge} Delivery
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openLocationPicker}
                  className="w-full py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/10 hover:text-orange-500 transition-all flex items-center justify-center gap-2 text-gray-500"
                >
                  <MapPin className="w-3.5 h-3.5" /> Change Location
                </button>

                {isNonBTM && (
                  <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 text-center space-y-2 mt-3">
                    <div className="text-3xl">🚀</div>
                    <h3 className="text-sm sm:text-base font-extrabold text-amber-900">Just wait... We are coming to your area soon!</h3>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-md mx-auto">
                      Mintoo is currently only serving orders in <b>BTM Layout</b> (1st Stage, 2nd Stage, Main Road & Crosses). Please select a BTM Layout address to place your order!
                    </p>
                    <button
                      type="button"
                      onClick={openLocationPicker}
                      className="mt-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      Change Address to BTM Layout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <div>
                    <h3 className="text-sm font-black text-gray-800">Set Delivery Address</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Select location to calculate delivery charges</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Auto-Detect Button */}
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={async () => {
                      const loadId = toast.loading('Detecting your location...');
                      try {
                        await detectLocation();
                        toast.dismiss(loadId);
                        toast.success('Location detected successfully!');
                      } catch (err) {
                        toast.dismiss(loadId);
                        toast.error('Could not auto-detect location. Please use manual entry.');
                        setIsManualInputOpen(true);
                      }
                    }}
                    className="relative overflow-hidden p-4 gradient-brand hover:brightness-110 border border-white/5 rounded-xl transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer text-center text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Compass className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-300" />
                    )}
                    <span className="text-xs font-black text-white uppercase tracking-wider">Auto-Detect</span>
                    <span className="text-[9px] text-white/80 font-bold uppercase tracking-wide">Using GPS</span>
                  </button>

                  {/* Manual Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualInputOpen(!isManualInputOpen);
                    }}
                    className={`p-4 border rounded-xl transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      isManualInputOpen 
                        ? 'bg-brand/20 border-brand text-brand font-extrabold'
                        : 'bg-[#12121f] hover:bg-[#1c1c2e] border-white/10 text-gray-400'
                    }`}
                  >
                    <Search className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-wider">Add Manual</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide">Type address or area</span>
                  </button>
                </div>

                {/* Inline Manual Form and Search */}
                {isManualInputOpen && (
                  <div className="pt-2 space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search area (or type custom address directly)..."
                        value={manualSearchQuery}
                        onChange={(e) => handleManualSearch(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-gray-400"
                      />
                      {isManualSearching && (
                        <div className="absolute right-3 top-3.5">
                          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Results dropdown */}
                    {manualSearchResults.length > 0 && (
                      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-48 overflow-y-auto z-10 relative">
                        {manualSearchResults.map((res: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => selectManualSearchResult(res)}
                            className="px-4 py-3 border-b border-gray-50 hover:bg-orange-50 cursor-pointer flex flex-col"
                          >
                            <span className="font-bold text-xs text-gray-900 truncate">{res.display_name.split(',')[0]}</span>
                            <span className="text-[10px] text-gray-500 truncate mt-0.5">{res.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Button to use custom typed address */}
                    {manualSearchQuery.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={useCustomTypedAddress}
                        className="w-full py-3 bg-gray-200/60 hover:bg-gray-200 text-gray-700 font-black uppercase tracking-wider rounded-xl text-[10px] transition-colors flex items-center justify-center gap-1.5"
                      >
                        Use "{manualSearchQuery}" Directly
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-orange-500/50 uppercase tracking-[3px]">Special Instructions</label>
            <textarea
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-orange-500/40 outline-none font-bold text-gray-900 text-sm transition-all placeholder:text-gray-500 resize-none"
              placeholder="E.g., Extra hot, gate code, ring the bell..."
              value={formData.additionalMessage}
              onChange={(e) => setFormData({ ...formData, additionalMessage: e.target.value })}
            />
          </div>
        </div>

        {/* ── Order Items ── */}
        <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Ticket className="w-4 h-4 text-orange-500" /> {isBulkOrder ? 'Event' : 'Order'} Items
            </h2>
            {isBulkOrder && (
              <div className="px-3 py-1.5 bg-orange-500/10 rounded-full text-[10px] font-black uppercase text-orange-500 border border-orange-500/20 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Bulk
              </div>
            )}
          </div>

          <div className="space-y-3">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                {item.image && (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                    <img
                      src={item.image}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt={item.name}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{item.name}</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">
                    {isBulkOrder ? (item as any).finalQuantity : (item as any).quantity} Unit(s)
                  </p>
                  {item.items?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {item.items.map((sub: string, i: number) => (
                        <li key={i} className="text-gray-500 text-[10px] flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                          {sub}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-base sm:text-lg font-black text-gray-900">
                    ₹{item.price * (isBulkOrder ? (item as any).finalQuantity : (item as any).quantity)}
                  </p>
                  {!isBulkOrder && (
                    <button
                      onClick={() => {
                        removeItem(item.id!);
                        toast.success(`${item.name} removed from cart`);
                      }}
                      className="p-1 hover:text-red-500 text-gray-400 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Summary, Coupon, Payment ── */}
        <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          {/* Free Delivery Before 2 PM Banner */}
          {isTillJuly1st ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <span className="text-xl">🎉</span>
              <div>
                <p className="text-orange-500 font-black text-xs uppercase tracking-widest">Free Delivery Active!</p>
                <p className="text-orange-300/70 text-[11px] font-medium">Free delivery is on us till July 1st!</p>
              </div>
            </div>
          ) : isBeforeTwo ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <span className="text-xl">🎉</span>
              <div>
                <p className="text-orange-500 font-black text-xs uppercase tracking-widest">Free Delivery Active!</p>
                <p className="text-orange-300/70 text-[11px] font-medium">Orders before 2:00 PM get free delivery today</p>
              </div>
            </div>
          ) : null}
          {/* Promo Code */}
          <div className="space-y-3 pb-6 border-b border-gray-200">
            <h3 className="text-[10px] font-black text-orange-500/50 uppercase tracking-[3px]">Promo Code</h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-orange-500/40 outline-none font-bold text-gray-900 uppercase text-sm transition-all placeholder:text-gray-500 min-w-0"
                placeholder="ENTER CODE"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-5 py-3 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 font-black uppercase tracking-widest text-[11px] hover:bg-orange-500/20 transition-all shrink-0"
              >
                Apply
              </button>
            </div>
            {isFreeDelivery && (
              <p className="text-orange-500 text-xs font-bold">✅ Free Delivery — {freeDeliveryReason}</p>
            )}
          </div>

          {/* Wallet Balance Integration */}
          {user && profile && profile.walletBalance > 0 && (
            <div className="space-y-4 pb-6 border-b border-gray-200 text-left">
              <h3 className="text-[10px] font-black text-orange-500/50 uppercase tracking-[3px]">Wallet Balance</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="use-wallet-cb"
                    checked={useWallet}
                    onChange={(e) => handleUseWalletToggle(e.target.checked)}
                    className="w-4.5 h-4.5 accent-[#6366F1] cursor-pointer"
                  />
                  <label htmlFor="use-wallet-cb" className="text-xs font-black uppercase text-gray-900 select-none cursor-pointer tracking-wider">
                    Use Wallet Cash (Available: <span className="text-orange-500">₹{profile.walletBalance}</span>)
                  </label>
                </div>

                {useWallet && (
                  <div className="space-y-2 mt-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Amount to Deduct (₹)</p>
                    <input
                      type="number"
                      max={maxWalletDeduction}
                      min={0}
                      value={customWalletAmount}
                      onChange={(e) => setCustomWalletAmount(e.target.value)}
                      placeholder={`Max deduction: ₹${maxWalletDeduction}`}
                      className="w-full bg-[#111] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-bold outline-none focus:border-orange-200"
                    />
                    {walletDeduction > 0 && (
                      <p className="text-orange-500 text-[9px] font-black uppercase tracking-wider">
                        Applied Wallet Deduction: -₹{walletDeduction}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="space-y-3 pb-6 border-b border-gray-200">
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-[3px]">
              <span>Subtotal</span>
              <span className="text-gray-900 text-lg font-black">₹{subtotal}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-[3px]">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-orange-500" />
                <span>Delivery</span>
              </div>
              <span className="text-lg font-black text-gray-900">
                {isFreeDelivery ? (
                  <div className="text-right">
                    <div>
                      <span className="line-through text-gray-500 mr-2 text-sm">₹{baseDeliveryCharge}</span>
                      <span className="text-orange-500">FREE</span>
                    </div>
                    <p className="text-orange-500/60 text-[10px] font-bold">{freeDeliveryReason}</p>
                  </div>
                ) : `₹${deliveryCharge}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-[3px]">
              <span>Hotel Charges</span>
              <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">FREE</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-[3px]">
              <span>Platform Fee</span>
              <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">FREE</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-[3px]">
              <span>Handling Charges</span>
              <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">FREE</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-bold text-xs uppercase tracking-[3px]">
              <span>Payment Gateway Charges</span>
              <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">FREE</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between items-center text-orange-500 font-bold text-xs uppercase tracking-[3px]">
                <span>Coupon Discount</span>
                <span className="text-lg font-black">-₹{couponDiscount}</span>
              </div>
            )}
            {walletDeduction > 0 && (
              <div className="flex justify-between items-center text-orange-500 font-bold text-xs uppercase tracking-[3px]">
                <span>Wallet Discount</span>
                <span className="text-lg font-black">-₹{walletDeduction}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end pb-2">
            <div>
              <p className="text-orange-500/40 text-[10px] font-black uppercase tracking-[4px] mb-1">
                {walletDeduction > 0 ? 'Payable Amount' : 'Grand Total'}
              </p>
              <p className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter text-gray-900">
                ₹{payableAmount}
              </p>
              {walletDeduction > 0 && (
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mt-1 text-left">
                  (Grand Total: ₹{grandTotal})
                </p>
              )}
            </div>
          </div>

          {/* Swiggy / Zomato Inspired Dark Payment Experience */}
          {payableAmount > 0 ? (
            <div className="glass-card text-white p-5 sm:p-7 rounded-[28px] space-y-6 text-left">
              {/* Subtle Ambient Background Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 blur-[90px] rounded-full pointer-events-none" />

              {/* 100% Secure Badge & Header */}
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <CreditCard className="w-4.5 h-4.5 text-emerald-400" /> Select Payment Method
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold tracking-wide mt-0.5">
                    Fast & Verified Instant Checkout
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Payable Amount</p>
                  <p className="text-2xl sm:text-3xl font-black italic text-emerald-400 tracking-tight mt-0.5">
                    ₹{payableAmount}
                  </p>
                </div>
                <span className="text-[10px] font-black text-gray-400 bg-gray-800 px-3 py-1.5 rounded-xl uppercase tracking-wider border border-gray-700">
                  {walletDeduction > 0 ? `Wallet: -₹${walletDeduction}` : 'Inclusive of Taxes'}
                </span>
              </div>

              {/* Modern Payment Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {razorpayKeyId && (
                <>
                {/* 1. Google Pay */}
                <div
                  onClick={() => setPaymentMethod('gpay')}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    paymentMethod === 'gpay'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500 scale-[1.01]'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-md flex items-center justify-center p-1 shrink-0">
                        <span className="font-black text-sm text-blue-600">G</span>
                        <span className="font-black text-sm text-red-500">P</span>
                        <span className="font-black text-sm text-yellow-500">a</span>
                        <span className="font-black text-sm text-green-500">y</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-white text-sm tracking-tight">Google Pay</p>
                          <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/40 animate-pulse">
                            ⚡ FASTEST
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Fast UPI Payment</p>
                      </div>
                    </div>
                    {paymentMethod === 'gpay' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover:border-gray-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-400 border-t border-gray-800/80 pt-2.5 mt-1">
                    <span>Direct App Launch</span>
                    <span className="text-emerald-400 font-extrabold">Instant UPI</span>
                  </div>
                </div>

                {/* 2. PhonePe */}
                <div
                  onClick={() => setPaymentMethod('phonepe')}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    paymentMethod === 'phonepe'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500 scale-[1.01]'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white shadow-md flex items-center justify-center font-black text-sm shrink-0">
                        पे
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-white text-sm tracking-tight">PhonePe</p>
                          <span className="bg-purple-500/20 text-purple-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-500/40">
                            ✨ ZERO FEE
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Pay via PhonePe</p>
                      </div>
                    </div>
                    {paymentMethod === 'phonepe' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover:border-gray-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-400 border-t border-gray-800/80 pt-2.5 mt-1">
                    <span>Direct App Launch</span>
                    <span className="text-purple-400 font-extrabold">UPI Intent</span>
                  </div>
                </div>

                {/* 3. Cards & Other UPI */}
                <div
                  onClick={() => setPaymentMethod('online')}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    paymentMethod === 'online'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500 scale-[1.01]'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-white text-sm tracking-tight">Cards & Other UPI</p>
                          <span className="bg-blue-500/20 text-blue-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-500/40">
                            ALL OPTIONS
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Paytm, BHIM, CRED, Cards & NetBanking</p>
                      </div>
                    </div>
                    {paymentMethod === 'online' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover:border-gray-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-gray-800/80 pt-2.5 mt-1 text-[8px] font-black uppercase text-gray-400">
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300 font-extrabold">Paytm</span>
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300 font-extrabold">BHIM</span>
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300 font-extrabold">Cards</span>
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-300 font-extrabold">NetBank</span>
                  </div>
                </div>
                </>
                )}

                {/* 4. Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500 scale-[1.01]'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-md flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-white text-sm tracking-tight">Cash on Delivery</p>
                          <span className="bg-amber-500/20 text-amber-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/40">
                            PAY AT DOORSTEP
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Pay with cash when order arrives</p>
                      </div>
                    </div>
                    {paymentMethod === 'cod' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover:border-gray-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-400 border-t border-gray-800/80 pt-2.5 mt-1">
                    <span>No Online Payment Needed</span>
                    <span className="text-amber-400 font-extrabold">Cash</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
              🎉 100% Covered By Wallet cash
            </div>
          )}

          {/* Sticky Bottom Place Order Bar for Mobile & Desktop CTA */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#12121f]/95 border-t border-gray-800/80 z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.5)] md:relative md:bg-transparent md:border-none md:p-0 md:shadow-none">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
              <div className="md:hidden text-left">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {paymentMethod === 'gpay' ? 'Google Pay' : paymentMethod === 'phonepe' ? 'PhonePe' : paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Checkout'}
                </p>
                <p className="text-xl font-black italic text-emerald-400">₹{payableAmount}</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isOffline || isNonBTM}
                className={`flex-1 text-white h-14 sm:h-16 rounded-2xl text-xs sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                  isOffline || isNonBTM
                    ? 'bg-gray-800 text-amber-400 border border-amber-500/40 cursor-not-allowed opacity-90 shadow-none'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {isOffline ? (
                  <>
                    <WifiOff className="w-5 h-5 text-red-400 animate-pulse" />
                    <span>Offline - Internet Required</span>
                  </>
                ) : isNonBTM ? (
                  <>
                    <MapPin className="w-5 h-5 text-amber-400" />
                    <span>Just wait... We are coming to your area soon! (BTM Only)</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {paymentMethod === 'gpay'
                        ? 'Pay with Google Pay'
                        : paymentMethod === 'phonepe'
                        ? 'Pay with PhonePe'
                        : paymentMethod === 'cod'
                        ? 'Place Order (COD)'
                        : 'Place Order & Pay'}
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>

      {/* Full-Screen Offline Alert Dialog */}
      <AnimatePresence>
        {showOfflineDialog && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#161616] border border-red-500/40 rounded-[28px] p-6 text-center shadow-2xl space-y-5 relative overflow-hidden text-left"
            >
              {/* Glow Shimmer */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center animate-pulse">
                <WifiOff className="w-8 h-8" />
              </div>

              <div className="space-y-3 text-center">
                <h3 className="text-lg font-black uppercase tracking-wider text-red-400 flex items-center justify-center gap-2">
                  <span>🚨 Internet Connection Required</span>
                </h3>
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-white font-black text-sm leading-relaxed shadow-inner">
                  "BOSS No internet connection. Please connect to the internet to place your order."
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 text-center">
                Orders cannot be placed offline. Re-connect to Wi-Fi or mobile data to complete your order.
              </p>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    const online = await checkIsOnline();
                    if (online) {
                      setIsOffline(false);
                      setShowOfflineDialog(false);
                      toast.success('✅ Internet connection restored! You can now place your order.');
                    } else {
                      toast.error('BOSS No internet connection. Please connect to the internet to place your order.', { id: 'no-internet-toast' });
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 via-[#F97316] to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Check Connection & Retry</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOfflineDialog(false)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
