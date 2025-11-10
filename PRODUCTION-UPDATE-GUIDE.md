# Production Server Update - Step-by-Step Guide

## ✅ Pre-Flight Checklist

Before starting, ensure:
- [ ] SSH access to production server
- [ ] Current backup exists (or will be created in step 1)
- [ ] You have 5-10 minutes for the process
- [ ] You're in the project directory: `~/FPP-Website`

---

## 📋 Step-by-Step Instructions

### Step 1: Backup Current System

```bash
cd ~
tar -czf fpp-control-backup-$(date +%Y%m%d-%H%M%S).tar.gz FPP-Website/
ls -lh fpp-control-backup*.tar.gz
```

**Expected:** You'll see a .tar.gz file created (size ~50-200MB)

---

### Step 2: Navigate to Project

```bash
cd ~/FPP-Website
pwd
```

**Expected output:** `/home/doc/FPP-Website`

---

### Step 3: Check Current Status

```bash
pm2 status
```

**Current state:** Only `fpp-poller` is running (ID 1)  
**Goal:** Get both `fpp-control` and `fpp-poller` running

---

### Step 4: Temporarily Start Web App

```bash
pm2 start ecosystem.config.js
pm2 status
```

**Expected:** You should now see TWO processes:
- `fpp-control` (ID 0) - online
- `fpp-poller` (ID 1) - online

**Note:** Your website should be accessible now at your domain

---

### Step 5: Clean Git State

```bash
git config core.autocrlf input
git restore scripts/*.sh update.sh package-lock.json
rm -f "tash pop"
git status
```

**Expected output:** `nothing to commit, working tree clean`

If you still see modifications:
```bash
git restore .
git status
```

---

### Step 6: Pull Latest Code

```bash
git pull origin master
```

**Expected output:**
```
Updating c020d88..a635001
Fast-forward
 docs/UPDATE-SYSTEM.md                    | 345 +++++++++++++++++++++
 scripts/cleanup-old-update-code.sh       |  71 +++++
 2 files changed, 416 insertions(+)
```

**This includes:**
- ✅ Cleanup script (removes old conflicting code)
- ✅ PM2 restart fix (ensures both apps start)
- ✅ Dashboard pulse animation (visual test)
- ✅ Complete documentation

---

### Step 7: Run Cleanup Script

```bash
./scripts/cleanup-old-update-code.sh
```

**Expected output:**
```
🧹 Cleaning up old update system code...
📦 Creating backup in: backups/old-update-code-YYYYMMDD_HHMMSS
  ✓ Backing up old update.sh
  ℹ️  No old stream endpoint found (already cleaned)

🗑️  Removing old update code...
  ✓ Removing update.sh (replaced by update-daemon.sh)
  ℹ️  stream endpoint already removed

✅ Cleanup complete!
```

**What this does:**
- Backs up old `update.sh` to `backups/` folder
- Removes `update.sh` (replaced by `update-daemon.sh`)
- Removes conflicting stream endpoint
- Ensures only new atomic update system is active

---

### Step 8: Rebuild Application

```bash
npm run build
```

**Expected:** Build completes successfully in ~30 seconds  
**Output:** Should end with route table and "✓ Compiled successfully"

**Note:** You'll see some ECONNREFUSED errors - this is normal (FPP device check during build)

---

### Step 9: Restart Both Apps Properly

```bash
pm2 stop all
sleep 2
pm2 start ecosystem.config.js
pm2 save
```

**Expected output from `pm2 status`:**
```
┌────┬────────────────────┬─────────┬─────┬──────────┬─────────┬─────────┐
│ id │ name               │ mode    │ ↺   │ status   │ cpu     │ memory  │
├────┼────────────────────┼─────────┼─────┼──────────┼─────────┼─────────┤
│ 0  │ fpp-control        │ fork    │ 0   │ online   │ 0%      │ 145mb   │
│ 1  │ fpp-poller         │ fork    │ 0   │ online   │ 0%      │ 76mb    │
└────┴────────────────────┴─────────┴─────┴──────────┴─────────┴─────────┘
```

**Critical:** Both apps must show "online"

---

### Step 10: Verify Website is Running

```bash
curl -I http://localhost:3000
```

**Expected:** Should return HTTP headers (200, 302, or 401 are all good)

**Also test in browser:** Visit your domain - you should see the site

---

### Step 11: Check for Visual Changes

