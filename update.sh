#!/bin/bash

# FPP Control Center - Update Script
# Version: 2.2.0 (Fixed: Stop PM2 before checking git status)

set -e

# Silent mode flag (for API calls)
SILENT=false
if [ "$1" = "--silent" ]; then
    SILENT=true
fi

log() {
    if [ "$SILENT" = false ]; then
        echo "$1"
    fi
}

log "🔄 FPP Control Center - Update Manager"
log "======================================"
log ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ This is not a Git repository!" >&2
    echo "Please clone from GitHub first." >&2
    exit 1
fi

# Stop PM2 FIRST (before checking git status)
# This closes the database and prevents .db-shm/.db-wal from appearing as uncommitted changes
PM2_WAS_RUNNING=false
if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "fpp-control"; then
        log "⏸️  Stopping server to prevent database conflicts..."
        pm2 delete fpp-control > /dev/null 2>&1 || pm2 stop fpp-control
        PM2_WAS_RUNNING=true
        
        # Wait for database to close cleanly and WAL file to flush
        sleep 3
        
        log "✅ Server stopped safely"
    fi
fi

# NOW check for uncommitted changes (after PM2 stopped)
STASHED=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log "📦 Stashing local changes..."
    git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)"
    STASHED=true
    log "✅ Local changes stashed"
fi

# Backup current version
log "💾 Creating backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "votes.db" ]; then
    cp votes.db "$BACKUP_DIR/votes.db.backup"
    log "✅ Database backed up"
fi

# Backup .env.local
if [ -f ".env.local" ]; then
    cp .env.local "$BACKUP_DIR/.env.local.backup"
    log "✅ Configuration backed up"
fi

log "✅ Backup saved to: $BACKUP_DIR"
log ""

# Fetch latest changes
log "📥 Fetching latest updates from GitHub..."
git fetch origin --quiet

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "✅ Already up to date!"
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        log "📦 Restoring stashed changes..."
        git stash pop --quiet
    fi
    
    # Restart PM2 if it was running
    if [ "$PM2_WAS_RUNNING" = true ]; then
        log "🔄 Restarting server..."
        pm2 start ecosystem.config.js
    fi
    
    log ""
    exit 0
fi

# Show what's new (only in interactive mode)
if [ "$SILENT" = false ]; then
    echo ""
    echo "📋 New changes available:"
    git log HEAD..origin/master --oneline --max-count=10
    echo ""
    
    read -p "Continue with update? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Update cancelled"
        
        # Restore stashed changes
        if [ "$STASHED" = true ]; then
            git stash pop --quiet
        fi
        
        # Restart PM2 if it was running
        if [ "$PM2_WAS_RUNNING" = true ]; then
            pm2 start ecosystem.config.js
        fi
        
        exit 1
    fi
fi

# Pull changes
log "📥 Pulling updates..."
git pull origin master --quiet

# Install/update dependencies
log "📦 Updating dependencies..."
if [ "$SILENT" = true ]; then
    npm install --silent 2>&1 > /dev/null
else
    npm install
fi

# Run database migrations if script exists
if [ -f "scripts/migrate-database.js" ]; then
    log "🗄️  Running database migrations..."
    node scripts/migrate-database.js
fi

# Rebuild application (PM2 is stopped, no database conflicts)
log "🔨 Building application..."
if [ "$SILENT" = true ]; then
    npm run build 2>&1 | grep -E "(Creating|Compiled|Error|Warning)" || true
else
    npm run build
fi

log ""
log "✅ Update complete!"
log ""
log "📋 Backup location: $BACKUP_DIR"

# Restore stashed changes if any (merge with new code)
if [ "$STASHED" = true ]; then
    log "📦 Restoring stashed changes..."
    if git stash pop --quiet 2>/dev/null; then
        log "✅ Local changes restored"
    else
        log "⚠️  Conflict detected - local changes kept in stash"
        log "   Run 'git stash list' to see stashed changes"
    fi
fi

# Restart PM2 if it was running
if [ "$PM2_WAS_RUNNING" = true ]; then
    log "🔄 Restarting server..."
    pm2 start ecosystem.config.js
    log "✅ Server restarted successfully"
fi

if [ "$SILENT" = false ]; then
    echo ""
    echo "To view stashed changes:"
    echo "  git stash list"
    echo ""
    echo "To rollback if needed:"
    echo "  git reset --hard HEAD@{1}"
    echo "  npm install"
    echo "  npm run build"
    echo "  pm2 restart fpp-control"
    echo ""
fi