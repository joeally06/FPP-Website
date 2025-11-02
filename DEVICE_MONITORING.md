# Device Monitoring System

## Overview
Database-driven automated monitoring system for network devices with ping-based health checks, email alerts, and a user-friendly management interface.

## Quick Start

### Adding Devices

After completing setup, add devices through the web UI:

1. **Navigate to Device Monitor**: 
   - Go to `http://localhost:3000/device-status` (or your domain)
   - Or click **📡 Device Monitor** in the admin navigation

2. **Add Your First Device**:
   - Click **"➕ Add Device"**
   - Fill in device details:
     - **Device ID**: Unique identifier (e.g., `fpp-main`)
     - **Device Name**: Display name (e.g., `FPP Main Controller`)
     - **Type**: Select from dropdown (FPP, Falcon, Projector, etc.)
     - **IP Address**: Device IP (e.g., `192.168.5.2`)
     - **Description**: Optional notes
     - **Enable monitoring**: Check to start monitoring immediately
   - Click **"Add Device"**

3. **Test Monitoring**:
   - Click **"🔍 Check Now"** to immediately ping all devices
   - View real-time status (green = online, red = offline)

4. **Configure Schedule** (Optional):
   - Click **"⏰ Schedule"**
   - Enable monitoring schedule
   - Set show hours (e.g., 4:00 PM - 10:00 PM)
   - Email alerts only sent during these hours

## Example Devices

Common light show equipment to monitor:

| Device Type | Example Name | Example IP | Purpose |
|------------|--------------|------------|---------|
| FPP Controller | FPP Main | 192.168.5.2 | Primary show controller |
| Falcon Controller | Falcon F48 | 192.168.5.3 | 48-port pixel controller |
| Projector | Epson Projector | 192.168.5.6 | Display projector |
| Network Switch | Network Switch | 192.168.5.1 | Network infrastructure |
| UPS | APC UPS | 192.168.5.10 | Power backup |

## Features

### Health Monitoring
- **Check Method**: Windows ping command (`ping -n 1 -w 1000 <ip>`)
- **Check Interval**: Every 5 minutes (300 seconds)
- **Auto-Start**: Monitoring starts automatically 5 seconds after server startup
- **Status Tracking**: Real-time online/offline status for each device

### Email Alerts
- **First Failure**: Email sent immediately when device goes offline
- **Rate Limiting**: Subsequent alerts only sent hourly if device remains offline
- **Alert Email**: Sent to admin email (SMTP_USER from .env.local)
- **Alert Content**: 
  - Device name and IP address
  - Timestamp of failure
  - Status indicator
  - Troubleshooting steps

### Database Tracking
Database: `sqlite.db`

Table: `device_status`
```sql
CREATE TABLE device_status (
  device_id TEXT PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT 0,
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_online DATETIME,
  consecutive_failures INTEGER DEFAULT 0,
  last_notified DATETIME
);
```

## Dashboard

Access the device monitoring dashboard at: **http://localhost:3000/device-status**

### Dashboard Features
- **Device Management**: Add, edit, delete devices through the UI
- **Stats Overview**: Total devices, online count, offline count
- **Device Cards**: Color-coded status display (green=online, red=offline, gray=disabled)
- **Auto-Refresh**: Automatically refreshes every 30 seconds
- **Manual Check**: "Check Now" button to trigger immediate health check
- **Device Details**: Shows IP, type, status, last checked, last seen online, consecutive failures
- **Alert History**: Displays when last alert email was sent
- **Schedule Management**: Configure monitoring hours and alert preferences
- **Real-time Editing**: Inline device editing and enable/disable toggles

## API Endpoints

### Manage Devices
```
GET /api/devices/manage
```
Get all devices from database.

```
POST /api/devices/manage
```
Add a new device.

**Request Body:**
```json
{
  "id": "fpp-main",
  "name": "FPP Main Controller",
  "type": "fpp",
  "ip": "192.168.5.2",
  "enabled": true,
  "description": "Primary controller"
}
```

