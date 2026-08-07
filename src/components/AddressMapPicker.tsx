import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Loader2, CheckCircle2, AlertTriangle, Compass, Navigation } from 'lucide-react';
import { useLocationStore, DeliveryLocation } from '../store/locationStore';
import { reverseGeocodeDetailed, haversineDistance, BTM_CENTER, BTM_METRO_GATE_B } from '../lib/location';
import toast from 'react-hot-toast';

interface AddressMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirmPin: (address: DeliveryLocation) => void;
}

export default function AddressMapPicker({ initialLat, initialLng, onConfirmPin }: AddressMapPickerProps) {
  const { deliveryLocation, detectLocation, isLoading: isDetectingGps, gpsAccuracy } = useLocationStore();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const startLat = initialLat || deliveryLocation?.lat || BTM_CENTER.lat;
  const startLng = initialLng || deliveryLocation?.lng || BTM_CENTER.lng;

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: startLat, lng: startLng });
  const [pinAddress, setPinAddress] = useState<DeliveryLocation | null>(deliveryLocation || null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  const debouncedGeocodeRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix default marker icon issues in Webpack/Vite
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 17,
        zoomControl: false,
      });

      // CartoDB Voyager tiles for modern aesthetics
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Add Zoom Control at top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Map Move Listeners
      map.on('movestart', () => {
        setIsDraggingMap(true);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCurrentCoords({ lat: center.lat, lng: center.lng });
      });

      map.on('moveend', () => {
        setIsDraggingMap(false);
        const center = map.getCenter();
        const lat = center.lat;
        const lng = center.lng;
        setCurrentCoords({ lat, lng });

        // Debounce reverse geocoding request (400ms)
        if (debouncedGeocodeRef.current) clearTimeout(debouncedGeocodeRef.current);
        debouncedGeocodeRef.current = setTimeout(async () => {
          setIsReverseGeocoding(true);
          try {
            const detailed = await reverseGeocodeDetailed(lat, lng);
            setPinAddress(detailed);
          } catch (err) {
            console.error('Reverse geocode error:', err);
          } finally {
            setIsReverseGeocoding(false);
          }
        }, 400);
      });

      mapInstanceRef.current = map;

      // Initial Reverse Geocode if not set
      if (!deliveryLocation) {
        reverseGeocodeDetailed(startLat, startLng).then((addr) => setPinAddress(addr));
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update GPS Accuracy circle on map
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (gpsAccuracy && gpsAccuracy < 100) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
        accuracyCircleRef.current.setRadius(gpsAccuracy);
      } else {
        accuracyCircleRef.current = L.circle([currentCoords.lat, currentCoords.lng], {
          radius: gpsAccuracy,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }
  }, [gpsAccuracy, currentCoords]);

  // Floating Locate Me Button action
  const handleLocateMe = async () => {
    try {
      const locationObj = await detectLocation();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([locationObj.lat, locationObj.lng], 18, {
          animate: true,
          duration: 1.2,
        });
      }
      setPinAddress(locationObj);
      toast.success('Centered on your precise GPS location 📍');
    } catch (err: any) {
      toast.error('Could not detect location. Please check browser GPS permissions.');
    }
  };

  const handleConfirm = () => {
    if (pinAddress) {
      onConfirmPin(pinAddress);
    }
  };

  return (
    <div className="relative w-full h-[450px] sm:h-[500px] rounded-2xl overflow-hidden shadow-inner border border-gray-200">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Centered Drag Pin Target Marker (Fixed center overlay) */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-8">
        <div className="relative flex flex-col items-center">
          {/* Target Pulse Halo */}
          <div className={`w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 absolute -bottom-1 animate-ping ${isDraggingMap ? 'opacity-100' : 'opacity-40'}`} />
          
          {/* Shadow Ellipse under Pin */}
          <div className={`w-6 h-2 bg-black/30 rounded-full blur-[2px] transition-all duration-200 ${isDraggingMap ? 'scale-75 opacity-40' : 'scale-100 opacity-70'}`} />

          {/* Animated Pin Marker */}
          <div className={`transition-transform duration-200 ${isDraggingMap ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'}`}>
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-emerald-500/30">
                <MapPin className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              {/* Pulsing center dot */}
              <div className="absolute w-2 h-2 bg-yellow-300 rounded-full top-2 right-2 animate-pulse" />
            </div>
          </div>

          {/* Pin Instruction Banner while dragging */}
          {isDraggingMap && (
            <div className="absolute -top-10 bg-gray-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-fade-in">
              Move map to adjust pin 📍
            </div>
          )}
        </div>
      </div>

      {/* Floating GPS Locate Button */}
      <button
        onClick={handleLocateMe}
        disabled={isDetectingGps}
        className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl hover:bg-emerald-50 text-gray-800 hover:text-emerald-600 transition-all border border-gray-200 flex items-center gap-2 text-xs font-bold cursor-pointer disabled:opacity-50"
        title="Locate me with high accuracy"
      >
        {isDetectingGps ? (
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
        ) : (
          <Crosshair className="w-4 h-4 text-emerald-600" />
        )}
        <span className="hidden sm:inline">Locate Me</span>
      </button>

      {/* Floating Accuracy Badge */}
      {gpsAccuracy !== null && (
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-gray-200 flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
          <span className={`w-2 h-2 rounded-full ${gpsAccuracy <= 20 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>GPS Accuracy: {gpsAccuracy}m</span>
          {gpsAccuracy > 20 && <span className="text-[10px] text-amber-600 font-medium">(Refining...)</span>}
        </div>
      )}

      {/* Bottom Floating Address Inspector Card */}
      <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-gray-100 flex flex-col space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              {isReverseGeocoding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-gray-900 truncate">
                  {pinAddress?.name || 'Selected Location'}
                </span>
                {pinAddress && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                    pinAddress.isDeliverable 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {pinAddress.isDeliverable ? '⚡ Serviceable (15 Min)' : '⚠️ Outside Fast Zone'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-medium truncate mt-0.5">
                {isReverseGeocoding ? 'Detecting street address details...' : (pinAddress?.formattedAddress || 'Move map pin to select delivery point')}
              </p>
              
              {/* Detailed Geo Specs Pill */}
              {pinAddress && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-gray-500 font-mono">
                  <span className="text-emerald-700 font-bold font-sans">
                    {haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, currentCoords.lat, currentCoords.lng).toFixed(2)} km from BTM Metro Gate B
                  </span>
                  <span>Lat: {currentCoords.lat.toFixed(5)}</span>
                  <span>Lng: {currentCoords.lng.toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={isReverseGeocoding || !pinAddress}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          Confirm Location & Proceed
        </button>
      </div>
    </div>
  );
}
