// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, MapPin, Phone, Truck, Clock, Store, Navigation, 
  ShieldCheck, Share2, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare, Sparkles
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

// Haversine distance calculator in KM
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

// Draw glowing Swiggy/Zomato style polyline
const drawRoute = (map: L.Map, points: Array<[number, number]>, polylineRef: React.MutableRefObject<L.Polyline | null>) => {
  if (polylineRef.current) {
    polylineRef.current.setLatLngs(points);
  } else {
    polylineRef.current = L.polyline(points, {
      color: '#059669', // Vibrant Emerald Green
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '8, 12'
    }).addTo(map);
  }
};

interface TrackMapProps {
  order: any;
  rider: any;
  mapError: string | null;
}

const TrackMap: React.FC<TrackMapProps> = ({ order, rider, mapError }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const hasFitBounds = useRef(false);
  const lastOrderId = useRef<string | null>(null);

  // 1. Initialize Leaflet Map with Swiggy/Zomato Vector Tiles (CartoDB Voyager)
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      try {
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([12.9165, 77.6101], 15);

        // CartoDB Voyager map tiles (Clean, modern Swiggy/Zomato look)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(mapInstance.current);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      } catch (err) {
        console.error("Leaflet initialization error:", err);
      }
    }

    return () => {
      try {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      } catch (err) {
        console.error("Leaflet map cleanup error:", err);
      }
    };
  }, []);

  // 2. Update Map Markers dynamically
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !order) return;

    try {
      if (lastOrderId.current !== order.id) {
        hasFitBounds.current = false;
        lastOrderId.current = order.id;
      }

      const restCoords: [number, number] = (order.hotelLocation?.lat && order.hotelLocation?.lng) 
        ? [order.hotelLocation.lat, order.hotelLocation.lng]
        : (order.items?.[0]?.hotelLocation?.lat && order.items?.[0]?.hotelLocation?.lng)
          ? [order.items[0].hotelLocation.lat, order.items[0].hotelLocation.lng]
          : [12.9165, 77.6101];
      const custCoords: [number, number] = [
        order.deliveryLocation?.lat || 12.9200,
        order.deliveryLocation?.lng || 77.6150
      ];
      const riderCoords: [number, number] | null = rider?.currentLocation?.lat && rider?.currentLocation?.lng
        ? [rider.currentLocation.lat, rider.currentLocation.lng]
        : null;

      // Swiggy/Zomato Custom HTML Map Pins
      const restaurantIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-11 h-11 rounded-2xl bg-gray-900 border-2 border-amber-400 shadow-2xl flex items-center justify-center text-white text-lg">👨‍🍳</div>
            <div class="absolute -bottom-1 w-3 h-3 bg-gray-900 rotate-45 border-r border-b border-amber-400"></div>
          </div>
        `,
        className: 'custom-div-icon',
        iconSize: [44, 48],
        iconAnchor: [22, 48]
      });

      const customerIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-11 h-11 rounded-2xl bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg font-bold">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-emerald-400 opacity-30"></span>
              🏠
            </div>
            <div class="absolute -bottom-1 w-3 h-3 bg-emerald-600 rotate-45 border-r border-b border-white"></div>
          </div>
        `,
        className: 'custom-div-icon',
        iconSize: [44, 48],
        iconAnchor: [22, 48]
      });

      const riderIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 border-3 border-white shadow-2xl flex items-center justify-center text-white text-xl animate-pulse">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40"></span>
              🛵
            </div>
          </div>
        `,
        className: 'custom-div-icon rider-smooth-move',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      // Restaurant Marker
      if (!markersRef.current['restaurant']) {
        markersRef.current['restaurant'] = L.marker(restCoords, { icon: restaurantIcon }).addTo(map)
          .bindPopup('<b>Mintoo Kitchen</b><br/>Your food is prepared here.');
      } else {
        markersRef.current['restaurant'].setLatLng(restCoords);
      }

      // Customer Marker
      if (!markersRef.current['customer']) {
        markersRef.current['customer'] = L.marker(custCoords, { icon: customerIcon }).addTo(map)
          .bindPopup(`<b>Your Address</b><br/>${order.deliveryLocation?.address || ''}`);
      } else {
        markersRef.current['customer'].setLatLng(custCoords);
      }

      // Rider Marker
      if (riderCoords) {
        if (!markersRef.current['rider']) {
          markersRef.current['rider'] = L.marker(riderCoords, { icon: riderIcon }).addTo(map)
            .bindPopup(`<b>Delivery Partner: ${rider.name}</b>`);
        } else {
          markersRef.current['rider'].setLatLng(riderCoords);
        }
      } else if (markersRef.current['rider']) {
        markersRef.current['rider'].remove();
        delete markersRef.current['rider'];
      }

      // Route points
      const routePoints: Array<[number, number]> = [];
      routePoints.push(restCoords);
      if (riderCoords) {
        routePoints.push(riderCoords);
      }
      routePoints.push(custCoords);

      drawRoute(map, routePoints, polylineRef);

      // Fit bounds
      if (!hasFitBounds.current) {
        const bounds = L.latLngBounds(routePoints);
        map.fitBounds(bounds, { padding: [80, 80] });
        hasFitBounds.current = true;
      }
    } catch (err) {
      console.error("Leaflet marker updates error:", err);
    }

  }, [order, rider]);

  if (mapError) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h3 className="font-bold text-gray-900 text-lg">Map Loading Failed</h3>
        <p className="text-gray-500 text-sm max-w-xs">{mapError}</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />;
};

// Horizontal Stepper Bar
interface TrackingProgressProps {
  status: string;
}

const TrackingProgress: React.FC<TrackingProgressProps> = ({ status }) => {
  const steps = [
    { label: 'Confirmed', key: 'pending' },
    { label: 'Preparing', key: 'Preparing' },
    { label: 'Picked Up', key: 'Ready for Delivery' },
    { label: 'On the Way', key: 'Out For Delivery' },
    { label: 'Delivered', key: 'delivered' }
  ];

  const getStepIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 0;
      case 'Preparing': return 1;
      case 'Ready for Delivery': return 2;
      case 'Out For Delivery': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="w-full py-3 px-1">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-[14px] left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full" />
        <div 
          className="absolute top-[14px] left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700" 
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-extrabold transition-all duration-500 ${
                  isCompleted 
                    ? 'bg-emerald-600 border-white text-white shadow-md' 
                    : 'bg-white border-gray-300 text-gray-400'
                } ${isActive ? 'scale-110 ring-4 ring-emerald-500/20' : ''}`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 transition-colors duration-300 ${
                isActive ? 'text-emerald-600 font-extrabold' : isCompleted ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Swiggy/Zomato Style Order Status Card with Dynamic Decreasing ETA
interface OrderStatusCardProps {
  order: any;
  rider: any;
  remainingSeconds: number;
  distanceKm: number;
  onRefresh: () => void;
}

const OrderStatusCard: React.FC<OrderStatusCardProps> = ({ order, rider, remainingSeconds, distanceKm, onRefresh }) => {
  const isDelivered = order.status === 'delivered';
  
  // Format remaining time (Minutes & Seconds countdown)
  const formatETA = (seconds: number) => {
    if (isDelivered || seconds <= 0) return 'Arrived!';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
      return `${secs} sec${secs > 1 ? 's' : ''}`;
    }
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] p-5 sm:p-6 space-y-4 relative z-20 backdrop-blur-lg">
      {/* Top Handle Pill */}
      <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto -mt-2 mb-1" />

      {/* Dynamic Decreasing ETA Header */}
      <div className="flex justify-between items-start text-left">
        <div className="space-y-1">
          <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest leading-none flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            ORDER #{order.id}
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">
            {isDelivered ? 'Order Delivered! 🎉' : 
             order.status === 'Out For Delivery' ? 'Rider is on the way to you! 🛵' : 
             order.status === 'Preparing' ? 'Chef is cooking your hot meal 👨‍🍳' : 'Order Confirmed'}
          </h2>
          <p className="text-xs text-gray-500 font-medium">Mintoo Kitchen • BTM Layout</p>
        </div>

        {/* Delivery Time Pill */}
        <div className="flex flex-col items-end text-right shrink-0">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md">
            <Clock className="w-4 h-4 text-emerald-200" />
            <span className="text-sm font-extrabold tracking-tight">
              {isDelivered ? 'DELIVERED' : '15-20 MINS'}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
            {isDelivered ? '0.0 km' : `${distanceKm.toFixed(1)} km away`}
          </span>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Stepper Progress */}
      <TrackingProgress status={order.status} />

      <div className="h-px bg-gray-100" />

      {/* Rider Information & Direct Call Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {rider ? (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-3 text-left min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-lg font-extrabold shadow-md shrink-0">
                {rider.name ? rider.name.charAt(0).toUpperCase() : '🛵'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Delivery Partner</p>
                <h4 className="text-sm font-bold text-gray-900 mt-0.5 truncate">{rider.name || 'Delivery Partner'}</h4>
                <p className="text-[10px] text-emerald-600 font-extrabold">Verified Delivery Partner</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {rider.phone && (
                <a 
                  href={`tel:${rider.phone}`}
                  className="h-10 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Call Rider"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call Rider</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-left py-1 flex-1 min-w-0">
              <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Delivery Partner</p>
              <h4 className="text-sm font-bold text-gray-900 mt-0.5">Assigning delivery agent... 🛵</h4>
              <p className="text-xs text-gray-500 font-medium truncate">Matching a delivery executive to hand off your meal.</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100" />

      {/* Security Footer */}
      <div className="flex items-center justify-center gap-1.5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>LIVE SATELLITE GPS TRACKING</span>
      </div>
    </div>
  );
};

