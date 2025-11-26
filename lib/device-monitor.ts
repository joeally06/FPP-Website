/**
 * Device Monitoring Scheduler
 * Automatically pings devices every 5 minutes
 */

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

let monitorInterval: NodeJS.Timeout | null = null;

async function checkDevices() {
  try {
    console.log('[Device Monitor] Starting device health check...');
    
    const response = await fetch('http://localhost:3000/api/devices/check');
    const data = await response.json();
    
    if (data.success) {
      console.log('[Device Monitor] Health check completed successfully');
    } else {
      console.error('[Device Monitor] Health check failed:', data.error);
    }
  } catch (error) {
    console.error('[Device Monitor] Error during health check:', error);
  }
}

export function startDeviceMonitoring() {
  // Prevent duplicate intervals
  if (monitorInterval) {
    console.log('[Device Monitor] Monitor already running');
    return;
  }

  console.log('[Device Monitor] Starting device monitoring service...');
  console.log(`[Device Monitor] Check interval: ${CHECK_INTERVAL / 1000} seconds`);

  // Run first check immediately
  checkDevices();

  // Schedule recurring checks
  monitorInterval = setInterval(checkDevices, CHECK_INTERVAL);
  
  console.log('[Device Monitor] Device monitoring service started successfully');
}

export function stopDeviceMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[Device Monitor] Device monitoring service stopped');
  }
}

// Auto-start monitoring (only on server-side)
// MOVED TO instrumentation.ts to prevent running during build
// if (typeof window === 'undefined') {
//   // Delay startup by 5 seconds to let the server fully initialize
//   setTimeout(() => {
//     console.log('[Device Monitor] Initializing device monitoring...');
//     startDeviceMonitoring();
//   }, 5000);
// }
