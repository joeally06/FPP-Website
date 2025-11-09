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

# Run the actual update script and capture both stdout and stderr
# Parse output to update status in real-time
bash ./update.sh --silent 2>&1 | while IFS= read -r line; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> "$LOG_FILE"
    
    # Update status based on what update.sh is doing
    if [[ "$line" =~ "Stopping server" ]]; then
        set_status "STOPPING"
    elif [[ "$line" =~ "Stashing" ]]; then
        set_status "STASHING"
    elif [[ "$line" =~ "Creating backup" ]]; then
        set_status "BACKING_UP"
    elif [[ "$line" =~ "Fetching latest" ]] || [[ "$line" =~ "Pulling updates" ]]; then
        set_status "UPDATING"
    elif [[ "$line" =~ "Updating dependencies" ]]; then
        set_status "INSTALLING"
    elif [[ "$line" =~ "Running database migrations" ]]; then
        set_status "MIGRATING"
    elif [[ "$line" =~ "Building application" ]]; then
        set_status "BUILDING"
    elif [[ "$line" =~ "Restoring stashed" ]]; then
        set_status "RESTORING"
    elif [[ "$line" =~ "Restarting server" ]]; then
        set_status "RESTARTING"
    elif [[ "$line" =~ "Update complete" ]]; then
        set_status "SUCCESS"
    elif [[ "$line" =~ "Already up to date" ]]; then
        set_status "UP_TO_DATE"
    fi
done

# Capture the exit code from the pipeline
EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
    # Check if we already set SUCCESS or UP_TO_DATE
    CURRENT_STATUS=$(cat "$STATUS_FILE" 2>/dev/null || echo "")
    if [[ "$CURRENT_STATUS" != "SUCCESS" ]] && [[ "$CURRENT_STATUS" != "UP_TO_DATE" ]]; then
        set_status "SUCCESS"
    fi
    log "✅ Update completed successfully!"
else
    set_status "FAILED"
    log "❌ Update failed with exit code: $EXIT_CODE"
    log "Check the log above for details"
fi

# Clean up PID file
rm -f "$PID_FILE"

log "=================================="
log "Update wrapper finished"
log "=================================="

exit $EXIT_CODE
