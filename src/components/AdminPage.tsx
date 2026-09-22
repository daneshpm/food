import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings,
  ShoppingBag,
  TrendingUp,
  Power,
  Store,
  Bike,
  RefreshCw,
  Phone,
  MessageSquare,
  Plus,
  Trash2,
  Lock,
  Mail,
  MapPin,
  UtensilsCrossed,
  DollarSign,
  FolderOpen,
  Edit,
  Sparkles,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { useMenuStore } from '../store/menuStore';
import { AnimatePresence, motion } from 'framer-motion';
import { getActiveKingDialogues, getActiveQueenDialogues, getActiveAnonymousDialogues, DEFAULT_KING_DIALOGUES, DEFAULT_QUEEN_DIALOGUES, DEFAULT_ANONYMOUS_DIALOGUES } from './FunGreetingBanner';
import AnimatedCounter from './ui/AnimatedCounter';
const PREASSIGNED_EMAILS = Array.from({ length: 10 }, (_, i) => `hotel${i + 1}@minto.com`);

export default function AdminPage() {
  useSEO("Admin Portal", "System admin control panel.");
  const navigate = useNavigate();
  const { menuItems } = useMenuStore();

  const [adminId, setAdminId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'hotels' | 'greetings'>('orders');
  const [subTab, setSubTab] = useState<'hotels' | 'foods'>('hotels');

  // Greetings Manager State
  const [kingGreetingsText, setKingGreetingsText] = useState(() => getActiveKingDialogues().join('\n'));
  const [queenGreetingsText, setQueenGreetingsText] = useState(() => getActiveQueenDialogues().join('\n'));
  const [anonGreetingsText, setAnonGreetingsText] = useState(() => getActiveAnonymousDialogues().join('\n'));

  const handleSaveGreetings = (e: React.FormEvent) => {
    e.preventDefault();
    const kingLines = kingGreetingsText.split('\n').map(l => l.trim()).filter(Boolean);
    const queenLines = queenGreetingsText.split('\n').map(l => l.trim()).filter(Boolean);
    const anonLines = anonGreetingsText.split('\n').map(l => l.trim()).filter(Boolean);

    if (kingLines.length === 0 || queenLines.length === 0 || anonLines.length === 0) {
      toast.error('Please enter at least one line for King, Queen, and Anonymous.');
      return;
    }

    localStorage.setItem('moms_magic_king_greetings', JSON.stringify(kingLines));
    localStorage.setItem('moms_magic_queen_greetings', JSON.stringify(queenLines));
    localStorage.setItem('moms_magic_anon_greetings', JSON.stringify(anonLines));
    toast.success('👑 Royal & Anonymous Greeting lines updated successfully! 🎉');
  };

  const handleResetGreetings = () => {
    if (!window.confirm('Reset all greeting lines back to the default dialogues?')) return;
    localStorage.removeItem('moms_magic_king_greetings');
    localStorage.removeItem('moms_magic_queen_greetings');
    localStorage.removeItem('moms_magic_anon_greetings');
    setKingGreetingsText(DEFAULT_KING_DIALOGUES.join('\n'));
    setQueenGreetingsText(DEFAULT_QUEEN_DIALOGUES.join('\n'));
    setAnonGreetingsText(DEFAULT_ANONYMOUS_DIALOGUES.join('\n'));
    toast.success('Reset greeting lines to defaults!');
  };

  // New Hotel Form State
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelFood, setNewHotelFood] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [newHotelImageUrl, setNewHotelImageUrl] = useState('');
  const [newHotelLocation, setNewHotelLocation] = useState('');
  const [newHotelPrice, setNewHotelPrice] = useState('');
  const [newHotelEmail, setNewHotelEmail] = useState('hotel1@minto.com');
  const [newHotelPassword, setNewHotelPassword] = useState('');
  const [isAddingHotel, setIsAddingHotel] = useState(false);
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Edit Item State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editHotelEmail, setEditHotelEmail] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Cleared orders locally
  const [clearedOrderIds, setClearedOrderIds] = useState<string[]>([]);

  // Load Cleared Orders list from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('moms_magic_cleared_admin_orders');
      if (stored) setClearedOrderIds(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Clear/Dismiss Order locally
  const dismissAdminOrder = (orderId: string) => {
    const updated = [...clearedOrderIds, orderId];
    setClearedOrderIds(updated);
    localStorage.setItem('moms_magic_cleared_admin_orders', JSON.stringify(updated));
    toast.success("Order dismissed from view.");
  };

  // Restore cleared orders
  const restoreAdminOrders = () => {
    setClearedOrderIds([]);
    localStorage.removeItem('moms_magic_cleared_admin_orders');
    toast.success("Cleared orders restored!");
  };

  // Check Firebase Auth + role. Trusts only a real, server-verified Firebase
  // Auth session (established by api/login.cjs after credential
  // verification) - no client-side localStorage bypass, and no longer
  // fails open on a lookup error (a Firestore read failure now denies
  // access instead of granting it).
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        navigate('/staff', { replace: true });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'staff', user.uid));
        if (snap.exists() && snap.data().role === 'admin') {
          setAdminId(user.uid);
        } else {
          toast.error('Access denied. Admin role required.');
          await signOut(auth);
          navigate('/staff', { replace: true });
        }
      } catch (err) {
        console.error('Admin role verification failed:', err);
        toast.error('Could not verify access. Please log in again.');
        await signOut(auth);
        navigate('/staff', { replace: true });
      }
      setChecking(false);
    });
    return () => unsub();
  }, [navigate]);

  // Load orders, riders, and hotels
  useEffect(() => {
    if (!adminId) return;

    const cachedHotels = localStorage.getItem('moms_magic_hotels');
    if (cachedHotels) {
      try {
        setHotels(JSON.parse(cachedHotels));
      } catch (_) {}
    }

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders')),
      (snapshot) => {
        const arr: any[] = [];
        snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(arr);
      },
      (error) => console.error('Error fetching orders:', error)
    );

    const unsubRiders = onSnapshot(
      query(collection(db, 'riders')),
      (snapshot) => {
        const arr: any[] = [];
        snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
        setRiders(arr);
      },
      (error) => console.error('Error fetching riders:', error)
    );

    const unsubHotels = onSnapshot(
      query(collection(db, 'hotels')),
      (snapshot) => {
        const arr: any[] = [];
        snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHotels(arr);
        const sanitized = arr.map(({ password, ...rest }: any) => rest);
        localStorage.setItem('moms_magic_hotels', JSON.stringify(sanitized));
      },
      (error) => {
        console.warn('Error subscribing to hotels Firestore collection (rules blocking?):', error);
      }
    );

    return () => {
      unsubOrders();
      unsubRiders();
      unsubHotels();
    };
  }, [adminId]);

  const handleAssignRider = async (orderId: string, riderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      if (riderId === '') {
        await updateDoc(orderRef, {
          riderId: '',
          riderStatus: '',
          riderName: '',
          riderPhone: ''
        });
        toast.success("Rider unassigned.");
      } else {
        const selectedRider = riders.find(r => r.id === riderId);
        await updateDoc(orderRef, {
          riderId: riderId,
          riderStatus: 'accepted',
          riderName: selectedRider?.name || 'Rider',
          riderPhone: selectedRider?.phone || ''
        });
        toast.success(`Assigned rider: ${selectedRider?.name || 'Partner'}! 🛵`);
      }
    } catch (err) {
      toast.error("Failed to assign rider.");
    }
  };

  const handleImageBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewHotelImageUrl(reader.result as string);
        toast.success("Image selected and previewed successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImageUrl(reader.result as string);
        toast.success("Image edited and previewed!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = selectedCategory === 'new' ? customCategory.trim() : selectedCategory.trim();

    const emailToAssign = newHotelEmail.trim() || 'hotel1@minto.com';
    if (!newHotelName.trim() || !newHotelFood.trim() || !newHotelLocation.trim() || !newHotelPrice.trim() || !finalCategory) {
      toast.error('All fields are required. Please select/create a category.');
      return;
    }
    if (!newHotelPassword.trim() || newHotelPassword.trim().length < 6) {
      toast.error('A password of at least 6 characters is required - there is no default password anymore.');
      return;
    }

    const hotelId = `hotel-${emailToAssign.split('@')[0]}`;
    const existingIndex = hotels.findIndex(h => h.email.toLowerCase() === emailToAssign.toLowerCase());

    const newHotel = {
      id: hotelId,
      name: newHotelName.trim(),
      foodName: newHotelFood.trim(),
      location: newHotelLocation.trim(),
      price: Number(newHotelPrice),
      email: emailToAssign,
      createdAt: new Date().toISOString()
    };

    // Prepare Menu Product Item to show in Customer menu
    const menuProductId = `item-${emailToAssign.replace('@', '-')}`;
    const menuProduct = {
      id: menuProductId,
      name: newHotelFood.trim(),
      price: Number(newHotelPrice),
      category: finalCategory,
      image: newHotelImageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
      type: 'food',
      isVeg: true,
      hotelId: emailToAssign,
      hotelLocation: newHotelLocation.trim()
    };

    // Optimistically update state & local storage cache
    let updatedHotels = [...hotels];
    if (existingIndex !== -1) {
      updatedHotels[existingIndex] = newHotel;
    } else {
      updatedHotels = [newHotel, ...hotels];
    }
    setHotels(updatedHotels);
    const sanitizedUpdated = updatedHotels.map(({ password, ...rest }: any) => rest);
    localStorage.setItem('moms_magic_hotels', JSON.stringify(sanitizedUpdated));

    // Save to local custom menu storage
    const cachedCustom = localStorage.getItem('moms_magic_custom_menu');
    let customItems: any[] = [];
    if (cachedCustom) {
      try { customItems = JSON.parse(cachedCustom); } catch (_) {}
    }
    const existingMenuIdx = customItems.findIndex(i => i.id === menuProductId);
    if (existingMenuIdx !== -1) {
      customItems[existingMenuIdx] = menuProduct;
    } else {
      customItems.push(menuProduct);
    }
    localStorage.setItem('moms_magic_custom_menu', JSON.stringify(customItems));

    // Update useMenuStore state directly
    const currentStoreItems = useMenuStore.getState().menuItems;
    const storeIdx = currentStoreItems.findIndex(i => i.id === menuProductId);
    let updatedStoreItems = [...currentStoreItems];
    if (storeIdx !== -1) {
      updatedStoreItems[storeIdx] = menuProduct as any;
    } else {
      updatedStoreItems.push(menuProduct as any);
    }
    useMenuStore.setState({ menuItems: updatedStoreItems });

    setIsAddingHotel(true);
    try {
      // 1. Save Hotel config to Firestore (password is NOT included here -
      // it's set separately below via a secured endpoint that hashes it
      // server-side, rather than ever being written to Firestore in plain
      // text the way it used to be)
      await setDoc(doc(db, 'hotels', hotelId), newHotel);

      // 2. Sync to Menu Items collection so customer can order it
      await setDoc(doc(db, 'menu', menuProductId), menuProduct);

      // 3. Set the kitchen's login password (hashed server-side)
      const adminToken = localStorage.getItem('moms_magic_admin_token');
      const passwordRes = await fetch('/api/hotel-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ mode: 'set-password', hotelId, password: newHotelPassword.trim() }),
      });
      const passwordData = await passwordRes.json().catch(() => ({ success: false }));
      if (!passwordRes.ok || !passwordData.success) {
        toast.error(passwordData.message || "Hotel saved, but setting its login password failed - set it again from here.");
      }

      toast.success('Hotel registered and Menu Item added successfully! 🎉');
      setNewHotelName('');
      setNewHotelFood('');
      setSelectedCategory('');
      setCustomCategory('');
      setNewHotelImageUrl('');
      setNewHotelLocation('');
      setNewHotelPrice('');
      setNewHotelEmail('hotel1@minto.com');
    } catch (err) {
      console.warn('Firestore write failed, falling back to local cache storage:', err);
      toast.success('Hotel saved to offline local cache successfully! 💾');
      setNewHotelName('');
      setNewHotelFood('');
      setSelectedCategory('');
      setCustomCategory('');
      setNewHotelImageUrl('');
      setNewHotelLocation('');
      setNewHotelPrice('');
      setNewHotelEmail('hotel1@minto.com');
    } finally {
      setIsAddingHotel(false);
    }
  };

  const handleResetHotelPassword = async (hotelId: string) => {
    const newPassword = window.prompt('New password for this kitchen (min 6 characters):');
    if (newPassword === null) return; // cancelled
    if (newPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    try {
      const adminToken = localStorage.getItem('moms_magic_admin_token');
      const res = await fetch('/api/hotel-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({ mode: 'set-password', hotelId, password: newPassword.trim() }),
      });
      const data = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to reset password.');
        return;
      }
      toast.success('Password reset. Share it with the kitchen directly - it is not stored anywhere readable.');
    } catch (err) {
      toast.error('Failed to reset password.');
    }
  };

  const handleDeleteHotel = async (id: string, email: string) => {
    if (!window.confirm('Are you sure you want to remove this hotel partner?')) return;
    
    // Update local state and cache optimistically
    const updatedHotels = hotels.filter(h => h.id !== id);
    setHotels(updatedHotels);
    const sanitizedDeleted = updatedHotels.map(({ password, ...rest }: any) => rest);
    localStorage.setItem('moms_magic_hotels', JSON.stringify(sanitizedDeleted));

    const menuProductId = `item-${email.replace('@', '-')}`;

    // Remove from custom local storage
    const cachedCustom = localStorage.getItem('moms_magic_custom_menu');
    if (cachedCustom) {
      try {
        const arr = JSON.parse(cachedCustom).filter((i: any) => i.id !== menuProductId);
        localStorage.setItem('moms_magic_custom_menu', JSON.stringify(arr));
      } catch (_) {}
    }

    // Remove from useMenuStore state
    const currentStoreItems = useMenuStore.getState().menuItems;
    const updatedStoreItems = currentStoreItems.filter(i => i.id !== menuProductId);
    useMenuStore.setState({ menuItems: updatedStoreItems });

    toast.success('Hotel removed.');

    try {
      // 1. Attempt Firestore delete for Hotel
      await deleteDoc(doc(db, 'hotels', id));
      
      // 2. Attempt Firestore delete for corresponding Menu Item
      const menuProductId = `item-${email.replace('@', '-')}`;
      await deleteDoc(doc(db, 'menu', menuProductId));
    } catch (err) {
      console.warn('Firestore delete failed, removed from local cache storage:', err);
    }
  };

  const handleDeleteFood = async (item: any) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This will also remove the corresponding kitchen dashboard mapping.`)) return;
    
    try {
      // 1. Delete menu item
      await deleteDoc(doc(db, 'menu', item.id));
      
      // 2. Delete corresponding hotel document
      if (item.hotelId) {
        const hotelId = `hotel-${item.hotelId.split('@')[0]}`;
        await deleteDoc(doc(db, 'hotels', hotelId));
        // Remove from local cache
        const cached = localStorage.getItem('moms_magic_hotels');
        if (cached) {
          try {
            const arr = JSON.parse(cached).filter((h: any) => h.id !== hotelId);
            localStorage.setItem('moms_magic_hotels', JSON.stringify(arr));
            setHotels(arr);
          } catch (_) {}
        }
      }

      // Remove from custom local storage
      const cachedCustom = localStorage.getItem('moms_magic_custom_menu');
      if (cachedCustom) {
        try {
          const arr = JSON.parse(cachedCustom).filter((i: any) => i.id !== item.id);
          localStorage.setItem('moms_magic_custom_menu', JSON.stringify(arr));
        } catch (_) {}
      }

      // Record in deleted items list
      const cachedDeleted = localStorage.getItem('moms_magic_deleted_menu');
      let deletedIds: string[] = [];
      if (cachedDeleted) {
        try { deletedIds = JSON.parse(cachedDeleted); } catch (_) {}
      }
      if (!deletedIds.includes(item.id)) {
        deletedIds.push(item.id);
        localStorage.setItem('moms_magic_deleted_menu', JSON.stringify(deletedIds));
      }

      // Remove from useMenuStore state
      const currentStoreItems = useMenuStore.getState().menuItems;
      const updatedStoreItems = currentStoreItems.filter(i => i.id !== item.id);
      useMenuStore.setState({ menuItems: updatedStoreItems });

      toast.success('Food item deleted successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete food item.');
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditCategory(item.category);
    setEditImageUrl(item.image);
    setEditHotelEmail(item.hotelId || 'hotel1@minto.com');
    setIsEditDrawerOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      const menuProductId = editingItem.id;
      const updatedMenuProduct = {
        ...editingItem,
        name: editName.trim(),
        price: Number(editPrice),
        category: editCategory.trim(),
        image: editImageUrl.trim(),
        hotelId: editHotelEmail.trim()
      };

      // Save to local custom menu storage
      const cachedCustom = localStorage.getItem('moms_magic_custom_menu');
      let customItems: any[] = [];
      if (cachedCustom) {
        try { customItems = JSON.parse(cachedCustom); } catch (_) {}
      }
      const existingMenuIdx = customItems.findIndex(i => i.id === menuProductId);
      if (existingMenuIdx !== -1) {
        customItems[existingMenuIdx] = updatedMenuProduct;
      } else {
        customItems.push(updatedMenuProduct);
      }
      localStorage.setItem('moms_magic_custom_menu', JSON.stringify(customItems));

      // Update useMenuStore state
      const currentStoreItems = useMenuStore.getState().menuItems;
      const storeIdx = currentStoreItems.findIndex(i => i.id === menuProductId);
      let updatedStoreItems = [...currentStoreItems];
      if (storeIdx !== -1) {
        updatedStoreItems[storeIdx] = updatedMenuProduct as any;
      } else {
        updatedStoreItems.push(updatedMenuProduct as any);
      }
      useMenuStore.setState({ menuItems: updatedStoreItems });

      // 1. Update Menu Item in Firestore (so customers see the update)
      await setDoc(doc(db, 'menu', menuProductId), updatedMenuProduct);

      // 2. Update Hotel Profile Mapping in Firestore
      if (editHotelEmail) {
        const hotelId = `hotel-${editHotelEmail.split('@')[0]}`;
        const hotelSnap = await getDoc(doc(db, 'hotels', hotelId));
        if (hotelSnap.exists()) {
          const hotelData = hotelSnap.data();
          await setDoc(doc(db, 'hotels', hotelId), {
            ...hotelData,
            foodName: editName.trim(),
            price: Number(editPrice),
            email: editHotelEmail.trim()
          });
        } else {
          // If mapping was broken/missing, recreate it. No password field -
          // this kitchen has no login until a password is set for it via
          // POST /api/hotel-auth {mode:'set-password', hotelId, password}
          // (hashed server-side, never written here in plain text). There's
          // no password-reset button in this UI yet.
          await setDoc(doc(db, 'hotels', hotelId), {
            id: hotelId,
            name: "Kitchen Partner",
            foodName: editName.trim(),
            location: "Indiranagar",
            price: Number(editPrice),
            email: editHotelEmail.trim(),
            createdAt: new Date().toISOString()
          });
        }
      }

      toast.success('Food item updated successfully! 🎯');
      setEditingItem(null);
      setIsEditDrawerOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update food item.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getEmailStatus = (email: string) => {
    const assigned = hotels.find(h => h.email.toLowerCase() === email.toLowerCase());
    return assigned ? { status: 'assigned', hotelName: assigned.name, foodName: assigned.foodName } : { status: 'available' };
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('admin_auth');
    toast.success("Signed out successfully.");
    navigate('/staff', { replace: true });
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Cancelled',
        cancelReason: 'Cancelled by Admin',
        cancelledAt: new Date().toISOString()
      });
      toast.success('Order cancelled successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel order.');
    }
  };

  const handleUpdateReturnStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        returnStatus: status
      });
      toast.success(`Return request marked as ${status}.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update return status.');
    }
  };

  const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)));

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const liveOrders = orders.filter(o => 
    (o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'completed' && !clearedOrderIds.includes(o.id)) || 
    (o.returnRequested && o.returnStatus === 'Pending')
  );
  const revenue = orders.filter(o => o.status === 'delivered').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pt-24 pb-32 px-4 md:px-6 relative overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-[35px] p-6 sm:p-8 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm text-xl">
              👑
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter">Admin Dashboard</h2>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mt-0.5">System Overview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {clearedOrderIds.length > 0 && (
              <button
                onClick={restoreAdminOrders}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left shadow-sm">
            <ShoppingBag className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Live Orders</p>
            <AnimatedCounter value={liveOrders.length} className="block text-3xl font-black italic text-gray-900 mt-1" />
          </div>
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left shadow-sm">
            <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Revenue</p>
            <AnimatedCounter value={revenue} format={(n) => `₹${Math.round(n).toLocaleString()}`} className="block text-3xl font-black italic text-gray-900 mt-1" />
          </div>
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left shadow-sm">
            <Bike className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Riders</p>
            <AnimatedCounter value={riders.length} className="block text-3xl font-black italic text-gray-900 mt-1" />
          </div>
          <div className="bg-white border border-gray-200 p-5 rounded-2xl text-left shadow-sm">
            <Store className="w-5 h-5 text-purple-500 mb-2" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Hotels / Kitchens</p>
            <AnimatedCounter value={hotels.length} className="block text-3xl font-black italic text-gray-900 mt-1" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-2xl max-w-xl shadow-inner">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Orders & Riders
          </button>
          <button
            onClick={() => setActiveTab('hotels')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'hotels' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Hotel Manager
          </button>
          <button
            onClick={() => setActiveTab('greetings')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'greetings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            👑 Greetings Manager
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'orders' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Live Orders */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-black uppercase tracking-widest text-gray-800 mb-4 border-b border-gray-100 pb-3">Live Orders</h3>
              {liveOrders.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-spin" />
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No active orders</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
                  {liveOrders.map(order => (
                    <div key={order.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 text-left shadow-sm">
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-gray-200/50 pb-3">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ORDER ID: #{order.id.slice(0, 8)}</p>
                          <h4 className="text-sm font-black text-gray-900 mt-1">{order.userName}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-orange-500/20">
                              {order.status}
                            </span>
                            <p className="text-gray-900 font-black mt-1.5 text-sm">₹{order.grandTotal}</p>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer text-[8px] font-black uppercase tracking-wider"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => dismissAdminOrder(order.id)}
                              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200 transition-all cursor-pointer text-[8px] font-black uppercase tracking-wider flex items-center justify-center"
                              title="Dismiss Order"
                            >
                              <EyeOff className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Return Request Banner */}
                      {order.returnRequested && order.returnStatus === 'Pending' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                          <p className="text-amber-800 text-xs font-bold mb-1">Return Requested!</p>
                          <p className="text-amber-700 text-[10px] mb-2">Reason: {order.returnReason} {order.returnNote ? `(${order.returnNote})` : ''}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateReturnStatus(order.id, 'Approved')}
                              className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-green-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateReturnStatus(order.id, 'Declined')}
                              className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-red-600"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-700">
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Info</p>
                          <p className="text-gray-900 font-bold">{order.userName}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">{order.userPhone}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-xs">{order.deliveryLocation?.address}</p>
                          
                          <div className="flex gap-2 mt-2">
                            <a 
                              href={`tel:${order.userPhone}`}
                              className="px-4 py-2 bg-white border border-gray-200 hover:border-orange-500 rounded-xl text-[9px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                            >
                              <Phone className="w-3 h-3" /> Call Customer
                            </a>
                          </div>
                        </div>

                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Rider Info</p>
                          {order.riderId ? (
                            <>
                              <p className="text-gray-900 font-bold">{order.riderName || 'Assigned Rider'}</p>
                              <p className="text-gray-500 text-[10px] mt-0.5">{order.riderPhone || 'No phone'}</p>
                              <div className="flex gap-2 mt-2">
                                {order.riderPhone && (
                                  <a 
                                    href={`tel:${order.riderPhone}`}
                                    className="px-4 py-2 bg-white border border-gray-200 hover:border-orange-500 rounded-xl text-[9px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                  >
                                    <Phone className="w-3 h-3" /> Call Rider
                                  </a>
                                )}
                                <button
                                  onClick={() => navigate(`/chat/${order.id}`)}
                                  className="px-4 py-2 bg-white border border-gray-200 hover:border-orange-500 rounded-xl text-[9px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" /> View Chat
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="text-gray-400 italic">No rider assigned yet</p>
                          )}
                        </div>
                      </div>

                      {/* Rider Assign Dropdown Selector */}
                      <div className="pt-3 border-t border-gray-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Assign/Change Rider</label>
                          <select
                            value={order.riderId || ''}
                            onChange={(e) => handleAssignRider(order.id, e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                          >
                            <option value="">-- Select Rider --</option>
                            {riders.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.status === 'online' ? '🟢 Online' : '🔴 Offline'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riders List */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-black uppercase tracking-widest text-gray-800 mb-4 border-b border-gray-100 pb-3">Delivery Partners</h3>
              {riders.length === 0 ? (
                <div className="text-center py-12">
                  <Bike className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No riders registered</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {riders.map(rider => (
                    <div key={rider.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center text-left">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${rider.status === 'online' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-200 border-gray-400 text-gray-600'}`}>
                          {rider.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-gray-900 font-bold text-sm">{rider.name}</p>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{rider.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 font-black text-xs">₹{rider.earnings || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'hotels' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Hotel Form */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm h-fit">
              <h3 className="text-lg font-black uppercase tracking-widest text-gray-800 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" /> Add Hotel & Food Mapping
              </h3>
              
              <form onSubmit={handleAddHotel} className="space-y-4 text-left">
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Hotel Name</label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Empire Restaurant"
                      value={newHotelName}
                      onChange={e => setNewHotelName(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-orange-300 font-bold text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Food Item Name</label>
                    <div className="relative">
                      <UtensilsCrossed className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="e.g. Chicken Biryani"
                        value={newHotelFood}
                        onChange={e => setNewHotelFood(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 outline-none focus:border-orange-300 font-bold text-xs text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={e => {
                        setSelectedCategory(e.target.value);
                      }}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                    >
                      <option value="">-- Select Category --</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="new">+ Create New Category</option>
                    </select>

                    {selectedCategory === 'new' && (
                      <input
                        type="text"
                        placeholder="Enter new category name"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900 placeholder:text-gray-400 mt-2"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Food Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Image URL (https://...)"
                      value={newHotelImageUrl}
                      onChange={e => setNewHotelImageUrl(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900 placeholder:text-gray-400"
                    />
                    <label className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center shrink-0">
                      Browse
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageBrowse}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {newHotelImageUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={newHotelImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Food Price (₹)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="number"
                        placeholder="Price"
                        value={newHotelPrice}
                        onChange={e => setNewHotelPrice(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 outline-none focus:border-orange-300 font-bold text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Location</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="e.g. Indiranagar"
                        value={newHotelLocation}
                        onChange={e => setNewHotelLocation(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 outline-none focus:border-orange-300 font-bold text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Kitchen Login Account</label>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-orange-500 rounded-xl text-left px-4 font-bold text-xs text-gray-500 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{newHotelEmail || "Select Pre-assigned Email..."}</span>
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Kitchen Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. kitchen123"
                      value={newHotelPassword}
                      onChange={e => setNewHotelPassword(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 outline-none focus:border-orange-300 font-bold text-sm text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAddingHotel}
                  className="w-full h-12 mt-2 bg-orange-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAddingHotel ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Register Hotel Partner
                      <Plus className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* List Mappings / Foods Tab wrapper */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
              <div className="flex gap-6 mb-6 border-b border-gray-100 pb-2">
                <button
                  onClick={() => setSubTab('hotels')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${subTab === 'hotels' ? 'border-b-2 border-orange-500 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Registered Hotels
                </button>
                <button
                  onClick={() => setSubTab('foods')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${subTab === 'foods' ? 'border-b-2 border-orange-500 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Menu & Food Items ({menuItems.length})
                </button>
              </div>

              {subTab === 'hotels' ? (
                /* Hotel List view */
                hotels.length === 0 ? (
                  <div className="text-center py-20">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3 opacity-60" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No hotels registered yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {hotels.map(hotel => (
                      <div key={hotel.id} className="bg-gray-50 border border-gray-200/50 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left shadow-sm">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 text-orange-500 flex items-center justify-center shrink-0">
                              <Store className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="font-black text-gray-900 text-base tracking-tight truncate">{hotel.name}</h4>
                            <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 text-[8px] font-black uppercase tracking-widest border border-orange-500/20">
                              {hotel.location}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                            <p className="truncate">
                              <strong className="font-bold text-gray-800">Assigned Food:</strong> {hotel.foodName} (₹{hotel.price})
                            </p>
                            <p className="truncate">
                              <strong className="font-bold text-gray-800">Email:</strong> {hotel.email}
                            </p>
                            <p className="truncate sm:col-span-2 flex items-center gap-2">
                              <strong className="font-bold text-gray-800">Password:</strong>
                              <span className="font-mono bg-gray-200 px-2 py-0.5 rounded text-xs font-bold text-gray-900">
                                (hidden - hashed server-side, not stored or shown in plain text)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleResetHotelPassword(hotel.id)}
                                className="text-gray-500 hover:text-orange-500 transition-colors p-1 cursor-pointer"
                                title="Reset Password"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteHotel(hotel.id, hotel.email)}
                          className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors shrink-0 self-end md:self-center cursor-pointer"
                          title="Remove Hotel Partner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Food Menu items list view */
                menuItems.length === 0 ? (
                  <div className="text-center py-20">
                    <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-3 opacity-60" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No food items found</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {menuItems.map(item => (
                      <div key={item.id} className="bg-gray-50 border border-gray-200/50 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left shadow-sm">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-gray-900 text-sm tracking-tight truncate">{item.name}</h4>
                              <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[8px] font-black uppercase tracking-widest border border-gray-300">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold mt-1">
                              Price: <strong className="text-gray-950 font-bold">₹{item.price}</strong> • Kitchen: <strong className="text-orange-500 font-extrabold">{item.hotelId || "hotel1@minto.com"}</strong>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="w-9 h-9 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFood(item)}
                            className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          /* Greetings Manager Tab */
          <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-8 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                  👑 Royal Greeting Lines Manager
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  Customize the funny rotating dialogues displayed on the Hero section for King & Queen users!
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetGreetings}
                  className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveGreetings} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* King Greetings Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                      👑 King Lines (1 per line)
                    </label>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {kingGreetingsText.split('\n').filter(l => l.trim()).length}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    Shown when a King opens the app:
                  </p>
                  <textarea
                    rows={12}
                    value={kingGreetingsText}
                    onChange={(e) => setKingGreetingsText(e.target.value)}
                    placeholder="Enter one funny greeting dialogue per line..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-xs font-bold text-gray-900 outline-none focus:border-amber-400 font-mono leading-relaxed shadow-inner"
                  />
                </div>

                {/* Queen Greetings Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-pink-600 uppercase tracking-widest flex items-center gap-1.5">
                      👑 Queen Lines (1 per line)
                    </label>
                    <span className="bg-pink-100 text-pink-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {queenGreetingsText.split('\n').filter(l => l.trim()).length}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    Shown when a Queen opens the app:
                  </p>
                  <textarea
                    rows={12}
                    value={queenGreetingsText}
                    onChange={(e) => setQueenGreetingsText(e.target.value)}
                    placeholder="Enter one funny greeting dialogue per line..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-xs font-bold text-gray-900 outline-none focus:border-pink-400 font-mono leading-relaxed shadow-inner"
                  />
                </div>

                {/* Anonymous / Default Greetings Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                      📱 Default Lines (Unregistered)
                    </label>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {anonGreetingsText.split('\n').filter(l => l.trim()).length}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    Shown when user hasn't set their name/title yet:
                  </p>
                  <textarea
                    rows={12}
                    value={anonGreetingsText}
                    onChange={(e) => setAnonGreetingsText(e.target.value)}
                    placeholder="Enter one default greeting dialogue per line..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-xs font-bold text-gray-900 outline-none focus:border-blue-400 font-mono leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-orange-500 hover:brightness-105 text-black font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-black" /> Save Greeting Lines
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Drawer for Pre-assigned Hotels */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 border-l border-gray-200 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest text-gray-900">Select Kitchen Account</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Choose one of the 10 pre-assigned accounts</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {PREASSIGNED_EMAILS.map((email) => {
                  const info = getEmailStatus(email);
                  const isAssigned = info.status === 'assigned';
                  const isSelected = newHotelEmail === email;

                  return (
                    <div
                      key={email}
                      onClick={() => {
                        setNewHotelEmail(email);
                        setIsDrawerOpen(false);
                        toast.success(`Selected account: ${email}`);
                      }}
                      className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/5 shadow-sm shadow-orange-500/10'
                          : isAssigned
                          ? 'border-gray-100 bg-gray-50 opacity-70 hover:opacity-100 hover:border-gray-300'
                          : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <p className={`font-black text-xs ${isSelected ? 'text-orange-500' : 'text-gray-900'}`}>{email}</p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          isAssigned 
                            ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                            : 'bg-green-500/10 text-green-600 border-green-500/20'
                        }`}>
                          {isAssigned ? 'Assigned' : 'Available'}
                        </span>
                      </div>
                      
                      {isAssigned && (
                        <p className="text-[9px] text-gray-500 font-semibold mt-1.5 leading-relaxed">
                          Assigned to: <strong className="font-extrabold text-gray-800">{info.hotelName}</strong> ({info.foodName})
                        </p>
                      )}
                      
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Default Password: minto@2026</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Food Drawer */}
      <AnimatePresence>
        {isEditDrawerOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditDrawerOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 border-l border-gray-200 z-10 text-left overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest text-gray-900">Edit Food Details</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Modify food mapping configuration</p>
                </div>
                <button
                  onClick={() => setIsEditDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Food Item Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                  >
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Food Price (₹)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Food Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={editImageUrl}
                      onChange={e => setEditImageUrl(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                    />
                    <label className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center shrink-0">
                      Browse
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageBrowse}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {editImageUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={editImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Assigned Kitchen Email</label>
                  <select
                    value={editHotelEmail}
                    onChange={e => setEditHotelEmail(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-orange-300 font-bold text-xs text-gray-900"
                  >
                    <option value="">-- Unassigned --</option>
                    {PREASSIGNED_EMAILS.map(email => (
                      <option key={email} value={email}>{email}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-full h-12 mt-4 bg-orange-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
