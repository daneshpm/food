import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  X, 
  Loader2, 
  Search, 
  Crosshair, 
  Clock, 
  Building2, 
  Home, 
  Briefcase, 
  ShoppingBag, 
  Landmark, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Sliders, 
  ShieldCheck,
  Building
} from 'lucide-react';
import { useLocationStore, DeliveryLocation } from '../store/locationStore';
import { 
  searchAddresses, 
  highlightTextParts, 
  isBTMServiceable, 
  haversineDistance, 
  BTM_METRO_GATE_B 
} from '../lib/location';
import AddressMapPicker from './AddressMapPicker';
import toast from 'react-hot-toast';

export default function LocationPicker() {
  const {
    isLocationPickerOpen,
    closeLocationPicker,
    deliveryLocation,
    setDeliveryLocation,
    savedAddresses,
    saveAddress,
    removeSavedAddress,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    detectLocation,
    isLoading: isGeolocating,
    activePickerTab,
    setActivePickerTab,
    gpsAccuracy,
  } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DeliveryLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Swiggy & Zomato Style Detail Form State
  const [selectedAddress, setSelectedAddress] = useState<DeliveryLocation | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [roadName, setRoadName] = useState('');
  const [suburbName, setSuburbName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressTag, setAddressTag] = useState<'Home' | 'Work' | 'PG / Hostel' | 'Other'>('Home');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync state when location picker opens or address changes
  useEffect(() => {
    if (!isLocationPickerOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
    } else if (deliveryLocation) {
      setSelectedAddress(deliveryLocation);
      setHouseNumber(deliveryLocation.houseNumber || '');
      setFloor(deliveryLocation.floor || '');
      setApartment(deliveryLocation.apartment || '');
      setRoadName(deliveryLocation.road || '');
      setSuburbName(deliveryLocation.suburb || '');
      setLandmark(deliveryLocation.landmark || '');
      setAddressTag((deliveryLocation.tag as any) || 'Home');
      setDeliveryInstruction(deliveryLocation.instructions || '');
    }
  }, [isLocationPickerOpen, deliveryLocation]);

  // When selectedAddress changes (e.g. via map drop or search click)
  useEffect(() => {
    if (selectedAddress) {
      setHouseNumber(selectedAddress.houseNumber || houseNumber || '');
      setApartment(selectedAddress.apartment || apartment || '');
      setRoadName(selectedAddress.road || roadName || '');
      setSuburbName(selectedAddress.suburb || suburbName || '');
      setLandmark(selectedAddress.landmark || landmark || '');
    }
  }, [selectedAddress]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute Address Search
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const performSearch = async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchAddresses(
          debouncedQuery,
          deliveryLocation?.lat || BTM_METRO_GATE_B.lat,
          deliveryLocation?.lng || BTM_METRO_GATE_B.lng,
          controller.signal
        );
        setSearchResults(results);
        if (results.length === 0) {
          setSearchError('No matching locations found. Search for PG name, street, road, or area in Bengaluru.');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Address search error:', err);
          setSearchError('Network connection issue. Please check signal.');
        }
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery, deliveryLocation]);

  // Handle GPS Auto Detect
  const handleAutoDetectGPS = async () => {
    try {
      const locationObj = await detectLocation();
      addRecentSearch(locationObj.name);
      
      setSelectedAddress(locationObj);
      setHouseNumber(locationObj.houseNumber || '');
      setApartment(locationObj.apartment || '');
      setRoadName(locationObj.road || '');
      setSuburbName(locationObj.suburb || '');

      if (locationObj.accuracy && locationObj.accuracy > 20) {
        toast('GPS Accuracy ~' + locationObj.accuracy + 'm. Drag pin on map for exact precision!', {
          icon: '📍',
          duration: 4000,
        });
      }

      if (locationObj.isDeliverable) {
        toast.success('Location detected! Fill PG/House details to finish 📍');
      } else {
        toast('Serving BTM Layout & surrounding fast delivery zone!', { icon: 'ℹ️' });
      }
      setActivePickerTab('details');
    } catch (err: any) {
      toast.error('Could not fetch location. Please grant browser GPS permission.');
    }
  };

  // Select Search Result Card
  const handleSelectSearchResult = (result: DeliveryLocation) => {
    addRecentSearch(result.name);
    setSelectedAddress(result);
    setHouseNumber(result.houseNumber || '');
    setApartment(result.apartment || '');
    setRoadName(result.road || '');
    setSuburbName(result.suburb || '');
    setActivePickerTab('details');
  };

  // Select Saved Address Card
  const handleSelectSavedAddress = (saved: DeliveryLocation) => {
    setDeliveryLocation(saved);
    toast.success(`Location set to ${saved.tag || 'Saved Address'} 📍`);
    closeLocationPicker();
  };

  // Confirm Pin on Map
  const handleConfirmMapPin = (pinLocation: DeliveryLocation) => {
    setSelectedAddress(pinLocation);
    setHouseNumber(pinLocation.houseNumber || '');
    setApartment(pinLocation.apartment || '');
    setRoadName(pinLocation.road || '');
    setSuburbName(pinLocation.suburb || '');
    setActivePickerTab('details');
  };

  // Final Swiggy/Zomato Style Address Submission & Save
  const handleFinalSaveAddress = () => {
    if (!selectedAddress) {
      toast.error('Please select an address first.');
      return;
    }

    const finalRoad = roadName.trim() || selectedAddress.road || '';
    const finalSuburb = suburbName.trim() || selectedAddress.suburb || 'BTM Layout';

    // Construct Swiggy / Zomato style display title (e.g. "Flat 402, Sunshine PG, 16th Main Road, BTM 2nd Stage")
    const titleParts = [
      houseNumber ? `Flat ${houseNumber}` : '',
      apartment,
      finalRoad,
      finalSuburb
    ].filter(Boolean);

    const displayName = titleParts.length > 0 ? titleParts.join(', ') : selectedAddress.name;

    // Construct full postal address string
    const fullParts = [
      houseNumber ? `Flat / Door ${houseNumber}` : '',
      floor ? `Floor ${floor}` : '',
      apartment ? `Building/PG: ${apartment}` : '',
      landmark ? `Near ${landmark}` : '',
      finalRoad,
      finalSuburb,
      selectedAddress.city || 'Bengaluru',
      selectedAddress.state || 'Karnataka',
      selectedAddress.postalCode || '560076'
    ].filter(Boolean);

    const formattedAddress = fullParts.join(', ') || selectedAddress.formattedAddress;
    
    // Calculate distance from BTM Metro Station Gate B
    const distFromMetroGateB = parseFloat(
      haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, selectedAddress.lat, selectedAddress.lng).toFixed(2)
    );

    const isDeliverable = isBTMServiceable(formattedAddress, selectedAddress.lat, selectedAddress.lng);

    const finalAddressObj: DeliveryLocation = {
      ...selectedAddress,
      name: displayName,
      formattedAddress,
      address: formattedAddress,
      houseNumber,
      floor,
      apartment,
      road: finalRoad,
      suburb: finalSuburb,
      landmark,
      tag: addressTag,
      instructions: deliveryInstruction,
      distance: distFromMetroGateB,
      distanceFromBtmMetroGateB: distFromMetroGateB,
      isDeliverable
    };

    setDeliveryLocation(finalAddressObj);
    saveAddress(finalAddressObj);

    if (isDeliverable) {
      toast.success(`Delivery address saved! (${distFromMetroGateB} km from BTM Metro Gate B) 📍`);
    } else {
      toast('Address saved! (Note: Location is outside 15-min delivery zone)', { icon: '⚠️' });
    }
    closeLocationPicker();
  };

  if (!isLocationPickerOpen) return null;

  // Category Icon Resolver
  const getCategoryIcon = (category: DeliveryLocation['category']) => {
    switch (category) {
      case 'apartment':
      case 'villa':
        return <Building2 className="w-4 h-4 text-purple-600" />;
      case 'pg':
        return <Building className="w-4 h-4 text-amber-600" />;
      case 'shop':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'business':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'street':
        return <Navigation className="w-4 h-4 text-teal-600" />;
      default:
        return <Landmark className="w-4 h-4 text-rose-600" />;
    }
  };

  const currentDistFromGateB = selectedAddress
    ? parseFloat(haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, selectedAddress.lat, selectedAddress.lng).toFixed(2))
    : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={deliveryLocation ? closeLocationPicker : undefined}
        />

        {/* Modal Window Sheet */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10 border border-gray-100"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-emerald-600 animate-bounce" />
                  Select Delivery Address
                </h2>
                <p className="text-xs text-emerald-700 font-bold mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> High-Accuracy GPS & BTM Metro Gate B Distance
                </p>
              </div>

              {deliveryLocation && (
                <button
                  onClick={closeLocationPicker}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mt-4 text-xs font-extrabold">
              <button
                onClick={() => setActivePickerTab('search')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePickerTab === 'search'
                    ? 'bg-white text-emerald-700 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Search & Saved
              </button>

              <button
                onClick={() => setActivePickerTab('map')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePickerTab === 'map'
                    ? 'bg-white text-emerald-700 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                Pin on Map
              </button>

              <button
                onClick={() => setActivePickerTab('details')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePickerTab === 'details'
                    ? 'bg-white text-emerald-700 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                House / PG Details
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-left">
            
            {/* TAB 1: SEARCH & SAVED ADDRESSES */}
            {activePickerTab === 'search' && (
              <div className="space-y-5">
                {/* Auto-detect GPS button */}
                <button
                  onClick={handleAutoDetectGPS}
                  disabled={isGeolocating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold py-3.5 rounded-2xl hover:brightness-105 transition-all disabled:opacity-50 shadow-md text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
                >
                  {isGeolocating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Crosshair className="w-5 h-5" />
                  )}
                  {isGeolocating ? 'Detecting Precise GPS Location...' : 'Use Current GPS Location'}
                </button>

                {/* GPS Precision Warning */}
                {gpsAccuracy !== null && gpsAccuracy > 20 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>GPS signal accuracy is ~{gpsAccuracy}m.</span>
                    </div>
                    <button
                      onClick={() => setActivePickerTab('map')}
                      className="text-amber-800 font-extrabold hover:underline text-[11px] shrink-0"
                    >
                      Refine Pin on Map &rarr;
                    </button>
                  </div>
                )}

                {/* Search Input Bar */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Search PG name, apartment, building, street, area in Bengaluru..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-extrabold text-gray-900 focus:outline-none focus:border-emerald-500 pl-11 pr-10 transition-colors shadow-inner"
                    />
                    <div className="absolute left-4 text-gray-400">
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Instant Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden divide-y divide-gray-50 max-h-72 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => handleSelectSearchResult(result)}
                          className="p-3.5 hover:bg-emerald-50/80 cursor-pointer transition-colors flex items-start gap-3 text-left"
                        >
                          <div className="p-2 rounded-xl bg-gray-100 text-gray-700 shrink-0 mt-0.5">
                            {getCategoryIcon(result.category)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-xs sm:text-sm text-gray-900 truncate">
                                {highlightTextParts(result.name, searchQuery).map((part, idx) =>
                                  part.isMatch ? (
                                    <mark key={idx} className="bg-emerald-200 text-emerald-950 rounded px-0.5">
                                      {part.text}
                                    </mark>
                                  ) : (
                                    <span key={idx}>{part.text}</span>
                                  )
                                )}
                              </span>
                              {result.distance !== undefined && (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                  {result.distance} km from Metro Gate B
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {highlightTextParts(result.formattedAddress, searchQuery).map((part, idx) =>
                                part.isMatch ? (
                                  <mark key={idx} className="bg-emerald-100 text-emerald-900 rounded px-0.5">
                                    {part.text}
                                  </mark>
                                ) : (
                                  <span key={idx}>{part.text}</span>
                                )
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search Error / Empty Notice */}
                  {searchError && searchQuery.length >= 2 && !isSearching && (
                    <div className="mt-2 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && searchQuery.length === 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Recent Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-[10px] font-bold text-gray-400 hover:text-rose-600 cursor-pointer"
                      >
                        Clear History
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSearchQuery(term)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-800 text-gray-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved Addresses Section */}
                {savedAddresses.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BookmarkIcon className="w-3.5 h-3.5 text-emerald-600" /> Saved Addresses
                    </h3>
                    <div className="space-y-2.5">
                      {savedAddresses.map((saved) => (
                        <div
                          key={saved.id}
                          onClick={() => handleSelectSavedAddress(saved)}
                          className="p-3.5 bg-gray-50 border border-gray-200 hover:border-emerald-500 rounded-2xl cursor-pointer transition-all hover:shadow-md flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                              {saved.tag === 'Home' ? (
                                <Home className="w-4 h-4" />
                              ) : saved.tag === 'Work' ? (
                                <Briefcase className="w-4 h-4" />
                              ) : saved.tag === 'PG / Hostel' ? (
                                <Building className="w-4 h-4 text-amber-600" />
                              ) : (
                                <MapPin className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs sm:text-sm text-gray-900 truncate">
                                  {saved.name || saved.tag || 'Saved Location'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  {saved.tag || 'Saved'}
                                </span>
                                {saved.distance !== undefined && (
                                  <span className="text-[10px] font-bold text-gray-400 ml-auto">
                                    {saved.distance} km from Metro Gate B
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 truncate mt-0.5">{saved.formattedAddress}</p>
                              {saved.instructions && (
                                <p className="text-[10px] text-emerald-700 font-bold mt-1">
                                  Note: "{saved.instructions}"
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (saved.id) removeSavedAddress(saved.id);
                            }}
                            className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Delete address"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INTERACTIVE MAP PIN PICKER */}
            {activePickerTab === 'map' && (
              <div className="space-y-4">
                <AddressMapPicker
                  initialLat={selectedAddress?.lat}
                  initialLng={selectedAddress?.lng}
                  onConfirmPin={handleConfirmMapPin}
                />
              </div>
            )}

            {/* TAB 3: SWIGGY / ZOMATO DETAILED ADDRESS FORM */}
            {activePickerTab === 'details' && (
              <div className="space-y-4 text-left">
                {/* Selected Location Summary Header & Distance Gauge */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-sm text-emerald-950 block truncate">
                        {selectedAddress?.name || 'Selected Location'}
                      </span>
                      <p className="text-xs text-emerald-800 font-medium truncate mt-0.5">
                        {selectedAddress?.formattedAddress}
                      </p>
                      <button
                        onClick={() => setActivePickerTab('map')}
                        className="text-[11px] font-extrabold text-emerald-700 hover:underline mt-1 block"
                      >
                        Adjust Pin Position on Map &rarr;
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-200 px-3 py-2 rounded-xl text-center shrink-0 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">Distance</span>
                    <span className="text-sm font-black text-gray-900">{currentDistFromGateB} km</span>
                    <span className="text-[9px] text-gray-500 font-bold block">from Metro Gate B</span>
                  </div>
                </div>

                {/* Form Fields: Swiggy/Zomato Extraction & Manual Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                      House / Flat / Door / Room No. *
                    </label>
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="e.g. Flat 402 / Room 12 / House #45"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                      Floor / Block (Optional)
                    </label>
                    <input
                      type="text"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="e.g. 4th Floor, B-Block"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                    Apartment / Building / PG / Villa Name *
                  </label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="e.g. Sunshine PG for Gents / Prestige Heights / Green Villa"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                      Road / Street / Main / Cross *
                    </label>
                    <input
                      type="text"
                      value={roadName}
                      onChange={(e) => setRoadName(e.target.value)}
                      placeholder="e.g. 16th Main Road / 7th Cross"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                      Area / Locality / Suburb *
                    </label>
                    <input
                      type="text"
                      value={suburbName}
                      onChange={(e) => setSuburbName(e.target.value)}
                      placeholder="e.g. BTM 2nd Stage / Madiwala"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Opposite Udupi Garden / Near Airtel Tower / BTM Gate B"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Save As Tag Selection */}
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                    Save Address As
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Home', 'Work', 'PG / Hostel', 'Other'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddressTag(t)}
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          addressTag === t
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {t === 'Home' ? (
                          <Home className="w-3.5 h-3.5" />
                        ) : t === 'Work' ? (
                          <Briefcase className="w-3.5 h-3.5" />
                        ) : t === 'PG / Hostel' ? (
                          <Building className="w-3.5 h-3.5" />
                        ) : (
                          <Tag className="w-3.5 h-3.5" />
                        )}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Instructions */}
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                    Delivery Instructions (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Leave at door',
                      'Ring bell once',
                      'Avoid calling',
                      'Hand to PG warden/security',
                      'Leave with neighbor'
                    ].map((inst) => (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => setDeliveryInstruction(deliveryInstruction === inst ? '' : inst)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          deliveryInstruction === inst
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {inst}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex gap-2">
                  <button
                    onClick={() => setActivePickerTab('search')}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinalSaveAddress}
                    className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Save & Deliver Here
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function BookmarkIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}
