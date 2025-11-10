#!/bin/bash

# Cleanup Script - Remove old update system code
# Keeps only the new atomic update daemon approach
# Version: 1.0.0

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧹 Cleaning up old update system code..."
echo "Project: $PROJECT_DIR"
echo ""

# Backup old files first
BACKUP_DIR="$PROJECT_DIR/backups/old-update-code-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in: $BACKUP_DIR"

# Move old update.sh to backup (keep for reference)
if [ -f "$PROJECT_DIR/update.sh" ]; then
    echo "  ✓ Backing up old update.sh"
    cp "$PROJECT_DIR/update.sh" "$BACKUP_DIR/"
else
    echo "  ℹ️  No old update.sh found (already cleaned)"
fi

# Move old stream endpoint to backup
if [ -f "$PROJECT_DIR/app/api/system/update/stream/route.ts" ]; then
    echo "  ✓ Backing up old stream endpoint"
    cp "$PROJECT_DIR/app/api/system/update/stream/route.ts" "$BACKUP_DIR/"
else
    echo "  ℹ️  No old stream endpoint found (already cleaned)"
fi

echo ""
echo "🗑️  Removing old update code..."

# Remove old update.sh (replaced by update-daemon.sh)
if [ -f "$PROJECT_DIR/update.sh" ]; then
    echo "  ✓ Removing update.sh (replaced by update-daemon.sh)"
    rm "$PROJECT_DIR/update.sh"
else
    echo "  ℹ️  update.sh already removed"
fi

# Remove old stream endpoint (replaced by polling)
if [ -f "$PROJECT_DIR/app/api/system/update/stream/route.ts" ]; then
    echo "  ✓ Removing app/api/system/update/stream/route.ts"
    rm "$PROJECT_DIR/app/api/system/update/stream/route.ts"
else
    echo "  ℹ️  stream endpoint already removed"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Current update system architecture:"
echo "   UI → /api/system/update (POST)"
echo "   └→ scripts/run-update.sh (launcher)"
echo "      └→ scripts/update-daemon.sh (atomic 8-phase process)"
echo ""
echo "📊 Status polling: /api/system/update-status (GET)"
echo "📜 Logs: logs/update.log"
echo "🔒 Lock file: logs/update.lock"
echo ""
echo "🎯 Old code backed up to: $BACKUP_DIR"
echo ""
echo "📌 Next steps:"
echo "   1. npm run build"
echo "   2. pm2 stop all"
echo "   3. pm2 start ecosystem.config.js"
echo "   4. Test update from UI"
