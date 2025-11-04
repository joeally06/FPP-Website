#!/bin/bash

# FPP Control Center - Upgrade System
# Based on FPP's upgrade approach - runs completely detached

set -e

UPGRADE_DIR="/tmp/fpp-control-upgrade"
STATUS_FILE="$UPGRADE_DIR/upgrade_status"
LOG_FILE="$UPGRADE_DIR/upgrade.log"
PID_FILE="$UPGRADE_DIR/upgrade.pid"

# Create upgrade directory
mkdir -p "$UPGRADE_DIR"

# Write PID
echo $$ > "$PID_FILE"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Status update function
set_status() {
    echo "$1" > "$STATUS_FILE"
    log "STATUS: $1"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    rm -f "$PID_FILE"
}

trap cleanup EXIT

log "========================================="
log "FPP Control Center Upgrade System"
log "========================================="

# Change to project directory
cd /home/doc/FPP-Website || {
    set_status "FAILED: Cannot find project directory"
    exit 1
}

PROJECT_DIR=$(pwd)
log "Project directory: $PROJECT_DIR"

# Step 1: Stop PM2 and close database
set_status "STOPPING"
log "Step 1: Stopping application to close database safely..."

if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "fpp-control"; then
        log "Deleting PM2 process (ensures clean database shutdown)..."
        pm2 delete fpp-control >> "$LOG_FILE" 2>&1 || true
        
        # Wait for database to close cleanly
        log "Waiting for database to close (3 seconds)..."
        sleep 3
        
        log "✅ Application stopped"
    else
        log "PM2 process not running, skipping stop"
    fi
else
    log "PM2 not installed, skipping stop"
fi

# Step 2: Backup
set_status "BACKING_UP"
log "Step 2: Creating backup..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_DIR/backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

if [ -f "$PROJECT_DIR/votes.db" ]; then
    cp "$PROJECT_DIR/votes.db" "$BACKUP_DIR/votes.db.backup"
    log "✅ Database backed up"
fi

if [ -f "$PROJECT_DIR/.env.local" ]; then
    cp "$PROJECT_DIR/.env.local" "$BACKUP_DIR/.env.local.backup"
    log "✅ Configuration backed up"
fi

log "✅ Backup saved to: $BACKUP_DIR"

# Step 3: Stash local changes
set_status "STASHING"
log "Step 3: Checking for local changes..."

STASHED=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log "Stashing uncommitted changes..."
    git stash push -m "Auto-stash before upgrade $TIMESTAMP" >> "$LOG_FILE" 2>&1
    STASHED=true
    log "✅ Changes stashed"
else
    log "No uncommitted changes"
fi

# Step 4: Fetch and check for updates
set_status "CHECKING"
log "Step 4: Checking for updates..."

git fetch origin >> "$LOG_FILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "Already up to date!"
    set_status "UP_TO_DATE"
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        git stash pop >> "$LOG_FILE" 2>&1 || true
    fi
    
    # Restart PM2
    log "Restarting application..."
    pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1
    set_status "COMPLETE"
    exit 0
fi

# Step 5: Pull updates
set_status "UPDATING"
log "Step 5: Pulling latest changes..."

git pull origin master >> "$LOG_FILE" 2>&1
log "✅ Code updated"

# Step 6: Install dependencies
set_status "INSTALLING"
log "Step 6: Installing dependencies..."

npm install >> "$LOG_FILE" 2>&1
log "✅ Dependencies installed"

# Step 7: Build application
set_status "BUILDING"
log "Step 7: Building application..."

npm run build >> "$LOG_FILE" 2>&1
log "✅ Build complete"

# Step 8: Run migrations
if [ -f "scripts/migrate-database.js" ]; then
    set_status "MIGRATING"
    log "Step 8: Running database migrations..."
    node scripts/migrate-database.js >> "$LOG_FILE" 2>&1
    log "✅ Migrations complete"
fi

# Step 9: Restore stashed changes
if [ "$STASHED" = true ]; then
    set_status "RESTORING"
    log "Step 9: Restoring local changes..."
    if git stash pop >> "$LOG_FILE" 2>&1; then
        log "✅ Local changes restored"
    else
        log "⚠️  Merge conflicts - changes kept in stash"
    fi
fi

# Step 10: Restart application
set_status "RESTARTING"
log "Step 10: Restarting application..."

pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1

# Wait for app to start
sleep 5

# Check if it's running
if pm2 list 2>/dev/null | grep -q "fpp-control.*online"; then
    log "✅ Application restarted successfully"
    set_status "COMPLETE"
else
    log "❌ Application failed to start"
    set_status "FAILED"
    exit 1
fi

log "========================================="
log "✅ UPGRADE COMPLETE!"
log "========================================="
log "Backup location: $BACKUP_DIR"
log "Log file: $LOG_FILE"

set_status "SUCCESS"
exit 0
