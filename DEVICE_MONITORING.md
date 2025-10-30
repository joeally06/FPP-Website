# Device Monitoring System

## Overview
Automated monitoring system for 5 network devices with ping-based health checks and email alerts.

## Monitored Devices

| Device Name | Type | IP Address | Description |
|------------|------|------------|-------------|
| FPP Main Controller | fpp | 192.168.5.2 | Primary FPP controller |
| FPP Secondary | fpp | 192.168.5.5 | Secondary FPP controller |
| Falcon F48 | falcon | 192.168.5.3 | 48-port pixel controller |
| Falcon F16v3 | falcon | 192.168.5.4 | 16-port pixel controller |
| Epson Projector | projector | 192.168.5.6 | Epson projector |

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
- **Stats Overview**: Total devices, online count, offline count
- **Device Cards**: Color-coded status display (green=online, red=offline)
- **Auto-Refresh**: Automatically refreshes every 30 seconds
- **Manual Check**: "Check Now" button to trigger immediate health check
- **Device Details**: Shows IP, type, status, last checked, last seen online, consecutive failures
- **Alert History**: Displays when last alert email was sent

## API Endpoints

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

### Device Configuration
File: `lib/device-config.ts`

To add/modify devices:
```typescript
export const DEVICES: Device[] = [
  {
    id: 'device-id',
    name: 'Device Name',
    type: 'fpp|falcon|projector',
    ip: '192.168.5.x',
    enabled: true,
    description: 'Device description'
  }
];
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

### View All Device Statuses
```sql
SELECT * FROM device_status ORDER BY device_id;
```

### View Offline Devices
```sql
SELECT * FROM device_status WHERE is_online = 0;
```

### View Alert History
```sql
SELECT device_id, last_notified, consecutive_failures 
FROM device_status 
WHERE last_notified IS NOT NULL 
ORDER BY last_notified DESC;
```

### Reset Device Status
```sql
DELETE FROM device_status WHERE device_id = 'device-id';
```

## Navigation

The Device Monitor is accessible from the Admin Navigation bar with the 📡 icon.

Available to: **Admin users only** (requires authentication)

## System Architecture

```
app/layout.tsx
  └─> lib/device-monitor.ts (auto-starts monitoring)
       └─> Calls /api/devices/check every 5 minutes
            └─> Uses lib/device-config.ts for device list
            └─> Pings each device (Windows ping command)
            └─> Updates lib/database.ts (device_status table)
            └─> Sends alerts via lib/email-service.ts (sendAlertEmail)

app/device-status/page.tsx (Dashboard UI)
  └─> Calls /api/devices/status to display current status
  └─> Auto-refreshes every 30 seconds
  └─> Manual "Check Now" button triggers /api/devices/check
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
- [ ] Add device response time tracking
- [ ] Historical uptime/downtime graphs
- [ ] SMS alerts for critical devices
- [ ] Custom alert thresholds per device
- [ ] Device grouping (e.g., critical vs. non-critical)
- [ ] Webhook notifications (Discord, Slack, etc.)
- [ ] Auto-recovery actions (restart devices, etc.)
- [ ] Mobile-responsive dashboard improvements
- [ ] Export device status reports
- [ ] Integration with FPP API for more detailed health checks

---

**System Status**: ✅ Active and Monitoring

**Last Updated**: 2024-01-15
