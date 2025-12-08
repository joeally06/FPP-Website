/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// ========================================
// TIMING CONSTANTS (milliseconds)
// ========================================

export const TIMING = {
  // Polling intervals
  POLL_INTERVAL_FAST: 5000,        // 5 seconds - Fast polling (UI updates, status checks)
  POLL_INTERVAL_MEDIUM: 10000,     // 10 seconds - Medium polling (background tasks)
  POLL_INTERVAL_SLOW: 30000,       // 30 seconds - Slow polling (infrequent checks)
  POLL_INTERVAL_VERY_SLOW: 60000,  // 60 seconds - Very slow polling
  
  // Timeouts
  FETCH_TIMEOUT: 5000,             // 5 seconds - HTTP request timeout
  FETCH_TIMEOUT_LONG: 10000,       // 10 seconds - Longer HTTP timeout
  CIRCUIT_BREAKER_RESET: 60000,    // 60 seconds - Circuit breaker reset timeout
  
  // UI feedback
  MESSAGE_DISPLAY_DURATION: 5000,  // 5 seconds - How long to show success/error messages
  RECONNECT_DELAY: 5000,           // 5 seconds - Delay before reconnecting
  RECONNECT_DELAY_LONG: 10000,     // 10 seconds - Longer reconnect delay
  
  // Retry delays (exponential backoff)
  RETRY_DELAYS: [5000, 10000, 30000, 60000, 120000, 300000] as const, // 5s, 10s, 30s, 1m, 2m, 5m
} as const;

// ========================================
// POLLER CONFIGURATION
// ========================================

export const POLLER = {
  DEFAULT_INTERVAL: 10000,    // 10 seconds
  MIN_INTERVAL: 5000,         // 5 seconds minimum
  MAX_INTERVAL: 60000,        // 60 seconds maximum
  TIMEOUT: 5000,              // 5 seconds request timeout
  LOG_INTERVAL_THRESHOLD: 30000, // Log every 30 seconds
} as const;

// ========================================
// DATABASE CONFIGURATION
// ========================================

export const DATABASE = {
  CACHE_SIZE_KB: -64000,      // 64MB cache
  MMAP_SIZE_BYTES: 67108864,  // 64MB memory-mapped I/O
} as const;

// ========================================
// RATE LIMITING
// ========================================

export const RATE_LIMIT = {
  DEFAULT_SONG_REQUESTS: 3,   // Default song requests per hour
  MIN_SONG_REQUESTS: 1,       // Minimum allowed
  MAX_SONG_REQUESTS: 10,      // Maximum allowed
} as const;

// ========================================
// TOKEN EXPIRY
// ========================================

export const TOKEN = {
  SPOTIFY_REFRESH_BUFFER: 60000, // Refresh 1 minute early
} as const;

// ========================================
// CIRCUIT BREAKER CONFIGURATION
// ========================================

export const CIRCUIT_BREAKER = {
  MIN_RESET_TIMEOUT: 10000,    // 10 seconds minimum
  DEFAULT_RESET_TIMEOUT: 60000, // 60 seconds default
  MAX_RESET_TIMEOUT: 300000,    // 5 minutes maximum
} as const;

// ========================================
// SCHEDULER CONFIGURATION
// ========================================

export const SCHEDULER = {
  STARTUP_DELAY: 5000,         // 5 seconds after startup before first run
} as const;
