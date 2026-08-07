// ═══════════════════════════════════════════════════════════════
// ENTERPRISE LOCATION & GEOCODING ENGINE
// ═══════════════════════════════════════════════════════════════

export interface DetailedAddress {
  id?: string;
  name: string; // Swiggy/Zomato style display header (e.g., "16th Main Rd, BTM 2nd Stage")
  formattedAddress: string; // Full address string
  address: string; // Alias for formattedAddress
  lat: number;
  lng: number;
  houseNumber?: string; // Door / Flat / House No
  floor?: string; // Floor / Block
  apartment?: string; // Building / PG / Villa Name
  landmark?: string; // Nearby landmark
  road?: string; // Main / Cross / Street
  suburb?: string; // Area / Locality / Suburb
  city: string;
  state: string;
  country: string;
  postalCode: string;
  category: 'apartment' | 'villa' | 'pg' | 'shop' | 'landmark' | 'street' | 'business' | 'other';
  distance?: number; // km from BTM Metro Gate B
  distanceFromBtmMetroGateB?: number; // km from BTM Metro Gate B
  isDeliverable: boolean;
  accuracy?: number; // GPS precision in meters
  tag?: 'Home' | 'Work' | 'PG / Hostel' | 'Other';
  instructions?: string;
}

// BTM Layout Metro Station Gate B Base Location (Hotel/Kitchen reference)
export const BTM_METRO_GATE_B = {
  lat: 12.916575,
  lng: 77.610116,
  name: 'BTM Layout Metro Station Gate B'
};

export const BTM_CENTER = BTM_METRO_GATE_B;
export const MAX_BTM_RANGE = 5.0; // 5.0 km radius for primary fast delivery zone

// ═══════════════════════════════════════════════════════════════
// HAVERSINE DISTANCE FORMULA (KM)
// ═══════════════════════════════════════════════════════════════
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if location or address is in BTM Layout / Service area
export function isBTMServiceable(address: string, lat: number, lng: number): boolean {
  const dist = haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, lat, lng);
  if (dist <= MAX_BTM_RANGE) return true;

  if (address) {
    const addrLower = address.toLowerCase();
    return (
      addrLower.includes('btm') || 
      addrLower.includes('btm layout') || 
      addrLower.includes('btm 1st') || 
      addrLower.includes('btm 2nd') || 
      addrLower.includes('btm stage') ||
      addrLower.includes('kuvempu') ||
      addrLower.includes('silk board') ||
      addrLower.includes('madiwala') ||
      addrLower.includes('koramangala') ||
      addrLower.includes('hsr')
    );
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// NETWORK RETRY WRAPPER WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════════
export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 400): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
  }
}

// Categorize location based on OSM key-value attributes & name clues
function determineCategory(props: any): DetailedAddress['category'] {
  const name = (props.name || props.street || '').toLowerCase();
  const osmKey = (props.osm_key || '').toLowerCase();
  const osmValue = (props.osm_value || '').toLowerCase();

  if (name.includes('pg') || name.includes('paying guest') || name.includes('hostel') || name.includes('stay')) {
    return 'pg';
  }
  if (name.includes('apartment') || name.includes('apts') || name.includes('residency') || name.includes('heights') || name.includes('prestige') || name.includes('brigade') || name.includes('sobha') || osmValue === 'apartments') {
    return 'apartment';
  }
  if (name.includes('villa') || name.includes('enclave') || name.includes('row house')) {
    return 'villa';
  }
  if (osmKey === 'shop' || (osmKey === 'amenity' && ['restaurant', 'cafe', 'fast_food', 'pharmacy', 'bank'].includes(osmValue)) || name.includes('store') || name.includes('supermarket') || name.includes('mall')) {
    return 'shop';
  }
  if (osmKey === 'tourism' || osmKey === 'historic' || osmValue === 'park' || name.includes('bridge') || name.includes('circle') || name.includes('junction') || name.includes('gate')) {
    return 'landmark';
  }
  if (osmKey === 'highway' || osmValue === 'residential' || name.includes('road') || name.includes('street') || name.includes('cross') || name.includes('main')) {
    return 'street';
  }
  if (osmKey === 'office' || name.includes('tech park') || name.includes('ltd') || name.includes('inc') || name.includes('solutions')) {
    return 'business';
  }
  return 'landmark';
}

