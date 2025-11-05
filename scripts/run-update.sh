#!/bin/bash

# Update Wrapper - Runs update.sh completely detached from Node.js
# This ensures the update continues even when PM2 stops the app

# DON'T use set -e - we want to capture errors and log them
# set -e would exit immediately on any error without logging

LOG_FILE="logs/update.log"
PID_FILE="logs/update.pid"
STATUS_FILE="logs/update_status"

# Create logs directory
mkdir -p logs

# Clear old status and log
> "$STATUS_FILE"
> "$LOG_FILE"

# Write our PID
echo $$ > "$PID_FILE"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Status function
set_status() {
    echo "$1" > "$STATUS_FILE"
    log "STATUS: $1"
}

log "=================================="
log "Update Wrapper Started (PID: $$)"
log "=================================="

# Change to project directory
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

log "Project directory: $PROJECT_DIR"
log "Executing update.sh..."

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
