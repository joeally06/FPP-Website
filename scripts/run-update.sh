#!/bin/bash

# Update Launcher - Runs update-daemon.sh in detached mode
# Version: 3.0.0 - Uses FPP-inspired atomic update daemon
#
# SECURITY:
# - Runs with inherited permissions (no sudo escalation)
# - Lock file prevents concurrent updates
# - Creates backup before any changes
# - Full audit trail in log file
#
# RESILIENCE:
# - Survives PM2 restart
# - Atomic updates with automatic rollback on failure
# - 8-phase update process with health verification
# - Independent daemon process

set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DAEMON_SCRIPT="$SCRIPT_DIR/update-daemon.sh"
LOG_FILE="$PROJECT_DIR/logs/update.log"
PID_FILE="$PROJECT_DIR/logs/update.pid"

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Log function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Initialize log
{
    echo ""
    echo "=================================="
    echo "Update Launcher Started (PID: $$)"
    echo "=================================="
} | tee -a "$LOG_FILE"

log "📁 Project directory: $PROJECT_DIR"
log "� Daemon script: $DAEMON_SCRIPT"

# Check if daemon script exists
if [ ! -f "$DAEMON_SCRIPT" ]; then
    log "❌ ERROR: update-daemon.sh not found at $DAEMON_SCRIPT"
    exit 1
fi

# Ensure daemon is executable
chmod +x "$DAEMON_SCRIPT" 2>/dev/null || {
    log "⚠️  WARNING: Could not set execute permissions on daemon"
}

log "🚀 Launching atomic update daemon..."
log "📋 8-Phase Update Process:"
log "   Phase 1: Download updates"
log "   Phase 2: Backup database & config"
log "   Phase 3: Stop PM2 services"
log "   Phase 4: Apply git updates (with rollback)"
log "   Phase 5: Install dependencies (with rollback)"
log "   Phase 6: Build application (with rollback)"
log "   Phase 7: Restart PM2 services"
log "   Phase 8: Verify health"

# Launch daemon in fully detached mode
nohup bash "$DAEMON_SCRIPT" "$PROJECT_DIR" >> "$LOG_FILE" 2>&1 &
DAEMON_PID=$!

# Save PID
echo $DAEMON_PID > "$PID_FILE"

log "✅ Update daemon launched (PID: $DAEMON_PID)"
log "📊 Monitor progress: tail -f logs/update.log"
log "📍 Status file: logs/update_status"

# Wait briefly to verify it started
sleep 2

if ps -p $DAEMON_PID > /dev/null 2>&1; then
    log "✓ Update daemon confirmed running"
    exit 0
else
    log "✗ Update daemon failed to start"
    exit 1
fi