```
PUT /api/devices/manage
```
Update existing device.

```
DELETE /api/devices/manage?id=device-id
```
Delete a device.

### Monitoring Schedule
```
GET /api/devices/schedule
```
Get current monitoring schedule configuration.

```
PUT /api/devices/schedule
```
Update monitoring schedule.

**Request Body:**
```json
{
  "enabled": true,
  "start_time": "16:00",
  "end_time": "22:00",
  "timezone": "America/Chicago"
}
```

### Check Device Health
```
GET /api/devices/check
```
Manually trigger ping check for all devices.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T12:00:00.000Z",
  "results": [
    {
      "deviceId": "fpp-main",
      "name": "FPP Main Controller",
      "ip": "192.168.5.2",
      "status": "online",
      "consecutiveFailures": 0
    }
  ]
}
```

### Get Device Status
```
GET /api/devices/status
```
Retrieve current status of all devices.

**Response:**
```json
{
  "success": true,
  "devices": [...],
  "statuses": [...],
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Configuration

### Device Management

**All device configuration is done through the web UI at `/device-status`.**

No need to edit configuration files! The system uses a database-driven approach where devices are stored in SQLite and can be managed through the interface.

### Database Schema

**devices table:**
```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  ip TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**device_status table:**
```sql
CREATE TABLE device_status (
  device_id TEXT PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT 0,
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_online DATETIME,
  consecutive_failures INTEGER DEFAULT 0,
  last_notified DATETIME,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

**monitoring_schedule table:**
```sql
CREATE TABLE monitoring_schedule (
  id INTEGER PRIMARY KEY,
  enabled BOOLEAN DEFAULT 1,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/Chicago',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Monitoring Settings
File: `lib/device-monitor.ts`

```typescript
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

To change check frequency, modify `CHECK_INTERVAL` (in milliseconds).

### Alert Settings
Alerts are sent via the existing Gmail SMTP configuration in `.env.local`:
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=your-email@gmail.com` (also receives alerts)
- `SMTP_PASS=your-app-password`

## Monitoring Logs

### Console Output
The monitoring system logs all checks to the console:

```
[Device Monitor] Initializing device monitoring...
[Device Monitor] Starting device monitoring service...
[Device Monitor] Check interval: 300 seconds
[Device Monitor] Starting device health check...
[Device Monitor] Checking FPP Main Controller (192.168.5.2)...
[Device Monitor] ✅ FPP Main Controller is ONLINE
[Device Monitor] Check complete. 5/5 devices online
[Device Monitor] Health check completed successfully
```

### Alert Notifications
When a device goes offline:
```
[Device Monitor] ❌ Device Name is OFFLINE (1 failures)
[Device Monitor] 📧 Sending alert email for Device Name...
[Device Monitor] ✅ Alert email sent for Device Name
```

## Troubleshooting

### Device Shows Offline But Is Actually Online
1. Verify device IP address is correct in `lib/device-config.ts`
2. Check network connectivity from server to device
3. Verify device responds to ping from server terminal:
   ```powershell
   ping -n 1 -w 1000 192.168.5.x
   ```
4. Check firewall settings on device and server

### Not Receiving Email Alerts
1. Verify SMTP credentials in `.env.local`
2. Test email service:
   - Check server logs for email errors
   - Verify Gmail App Password is correct
   - Check spam folder
3. Verify `last_notified` timestamp in database isn't blocking alerts

### Monitoring Not Running
1. Check server logs for "[Device Monitor]" messages
2. Verify `lib/device-monitor.ts` is imported in `app/layout.tsx`
3. Restart dev server to reinitialize monitor

### High False Positives
If devices frequently show offline but are actually online:
1. Increase ping timeout in `app/api/devices/check/route.ts`:
   ```typescript
   await execPromise(`ping -n 1 -w 2000 ${ip}`); // 2 second timeout
   ```
2. Increase check interval to reduce network load

## Database Queries

### View All Devices and Their Status
```sql
SELECT d.*, ds.is_online, ds.last_checked, ds.consecutive_failures
FROM devices d
LEFT JOIN device_status ds ON d.id = ds.device_id
ORDER BY d.name;
```

### View Only Enabled Devices
```sql
SELECT * FROM devices WHERE enabled = 1 ORDER BY name;
```

### View Offline Devices
```sql
SELECT d.name, d.ip, ds.consecutive_failures, ds.last_seen_online
FROM devices d
JOIN device_status ds ON d.id = ds.device_id
WHERE d.enabled = 1 AND ds.is_online = 0;
```

### View Alert History
```sql
SELECT d.name, d.ip, ds.last_notified, ds.consecutive_failures 
FROM devices d
JOIN device_status ds ON d.id = ds.device_id
WHERE ds.last_notified IS NOT NULL 
ORDER BY ds.last_notified DESC;
```

### Get Monitoring Schedule
```sql
SELECT * FROM monitoring_schedule WHERE id = 1;
```

### Reset Device Status
```sql
DELETE FROM device_status WHERE device_id = 'device-id';
```

### Clean Up Old Status Data
```sql
-- Remove status data for deleted devices
DELETE FROM device_status 
WHERE device_id NOT IN (SELECT id FROM devices);
```

## Navigation

The Device Monitor is accessible from the Admin Navigation bar with the 📡 icon.

Available to: **Admin users only** (requires authentication)

## System Architecture

```
app/layout.tsx
  └─> lib/device-monitor.ts (auto-starts monitoring)
       └─> Calls /api/devices/check every 5 minutes
            └─> Queries lib/database.ts (devices table)
            └─> Pings each enabled device (Windows/Linux ping)
            └─> Updates device_status table
            └─> Sends alerts via lib/email-service.ts (if within schedule)
            └─> Checks monitoring_schedule for active hours

app/device-status/page.tsx (Dashboard UI)
  └─> GET /api/devices/status - Display current status
  └─> GET /api/devices/manage - List all devices
  └─> POST /api/devices/manage - Add new device
  └─> PUT /api/devices/manage - Update device
  └─> DELETE /api/devices/manage - Remove device
  └─> GET /api/devices/schedule - Get schedule
  └─> PUT /api/devices/schedule - Update schedule
  └─> GET /api/devices/check - Manual check trigger
  └─> Auto-refreshes every 30 seconds

lib/migrate-devices.ts (One-time migration)
  └─> Migrates hardcoded devices to database on first run
  └─> Only runs if devices table is empty
  └─> Can be safely removed after migration
```

## Production Deployment

Before deploying to production:

1. **Review Check Interval**: 5 minutes may be too frequent for production
2. **Verify Device IPs**: Ensure all IPs are correct for production network
3. **Test Email Alerts**: Verify alert emails are received and not marked as spam
4. **Monitor Database Size**: device_status table grows with time
5. **Set Up Monitoring**: Monitor the monitoring system itself for failures
6. **Consider Backup Notifications**: Add SMS or other alert channels for critical devices

## Future Enhancements

Potential improvements:
- [ ] Device response time tracking (latency monitoring)
- [ ] Historical uptime/downtime graphs and analytics
- [ ] SMS alerts for critical devices
- [ ] Custom alert thresholds per device (failure count before alert)
- [ ] Device grouping (e.g., critical vs. non-critical)
- [ ] Webhook notifications (Discord, Slack, Teams, etc.)
- [ ] Auto-recovery actions (restart devices via API)
- [ ] Mobile app for device monitoring
- [ ] Export device status reports (CSV, PDF)
- [ ] Integration with FPP API for detailed health data
- [ ] Device dependency mapping (cascading alerts)
- [ ] Multi-user device management (assign devices to users)
- [ ] Device templates for quick setup
- [ ] Bulk device import/export
- [ ] Advanced scheduling (different hours per day of week)

---

**System Status**: ✅ Active and Production-Ready

**Management**: Web UI at `/device-status`

**Last Updated**: November 1, 2025
