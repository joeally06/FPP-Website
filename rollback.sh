#!/bin/bash

# ========================================
# FPP Control Center - Rollback Script
# ========================================

if [ -z "$1" ]; then
  echo "❌ Error: Backup directory path required"
  echo ""
  echo "Usage: ./rollback.sh <backup_directory>"
  echo ""
  echo "Example: ./rollback.sh backups/20250128_143022"
  echo ""
  echo "Available backups:"
  if [ -d "backups" ]; then
    ls -1t backups/ | head -5
  else
    echo "  No backups found"
  fi
  exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Error: Backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo "🔄 FPP Control Center Rollback"
echo "================================"
echo ""
echo "⚠️  WARNING: This will restore your system to a previous state."
echo "   Current database and configuration will be replaced."
echo ""
echo "📂 Backup directory: $BACKUP_DIR"
echo ""

if [ -f "$BACKUP_DIR/votes.db" ]; then
  echo "✅ Database backup found"
else
  echo "❌ Database backup not found in $BACKUP_DIR"
  exit 1
fi

if [ -f "$BACKUP_DIR/.env.local" ]; then
  echo "✅ Configuration backup found"
else
  echo "⚠️  Configuration backup not found (will skip .env.local restore)"
fi

echo ""
read -p "Continue with rollback? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Rollback cancelled"
  exit 0
fi

echo ""
echo "🔄 Restoring from backup..."

# Stop the server if running (optional - user should stop it manually)
# pkill -f "next dev" || true

# Restore database
if [ -f "$BACKUP_DIR/votes.db" ]; then
  cp "$BACKUP_DIR/votes.db" votes.db
  echo "✅ Database restored"
fi

# Restore WAL and SHM files if they exist
if [ -f "$BACKUP_DIR/votes.db-wal" ]; then
  cp "$BACKUP_DIR/votes.db-wal" votes.db-wal
  echo "✅ Database WAL file restored"
fi

if [ -f "$BACKUP_DIR/votes.db-shm" ]; then
  cp "$BACKUP_DIR/votes.db-shm" votes.db-shm
  echo "✅ Database SHM file restored"
fi

# Restore configuration
if [ -f "$BACKUP_DIR/.env.local" ]; then
  cp "$BACKUP_DIR/.env.local" .env.local
  echo "✅ Configuration restored"
fi

echo ""
echo "✅ Rollback completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Review your configuration: .env.local"
echo "   2. Restart the server: npm run dev"
echo ""
echo "💡 Tip: If issues persist, you can try another backup:"
echo "   Available backups in backups/ directory"
echo ""
