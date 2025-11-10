# Auto-Update System - Diagnosis & Testing Guide

> ⚠️ **DEPRECATED**: This guide is for the old update system.  
> **Current System**: See [UPDATE-SYSTEM.md](./UPDATE-SYSTEM.md) for the new FPP-inspired atomic update system with 8-phase rollback.

## ✅ What Was Fixed

### Root Causes Identified:
1. **Missing Environment Variables**: Detached processes weren't inheriting PM2 PATH
2. **No Validation**: Script assumed PM2/git were available without checking
3. **Silent Failures**: Errors weren't being logged properly
4. **Poor Error Messages**: Users couldn't diagnose why updates failed

### Solutions Implemented:
1. ✅ **Environment Validation**: Pre-flight checks before starting update
2. ✅ **Enhanced Logging**: Timestamps, error tracking, detailed status
3. ✅ **Full Environment Propagation**: Explicitly pass PATH, HOME, USER
4. ✅ **Test Script**: New tool to validate update system health

---

## 🧪 Testing the Fix

### Step 1: Run Health Check

```bash
./scripts/test-update-system.sh
```

This will validate:
- ✅ PM2 is available
- ✅ Scripts exist and are executable
- ✅ Git repository is configured
- ✅ Logs directory is writable
- ✅ Detached processes work
- ✅ Node.js/npm are available
- ✅ PM2 process is running

**Expected output:**
```
✅ All tests passed!
🎉 Auto-update system is ready
```

If you see errors, fix them before attempting update.

---

### Step 2: Monitor Update Process

Before clicking "Update" in the admin dashboard, open a terminal:

```bash
# In one terminal, monitor the update log
tail -f logs/update.log

# In another terminal, watch the status
watch -n 1 cat logs/update_status
```

---

### Step 3: Trigger Update

1. Go to Admin Dashboard → System Settings
2. Click "Check for Updates"
3. If updates available, click "Update Now"
4. Watch the logs in your terminal

**Expected flow:**
```
STARTING       → Initializing
STOPPING       → Stopping PM2
BACKING_UP     → Creating backup
STASHING       → Stashing local changes
UPDATING       → Pulling from GitHub
INSTALLING     → Installing dependencies
MIGRATING      → Running database migrations
BUILDING       → Building Next.js app
RESTARTING     → Starting PM2
COMPLETED      → Success!
```

---

## 🔍 Troubleshooting

### Issue: "PM2 not found in PATH"

**Cause**: PM2 not available to detached process

**Fix:**
```bash
# Check where PM2 is installed
which pm2

# Add PM2 to PATH in your shell profile
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# OR install PM2 globally
npm install -g pm2
```

---

### Issue: "Update script not found"

**Cause**: Scripts missing or not executable

**Fix:**
```bash
# Make scripts executable
chmod +x update.sh
chmod +x scripts/run-update.sh
chmod +x scripts/test-update-system.sh

# Verify
ls -l update.sh scripts/run-update.sh
```

---

### Issue: "Failed to set script permissions"

**Cause**: Script not executable or filesystem mounted as read-only

**Fix:**
```bash
# Check filesystem mount options
mount | grep $(pwd -P)

# Remount if needed (requires sudo)
# sudo mount -o remount,rw /path/to/FPP-Control-Center

# Or manually set permissions
chmod +x scripts/run-update.sh update.sh
```

---

### Issue: Update hangs at "STARTING"

**Cause**: Script crashed before writing first status

**Check logs:**
```bash
# View full log
cat logs/update.log

# Check for errors
grep -i error logs/update.log

# Check if process is still running
ps aux | grep run-update.sh
```

**Common causes:**
- Git repository has conflicts
- PM2 failed to stop
- Network connection lost

---

### Issue: Update fails during "BUILDING"

**Cause**: npm build errors or out of memory

**Fix:**
```bash
# Check build logs
tail -50 logs/update.log

# Try manual build to see full error
npm run build

# If out of memory, increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

### Issue: Server doesn't restart after update

**Cause**: PM2 failed to start

**Fix:**
```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs fpp-control --lines 50

# Manually restart
pm2 restart fpp-control

# Or stop and start
pm2 stop fpp-control
pm2 start ecosystem.config.js
```

---

## 🐛 Debug Mode

To see detailed debug output during update:

```bash
# Edit run-update.sh and add at top:
set -x  # Enable debug mode

# Then run update and check logs
tail -f logs/update.log
```

---

## 📊 Monitoring During Update

### Watch all relevant info:

```bash
# Terminal 1: Update log
tail -f logs/update.log

# Terminal 2: Status
watch -n 1 'echo "Status: $(cat logs/update_status 2>/dev/null || echo IDLE)" && echo "---" && pm2 list'

# Terminal 3: System resources
watch -n 2 'echo "CPU/Memory:" && top -b -n 1 | head -20'
```

---

## ✅ Success Indicators

Update succeeded if you see:

1. **In logs/update.log:**
   ```
   ✅ Update completed successfully!
   🎉 Application should restart automatically
   ```

2. **In logs/update_status:**
   ```
   COMPLETED
   ```

3. **PM2 shows running:**
   ```bash
   pm2 list
   # fpp-control should be "online"
   ```

4. **Application accessible:**
   - Navigate to http://localhost:3000
   - Page loads without errors
   - Check version in footer or admin panel

---

## 🔒 Security Notes

The enhanced update system:

- ✅ **Admin Only**: Update API requires admin authentication
- ✅ **No Privilege Escalation**: Runs with current user permissions
- ✅ **Validated Paths**: Script paths are validated before execution
- ✅ **Audit Trail**: All actions logged with timestamps
- ✅ **Rollback Capability**: Creates backup before updating
- ✅ **Git Controlled**: Only pulls from configured origin

---

## 📝 Manual Update (If Auto-Update Fails)

If all else fails, update manually:

```bash
# 1. Stop the server
pm2 stop fpp-control

# 2. Create backup
cp votes.db votes.db.backup

# 3. Pull updates
git pull origin master

# 4. Update dependencies
npm install

# 5. Run migrations
node scripts/migrate-database.js

# 6. Build
npm run build

# 7. Restart
pm2 restart fpp-control
```

---

## 🎯 Next Steps

After confirming auto-update works:

1. ✅ Test on your production server
2. ✅ Document any environment-specific issues
3. ✅ Consider setting up automated update checks (cron job)
4. ✅ Add update notifications (email/webhook)

---

## 📞 Getting Help

If update still fails after these fixes:

1. Run: `./scripts/test-update-system.sh` and share output
2. Share: `logs/update.log` (last 100 lines)
3. Share: Output of `pm2 list` and `pm2 logs fpp-control --lines 20`
4. Share: Node version: `node --version`, npm version: `npm --version`
5. Create GitHub issue with above info

---

## 🔄 Changelog

**Version 2.3.0** (Current)
- ✅ Added environment validation
- ✅ Enhanced error logging
- ✅ Full environment propagation
- ✅ Created test script
- ✅ Improved status tracking