// ═══════════════════════════════════════════════════════════════
// PHOTON & OPENSTREETMAP AUTOCOMPLETE PROVIDER WITH PROXIMITY BIAS
// ═══════════════════════════════════════════════════════════════
export async function searchAddresses(
  query: string, 
  userLat?: number, 
  userLng?: number,
  signal?: AbortSignal
): Promise<DetailedAddress[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const refLat = userLat || BTM_METRO_GATE_B.lat;
  const refLng = userLng || BTM_METRO_GATE_B.lng;

  const aliasLower = trimmed.toLowerCase();
  let searchStr = trimmed;
  if (!aliasLower.includes('bengaluru') && !aliasLower.includes('bangalore')) {
    searchStr = `${trimmed}, Bengaluru`;
  }

  const results: DetailedAddress[] = [];

  // 1. Try Photon API by Komoot
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&lat=${refLat}&lon=${refLng}&limit=12&lang=en`;
    const res = await fetchWithRetry(photonUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        for (const feature of data.features) {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates || [refLng, refLat];
          const lon = coords[0];
          const lat = coords[1];

          const road = props.street || props.name || '';
          const suburb = props.district || props.suburb || props.locality || 'Bengaluru';
          const city = props.city || props.county || 'Bengaluru';
          const state = props.state || 'Karnataka';
          const country = props.country || 'India';
          const postalCode = props.postcode || '';

          const title = road && suburb ? `${road}, ${suburb}` : props.name || road || suburb || trimmed;

          const parts = [props.name, props.housenumber, props.street, props.district, props.city, props.state, props.postcode].filter(Boolean);
          const formattedAddress = parts.length > 0 ? Array.from(new Set(parts)).join(', ') : `${title}, Bengaluru`;

          const distFromMetroGateB = parseFloat(haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, lat, lon).toFixed(2));
          const isDeliverable = isBTMServiceable(formattedAddress, lat, lon);
          const category = determineCategory(props);

          results.push({
            id: `photon-${props.osm_id || Math.random()}`,
            name: title,
            formattedAddress,
            address: formattedAddress,
            lat,
            lng: lon,
            houseNumber: props.housenumber || '',
            road,
            suburb,
            city,
            state,
            country,
            postalCode,
            category,
            distance: distFromMetroGateB,
            distanceFromBtmMetroGateB: distFromMetroGateB,
            isDeliverable,
          });
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn('Photon API fetch error, trying Nominatim fallback:', err);
  }

  // 2. Fallback to OpenStreetMap Nominatim
  if (results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchStr)}&limit=8&addressdetails=1&lat=${refLat}&lon=${refLng}`;
      const res = await fetchWithRetry(nomUrl, { headers: { 'Accept-Language': 'en' }, signal });
      if (res.ok) {
        const nomData = await res.json();
        for (const item of nomData) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const addr = item.address || {};
          
          const houseNumber = addr.house_number || addr.building || '';
          const apartment = addr.building || addr.amenity || addr.shop || '';
          const road = addr.road || addr.pedestrian || addr.footway || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.residential || '';
          const city = addr.city || addr.town || addr.municipality || 'Bengaluru';
          const state = addr.state || 'Karnataka';
          const country = addr.country || 'India';
          const postalCode = addr.postcode || '';

          const title = road && suburb ? `${road}, ${suburb}` : item.display_name.split(',')[0];
          const distFromMetroGateB = parseFloat(haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, lat, lon).toFixed(2));
          const isDeliverable = isBTMServiceable(item.display_name, lat, lon);
          const category = determineCategory({ name: title, ...addr });

          results.push({
            id: `nom-${item.place_id || Math.random()}`,
            name: title,
            formattedAddress: item.display_name,
            address: item.display_name,
            lat,
            lng: lon,
            houseNumber,
            apartment,
            road,
            suburb,
            city,
            state,
            country,
            postalCode,
            category,
            distance: distFromMetroGateB,
            distanceFromBtmMetroGateB: distFromMetroGateB,
            isDeliverable,
          });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('Nominatim search failed:', err);
    }
  }

  results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  return deduplicateAddresses(results);
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE ADDRESS DETECTION & REMOVAL
// ═══════════════════════════════════════════════════════════════
export function deduplicateAddresses(addresses: DetailedAddress[]): DetailedAddress[] {
  const seen = new Set<string>();
  const unique: DetailedAddress[] = [];

  for (const addr of addresses) {
    const normName = addr.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const roundedLat = addr.lat.toFixed(3);
    const roundedLng = addr.lng.toFixed(3);
    const key = `${normName}_${roundedLat}_${roundedLng}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(addr);
    }
  }

  return unique;
}

// ═══════════════════════════════════════════════════════════════
// DETAILED REVERSE GEOCODING (LAT/LNG TO STRUCTURED ADDRESS)
// ═══════════════════════════════════════════════════════════════
export async function reverseGeocodeDetailed(lat: number, lng: number): Promise<DetailedAddress> {
  const distFromMetroGateB = parseFloat(haversineDistance(BTM_METRO_GATE_B.lat, BTM_METRO_GATE_B.lng, lat, lng).toFixed(2));
  const isNearBtm = distFromMetroGateB <= MAX_BTM_RANGE;

  // 1. Try High-Resolution OpenStreetMap Nominatim Reverse Geocoding first
  try {
    const nomRes = await fetchWithRetry(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (nomRes.ok) {
      const data = await nomRes.json();
      if (data && data.address) {
        const addr = data.address;
        const houseNo = addr.house_number || addr.building || addr.office || addr.amenity || addr.shop || '';
        const apartment = addr.building || addr.amenity || addr.shop || addr.complex || '';
        const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.subdistrict || (isNearBtm ? 'BTM Layout' : 'Bengaluru');
        const city = addr.city || addr.town || addr.municipality || 'Bengaluru';
        const state = addr.state || 'Karnataka';
        const country = addr.country || 'India';
        const postalCode = addr.postcode || '560076';

        // Build Swiggy / Zomato style main title (e.g. "16th Main Road, BTM 2nd Stage")
        let placeMain = '';
        if (road && suburb && road.toLowerCase() !== suburb.toLowerCase()) {
          placeMain = `${road}, ${suburb}`;
        } else if (road) {
          placeMain = road;
        } else if (suburb) {
          placeMain = suburb;
        } else {
          placeMain = data.display_name.split(',')[0] || 'Detected Location';
        }

        const addressParts = [houseNo, apartment, road, suburb, city, postalCode].filter(Boolean);
        const formatted = Array.from(new Set(addressParts)).join(', ') || data.display_name;

        return {
          name: placeMain,
          formattedAddress: formatted,
          address: formatted,
          lat,
          lng,
          houseNumber: houseNo,
          apartment,
          road,
          suburb,
          city,
          state,
          country,
          postalCode,
          category: determineCategory({ name: placeMain, ...addr }),
          distance: distFromMetroGateB,
          distanceFromBtmMetroGateB: distFromMetroGateB,
          isDeliverable: isBTMServiceable(formatted, lat, lng),
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode failed, trying Photon fallback:', err);
  }

  // 2. Try Photon Reverse Geocoding
  try {
    const photonRes = await fetchWithRetry(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
    );
    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data && data.features && data.features.length > 0) {
        const props = data.features[0].properties || {};
        const houseNo = props.housenumber || '';
        const road = props.street || props.name || '';
        const suburb = props.district || props.suburb || props.locality || (isNearBtm ? 'BTM Layout' : 'Bengaluru');
        const city = props.city || 'Bengaluru';
        const postalCode = props.postcode || '560076';

        let placeMain = road && suburb ? `${road}, ${suburb}` : road || suburb || props.name || 'Selected Location';
        const formatted = [houseNo, road, suburb, city, postalCode].filter(Boolean).join(', ');

        return {
          name: placeMain,
          formattedAddress: formatted,
          address: formatted,
          lat,
          lng,
          houseNumber: houseNo,
          road,
          suburb,
          city,
          state: 'Karnataka',
          country: 'India',
          postalCode,
          category: determineCategory(props),
          distance: distFromMetroGateB,
          distanceFromBtmMetroGateB: distFromMetroGateB,
          isDeliverable: isBTMServiceable(formatted, lat, lng),
        };
      }
    }
  } catch (err) {
    console.warn('Photon reverse geocode failed:', err);
  }

  // Default fallback
  const fallbackFormatted = isNearBtm
    ? '16th Main Road, BTM 2nd Stage, BTM Layout, Bengaluru, 560076'
    : 'Bengaluru, Karnataka, India';

  return {
    name: isNearBtm ? '16th Main Rd, BTM 2nd Stage' : 'Bengaluru',
    formattedAddress: fallbackFormatted,
    address: fallbackFormatted,
    lat,
    lng,
    road: '16th Main Road',
    suburb: 'BTM 2nd Stage',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560076',
    category: 'landmark',
    distance: distFromMetroGateB,
    distanceFromBtmMetroGateB: distFromMetroGateB,
    isDeliverable: isBTMServiceable(fallbackFormatted, lat, lng),
  };
}

// Standard simple reverseGeocode string compatibility wrapper
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const detailed = await reverseGeocodeDetailed(lat, lng);
  return detailed.formattedAddress;
}

// ═══════════════════════════════════════════════════════════════
// TEXT MATCH HIGHLIGHTER HELPER
// ═══════════════════════════════════════════════════════════════
export function highlightTextParts(text: string, query: string): { text: string; isMatch: boolean }[] {
  if (!query || !query.trim()) return [{ text, isMatch: false }];

  const terms = query.trim().split(/\s+/).filter(Boolean);
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part) => ({
    text: part,
    isMatch: terms.some((term) => part.toLowerCase() === term.toLowerCase()),
  }));
}
