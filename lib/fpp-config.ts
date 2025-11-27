/**
 * Centralized FPP configuration
 * 
 * Uses fpp.local as the default fallback (FPP's mDNS hostname)
 * This works on most local networks without configuration.
 * 
 * To use a specific IP, set FPP_URL in your .env.local:
 *   FPP_URL=http://192.168.1.100
 */

// Default to fpp.local (mDNS hostname that FPP advertises)
const DEFAULT_FPP_HOST = 'fpp.local';
const DEFAULT_FPP_PORT = 80;

/**
 * Get the FPP base URL
 * Priority: FPP_URL env > NEXT_PUBLIC_FPP_URL env > fpp.local default
 */
export function getFppUrl(): string {
  return (
    process.env.FPP_URL ||
    process.env.NEXT_PUBLIC_FPP_URL ||
    `http://${DEFAULT_FPP_HOST}`
  );
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
