# Release Notes: v1.0.1-rc.2

**Release Date:** November 9, 2025  
**Release Name:** Performance & Architecture Release  
**Type:** Release Candidate 2

---

## 🎯 Overview

This release focuses on **performance optimization** and **architectural improvements** that make FPP Control Center more scalable, efficient, and maintainable. Key highlights include a revolutionary backend caching system, database normalization, and Spotify integration.

---

## 🚀 Major Features

### 1. FPP State Caching System (Backend Polling)

**Problem Solved:**  
Previously, every user's browser polled the FPP device directly every 10 seconds. With multiple concurrent users, this created:
- Excessive load on FPP device
- Redundant API calls
- Frontend performance issues
- Poor scalability

**Solution:**  
A sophisticated backend polling service that caches FPP state in the database.

**Architecture:**
```
┌─────────────────────┐
│  FPP Device         │ ← Polled once every 10s
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  FPP Poller Service │ (lib/fpp-poller.ts)
│  (PM2 Background)   │ 
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  SQLite Database    │ (votes.db)
│  (fpp_state cache)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cached Status API  │ (/api/fpp/cached-status)
│  (Sub-ms response)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Frontend           │ (All users read from cache)
│  (Unlimited users)  │
└─────────────────────┘
```

**Benefits:**
- ✅ **99% reduction** in FPP API calls
- ✅ **Sub-millisecond** API responses (vs 50-200ms FPP calls)
- ✅ **Unlimited** concurrent users with no FPP load increase
- ✅ **Exponential backoff** on failures (doesn't hammer offline FPP)
- ✅ **Health monitoring** with poll logs and statistics
- ✅ **Stale data detection** (warns users if poller is down)

**New Files:**
- `lib/fpp-poller.ts` - Background polling service (400+ lines)
- `migrations/012_fpp_state_caching.sql` - Database schema
- `app/api/fpp/cached-status/route.ts` - Fast cached API
- `scripts/verify-migration-012.js` - Validation tool

**Database Tables:**
- `fpp_state` - Current FPP status (single row, updated every 10s)
- `fpp_cached_playlists` - Available playlists with sync timestamps
- `fpp_cached_playlist_sequences` - Playlist contents (FK to playlists)
- `fpp_poll_log` - Polling history with auto-cleanup (keeps last 1000)
- `fpp_health_summary` - View for monitoring poller health

**Security Features:**
- Input validation on all FPP responses
- 5-second timeout prevents hanging requests
- Prepared statements prevent SQL injection
- Transaction-based atomic updates
- Graceful error handling (no crashes)
- String sanitization (belt-and-suspenders)

---

### 2. Database Normalization (Migration 011)

**Problem Solved:**  
Two tables storing duplicate sequence metadata:
- `spotify_metadata` (29 custom sequences)
- `sequence_metadata` (3 auto sequences)
- No foreign key constraints
- `jukebox_queue` referenced sequences by name only

**Solution:**  
Unified `sequences` table with proper foreign keys.

**Migration Results:**
- ✅ **32 sequences** migrated (29 + 3)
- ✅ **Zero data loss** (verified)
- ✅ **Foreign keys** added to `jukebox_queue`
- ✅ **Play statistics** preserved
- ✅ **Backward compatibility** view created

**New Schema:**
```sql
sequences (unified table)
├── id (PRIMARY KEY)
├── name (UNIQUE)
├── display_name
├── artist
├── album
├── spotify_url (NEW)
├── description
├── type ('custom' | 'auto')
├── play_count
└── last_requested_at

jukebox_queue
├── id (PRIMARY KEY)
└── sequence_id (FOREIGN KEY → sequences.id) -- NEW!
```

**Files:**
- `migrations/011_normalize_database.sql` - Migration script
- `scripts/analyze-database.js` - Schema analysis tool
- `scripts/validate-migration-011.js` - Verification script
- `votes.db.backup-before-migration-011` - Safety backup

---

### 3. Spotify Integration

**New Feature:**  
"Listen on Spotify" button in jukebox Now Playing section.

**Features:**
- ✅ Auto-fetch Spotify URLs from Spotify API
- ✅ Cache URLs in database (no repeated API calls)
- ✅ Bulk refresh button in Media Library
- ✅ Auto-update when metadata changes
- ✅ Security: `rel="noopener noreferrer"` on external links

**User Experience:**
1. Song plays in jukebox
2. "Listen on Spotify" button appears (if URL found)
3. Click → Opens Spotify in new tab
4. Users can add song to their playlists

**Admin Features:**
- Media Library shows Spotify URLs
- "Refresh Spotify URLs" button (bulk update all sequences)
- Auto-fetch on metadata edits
- Manual override option

**Files:**
- `migrations/010_add_spotify_url.sql` - Database schema
- `lib/spotify-url-helper.ts` - Shared helper functions
- `app/api/admin/media-library/refresh-urls/route.ts` - Bulk refresh API
- `scripts/refresh-spotify-urls.js` - Backfill script
- Updated: `app/jukebox/page.tsx`, `app/api/jukebox/metadata/route.ts`

---

## 🔧 Changes & Improvements

### Jukebox UI
- Now uses `/api/fpp/cached-status` (database-backed)
- Stale data indicator (yellow banner after 30s)
- Spotify button in Now Playing section
- Removed direct FPP polling from frontend

### API Routes
- `/api/jukebox/status` reads from database cache
- All FPP operations use prepared statements
- Cache-Control headers on cached endpoints
- X-Cache-Age and X-Cache-Stale headers

### PM2 Configuration
- Dual-process setup: Next.js app + FPP poller
- Auto-restart on crashes
- Separate log files: `fpp-control.log`, `fpp-poller.log`
- 256MB memory limit for poller
- Environment variables: `FPP_POLL_INTERVAL`, `FPP_HOST`

### Database
- 15 new prepared statements for FPP operations
- Foreign key constraints enforced
- Triggers for auto-cleanup
- Views for monitoring
- WAL mode + 64MB cache + memory-mapped I/O

---

## 🔐 Security Enhancements

### FPP Poller
- ✅ Input validation rejects malformed responses
- ✅ 5-second timeout prevents DoS via slow responses
- ✅ Prepared statements (SQL injection prevention)
- ✅ String sanitization on all user-controllable data
- ✅ Transaction safety (atomic updates)
- ✅ Graceful error handling (no crashes)

### Database
- ✅ Foreign key constraints prevent orphaned records
- ✅ Prepared statements throughout codebase
- ✅ CASCADE deletes maintain referential integrity
- ✅ Triggers for automatic data maintenance

### External Links
- ✅ `rel="noopener noreferrer"` on Spotify links
- ✅ HTTPS enforcement on external resources
- ✅ Content Security Policy headers

---

## 📊 Performance Metrics

### Before vs After (FPP Caching)

| Metric | Before (Direct Polling) | After (Cached) | Improvement |
|--------|------------------------|----------------|-------------|
| API Response Time | 50-200ms | <1ms | **200x faster** |
| FPP API Calls (10 users) | 60/min | 6/min | **90% reduction** |
| FPP API Calls (100 users) | 600/min | 6/min | **99% reduction** |
| Database Queries | Low | High | Acceptable (SQLite is fast) |
| Scalability | Poor | Excellent | Unlimited users |
| FPP Device Load | High | Minimal | Single poller only |

### Database Performance
- **Sub-millisecond** reads with 64MB cache
- **WAL mode** allows concurrent reads/writes
- **Memory-mapped I/O** (67MB) for faster reads
- **Prepared statements** eliminate query parsing overhead

---

## 🐛 Bug Fixes

1. **Redundant FPP Polling**  
   - Fixed: Multiple users causing excessive FPP API calls
   - Solution: Single backend poller with database cache

2. **Database Duplication**  
   - Fixed: `spotify_metadata` and `sequence_metadata` storing same data
   - Solution: Unified `sequences` table with migration

3. **Missing Foreign Keys**  
   - Fixed: `jukebox_queue` had no FK to sequences
   - Solution: Added `sequence_id` FK with CASCADE deletes

4. **Frontend Performance**  
   - Fixed: Each user polling FPP every 10s
   - Solution: Lightweight database reads from cache

5. **Scalability Bottleneck**  
   - Fixed: FPP device couldn't handle >10 concurrent users
   - Solution: Backend caching supports unlimited users

---

## 📦 New Files

### Core Features
- `lib/fpp-poller.ts` (482 lines) - Background polling service
- `lib/spotify-url-helper.ts` (71 lines) - Spotify integration helpers
- `app/api/fpp/cached-status/route.ts` (117 lines) - Fast cached API

### Migrations
- `migrations/010_add_spotify_url.sql` - Spotify URL columns
- `migrations/011_normalize_database.sql` - Unified sequences table
- `migrations/012_fpp_state_caching.sql` - FPP caching infrastructure

### Scripts
- `scripts/verify-migration-012.js` - Validate FPP caching tables
- `scripts/validate-migration-011.js` - Verify normalization
- `scripts/analyze-database.js` - Schema analysis tool
- `scripts/refresh-spotify-urls.js` - Backfill Spotify URLs
- `scripts/test-sequences-table.js` - Test unified sequences table

### Documentation
- `RELEASE-v1.0.1-rc.2.md` (this file)

---

## 🔄 Migration Guide

### From v1.0.0-rc.1 to v1.0.1-rc.2

**1. Backup Database (Critical!)**
```bash
cp votes.db votes.db.backup-before-upgrade
```

**2. Pull Latest Code**
```bash
git pull origin master
git checkout v1.0.1-rc.2
```

**3. Install Dependencies**
```bash
npm install
npm update
npm audit fix
```

**4. Run Migrations (Automatic on first start)**
```bash
npm run migrate
```

Or manually:
```bash
node -e "const db=require('better-sqlite3')('votes.db'); db.exec(require('fs').readFileSync('migrations/010_add_spotify_url.sql','utf8')); console.log('✅ Migration 010 applied');"
node -e "const db=require('better-sqlite3')('votes.db'); db.exec(require('fs').readFileSync('migrations/011_normalize_database.sql','utf8')); console.log('✅ Migration 011 applied');"
node -e "const db=require('better-sqlite3')('votes.db'); db.exec(require('fs').readFileSync('migrations/012_fpp_state_caching.sql','utf8')); console.log('✅ Migration 012 applied');"
```

**5. Verify Migrations**
```bash
node scripts/verify-migration-012.js
node scripts/validate-migration-011.js
```

**6. Update PM2 Configuration**
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

**7. Build & Restart**
```bash
npm run build
pm2 restart all
```

**8. Optional: Refresh Spotify URLs**
```bash
node scripts/refresh-spotify-urls.js
```

---

## 🧪 Testing

### Verification Commands

**Check Database Structure:**
```bash
node scripts/verify-migration-012.js
# Should show: ✅ Migration 012 verified successfully!
```

**Test FPP Poller:**
```bash
npm install -g esbuild esbuild-register
node -r esbuild-register lib/fpp-poller.ts
# Should show: [FPP Poller] Starting FPP State Polling Service
# Press Ctrl+C to stop
```

**Test Cached API:**
```bash
npm run dev
# In another terminal:
curl http://localhost:3000/api/fpp/cached-status
```

**Check PM2 Processes:**
```bash
pm2 status
# Should show: fpp-control (online), fpp-poller (online)

pm2 logs fpp-poller --lines 20
# Should show: [FPP Poller] ✓ Updated state: ...
```

---

## ⚠️ Breaking Changes

### None! 

This release is **fully backward compatible**. All existing features work identically from the user's perspective.

### Internal Changes (Developers Only)
- Database schema changed (but migrations handle it automatically)
- FPP status now comes from database instead of direct API
- Frontend jukebox component expects `cache` metadata in status response

---

## 🚀 Deployment

### Production Deployment (Recommended)

**Using PM2:**
```bash
# Stop old processes
pm2 stop all

# Pull updates
git pull origin master
git checkout v1.0.1-rc.2

# Install dependencies
npm install
npm update

# Build production
npm run build

# Start with PM2
pm2 delete all
pm2 start ecosystem.config.js
pm2 save

# Enable startup script
pm2 startup
```

**Using Systemd (Alternative):**
```bash
# Stop services
sudo systemctl stop fpp-control fpp-poller

# Update code
git pull origin master
git checkout v1.0.1-rc.2
npm install
npm run build

# Restart services
sudo systemctl restart fpp-control fpp-poller
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["sh", "-c", "pm2-runtime start ecosystem.config.js"]
```

---

## 📋 Upgrade Checklist

- [ ] Backup database (`votes.db`)
- [ ] Pull latest code (`git pull origin master`)
- [ ] Checkout v1.0.1-rc.2 (`git checkout v1.0.1-rc.2`)
- [ ] Install dependencies (`npm install`)
- [ ] Run migrations (automatic on first start or `npm run migrate`)
- [ ] Verify migration 012 (`node scripts/verify-migration-012.js`)
- [ ] Verify migration 011 (`node scripts/validate-migration-011.js`)
- [ ] Build production (`npm run build`)
- [ ] Update PM2 config (`pm2 delete all && pm2 start ecosystem.config.js`)
- [ ] Test cached API (`curl http://localhost:3000/api/fpp/cached-status`)
- [ ] Check PM2 logs (`pm2 logs fpp-poller --lines 20`)
- [ ] Verify jukebox works (visit http://localhost:3000/jukebox)
- [ ] Optional: Refresh Spotify URLs (`node scripts/refresh-spotify-urls.js`)

---

## 🔮 What's Next?

### Upcoming in v1.0.2 (Planned)
- Admin monitoring dashboard for FPP poller health
- GET `/api/admin/fpp-poller/health` endpoint
- GET `/api/admin/fpp-poller/stats` endpoint (success rate, avg response time)
- Enhanced rate limiting on cached status API
- Automatic Spotify URL refresh on schedule
- WebSocket support for real-time jukebox updates

### Upcoming in v1.1.0 (Planned)
- Multi-admin user management
- Advanced theme builder with custom gradients
- Enhanced analytics dashboard with charts
- Playlist scheduling system
- Weather-based show automation

---

## 🙏 Acknowledgments

This release represents significant architectural improvements based on real-world usage patterns and performance profiling. Special thanks to early adopters who identified scalability issues with direct FPP polling.

---

## 📞 Support

- **Issues:** https://github.com/joeally06/FPP-Control-Center/issues
- **Discussions:** https://github.com/joeally06/FPP-Control-Center/discussions
- **Documentation:** See `README.md`, `INSTALLATION.md`, `CLOUDFLARE-TUNNEL.md`

---

## 📄 License

MIT License - See LICENSE file for details

---

**Enjoy the performance boost! 🚀**
