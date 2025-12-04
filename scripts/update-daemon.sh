#!/bin/bash

# Update Daemon - Inspired by FPP's upgrade system
# Runs completely independent of PM2/Node.js processes
# Version: 3.5.0 - Install devDependencies for TypeScript builds

set -e

PROJECT_DIR="${1:-$(pwd)}"
LOG_FILE="$PROJECT_DIR/logs/update.log"
STATUS_FILE="$PROJECT_DIR/logs/update_status"
LOCK_FILE="$PROJECT_DIR/logs/update.lock"

# Track if update completed successfully
UPDATE_SUCCESS=false

# Function to write status
write_status() {
    echo "$1" > "$STATUS_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] STATUS: $1" >> "$LOG_FILE"
}

# Function to log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Cleanup on exit - only mark completed if UPDATE_SUCCESS is true
cleanup() {
    rm -f "$LOCK_FILE"
    if [ "$UPDATE_SUCCESS" = true ]; then
        write_status "COMPLETED"
        log "✅ Update completed successfully"
    else
        # Check if we were just "up to date" (not a failure)
        CURRENT_STATUS=$(cat "$STATUS_FILE" 2>/dev/null || echo "")
        if [ "$CURRENT_STATUS" != "UP_TO_DATE" ] && [ "$CURRENT_STATUS" != "COMPLETED" ]; then
            write_status "FAILED"
            log "❌ Update failed"
        fi
    fi
}

trap cleanup EXIT

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Check for lock file (prevent concurrent updates)
if [ -f "$LOCK_FILE" ]; then
    log "⚠️  Another update is already running"
    write_status "LOCKED"
    exit 1
fi

# Create lock file
echo $$ > "$LOCK_FILE"

log "🚀 Update Daemon Started (PID: $$)"
log "Project Directory: $PROJECT_DIR"
write_status "STARTING"

cd "$PROJECT_DIR" || {
    log "❌ Cannot change to project directory: $PROJECT_DIR"
    write_status "FAILED"
    exit 1
}

# Phase 1: Pre-download and verify
log "📥 Phase 1: Downloading updates..."
write_status "DOWNLOADING"

# Fetch latest changes without applying
git fetch origin master >> "$LOG_FILE" 2>&1 || {
    log "❌ Git fetch failed"
    write_status "FAILED"
    exit 1
}

# Check if updates are available
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/master)

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    log "✅ Already up to date"
    write_status "UP_TO_DATE"
    UPDATE_SUCCESS=true
    exit 0
fi

log "📦 Updates available: $LOCAL_COMMIT -> $REMOTE_COMMIT"

# Get commit messages
log "Changes to be applied:"
git log --oneline "$LOCAL_COMMIT..$REMOTE_COMMIT" >> "$LOG_FILE" 2>&1

# Phase 2: Backup current state
log "💾 Phase 2: Creating backup..."
write_status "BACKING_UP"

BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "votes.db" ]; then
    cp votes.db "$BACKUP_DIR/votes.db.backup" && \
        log "✅ Database backed up" || \
        log "⚠️  Database backup failed (non-critical)"
fi

# Backup env file
if [ -f ".env.local" ]; then
    cp .env.local "$BACKUP_DIR/.env.local.backup" && \
        log "✅ Config backed up" || \
        log "⚠️  Config backup failed (non-critical)"
fi

log "✅ Backup saved to: $BACKUP_DIR"

# Phase 3: Stop auxiliary services only
log "⏸️  Phase 3: Stopping auxiliary services..."
write_status "STOPPING"

# Find PM2 executable
PM2_BIN=$(command -v pm2 || echo "")