Open your website and verify these three test changes:

1. **Dashboard Title** (NEW):
   - Go to admin dashboard
   - Title "🎮 FPP Control Center" should have subtle pulse animation
   - Fades between 100% and 85% opacity every 3 seconds

2. **Footer** (Previous update):
   - Scroll to bottom of any page
   - Footer text should have rainbow gradient animation

3. **Jukebox Header** (Previous update):
   - Go to `/jukebox` page
   - Header should have animated gradient and pulsing/bouncing icons

**If you see all three:** Visual confirmation that updates are working! ✅

---

### Step 12: Test Auto-Update from UI

Now test the atomic update system:

1. **Open Admin Dashboard**
   - Navigate to System Updates section

2. **Check for Updates**
   - Click "Check for Updates"
   - Should show: "No updates available" (you're on latest)

3. **For future updates:**
   - When updates are available, click "Start Update"
   - Watch the 8-phase process in real-time
   - Both apps should restart automatically
   - No manual rebuild needed!

---

### Step 13: Monitor Logs (Optional)

Open a second terminal and watch logs during next update:

```bash
tail -f ~/FPP-Website/logs/update.log
```

**You'll see all 8 phases:**
1. DOWNLOADING
2. BACKING_UP
3. STOPPING (this is where UI disconnects - normal!)
4. UPDATING
5. INSTALLING
6. BUILDING (longest phase, ~30 seconds)
7. RESTARTING (both apps now start!)
8. VERIFYING

---

## 🎯 Success Criteria

You've succeeded when:

- [x] Both PM2 apps show "online" (`pm2 status`)
- [x] Website is accessible in browser
- [x] Dashboard title has pulse animation (proves latest code deployed)
- [x] Footer has rainbow gradient (proves recent updates work)
- [x] No errors in `tail -f logs/update.log`
- [x] Old `update.sh` removed (only `update-daemon.sh` exists)

---

## 🚨 Troubleshooting

### Problem: Only one PM2 app running after restart

```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

### Problem: Git pull conflicts

```bash
git stash
git pull origin master
```

### Problem: Build fails

```bash
# Check Node version (should be 20+)
node --version

# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problem: Website not accessible

```bash
# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Check PM2 logs
pm2 logs fpp-control --lines 50
```

### Problem: Update script errors

```bash
# Check if script is executable
ls -la scripts/*.sh

# Make executable if needed
chmod +x scripts/*.sh

# Try manual update
./scripts/run-update.sh
```

---

## 📚 Next Steps

After successful completion:

1. **Read the Documentation**
   - `docs/UPDATE-SYSTEM.md` - Complete architecture guide
   - Understand how the 8-phase update works
   - Learn troubleshooting techniques

2. **Test Future Updates**
   - When I push a new commit, test the auto-update
   - Should work from UI without manual intervention
   - Both apps should restart automatically

3. **Monitor System**
   - Check `pm2 status` daily
   - Watch for any restarts or crashes
   - Review logs if issues occur

4. **Backup Strategy**
   - System auto-backs up before each update
   - Backups stored in: `backups/YYYYMMDD_HHMMSS/`
   - Keep at least 3-5 recent backups

---

## ✅ Completion Checklist

Mark these off as you complete each step:

- [ ] Step 1: Created backup
- [ ] Step 2: Navigated to project
- [ ] Step 3: Checked PM2 status
- [ ] Step 4: Started both apps
- [ ] Step 5: Cleaned git state
- [ ] Step 6: Pulled latest code
- [ ] Step 7: Ran cleanup script
- [ ] Step 8: Built application
- [ ] Step 9: Restarted apps properly
- [ ] Step 10: Verified website running
- [ ] Step 11: Confirmed visual changes
- [ ] Step 12: Tested update UI
- [ ] Step 13: Monitored logs

**Once all checked:** Your system is fully updated and ready! 🎉

---

## 📞 Support

If you get stuck:

1. Check the troubleshooting section above
2. Review logs: `tail -f logs/update.log`
3. Check PM2 status: `pm2 status`
4. Review `docs/UPDATE-SYSTEM.md` for detailed architecture
5. Create GitHub issue with error logs if needed

---

**Time to complete:** ~5-10 minutes  
**Difficulty:** Easy (just follow the steps)  
**Risk:** Low (backups created, rollback available)

**Let's do this! 🚀**
