#!/bin/bash

# Update Daemon - Inspired by FPP's upgrade system
# Runs completely independent of PM2/Node.js processes
# Version: 3.1.0 - Fixed premature completion issue

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

# Phase 3: Stop services
log "⏸️  Phase 3: Stopping services..."
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
    
    # Stop all PM2 processes
    "$PM2_BIN" stop all >> "$LOG_FILE" 2>&1 || {
        log "⚠️  PM2 stop had issues (may not be running)"
    }
    
    sleep 2
    log "✅ Services stopped"
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

if npm install >> "$LOG_FILE" 2>&1; then
    log "✅ Dependencies installed"
else
    log "❌ npm install failed"
    
    # Attempt rollback
    log "🔄 Attempting rollback..."
    git reset --hard "$LOCAL_COMMIT" >> "$LOG_FILE" 2>&1
    npm install >> "$LOG_FILE" 2>&1
    
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
    npm install >> "$LOG_FILE" 2>&1
    npm run build >> "$LOG_FILE" 2>&1
    
    write_status "FAILED"
    exit 1
fi

# Phase 7: Restart services
log "🔄 Phase 7: Restarting services..."
write_status "RESTARTING"

if [ -n "$PM2_BIN" ]; then
    # Stop all services first to ensure clean restart
    log "Stopping all PM2 services..."
    "$PM2_BIN" stop all >> "$LOG_FILE" 2>&1 || {
        log "⚠️  PM2 stop had issues (services may not be running)"
    }
    
    sleep 2
    
    # Start from ecosystem config to ensure both apps start
    if [ -f "ecosystem.config.js" ]; then
        log "Starting services from ecosystem.config.js..."
        "$PM2_BIN" start ecosystem.config.js >> "$LOG_FILE" 2>&1 || {
            log "❌ Could not start services from ecosystem.config.js"
            write_status "FAILED"
            exit 1
        }
        log "✅ Services started from ecosystem.config.js"
    else
        # Fallback: try restart all
        log "No ecosystem.config.js, trying restart all..."
        "$PM2_BIN" restart all >> "$LOG_FILE" 2>&1 || {
            log "❌ Could not restart services"
            write_status "FAILED"
            exit 1
        }
        log "✅ Services restarted"
    fi
    
    sleep 3
    
    # Save PM2 config
    "$PM2_BIN" save >> "$LOG_FILE" 2>&1 || log "⚠️  Could not save PM2 config"
    
    # Show current status
    "$PM2_BIN" status >> "$LOG_FILE" 2>&1
    
    # Verify both services started (expect 2: fpp-control + fpp-poller)
    ONLINE_COUNT=$("$PM2_BIN" list | grep -c "online" || echo "0")
    EXPECTED_COUNT=2
    
    if [ "$ONLINE_COUNT" -ge "$EXPECTED_COUNT" ]; then
        log "✅ All services running ($ONLINE_COUNT/$EXPECTED_COUNT online)"
    else
        log "⚠️  Only $ONLINE_COUNT/$EXPECTED_COUNT services online"
        log "⚠️  Some services may not have started correctly"
    fi
else
    log "⚠️  PM2 not found, cannot restart services"
    log "ℹ️  Please manually restart: pm2 restart all"
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
