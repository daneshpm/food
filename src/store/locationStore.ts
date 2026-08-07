import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  haversineDistance, 
  reverseGeocodeDetailed, 
  isBTMServiceable, 
  BTM_CENTER, 
  MAX_BTM_RANGE,
  DetailedAddress 
} from '../lib/location';

export interface NearbyRestaurant {
  id: number;
  name: string;
  lat: number;
  lng: number;
  cuisine?: string;
}

export interface DeliveryLocation extends DetailedAddress {}

interface LocationStore {
  deliveryLocation: DeliveryLocation | null;
  nearbyRestaurants: NearbyRestaurant[];
  savedAddresses: DeliveryLocation[];
  recentSearches: string[];
  isLocationPickerOpen: boolean;
  activePickerTab: 'search' | 'map' | 'details';
  restaurantLocation: { lat: number; lng: number };
  maxDeliveryRange: number;
  isLoading: boolean;
  isWatchingGps: boolean;
  gpsAccuracy: number | null;
  gpsWatchId: number | null;

  // Actions
  setDeliveryLocation: (location: Partial<DeliveryLocation> & { lat: number; lng: number }) => void;
  setNearbyRestaurants: (restaurants: NearbyRestaurant[]) => void;
  openLocationPicker: (tab?: 'search' | 'map' | 'details') => void;
  closeLocationPicker: () => void;
  setActivePickerTab: (tab: 'search' | 'map' | 'details') => void;
  clearLocation: () => void;
  
  // Saved Addresses
  saveAddress: (address: DeliveryLocation) => void;
  removeSavedAddress: (id: string) => void;
  updateSavedAddress: (id: string, updated: Partial<DeliveryLocation>) => void;

  // Recent Searches
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;

  // High Accuracy Geolocation
  detectLocation: () => Promise<DeliveryLocation>;
  startGpsTracking: () => void;
  stopGpsTracking: () => void;
}

