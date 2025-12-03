/**
 * Location utilities for jukebox geo-restrictions
 * Uses browser GPS for accurate distance checking
 */

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number; // Accuracy in meters
  source: 'gps' | 'ip'; // Track location source
}

export interface ShowLocation {
  isActive: boolean;
  maxDistanceMiles: number;
  showLat: number | null;
  showLng: number | null;
  showLocationName: string | null;
}

/**
 * Get user's location from browser (GPS) - CLIENT SIDE ONLY
 * This is far more accurate than IP geolocation
 */
export function getBrowserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        });
      },
      (error) => {
        let message = 'Location access denied';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true, // Use GPS, not just WiFi/cell tower
        timeout: 10000, // 10 second timeout
        maximumAge: 60000 // Cache for 1 minute
      }
    );
  });
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
): { allowed: boolean; distance: number } {
  const distance = getDistanceInMiles(userLat, userLng, showLat, showLng);
  return {
    allowed: distance <= maxMiles,
    distance
  };
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
