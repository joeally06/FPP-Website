# Geolocation Feature Documentation

## Overview

The geolocation feature prevents remote users from disrupting your light show by restricting song requests and votes to visitors who are physically on-site. Using IP-based geolocation, the system calculates the distance between users and your show location, blocking requests from users outside a configurable radius.

---

## Features

✅ **Location-Based Blocking**: Only users within a specified distance can request songs or vote  
✅ **Admin Configuration**: Easy-to-use settings panel with browser geolocation  
✅ **Graceful Degradation**: If geolocation lookup fails, requests are allowed (don't punish users)  
✅ **Local Network Bypass**: Users on local networks (192.168.x.x, 10.x.x.x) skip location checks  
✅ **Detailed Analytics**: Location data stored with each request for troubleshooting  
✅ **Google Maps Integration**: Verify your show location visually  
✅ **Security Logging**: Console logs when requests are blocked with distance information

---

## How It Works

### 1. User Makes Request

When a visitor requests a song or votes, their IP address is captured.

### 2. Location Lookup

The system queries ip-api.com to determine the user's approximate GPS coordinates based on their IP address.

### 3. Distance Calculation

Using the Haversine formula, the system calculates the distance in miles between the user's location and your show location.

### 4. Decision

- **Within radius**: Request allowed ✅
- **Outside radius**: Request blocked with friendly error message ❌
- **Lookup failed**: Request allowed (graceful degradation) ✅
- **Local network**: Request allowed (bypass) ✅

### 5. Data Storage

Location information is stored with the request:
- Latitude/Longitude
- City, Region, Country
- Distance from show (in miles)

---

## Admin Configuration

### Access Settings

1. Navigate to **Admin Panel** → **Settings**
2. Click **📍 Location** in the sidebar

### Setup Steps

#### 1. Enable Location Restrictions

Toggle the **"Enable Location Restrictions"** checkbox.

#### 2. Set Show Location

**Option A: Use Browser Geolocation (Recommended)**
- Click **"📍 Use My Current Location"**
- Allow browser to access your location
- Coordinates auto-fill

**Option B: Manual Entry**
- Enter **Latitude** (e.g., 40.712776)
- Enter **Longitude** (e.g., -74.005974)
- Optionally add a **Location Name** for reference

**Option C: Use Google Maps**
1. Click **"🗺️ View on Google Maps"** (after entering coordinates)
2. Verify location is correct
3. Adjust coordinates if needed

#### 3. Set Maximum Distance

Use the slider to set how far from the show users can request songs:
- **0.1 miles**: Very close (tight radius)
- **1 mile**: Recommended for neighborhood shows
- **5 miles**: Moderate (covers larger area)
- **10 miles**: Wide area (suburban/rural)

#### 4. Save Settings

Click **"💾 Save Settings"** to apply changes immediately.

---

## Testing

### Test Locally (Development)

1. **Enable location restrictions** in admin panel
2. **Set show location** to your current location
3. **Set radius** to 1 mile
4. **Try requesting a song** from the jukebox:
   - Should work if you're at the show location
   - Will be blocked if using VPN/proxy with remote location

### Test with VPN

1. Connect to VPN in different city/country
2. Try requesting a song
3. Should see error: "Sorry, you must be within X miles of the show to request songs"

### View Console Logs

Check browser console for security events:
```
[Security] Song request from 203.0.113.45 blocked: User is 15.3 miles away (limit: 1.0 miles)
```

---

## Location Data Accuracy

### IP Geolocation Accuracy

- **Urban areas**: 3-10 miles typical accuracy
- **Rural areas**: 10-50 miles typical accuracy
- **VPN/Proxy**: Shows VPN server location, not user location
- **Mobile data**: May show cell tower location

### Known Limitations

⚠️ **VPN Users**: Will be blocked if VPN server is outside radius  
⚠️ **Mobile Data**: May show inaccurate location based on cell tower  
⚠️ **Privacy Services**: Users with privacy-focused DNS/proxies may be blocked  
⚠️ **Local Networks**: 192.168.x.x and 10.x.x.x addresses bypass checks (always allowed)

---

## Database Schema

### New Columns in `jukebox_queue`

```sql
latitude REAL            -- User's GPS latitude
longitude REAL           -- User's GPS longitude
city TEXT                -- User's city
region TEXT              -- User's state/region
country_code TEXT        -- Two-letter country code (US, CA, etc.)
distance_from_show REAL  -- Distance in miles from show location
```

### New Columns in `votes`

Same columns as above for tracking vote locations.

### New Table: `location_restrictions`

```sql
id INTEGER PRIMARY KEY CHECK (id = 1)  -- Ensures single row
enabled INTEGER NOT NULL DEFAULT 0     -- 0 = disabled, 1 = enabled
max_distance_miles REAL NOT NULL DEFAULT 1.0
show_latitude REAL                     -- Show GPS latitude
show_longitude REAL                    -- Show GPS longitude
location_name TEXT                     -- Optional friendly name
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_by TEXT                        -- Admin email who made change
```

---

## API Endpoints

### GET `/api/location-restrictions`

Returns current location restriction settings.

**Response:**
```json
{
  "enabled": true,
  "max_distance_miles": 1.0,
  "show_latitude": 40.712776,
  "show_longitude": -74.005974,
  "location_name": "123 Main Street"
}
```

### PUT `/api/location-restrictions`

Updates location restriction settings (admin-only).

**Request:**
```json
{
  "enabled": true,
  "max_distance_miles": 2.5,
  "show_latitude": 40.712776,
  "show_longitude": -74.005974,
  "location_name": "Home Light Show"
}
```

**Response:**
```json
{
  "message": "Location restrictions updated successfully",
  "settings": { /* updated settings */ }
}
```

---

## Code Architecture

### Core Utilities (`lib/location-utils.ts`)

**`fetchLocationFromIP(ip: string)`**
- Queries ip-api.com for GPS coordinates
- Returns: `{ lat, lng, city, region, countryCode }` or `null`
- Handles timeouts, errors, and local IPs

**`getDistanceInMiles(lat1, lng1, lat2, lng2)`**
- Haversine formula for accurate distance calculation
- Returns distance in miles

**`isWithinAllowedDistance(userLocation, maxDistance)`**
- Combines lookup + distance check
- Returns: `{ allowed: boolean, distance: number }`

**`getAddressFromCoords(lat, lng)`**
- Reverse geocoding via Nominatim API
- Returns human-readable address

### API Integration

**`app/api/jukebox/queue/route.ts`**
- Checks location restrictions before adding to queue
- Returns 403 Forbidden if user is too far
- Passes location data to transaction

**`app/api/votes/route.ts`**
- Same logic for voting system
- Custom INSERT with ON CONFLICT for location tracking

**`lib/jukebox-queue.ts`**
- Updated transaction to accept location parameters
- Stores location atomically with queue record

---

## Error Messages

### User-Facing Errors

**Too Far Away:**
```
Sorry, you must be within 1.0 miles of the show to request songs.
You are currently 5.3 miles away.
```

**Location Lookup Failed:**
```
Could not determine your location. Please try again.
```

### Admin Errors

**Invalid Coordinates:**
```
Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180
```

**Missing Coordinates:**
```
Show location coordinates are required when restrictions are enabled
```

---

## Security & Privacy

### What Data Is Stored

For each request:
- IP address (already stored)
- GPS coordinates (latitude/longitude)
- City, region, country
- Distance from show

### Who Can See Location Data

- **Admins**: Can view location data in database
- **Users**: Cannot see their own or others' location data
- **Public**: No access to location information

### Data Retention

Location data is retained alongside queue/vote records. Consider implementing:
- Automatic cleanup after 30 days
- Anonymization after show season ends
- GDPR-compliant data export/deletion

### IP Geolocation Service

Uses **ip-api.com** free tier:
- No API key required
- 45 requests per minute limit
- Data not shared with third parties
- See: [ip-api.com privacy policy](https://ip-api.com/)

---

## Troubleshooting

### Location Restrictions Not Working

**Check:**
1. ✅ Feature is **enabled** in admin panel
2. ✅ Show location **coordinates are set**
3. ✅ User is **not on local network** (192.168.x.x)
4. ✅ ip-api.com is **accessible** (not blocked by firewall)

**Console logs:**
```javascript
[Security] Location restrictions enabled: true
[Security] User location: 40.7128, -74.0060
[Security] Distance from show: 0.5 miles
[Security] Request allowed
```

### All Requests Being Blocked

**Check:**
1. Show coordinates are **correct** (not swapped lat/lng)
2. Distance radius is **sufficient** (try increasing to 5 miles)
3. ip-api.com is **responding** (check network tab)

### Location Lookup Failing

**Possible causes:**
- ip-api.com rate limit exceeded (45 req/min)
- Network firewall blocking external APIs
- User on local network (no public IP)
- User behind VPN/proxy

**Graceful degradation:** Requests are **allowed** when lookup fails.

### Database Errors

**Check:**
1. Migration ran successfully: `node run-migrations.js`
2. Columns exist: Run `node check-db.js`
3. Table permissions are correct

---

## Future Enhancements

### Planned Features

- [ ] **Admin Dashboard Widget**: Show user locations on map
- [ ] **Historical Analytics**: Heatmap of request locations over time
- [ ] **Multiple Locations**: Support for multi-show touring setups
- [ ] **Whitelist/Blacklist**: Manual IP override for special cases
- [ ] **SMS Verification**: Alternative to geolocation for verified users
- [ ] **Geofencing**: Polygon-based boundaries instead of circular radius

### API Improvements

- [ ] Switch to more accurate geolocation service (Google, MaxMind)
- [ ] Cache location lookups per IP (reduce API calls)
- [ ] Batch location lookups for multiple requests
- [ ] Fallback to multiple geolocation providers

---

## Support

### Getting Help

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review console logs for error messages
3. Create issue on [GitHub](https://github.com/joeally06/FPP-Control-Center/issues)

### Debug Mode

Enable verbose logging by setting environment variable:

```env
DEBUG_GEOLOCATION=true
```

This will log detailed information about:
- IP addresses
- Location lookups
- Distance calculations
- Security decisions

---

## License & Attribution

This feature uses:
- **ip-api.com**: Free IP geolocation API (no attribution required)
- **Haversine Formula**: Public domain mathematical formula
- **Nominatim**: OpenStreetMap reverse geocoding (free, usage limits apply)

See main [LICENSE](../LICENSE) for project license information.
