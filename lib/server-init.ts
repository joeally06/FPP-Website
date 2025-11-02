/**
 * Server-side initialization
 * Starts background services when the app starts
 */

// Only run on server-side
if (typeof window === 'undefined') {
  // Initialize background services
  import('./santa-queue-processor');
  import('./device-monitor');
  import('./db-scheduler');
}
