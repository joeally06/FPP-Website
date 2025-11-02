import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getEnabledDevices, upsertDeviceStatus, getDeviceStatus } from '@/lib/database';
import { sendAlertEmail } from '@/lib/email-service';
import { isMonitoringActive, getSchedule, formatTime } from '@/lib/monitoring-schedule';

const execFileAsync = promisify(execFile);

// Ping a device using platform-specific ping command
async function pingDevice(ip: string): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: ping -n 1 -w 1000 (1 packet, 1 second timeout)
      await execFileAsync('ping', ['-n', '1', '-w', '1000', ip]);
    } else {
      // Linux/Mac: ping -c 1 -W 1 (1 packet, 1 second timeout)
      await execFileAsync('ping', ['-c', '1', '-W', '1', ip]);
    }
    
    return true; // Success - device is online
  } catch (error) {
    return false; // Failed - device is offline
  }
}

export async function GET() {
  try {
    // Check if monitoring is currently active based on schedule
    if (!isMonitoringActive()) {
      const schedule = getSchedule();
      const startTime = schedule ? formatTime(schedule.start_time) : 'N/A';
      const endTime = schedule ? formatTime(schedule.end_time) : 'N/A';
      
      console.log(`[Device Monitor] ⏰ Outside monitoring hours (${startTime} - ${endTime}) - skipping checks`);
      
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: `Monitoring paused - Show hours: ${startTime} - ${endTime}`,
        monitoringActive: false,
        results: []
      });
    }

    console.log('[Device Monitor] Starting device health check...');
    
    // Get enabled devices from database
    const devices = getEnabledDevices.all() as Array<{
      id: string;
      name: string;
      type: string;
      ip: string;
      enabled: number;
      description: string | null;
    }>;

    if (devices.length === 0) {
      console.log('[Device Monitor] No enabled devices to check');
      return NextResponse.json({
        success: true,
        message: 'No enabled devices to check',
        timestamp: new Date().toISOString(),
        monitoringActive: true,
        results: []
      });
    }

    const results = [];

    for (const device of devices) {
      console.log(`[Device Monitor] Checking ${device.name} (${device.ip})...`);
      const isOnline = await pingDevice(device.ip);

      // Get previous status
      const previousStatus = getDeviceStatus.get(device.id) as any;

      if (isOnline) {
        // Device is online
        console.log(`[Device Monitor] ✅ ${device.name} is ONLINE`);

        upsertDeviceStatus.run(
          device.id,
          1, // is_online = true
          new Date().toISOString(), // last_seen_online
          0, // consecutive_failures reset to 0
          previousStatus?.last_notified || null // preserve last_notified
        );

        results.push({
          deviceId: device.id,
          name: device.name,
          ip: device.ip,
          status: 'online',
          consecutiveFailures: 0
        });
      } else {
        // Device is offline
        const consecutiveFailures = (previousStatus?.consecutive_failures || 0) + 1;
        console.log(`[Device Monitor] ❌ ${device.name} is OFFLINE (${consecutiveFailures} failures)`);

        // Check if we should send an alert email
        let shouldNotify = false;
        let lastNotified = previousStatus?.last_notified || null;

        // Only send alerts if monitoring is active (during show hours)
        if (isMonitoringActive()) {
          if (consecutiveFailures === 1) {
            // First failure - always notify
            shouldNotify = true;
          } else if (previousStatus?.last_notified) {
            // Subsequent failures - notify only if more than 1 hour since last notification
            const lastNotifiedTime = new Date(previousStatus.last_notified).getTime();
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (lastNotifiedTime < oneHourAgo) {
              shouldNotify = true;
            }
          }
        } else {
          console.log(`[Device Monitor] 🔕 Alerts suppressed - outside monitoring hours`);
        }

        if (shouldNotify) {
          console.log(`[Device Monitor] 📧 Sending alert email for ${device.name}...`);
          try {
            await sendAlertEmail(device.name, device.ip);
            lastNotified = new Date().toISOString();
            console.log(`[Device Monitor] ✅ Alert email sent for ${device.name}`);
          } catch (emailError) {
            console.error(`[Device Monitor] ❌ Failed to send alert email for ${device.name}:`, emailError);
          }
        }

        upsertDeviceStatus.run(
          device.id,
          0, // is_online = false
          previousStatus?.last_seen_online || null, // preserve last_seen_online
          consecutiveFailures,
          lastNotified
        );

        results.push({
          deviceId: device.id,
          name: device.name,
          ip: device.ip,
          status: 'offline',
          consecutiveFailures,
          lastSeenOnline: previousStatus?.last_seen_online || null
        });
      }
    }

    console.log(`[Device Monitor] Check complete. ${results.filter(r => r.status === 'online').length}/${results.length} devices online`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      monitoringActive: true,
      results
    });

  } catch (error) {
    console.error('[Device Monitor] Error checking devices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check devices' },
      { status: 500 }
    );
  }
}
