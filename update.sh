#!/bin/bash

# FPP Control Center - Update Script
# Version: 1.0.0

set -e

echo "🔄 FPP Control Center - Update Manager"
echo "======================================"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ This is not a Git repository!"
    echo "Please clone from GitHub first."
    exit 1
fi

# Backup current version
echo "💾 Creating backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "votes.db" ]; then
    cp votes.db "$BACKUP_DIR/votes.db.backup"
    echo "✅ Database backed up"
fi

# Backup .env.local
if [ -f ".env.local" ]; then
    cp .env.local "$BACKUP_DIR/.env.local.backup"
    echo "✅ Configuration backed up"
fi

echo "✅ Backup saved to: $BACKUP_DIR"
echo ""

# Fetch latest changes
echo "📥 Fetching latest updates from GitHub..."
git fetch origin

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Already up to date!"
    echo ""
    exit 0
fi

# Show what's new
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

# Stash any local changes
if ! git diff-index --quiet HEAD --; then
    echo "📦 Stashing local changes..."
    git stash
    STASHED=true
fi

# Pull changes
echo "📥 Pulling updates..."
git pull origin master

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "📦 Restoring local changes..."
    git stash pop || echo "⚠️  Could not restore local changes - check git stash"
fi

# Install/update dependencies
echo "📦 Updating dependencies..."
npm install

# Run database migrations
echo "🗄️  Running database migrations..."
node scripts/migrate-database.js

# Rebuild application
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Update complete!"
echo ""
echo "📋 Backup location: $BACKUP_DIR"
echo ""
echo "To start the updated server:"
echo "  npm start"
echo ""
echo "To rollback if needed:"
echo "  ./rollback.sh $BACKUP_DIR"
echo ""