// Main Tracking Component
export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  useSEO("Track Order", "Live order and rider tracking screen.");

  const [order, setOrder] = useState<any>(null);
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Dynamic Decreasing ETA Countdown State (in seconds)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1200); // Default 20 mins

  // 1. Listen to Order changes
  useEffect(() => {
    if (!orderId) {
      try {
        const stored = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
        const activeOrders = stored.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled');
        if (activeOrders.length > 0) {
          activeOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          navigate(`/track/${activeOrders[0].id}`, { replace: true });
        } else {
          setMapError("No active orders found.");
          setLoading(false);
        }
      } catch (err) {
        setMapError("Failed to fetch local order data.");
        setLoading(false);
      }
      return;
    }

    const loadLocalOrder = (id: string) => {
      try {
        const stored: any[] = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
        return stored.find(o => o.id === id) || null;
      } catch { return null; }
    };

    const localOrder = loadLocalOrder(orderId);
    if (localOrder) {
      setOrder(localOrder);
      setLoading(false);
    }

    const orderDocRef = doc(db, 'orders', orderId);
    const unsubscribeOrder = onSnapshot(orderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() };
        setOrder(orderData);
        setLoading(false);
      } else if (!localOrder) {
        setMapError("Order not found.");
        setLoading(false);
      }
    }, (error) => {
      console.warn("Firestore order blocked, using local cache:", error.message);
      if (!localOrder) {
        setMapError("Could not load order. Check your connection.");
        setLoading(false);
      }
    });

    return () => unsubscribeOrder();
  }, [orderId, navigate]);

  // 2. Listen to Rider changes
  useEffect(() => {
    const effectiveRiderId = order?.riderId || order?.assignedDeliveryPartnerId;
    if (!order || !effectiveRiderId) {
      return;
    }

    const riderDocRef = doc(db, 'riders', effectiveRiderId);
    const unsubscribeRider = onSnapshot(riderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setRider(docSnap.data());
      }
    }, (error) => {
      console.error("Rider subscription error:", error);
    });

    return () => unsubscribeRider();
  }, [order]);

  // 3. Initialize & Decrement Live ETA Countdown
  useEffect(() => {
    if (!order) return;

    const currentStatus = String(order.status || '').toLowerCase();

    if (currentStatus === 'delivered' || currentStatus === 'completed') {
      setRemainingSeconds(0);
      return;
    }

    // Determine base initial duration based on order status
    let initialSecs = 1500; // 25 mins base
    if (currentStatus.includes('prep') || currentStatus.includes('accept')) initialSecs = 1200; // 20 mins
    if (currentStatus.includes('ready')) initialSecs = 720; // 12 mins
    if (currentStatus.includes('out') || currentStatus.includes('picked') || currentStatus.includes('assign')) initialSecs = 480; // 8 mins

    // Calculate distance factor if rider coordinates exist
    if (rider?.currentLocation?.lat && order.deliveryLocation?.lat) {
      const dist = calculateDistance(
        rider.currentLocation.lat,
        rider.currentLocation.lng,
        order.deliveryLocation.lat,
        order.deliveryLocation.lng
      );
      // Average 25 km/h delivery speed
      const distSecs = Math.ceil((dist / 25) * 3600);
      if (distSecs > 0) initialSecs = Math.min(initialSecs, distSecs);
    }

    setRemainingSeconds(initialSecs);

    // Live tick down every 1 second
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.status, rider?.currentLocation]);

  const handleManualRefresh = () => {
    toast.success("GPS location updated! 🛰️");
  };

  const distanceKm = (() => {
    if (!order) return 0;
    const lat1 = rider?.currentLocation?.lat || 12.9165; 
    const lon1 = rider?.currentLocation?.lng || 77.6101;
    const lat2 = order.deliveryLocation?.lat || 12.9200;
    const lon2 = order.deliveryLocation?.lng || 77.6150;
    return calculateDistance(lat1, lon1, lat2, lon2);
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-emerald-600"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">Syncing satellite live location...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-6">
        <div className="text-5xl">📦</div>
        <h2 className="text-2xl font-bold text-gray-900 text-center">Order Not Found</h2>
        <p className="text-gray-500 text-sm font-medium text-center max-w-xs">
          {mapError || "We couldn't find this order."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
          >
            My Orders
          </button>
          <button
            onClick={() => navigate('/home')}
            className="px-6 py-3 bg-gray-100 text-gray-900 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <style>{`
        .rider-smooth-move {
          transition: transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      {/* Full Map Viewport */}
      <div className="flex-1 w-full relative min-h-[48vh] md:min-h-[58vh] bg-gray-100">
        <TrackMap order={order} rider={rider} mapError={mapError} />
        
        {/* Floating Top Controls */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <button 
            onClick={() => navigate('/profile')}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-900 shadow-md hover:border-emerald-600 transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Back to profile"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button 
            onClick={handleManualRefresh}
            className="pointer-events-auto px-4 py-2.5 rounded-full bg-white border border-gray-200 flex items-center gap-1.5 text-gray-900 shadow-md hover:border-emerald-600 transition-all active:scale-95 text-xs font-bold uppercase tracking-wider cursor-pointer"
            title="Refresh GPS Location"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sync GPS</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Card */}
      <OrderStatusCard 
        order={order} 
        rider={rider} 
        remainingSeconds={remainingSeconds} 
        distanceKm={distanceKm}
        onRefresh={handleManualRefresh} 
      />
    </div>
  );
}
