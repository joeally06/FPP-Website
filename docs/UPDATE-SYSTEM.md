# Update System Architecture

## Overview

FPP Control Center uses a **FPP-inspired atomic update system** that survives service restarts and provides automatic rollback on failure.

## Architecture

```
User Interface (Admin Dashboard)
        ↓
POST /api/system/update
        ↓
scripts/run-update.sh (Launcher)
        ↓
scripts/update-daemon.sh (Atomic Update Process)
        ↓
8 Phases with Rollback
```

## Components

### Active Components ✅

1. **`app/api/system/update/route.ts`** - API endpoint that spawns launcher
2. **`scripts/run-update.sh`** - Launcher (detaches daemon with nohup)
3. **`scripts/update-daemon.sh`** - Main update orchestrator (8 phases)
4. **`app/api/system/update-status/route.ts`** - Status polling endpoint

### Deprecated Components ❌

These files are **NO LONGER USED** and should be removed:

1. ~~`update.sh`~~ - Old unreliable update script (replaced by `update-daemon.sh`)
2. ~~`app/api/system/update/stream/route.ts`~~ - Old streaming endpoint (replaced by polling)

If these files exist in your installation, run:
```bash
./scripts/cleanup-old-update-code.sh
```

## 8-Phase Update Process

Each phase has automatic rollback on failure:

1. **DOWNLOADING** - Fetch latest code from GitHub
2. **BACKING_UP** - Backup database & config to timestamped folder
3. **STOPPING** - Stop all PM2 services (this is where API disconnects)
4. **UPDATING** - Apply git updates (rollback: `git reset --hard`)
5. **INSTALLING** - Install dependencies (rollback: revert + reinstall)
6. **BUILDING** - Build application (rollback: revert + rebuild old)
7. **RESTARTING** - Restart PM2 services (uses `pm2 start ecosystem.config.js`)
8. **VERIFYING** - Health check (HTTP request + PM2 status)

## Safety Features

- ✅ **Lock file** - Prevents concurrent updates
- ✅ **Atomic operations** - All or nothing
- ✅ **Automatic rollback** - On any failure
- ✅ **Backup before changes** - User data protected in timestamped folder
- ✅ **Detached process** - Survives PM2 restart (triple detachment)
- ✅ **Comprehensive logging** - Full audit trail with timestamps
- ✅ **Both apps restart** - Fixed to ensure fpp-control + fpp-poller both start

## Usage

### From UI (Recommended)
```
Admin Dashboard → System Updates → Check for Updates → Start Update
```

### From Command Line
```bash
# Automatic (recommended)
./scripts/run-update.sh

# Manual (for testing/debugging)
bash scripts/update-daemon.sh /path/to/project
```

### Check Status
```bash
# View logs in real-time
tail -f logs/update.log

# Check current status
cat logs/update_status

# View last update result
cat logs/update.log | grep "Updated from"

# Check PM2 status
pm2 status
```

## Troubleshooting

### Update Stuck

```bash
# Check if daemon is running
ps aux | grep update-daemon

# Check lock file
cat logs/update.lock

# If stale (>30 min old), remove:
rm logs/update.lock logs/update.pid
```

### Rollback Failed Update

```bash
# View backup locations
ls -lt backups/

# Manually restore (replace YYYYMMDD_HHMMSS with actual timestamp)
cp backups/YYYYMMDD_HHMMSS/votes.db.backup votes.db
cp backups/YYYYMMDD_HHMMSS/.env.local.backup .env.local
```

### Only One PM2 App Running

This was a bug in Phase 7 that's now fixed (commit c56abbf).

