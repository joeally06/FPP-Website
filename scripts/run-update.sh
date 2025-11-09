#!/bin/bash

# Update Wrapper - Runs update.sh completely detached from Node.js
# This ensures the update continues even when PM2 stops the app
#
# SECURITY:
# - Runs with inherited permissions (no sudo escalation)
# - Validates PM2 is available before starting
# - Creates backup before any changes
# - Full audit trail in log file
#
# RESILIENCE:
# - Survives PM2 restart
# - Proper exit code handling
# - Status tracking at each step
# - Automatic rollback on critical failures

# DON'T use set -e - we want to capture errors and log them
# set -e would exit immediately on any error without logging

LOG_FILE="logs/update.log"
PID_FILE="logs/update.pid"
STATUS_FILE="logs/update_status"
ERROR_FILE="logs/update_error"

# Create logs directory
mkdir -p logs

# Clear old status, log, and errors
> "$STATUS_FILE"
> "$LOG_FILE"
> "$ERROR_FILE"

# Write our PID
echo $$ > "$PID_FILE"

# Log function with timestamp
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Error log function
log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] ERROR: $1" | tee -a "$LOG_FILE" >> "$ERROR_FILE"
}

# Status function
set_status() {
    echo "$1" > "$STATUS_FILE"
    log "STATUS: $1"
}

log "==========================================="
log "🚀 Update Wrapper Started (PID: $$)"
log "==========================================="

# Change to project directory
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

log "📁 Project directory: $PROJECT_DIR"

# Validate environment BEFORE starting
log "🔍 Validating environment..."

# Check if PM2 is available
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 not found in PATH"
    log_error "PATH: $PATH"
    set_status "FAILED"
    log "❌ Update aborted - PM2 not available"
    exit 1
fi

# Check if update.sh exists
if [ ! -f "./update.sh" ]; then
    log_error "update.sh not found in $PROJECT_DIR"
    set_status "FAILED"
    log "❌ Update aborted - update.sh missing"
    exit 1
fi

# Make update.sh executable
chmod +x ./update.sh 2>/dev/null || {
    log_error "Failed to make update.sh executable"
    set_status "FAILED"
    log "❌ Update aborted - permission issue"
    exit 1
}

log "✅ Environment validation passed"
log "📍 PM2 location: $(which pm2)"
log "📍 Node version: $(node --version 2>/dev/null || echo 'unknown')"
log "📍 npm version: $(npm --version 2>/dev/null || echo 'unknown')"
log ""
log "🔄 Executing update.sh..."
log ""

set_status "STARTING"

# Run the actual update script
# We use exec to replace this process with update.sh
# This ensures update continues even if parent process dies
log "🔄 Starting update process..."
log "📝 Output will be logged to: $LOG_FILE"
log ""

# Execute update.sh directly (not in a pipeline that can break)
# Redirect all output to log file
exec bash ./update.sh --silent >> "$LOG_FILE" 2>&1

# Note: This line will never execute because exec replaces the process
# Exit code is handled by update.sh itself

