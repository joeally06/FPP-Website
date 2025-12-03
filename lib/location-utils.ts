/**
 * Location utilities for jukebox geo-restrictions
 * Prevents remote requests from users not physically at the light show
 */

export interface UserLocation {
  ip: string;
  lat: number;
  lng: number;
  city: string;
  region: string;
  countryCode: string;
}

export interface ShowLocation {
  isActive: boolean;
  maxDistanceMiles: number;
  showLat: number | null;
  showLng: number | null;
  showLocationName: string | null;
}

/**
 * Fetch geolocation from IP using free ip-api service
 * Rate limit: 45 req/min on free tier
 */
export async function fetchLocationFromIP(ipAddress: string): Promise<UserLocation | null> {
  // Skip local network IPs
  if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || 
      ipAddress.startsWith('10.') || ipAddress.startsWith('172.16.')) {
    console.log(`[Location] Local IP detected: ${ipAddress}`);
    return null;
  }

  try {
    const apiUrl = `http://ip-api.com/json/${ipAddress}?fields=status,lat,lon,city,regionName,countryCode`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        ip: ipAddress,
        lat: data.lat || 0,
        lng: data.lon || 0,
        city: data.city || 'Unknown',
        region: data.regionName || '',
        countryCode: data.countryCode || '',
      };
    }
    
    return null;
  } catch (err) {
    console.error('[Location] Lookup error:', err);
    return null;
  }
}

/**
 * Calculate distance in miles between two GPS coordinates
 * Uses Haversine formula
 */
export function getDistanceInMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const earthRadiusMiles = 3959;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if user is within allowed distance of show
 */
export function isWithinAllowedDistance(
  userLat: number,
  userLng: number,
  showLat: number,
  showLng: number,
  maxMiles: number
): boolean {
  const distance = getDistanceInMiles(userLat, userLng, showLat, showLng);
  return distance <= maxMiles;
}

/**
 * Reverse geocode to get address from coordinates
 * Uses Nominatim (OpenStreetMap) API
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FPP-Control-Center' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
