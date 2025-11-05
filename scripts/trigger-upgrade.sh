#!/bin/bash

# FPP Control Center - Upgrade Trigger
# Based on FPP's upgradeOS.php approach
# Creates a self-deleting temp script that runs independently

UPGRADE_SCRIPT="/tmp/fpp-control-upgrade-$$.sh"

# Create the temporary upgrade script
cat > "$UPGRADE_SCRIPT" << 'UPGRADE_EOF'
#!/bin/bash

# Temporary upgrade script - will delete itself when done
SELF_SCRIPT="$0"
LOG_FILE="/home/doc/FPP-Website/logs/upgrade.log"
STATUS_FILE="/home/doc/FPP-Website/logs/upgrade_status"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

set_status() {
    echo "$1" > "$STATUS_FILE"
    log "STATUS: $1"
}

log "========================================="
log "FPP Control Center Upgrade"
log "========================================="

cd /home/doc/FPP-Website || {
    set_status "FAILED"
    log "ERROR: Cannot find project directory"
    rm -f "$SELF_SCRIPT"
    exit 1
}

# Step 1: Stop PM2 and close database
set_status "STOPPING"
log "Stopping application..."

if command -v pm2 &> /dev/null; then
    pm2 delete fpp-control >> "$LOG_FILE" 2>&1 || pm2 stop fpp-control >> "$LOG_FILE" 2>&1 || true
    sleep 3
    log "✅ Application stopped"
fi

# Step 2: Backup
set_status "BACKING_UP"
log "Creating backup..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

cp votes.db "$BACKUP_DIR/votes.db.backup" 2>/dev/null && log "✅ Database backed up"
cp .env.local "$BACKUP_DIR/.env.local.backup" 2>/dev/null && log "✅ Config backed up"

# Step 3: Stash changes
set_status "STASHING"
STASHED=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log "Stashing local changes..."
    git stash push -m "Auto-stash $TIMESTAMP" >> "$LOG_FILE" 2>&1
    STASHED=true
fi

# Step 4: Pull updates
set_status "UPDATING"
log "Pulling latest code..."

git fetch origin >> "$LOG_FILE" 2>&1
git pull origin master >> "$LOG_FILE" 2>&1 || {
    set_status "FAILED"
    log "ERROR: Git pull failed"
    pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1
    rm -f "$SELF_SCRIPT"
    exit 1
}

log "✅ Code updated"

# Step 5: Install dependencies (force clean install)
set_status "INSTALLING"
log "Installing dependencies..."

# Clean install to ensure TypeScript and all deps are fresh
rm -rf node_modules package-lock.json
npm install >> "$LOG_FILE" 2>&1 || {
    set_status "FAILED"
    log "ERROR: npm install failed"
    pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1
    rm -f "$SELF_SCRIPT"
    exit 1
}

log "✅ Dependencies installed"

# Step 6: Build
set_status "BUILDING"
log "Building application..."

npm run build >> "$LOG_FILE" 2>&1 || {
    set_status "FAILED"
    log "ERROR: Build failed"
    pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1
    rm -f "$SELF_SCRIPT"
    exit 1
}

log "✅ Build complete"

# Step 7: Restore stashed changes
if [ "$STASHED" = true ]; then
    set_status "RESTORING"
    log "Restoring local changes..."
    git stash pop >> "$LOG_FILE" 2>&1 || log "⚠️ Merge conflicts - kept in stash"
fi

# Step 8: Restart PM2
set_status "RESTARTING"
log "Starting application..."

pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1

sleep 5

if pm2 list 2>/dev/null | grep -q "fpp-control.*online"; then
    set_status "SUCCESS"
    log "✅ UPGRADE COMPLETE!"
else
    set_status "FAILED"
    log "ERROR: Failed to start"
    rm -f "$SELF_SCRIPT"
    exit 1
fi

log "========================================="
log "Backup: $BACKUP_DIR"
log "========================================="

# Delete this script
rm -f "$SELF_SCRIPT"

exit 0
UPGRADE_EOF

# Make the temp script executable
chmod +x "$UPGRADE_SCRIPT"

echo "Upgrade script created: $UPGRADE_SCRIPT"

# Execute using 'at now' like FPP does (runs immediately but detached)
if command -v at &> /dev/null; then
    echo "bash $UPGRADE_SCRIPT" | at now 2>/dev/null
    echo "✅ Upgrade scheduled with 'at' command"
elif command -v batch &> /dev/null; then
    echo "bash $UPGRADE_SCRIPT" | batch 2>/dev/null
    echo "✅ Upgrade scheduled with 'batch' command"
else
    # Fallback: run with nohup in background
    nohup bash "$UPGRADE_SCRIPT" > /dev/null 2>&1 &
    echo "✅ Upgrade started in background"
fi

echo "Monitor progress: tail -f /home/doc/FPP-Website/logs/upgrade.log"

exit 0
