/**
 * Device Migration Script
 * Migrates hardcoded devices from device-config.ts to database
 */

import { getAllDevices, insertDevice } from './database';
import { DEVICES } from './device-config';

export function migrateDevicesToDatabase() {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    return;
  }

  try {
    const existingDevices = getAllDevices.all();
    
    // Only migrate if database is empty
    if (existingDevices.length === 0) {
      console.log('📦 [Device Migration] Starting device migration to database...');
      
      let successCount = 0;
      let failCount = 0;
      
      for (const device of DEVICES) {
        try {
          insertDevice.run(
            device.id,
            device.name,
            device.type,
            device.ip,
            device.enabled ? 1 : 0,
            device.description || null
          );
          console.log(`✅ [Device Migration] Migrated: ${device.name} (${device.ip})`);
          successCount++;
        } catch (error) {
          console.error(`❌ [Device Migration] Failed to migrate ${device.name}:`, error);
          failCount++;
        }
      }
      
      console.log(`✅ [Device Migration] Migration complete: ${successCount} succeeded, ${failCount} failed`);
    } else {
      console.log(`ℹ️ [Device Migration] Database already has ${existingDevices.length} devices, skipping migration`);
    }
  } catch (error) {
    console.error('❌ [Device Migration] Migration failed:', error);
  }
}

// Auto-run migration on server startup
if (typeof window === 'undefined') {
  migrateDevicesToDatabase();
}
