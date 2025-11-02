#!/bin/bash

# FPP Control Center - Update Script
# Version: 2.0.0 (API-compatible)

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

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "❌ Uncommitted changes detected!" >&2
    echo "Please commit or stash your changes first." >&2
    exit 1
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
        exit 1
    fi
fi

# Pull changes (no stashing needed since we validated no uncommitted changes)
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

# Rebuild application
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

# Restart PM2 if running
if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "fpp-control"; then
        log "🔄 Restarting server..."
        pm2 restart fpp-control --update-env
        log "✅ Server restarted successfully"
    fi
fi

if [ "$SILENT" = false ]; then
    echo ""
    echo "To start the updated server manually:"
    echo "  npm start"
    echo ""
    echo "To rollback if needed:"
    echo "  ./rollback.sh $BACKUP_DIR"
    echo ""
fi