const DEFAULT_SAVED_ADDRESSES: DeliveryLocation[] = [
  {
    id: 'saved-home-default',
    name: 'Flat 402, Sunshine Residency',
    formattedAddress: '16th Main Road, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka 560076',
    address: '16th Main Road, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka 560076',
    lat: 12.9165,
    lng: 77.6101,
    houseNumber: 'Flat 402',
    apartment: 'Sunshine Residency',
    road: '16th Main Road',
    suburb: 'BTM 2nd Stage',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560076',
    category: 'apartment',
    tag: 'Home',
    distance: 0.2,
    isDeliverable: true,
    instructions: 'Leave at front door & ring bell once',
  },
  {
    id: 'saved-work-default',
    name: 'Unit 3B, Embassy TechVillage',
    formattedAddress: 'Outer Ring Road, Devarabeesanahalli, Bengaluru, Karnataka 560103',
    address: 'Outer Ring Road, Devarabeesanahalli, Bengaluru, Karnataka 560103',
    lat: 12.9279,
    lng: 77.6912,
    houseNumber: 'Block B3',
    apartment: 'Embassy TechVillage',
    road: 'Outer Ring Road',
    suburb: 'Devarabeesanahalli',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560103',
    category: 'business',
    tag: 'Work',
    distance: 8.5,
    isDeliverable: false,
    instructions: 'Call upon arrival at main reception security',
  }
];

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      deliveryLocation: null,
      nearbyRestaurants: [],
      savedAddresses: DEFAULT_SAVED_ADDRESSES,
      recentSearches: ['BTM 2nd Stage', '16th Main Road', 'Udupi Garden BTM', 'Marathahalli Bridge', 'Silk Board Signal'],
      isLocationPickerOpen: false,
      activePickerTab: 'search',
      restaurantLocation: BTM_CENTER,
      maxDeliveryRange: MAX_BTM_RANGE,
      isLoading: false,
      isWatchingGps: false,
      gpsAccuracy: null,
      gpsWatchId: null,

      setDeliveryLocation: (location) => {
        const formatted = location.formattedAddress || location.address || location.name || 'Selected Address';
        const isDeliverable = location.isDeliverable ?? isBTMServiceable(formatted, location.lat, location.lng);
        const name = location.name || formatted.split(',')[0] || 'Selected Address';
        const distFromGateB = location.distance ?? parseFloat(haversineDistance(BTM_CENTER.lat, BTM_CENTER.lng, location.lat, location.lng).toFixed(2));
        
        const fullObj: DeliveryLocation = {
          name,
          formattedAddress: formatted,
          address: formatted,
          lat: location.lat,
          lng: location.lng,
          city: location.city || 'Bengaluru',
          state: location.state || 'Karnataka',
          country: location.country || 'India',
          postalCode: location.postalCode || '560076',
          category: location.category || 'landmark',
          distance: distFromGateB,
          distanceFromBtmMetroGateB: distFromGateB,
          isDeliverable,
          ...location
        };

        set({ deliveryLocation: fullObj });
      },

      setNearbyRestaurants: (restaurants) => set({ nearbyRestaurants: restaurants }),
      
      openLocationPicker: (tab = 'search') => set({ isLocationPickerOpen: true, activePickerTab: tab }),
      closeLocationPicker: () => set({ isLocationPickerOpen: false }),
      setActivePickerTab: (tab) => set({ activePickerTab: tab }),

      clearLocation: () => set({ deliveryLocation: null, nearbyRestaurants: [] }),

      // Saved Addresses Actions
      saveAddress: (address) => {
        const currentSaved = get().savedAddresses;
        const newAddress: DeliveryLocation = {
          ...address,
          id: address.id || `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        };
        
        // Remove existing duplicate by id or tag if same tag
        const filtered = currentSaved.filter(
          (a) => a.id !== newAddress.id && !(newAddress.tag && newAddress.tag !== 'Other' && a.tag === newAddress.tag)
        );

        set({ savedAddresses: [newAddress, ...filtered] });
      },

      removeSavedAddress: (id) => {
        set((state) => ({
          savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
        }));
      },

      updateSavedAddress: (id, updated) => {
        set((state) => ({
          savedAddresses: state.savedAddresses.map((a) => (a.id === id ? { ...a, ...updated } : a)),
        }));
      },

      // Recent Searches Actions
      addRecentSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2) return;
        set((state) => {
          const filtered = state.recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
          return { recentSearches: [trimmed, ...filtered].slice(0, 10) };
        });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      // High Accuracy GPS Auto Detection Engine
      detectLocation: async () => {
        if (!navigator.geolocation) {
          throw new Error('Geolocation API is not supported by your browser.');
        }

        set({ isLoading: true });

        return new Promise<DeliveryLocation>((resolve, reject) => {
          let hasResolved = false;

          const requestPosition = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                if (hasResolved) return;
                const { latitude, longitude, accuracy } = pos.coords;

                set({ gpsAccuracy: Math.round(accuracy) });

                // Check if accuracy is acceptable (<= 20 meters target)
                if (accuracy > 20 && highAccuracy) {
                  // Re-try once with high precision force
                  console.warn(`GPS accuracy is ${accuracy}m (>20m target). Requesting refined fix...`);
                }

                try {
                  const detailed = await reverseGeocodeDetailed(latitude, longitude);
                  const locationObj: DeliveryLocation = {
                    ...detailed,
                    accuracy: Math.round(accuracy),
                  };

                  set({
                    deliveryLocation: locationObj,
                    isLoading: false,
                  });
                  hasResolved = true;
                  resolve(locationObj);
                } catch (err) {
                  set({ isLoading: false });
                  reject(err);
                }
              },
              (err) => {
                if (highAccuracy) {
                  // Fallback to lower accuracy if high accuracy times out
                  requestPosition(false);
                } else {
                  set({ isLoading: false });
                  reject(err);
                }
              },
              { enableHighAccuracy: highAccuracy, timeout: 12000, maximumAge: 0 }
            );
          };

          requestPosition(true);
        });
      },

      // Continuous Live GPS Watch
      startGpsTracking: () => {
        if (!navigator.geolocation) return;
        
        const existingWatch = get().gpsWatchId;
        if (existingWatch !== null) return;

        const watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            set({ gpsAccuracy: Math.round(accuracy), isWatchingGps: true });

            const current = get().deliveryLocation;
            // Update location if moved significantly (> 15 meters)
            if (current) {
              const movedKm = haversineDistance(current.lat, current.lng, latitude, longitude);
              if (movedKm > 0.015) {
                const detailed = await reverseGeocodeDetailed(latitude, longitude);
                set({
                  deliveryLocation: {
                    ...detailed,
                    accuracy: Math.round(accuracy),
                  },
                });
              }
            }
          },
          (err) => {
            console.warn('Continuous GPS tracking error:', err);
            set({ isWatchingGps: false });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
        );

        set({ gpsWatchId: watchId, isWatchingGps: true });
      },

      stopGpsTracking: () => {
        const watchId = get().gpsWatchId;
        if (watchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
        }
        set({ gpsWatchId: null, isWatchingGps: false });
      },
    }),
    {
      name: 'delivery-location-storage',
      partialize: (state) => ({
        deliveryLocation: state.deliveryLocation,
        savedAddresses: state.savedAddresses,
        recentSearches: state.recentSearches,
      }),
    }
  )
);
