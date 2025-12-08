import crypto from 'crypto';

// Anonymize IP address using SHA256 hash with a salt
const IP_SALT = process.env.IP_HASH_SALT || 'fpp-jukebox-salt-2025';

export function anonymizeIP(ip: string): string {
  // Hash the IP with salt for anonymization
  return crypto
    .createHash('sha256')
    .update(ip + IP_SALT)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for storage efficiency
}

export function getClientIP(request: Request): string {
  // Security: When behind Cloudflare, ONLY trust cf-connecting-ip
  // This prevents IP spoofing via forged x-forwarded-for headers
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback for non-Cloudflare deployments (development/direct connections)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback (won't work in production behind proxy)
  return '127.0.0.1';
}

// Simple geolocation lookup (you could integrate with a real IP geolocation service)
export async function getGeolocation(ip: string): Promise<{
  city: string | null;
  region: string | null;
  country: string | null;
}> {
  // Skip geolocation for local IPs
  if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      city: 'Local Network',
      region: null,
      country: 'Local'
    };
  }

  try {
    // Using ip-api.com free tier (45 requests/minute limit)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`, {
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        city: data.city || null,
        region: data.regionName || null,
        country: data.country || null
      };
    }
  } catch (error) {
    // Silently fail - geolocation is optional
    console.log('Geolocation lookup failed:', error);
  }

  return {
    city: null,
    region: null,
    country: null
  };
}
