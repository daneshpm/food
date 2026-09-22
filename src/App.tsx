import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import React, { useEffect, Suspense, lazy } from 'react';
import { requestForToken, onMessageListener } from './firebase';

// Components
const AuthPage = lazy(() => import('./components/AuthPage'));
const HomePage = lazy(() => import('./components/HomePage'));

const CartPage = lazy(() => import('./components/CartPage'));
const Checkout = lazy(() => import('./components/Checkout'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const TrackingPage = lazy(() => import('./components/TrackingPage'));
const DeliveryDashboard = lazy(() => import('./components/DeliveryDashboard'));
const BulkOrderPage = lazy(() => import('./components/BulkOrderPage'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const FoodInfoPage = lazy(() => import('./components/FoodInfoPage'));
const CategoryPage = lazy(() => import('./components/CategoryPage'));
import BottomNav from './components/BottomNav';
import BottomCartBar from './components/BottomCartBar';
import OperatingHoursGate from './components/OperatingHoursGate';
import MaintenanceGate from './components/MaintenanceGate';
import CityGateway from './components/CityGateway';
import LocationPicker from './components/LocationPicker';
import UndoManager from './components/UndoManager';
import CapacitorBackButtonHandler from './components/CapacitorBackButtonHandler';
import OfflineGate from './components/OfflineGate';





const HotelPanel = lazy(() => import('./components/HotelPanel'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const StaffLogin = lazy(() => import('./components/StaffLogin'));
const HotelLogin = lazy(() => import('./components/HotelLogin'));
const RiderLogin = lazy(() => import('./components/RiderLogin'));
const OrdersPage = lazy(() => import('./components/OrdersPage'));
const ChatPage = lazy(() => import('./components/ChatPage'));
const DeleteAccountPage = lazy(() => import('./components/DeleteAccountPage'));


// Store
import { useSystemStore } from './store/systemStore';
import { useMenuStore } from './store/menuStore';
import { useLocationStore } from './store/locationStore';

function GoldenParticles() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="hidden md:block">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-brand/20 rounded-full blur-[0.5px]"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0 
            }}
            animate={{ 
              y: [null, "-10%"],
              opacity: [0, 0.4, 0]
            }}
            transition={{ 
              duration: Math.random() * 8 + 8, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>
      {/* Pizza and Biryani Watermark Mix Background */}
      <div className="absolute top-[10%] right-[-100px] w-96 h-96 rounded-full overflow-hidden opacity-[0.025] rotate-12 shrink-0 hidden md:block">
        <img src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80" className="w-full h-full object-cover" alt="Biryani" />
      </div>
      <div className="absolute bottom-[10%] left-[-100px] w-[450px] h-[450px] rounded-full overflow-hidden opacity-[0.025] -rotate-12 shrink-0 hidden md:block">
        <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80" className="w-full h-full object-cover" alt="Pizza" />
      </div>

      {/* Ambient Brand Glow */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-brand/5 blur-[80px] md:blur-[150px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/5 blur-[80px] md:blur-[150px] rounded-full" />
    </div>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const listenSettings = useSystemStore(state => state.listenSettings);
  const listenToMenu = useMenuStore(state => state.listenToMenu);
  const { deliveryLocation, openLocationPicker } = useLocationStore();



  // Synchronize dynamic admin settings and menu on app initialization
  useEffect(() => {
    const unsubscribeSettings = listenSettings();
    const unsubscribeMenu = listenToMenu();
    return () => {
      unsubscribeSettings();
      unsubscribeMenu();
    };
  }, [listenSettings, listenToMenu]);

  // Request notification permissions, register service worker, and setup foreground listener on mount
  useEffect(() => {
    // Request permission & save token to Firestore
    requestForToken();

    // Listen for foreground push notifications
    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground FCM notification received:', payload);
      
      // Render premium Swish-themed notification Toast matching app styles
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            } transition-all duration-300 max-w-md w-full bg-white border border-orange-500/20 shadow-lg rounded-[20px] pointer-events-auto flex p-4 backdrop-blur-[10px]`}
          >
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full object-cover border border-orange-500/20"
                    src={payload.notification?.image || '/logo.png'}
                    alt="Notification Icon"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-orange-500">
                    {payload.notification?.title || 'Order Update'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 font-medium">
                    {payload.notification?.body || 'You have a new notification.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-orange-500/10 pl-3 ml-3 items-center">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-xs font-bold text-gray-500 hover:text-orange-500 transition-colors uppercase tracking-[1px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#14141f',
            color: '#FFFFFF',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '20px',
            padding: '16px 24px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
          }
        }}
      />
      <OfflineGate>
        <LocationPicker />
        <UndoManager />
        <CapacitorBackButtonHandler />

        <MaintenanceGate>
            <div className="min-h-screen bg-mesh text-gray-900 font-sans relative flex flex-col selection:bg-brand/30">
              <GoldenParticles />

              <main className="flex-1 relative z-10">
                <PageTransition>
                  <Suspense fallback={
                    <div className="min-h-screen bg-mesh text-white flex flex-col items-center justify-center relative overflow-hidden">
                      <style dangerouslySetInnerHTML={{__html: `
                        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@700&display=swap');
                      `}} />
                      <div className="w-auto px-6 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-[0_10px_30px_rgba(99,102,241,0.25)] border border-brand/30 bg-gradient-to-br from-brand/20 to-transparent mb-6 relative z-10">
                        <span className="text-gradient-brand text-3xl font-black italic" style={{ fontFamily: "'Clash Display', sans-serif" }}>Mintoo</span>
                      </div>

                      <div className="text-center space-y-2 mb-6 relative z-10">
                        <p className="text-xs font-bold text-brand uppercase tracking-widest animate-pulse">Mintoo Delivery Engine</p>
                        <p className="text-gray-400 text-xs font-medium">Fetching fresh recipes & nearby kitchens...</p>
                      </div>

                      <div className="flex gap-2 relative z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent animate-[bounce_1s_infinite_0ms]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-brand animate-[bounce_1s_infinite_150ms]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-accent animate-[bounce_1s_infinite_300ms]" />
                      </div>
                    </div>
                  }>
                    <Routes>
                      <Route path="/" element={<AuthPage />} />
                      <Route path="/home" element={<HomePage />} />
                      <Route path="/food/:foodId" element={<FoodInfoPage />} />
                      <Route path="/category/:categoryId" element={<CategoryPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/track" element={<TrackingPage />} />
                      <Route path="/track/:orderId" element={<TrackingPage />} />
                      <Route path="/delivery" element={<DeliveryDashboard />} />
                      <Route path="/rider" element={<DeliveryDashboard />} />
                      <Route path="/bulk" element={<BulkOrderPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/hotel" element={<HotelPanel />} />
                      <Route path="/staff" element={<StaffLogin />} />
                      <Route path="/hotel-login" element={<HotelLogin />} />
                      <Route path="/rider-login" element={<RiderLogin />} />
                      <Route path="/orders" element={<OrdersPage />} />
                      <Route path="/chat/:orderId" element={<ChatPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/delete-account" element={<DeleteAccountPage />} />
                    </Routes>
                  </Suspense>
                </PageTransition>
              </main>

              <BottomCartBar />
              <BottomNav />
            </div>
        </MaintenanceGate>
      </OfflineGate>
    </Router>
  );
}
