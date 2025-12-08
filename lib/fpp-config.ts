/**
 * Centralized FPP configuration
 * 
 * Uses fpp.local as the default fallback (FPP's mDNS hostname)
 * This works on most local networks without configuration.
 * 
 * To use a specific IP, set FPP_URL in your .env.local:
 *   FPP_URL=http://192.168.1.100
 * 
 * SECURITY: SSRF protection - only allows whitelisted FPP hosts
 */

// Default to fpp.local (mDNS hostname that FPP advertises)
const DEFAULT_FPP_HOST = 'fpp.local';
const DEFAULT_FPP_PORT = 80;

// SECURITY: Whitelist of allowed FPP hostnames/IPs
// Add your FPP device hostname or IP here
const ALLOWED_FPP_HOSTS = [
  'fpp.local',
  '192.168.5.2',  // Your FPP device IP
  // Add more FPP devices as needed
];

/**
 * Validate FPP URL to prevent SSRF attacks
 * Blocks: localhost, private IPs (except whitelisted), cloud metadata endpoints
 * 
 * @throws Error if URL is invalid or not whitelisted
 */
function validateFppUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    
    // 1. Protocol validation - only HTTP/HTTPS allowed
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Invalid protocol: ${url.protocol}. Only HTTP/HTTPS allowed.`);
    }
    
    // 2. Hostname whitelist validation
    const hostname = url.hostname;
    
    // Check if hostname is in whitelist
    if (!ALLOWED_FPP_HOSTS.includes(hostname)) {
      // Also check if it's a whitelisted IP in different formats
      const isWhitelisted = ALLOWED_FPP_HOSTS.some(allowed => {
        // Handle IPv6 localhost variations
        if (allowed === hostname) return true;
        // Normalize IPv6 addresses
        if (hostname.includes(':') && allowed.includes(':')) {
          return hostname.toLowerCase() === allowed.toLowerCase();
        }
        return false;
      });
      
      if (!isWhitelisted) {
        console.error(`[Security] SSRF attempt blocked: ${hostname} not in whitelist`);
        throw new Error(`FPP hostname not whitelisted: ${hostname}`);
      }
    }
    
    // 3. Block dangerous hostnames
    const dangerousHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::]',
      '::1',
      '169.254.169.254', // AWS/GCP metadata
      'metadata.google.internal', // GCP metadata
      'instance-data',
    ];
    
    if (dangerousHosts.some(dangerous => 
      hostname.toLowerCase().includes(dangerous.toLowerCase())
    )) {
      console.error(`[Security] SSRF attempt blocked: dangerous hostname ${hostname}`);
      throw new Error('Localhost and metadata endpoints not allowed');
    }
    
    // 4. Block private IP ranges (except whitelisted)
    if (hostname.startsWith('10.') || 
        hostname.startsWith('172.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('127.')) {
      // These are private IPs - must be explicitly whitelisted
      if (!ALLOWED_FPP_HOSTS.includes(hostname)) {
        console.error(`[Security] SSRF attempt blocked: private IP ${hostname} not whitelisted`);
        throw new Error('Private IP not whitelisted');
      }
    }
    
    return urlString;
  } catch (error) {
    console.error('[Security] FPP URL validation failed:', error);
    throw error;
  }
}

/**
 * Get the FPP base URL with SSRF protection
 * Priority: FPP_URL env > NEXT_PUBLIC_FPP_URL env > fpp.local default
 * 
 * @throws Error if URL fails validation (SSRF protection)
 */
export function getFppUrl(): string {
  const url = (
    process.env.FPP_URL ||
    process.env.NEXT_PUBLIC_FPP_URL ||
    `http://${DEFAULT_FPP_HOST}`
  );
  
  // Validate URL for security
  return validateFppUrl(url);
}

/**
 * Get just the FPP host (without protocol or port)
 * Useful for socket connections
 */
export function getFppHost(): string {
  const url = getFppUrl();
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return DEFAULT_FPP_HOST;
  }
}

/**
 * Get the FPP port
 */
export function getFppPort(): number {
  const url = getFppUrl();
  try {
    const parsed = new URL(url);
    return parsed.port ? parseInt(parsed.port, 10) : DEFAULT_FPP_PORT;
  } catch {
    return DEFAULT_FPP_PORT;
  }
}

// Export constants for reference
export const FPP_DEFAULTS = {
  host: DEFAULT_FPP_HOST,
  port: DEFAULT_FPP_PORT,
  url: `http://${DEFAULT_FPP_HOST}`,
} as const;