**Quick fix:**
```bash
# Start both apps
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

**Root cause:** Old code used `pm2 restart all` which only restarted running processes. New code uses `pm2 stop all && pm2 start ecosystem.config.js` which guarantees both apps start.

### Health Check Shows HTTP 000

This warning is harmless if PM2 shows both apps online. Causes:
- App still starting (5s might not be enough)
- Firewall blocking localhost
- Auth required (returns 401, not 000)

The update still succeeds as long as PM2 shows both apps online.

## Migration from Old System

If you have the old update system installed (update.sh exists):

### Step 1: Backup Current Installation
```bash
cd ~
tar -czf fpp-control-backup-$(date +%Y%m%d).tar.gz FPP-Website/
```

### Step 2: Clean Git State
```bash
cd ~/FPP-Website
git config core.autocrlf input
git restore scripts/*.sh update.sh package-lock.json
rm -f "tash pop"
git status  # Should show clean
```

### Step 3: Pull Latest Code
```bash
git pull origin master
```

### Step 4: Run Cleanup Script
```bash
./scripts/cleanup-old-update-code.sh
```

### Step 5: Rebuild
```bash
npm run build
```

### Step 6: Restart Both Apps
```bash
pm2 stop all
pm2 start ecosystem.config.js
pm2 save
```

### Step 7: Test Update from UI
1. Open Admin Dashboard
2. Navigate to System Updates
3. Click "Check for Updates"
4. Click "Start Update"
5. Watch logs: `tail -f logs/update.log`
6. Verify both apps restart: `pm2 status`

## Comparison: Old vs New

| Feature | Old System (update.sh) | New System (update-daemon.sh) |
|---------|------------------------|-------------------------------|
| Survives PM2 restart | ❌ No - dies when PM2 stops | ✅ Yes - triple detachment |
| Automatic rollback | ❌ No | ✅ Yes - all phases |
| Both apps restart | ❌ No - only running ones | ✅ Yes - start from ecosystem |
| Backup before changes | ❌ No | ✅ Yes - timestamped folder |
| Lock file protection | ❌ No - concurrent allowed | ✅ Yes - prevents conflicts |
| Comprehensive logging | ⚠️ Basic | ✅ Full with timestamps |
| Status tracking | ⚠️ Streaming only | ✅ Polling fallback |
| Health verification | ❌ No | ✅ Yes - HTTP + PM2 check |
| Update in 8 phases | ❌ No - monolithic | ✅ Yes - atomic phases |

## Known Issues (Fixed)

### Issue 1: Only fpp-poller Restarts ✅ FIXED
- **Problem:** Phase 7 used `pm2 restart all` which only restarted running processes
- **Solution:** Changed to `pm2 stop all && pm2 start ecosystem.config.js`
- **Fixed in:** Commit c56abbf
- **Result:** Both apps now guaranteed to start

### Issue 2: Wrong Script Called ✅ FIXED
- **Problem:** run-update.sh was calling update.sh instead of update-daemon.sh
- **Solution:** Updated launcher to use correct daemon path
- **Fixed in:** Commit 9157744
- **Result:** New atomic system now used

### Issue 3: Git Line Endings ✅ DOCUMENTED
- **Problem:** Scripts modified on Linux due to CRLF/LF differences
- **Solution:** `git config core.autocrlf input && git restore scripts/*.sh`
- **Prevention:** Added to migration guide
- **Result:** Clean git state maintained

## Architecture Details

### Triple Detachment Strategy

The daemon survives PM2 restart through three layers:

1. **Node.js Level:**
   ```typescript
   spawn(..., { detached: true, stdio: 'ignore' })
   daemon.unref()
   ```

2. **Launcher Level:**
   ```bash
   nohup bash "$DAEMON_SCRIPT" "$PROJECT_DIR" >> "$LOG_FILE" 2>&1 &
   ```

3. **Process Management:**
   - Daemon PID saved to file
   - Lock file prevents duplicates
   - Status file for IPC

### Status File as IPC

Instead of direct process communication (which breaks when PM2 stops), the daemon writes to a status file:

```bash
write_status() {
    echo "$1" > "$STATUS_FILE"
}
```

The UI polls this file every 2 seconds:

```typescript
const response = await fetch('/api/system/update-status')
const { status, lastLines } = await response.json()
```

This survives PM2 restarts because it's file-based, not process-based.

### Rollback Strategy

Each phase that modifies state has rollback logic:

```bash
git pull || {
    git reset --hard $LOCAL_COMMIT
    exit 1
}

npm install || {
    git reset --hard $LOCAL_COMMIT
    npm install  # Reinstall old deps
    exit 1
}

npm run build || {
    git reset --hard $LOCAL_COMMIT
    npm install
    npm run build  # Rebuild old version
    exit 1
}
```

**Guarantee:** System is never left in partially updated state.

## Timeline of Updates

### v3.1.0 (Current) - Both Apps Restart Fix
- **Date:** November 10, 2025
- **Commits:** c56abbf, c020d88, c7e4130
- **Change:** Phase 7 now uses `pm2 start ecosystem.config.js`
- **Impact:** Both fpp-control and fpp-poller guaranteed to start

### v3.0.0 - FPP-Inspired Atomic System
- **Date:** November 9, 2025
- **Commits:** 4c42feb, 9157744
- **Change:** Complete rewrite using 8-phase atomic process
- **Impact:** Survives PM2 restart, automatic rollback

### v2.x - Old System (Deprecated)
- **Script:** update.sh
- **Problems:** Died on PM2 restart, no rollback, unreliable
- **Status:** Replaced by update-daemon.sh

## Performance

Typical update duration:
- **Phase 1-2:** 2-5 seconds (download + backup)
- **Phase 3:** 2 seconds (stop services)
- **Phase 4:** 1-3 seconds (git pull)
- **Phase 5:** 5-15 seconds (npm install)
- **Phase 6:** 15-30 seconds (npm run build) ← longest phase
- **Phase 7:** 2-5 seconds (restart services)
- **Phase 8:** 5 seconds (health check)

**Total:** ~30-60 seconds for typical update

## See Also

- [INSTALLATION.md](../INSTALLATION.md) - Initial setup guide
- [SECURITY-IMPLEMENTATION.md](../SECURITY-IMPLEMENTATION.md) - Security features
- [ecosystem.config.js](../ecosystem.config.js) - PM2 configuration
- [scripts/update-daemon.sh](../scripts/update-daemon.sh) - Source code
- [scripts/run-update.sh](../scripts/run-update.sh) - Launcher source

## Support

If you encounter issues:

1. Check logs: `tail -f logs/update.log`
2. Check PM2 status: `pm2 status`
3. Review this documentation
4. Create GitHub issue with logs