if [ -z "$PM2_BIN" ]; then
    # Try common locations
    for path in ~/.nvm/versions/node/*/bin/pm2 /usr/local/bin/pm2 /usr/bin/pm2; do
        if [ -f "$path" ]; then
            PM2_BIN="$path"
            break
        fi
    done
fi

if [ -n "$PM2_BIN" ]; then
    log "Found PM2 at: $PM2_BIN"
    
    # Only stop fpp-poller (safe to stop)
    # DO NOT stop fpp-control - it will be restarted cleanly at the end
    log "Stopping fpp-poller..."
    if "$PM2_BIN" stop fpp-poller >> "$LOG_FILE" 2>&1; then
        log "✅ fpp-poller stopped"
    else
        log "⚠️  fpp-poller not running or already stopped"
    fi
    
    sleep 2
    log "✅ Auxiliary services stopped (fpp-control will restart with new code)"
else
    log "⚠️  PM2 not found, skipping service stop"
fi

# Phase 4: Apply updates
log "📥 Phase 4: Applying updates..."
write_status "UPDATING"

# Stash any local changes
git stash >> "$LOG_FILE" 2>&1 || true

# Pull updates
if git pull origin master >> "$LOG_FILE" 2>&1; then
    log "✅ Code updated successfully"
else
    log "❌ Git pull failed"
    
    # Attempt rollback
    log "🔄 Attempting rollback..."
    git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1
    
    write_status "FAILED"
    exit 1
fi

# Phase 5: Install dependencies
log "📦 Phase 5: Installing dependencies..."
write_status "INSTALLING"

# Install all dependencies including devDependencies (needed for TypeScript build)
if npm install --include=dev >> "$LOG_FILE" 2>&1; then
    log "✅ Dependencies installed"
else
    log "❌ npm install failed"
    
    # Attempt rollback
    log "🔄 Attempting rollback..."
    git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1
    npm install --include=dev >> "$LOG_FILE" 2>&1
    
    write_status "FAILED"
    exit 1
fi

# Phase 6: Build application
log "🔨 Phase 6: Building application..."
write_status "BUILDING"

if npm run build >> "$LOG_FILE" 2>&1; then
    log "✅ Build completed"
else
    log "❌ Build failed"
    
    # Attempt rollback
    log "🔄 Attempting rollback..."
    git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1
    npm install --include=dev >> "$LOG_FILE" 2>&1
    npm run build >> "$LOG_FILE" 2>&1
    
    write_status "FAILED"
    exit 1
fi

# Phase 7: Restart all services
log "🔄 Phase 7: Restarting all services..."
write_status "RESTARTING"

if [ -n "$PM2_BIN" ]; then
    # Restart all services from ecosystem config
    if [ -f "ecosystem.config.js" ]; then
        log "Restarting all services from ecosystem.config.js..."
        
        # Delete all old processes to ensure clean restart
        log "Removing old PM2 processes..."
        "$PM2_BIN" delete all >> "$LOG_FILE" 2>&1 || {
            log "⚠️  Could not delete old processes"
        }
        
        sleep 2
        
        # Start fresh from ecosystem config (includes fpp-control and fpp-poller)
        log "Starting fresh from ecosystem.config.js..."
        "$PM2_BIN" start ecosystem.config.js >> "$LOG_FILE" 2>&1 || {
            log "❌ Could not start services from ecosystem.config.js"
            write_status "FAILED"
            exit 1
        }
        
        log "✅ All services started from ecosystem.config.js"
    else
        # Fallback: restart fpp-control and start fpp-poller
        log "No ecosystem.config.js, restarting services individually..."
        
        "$PM2_BIN" restart fpp-control >> "$LOG_FILE" 2>&1 || {
            log "⚠️  Could not restart fpp-control"
        }
        
        "$PM2_BIN" start fpp-poller >> "$LOG_FILE" 2>&1 || {
            log "⚠️  Could not start fpp-poller"
        }
        
        log "✅ Services restarted"
    fi
    
    sleep 3
    
    # Save PM2 config
    "$PM2_BIN" save >> "$LOG_FILE" 2>&1 || log "⚠️  Could not save PM2 config"
    
    # Show current status
    "$PM2_BIN" status >> "$LOG_FILE" 2>&1
    
    # Verify services are running
    FPP_CONTROL_STATUS=$("$PM2_BIN" jlist 2>/dev/null | jq -r '.[] | select(.name=="fpp-control") | .pm2_env.status' 2>/dev/null || echo "unknown")
    FPP_POLLER_STATUS=$("$PM2_BIN" jlist 2>/dev/null | jq -r '.[] | select(.name=="fpp-poller") | .pm2_env.status' 2>/dev/null || echo "unknown")
    
    if [ "$FPP_CONTROL_STATUS" = "online" ]; then
        log "✅ fpp-control is running"
    else
        log "⚠️  fpp-control status: $FPP_CONTROL_STATUS"
    fi
    
    if [ "$FPP_POLLER_STATUS" = "online" ]; then
        log "✅ fpp-poller is running"
    else
        log "⚠️  fpp-poller status: $FPP_POLLER_STATUS"
    fi
else
    log "⚠️  PM2 not found, cannot restart services"
    log "ℹ️  Please manually restart: pm2 start ecosystem.config.js"
fi

# Phase 8: Verify health
log "🏥 Phase 8: Verifying health..."
write_status "VERIFYING"

sleep 5

# Check if services are running
if [ -n "$PM2_BIN" ]; then
    RUNNING=$("$PM2_BIN" list | grep -c "online" || echo "0")
    EXPECTED=2
    if [ "$RUNNING" -ge "$EXPECTED" ]; then
        log "✅ All services running ($RUNNING/$EXPECTED online)"
    else
        log "⚠️  Only $RUNNING/$EXPECTED services online"
    fi
fi

# Try to ping the application
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "401" ]; then
        log "✅ Application responding (HTTP $HTTP_CODE)"
    else
        log "⚠️  Application health check: HTTP $HTTP_CODE"
    fi
fi

log "🎉 Update completed successfully!"
log "Updated from $LOCAL_COMMIT to $REMOTE_COMMIT"

# Mark success so cleanup trap knows we completed properly
UPDATE_SUCCESS=true

exit 0
