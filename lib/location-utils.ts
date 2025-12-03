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
  return new Promise(async (resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot access location - not in browser environment'));
      return;
    }

    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported by your browser. Try updating your browser or using Chrome/Firefox.'));
      return;
    }

    // Check if we're on a secure context (HTTPS or localhost)
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    console.log('[Location] Requesting location from browser...');
    console.log('[Location] Protocol:', window.location.protocol);
    console.log('[Location] Hostname:', window.location.hostname);
    console.log('[Location] Is secure context:', isSecure);

    // Check permission state if available (but don't block based on it)
    if ('permissions' in navigator) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('[Location] Permission API reports state:', permissionStatus.state);
      } catch (e) {
        console.log('[Location] Could not check permission state:', e);
      }
    }

    // Always try the actual geolocation request - it's more reliable than the Permissions API
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[Location] ✅ SUCCESS! Position obtained:');
        console.log('[Location] Latitude:', position.coords.latitude);
        console.log('[Location] Longitude:', position.coords.longitude);
        console.log('[Location] Accuracy:', position.coords.accuracy, 'meters');
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        });
      },
      (error) => {
        console.error('[Location] ❌ ERROR:');
        console.error('[Location] Error code:', error.code);
        console.error('[Location] Error message:', error.message);
        console.error('[Location] PERMISSION_DENIED = 1, POSITION_UNAVAILABLE = 2, TIMEOUT = 3');
        
        let message = 'Location access failed';
        let helpText = '';
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            message = 'Location permission was denied.';
            helpText = '\n\nTo fix this:\n1. Look for the 🔒 icon in your browser\'s address bar (top-left)\n2. Click it and find "Location" or "Permissions"\n3. Change "Location" to "Allow"\n4. Refresh this page\n5. Try clicking "Allow Location Access" again';
            break;
          case 2: // POSITION_UNAVAILABLE
            message = 'Location information is unavailable.';
            helpText = '\n\nMake sure:\n1. Your device has location services enabled\n2. You have GPS/Wi-Fi enabled\n3. You\'re not blocking location with a browser extension';
            break;
          case 3: // TIMEOUT
            message = 'Location request timed out.';
            helpText = '\n\nPlease try again. If this keeps happening:\n1. Check your internet connection\n2. Try restarting your browser\n3. Make sure location services are enabled on your device';
            break;
        }
        reject(new Error(message + helpText));
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 1800000
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
