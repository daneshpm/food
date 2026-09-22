import { Link, useLocation } from 'react-router-dom';
import { Home, Clipboard, ShoppingCart, User, MapPin } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function BottomNav() {
  const location = useLocation();
  const { items } = useCartStore();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Hide bottom nav on specific screens like login or admin
  const hiddenRoutes = ['/', '/admin', '/delivery', '/checkout'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-[100] bg-[#07070d] border-t border-white/5 pb-safe md:hidden">
      <div className="flex items-center justify-around py-2.5 px-2">
        {/* Home */}
        <Link 
          to="/home" 
          className={`flex flex-col items-center gap-1 transition-all relative py-1 px-3 ${
            isActive('/home') ? 'text-brand' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Home className={`w-6 h-6 ${isActive('/home') ? 'fill-brand/10 text-brand' : ''}`} />
          <span className="text-[10px] font-semibold tracking-wide">Home</span>
          {isActive('/home') && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] gradient-brand rounded-full animate-pulse" />
          )}
        </Link>
        
        {/* Orders */}
        <Link 
          to="/orders" 
          className={`flex flex-col items-center gap-1 transition-all relative py-1 px-3 ${
            isActive('/orders') ? 'text-brand' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Clipboard className={`w-6 h-6 ${isActive('/orders') ? 'fill-brand/10 text-brand' : ''}`} />
          <span className="text-[10px] font-semibold tracking-wide">Orders</span>
          {isActive('/orders') && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] gradient-brand rounded-full animate-pulse" />
          )}
        </Link>

        {/* Cart */}
        <Link 
          to="/cart" 
          className={`flex flex-col items-center gap-1 transition-all relative py-1 px-3 ${
            isActive('/cart') ? 'text-brand' : 'text-gray-500 hover:text-white'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-6 h-6 ${isActive('/cart') ? 'fill-brand/10 text-brand' : ''}`} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 gradient-brand text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#07070d]">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Cart</span>
          {isActive('/cart') && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] gradient-brand rounded-full animate-pulse" />
          )}
        </Link>

        {/* Track */}
        <Link 
          to="/track" 
          className={`flex flex-col items-center gap-1 transition-all relative py-1 px-3 ${
            location.pathname.startsWith('/track') ? 'text-brand' : 'text-gray-500 hover:text-white'
          }`}
        >
          <MapPin className={`w-6 h-6 ${location.pathname.startsWith('/track') ? 'fill-brand/10 text-brand' : ''}`} />
          <span className="text-[10px] font-semibold tracking-wide">Track</span>
          {location.pathname.startsWith('/track') && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] gradient-brand rounded-full animate-pulse" />
          )}
        </Link>

        {/* Profile */}
        <Link 
          to="/profile" 
          className={`flex flex-col items-center gap-1 transition-all relative py-1 px-3 ${
            isActive('/profile') ? 'text-brand' : 'text-gray-500 hover:text-white'
          }`}
        >
          <User className={`w-6 h-6 ${isActive('/profile') ? 'fill-brand/10 text-brand' : ''}`} />
          <span className="text-[10px] font-semibold tracking-wide">Profile</span>
          {isActive('/profile') && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] gradient-brand rounded-full animate-pulse" />
          )}
        </Link>
      </div>
    </nav>
  );
}
