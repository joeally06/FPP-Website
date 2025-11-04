#!/bin/bash

# Update Wrapper - Runs update.sh completely detached from Node.js
# This ensures the update continues even when PM2 stops the app

# DON'T use set -e - we want to capture errors and log them
# set -e would exit immediately on any error without logging

LOG_FILE="logs/update.log"
PID_FILE="logs/update.pid"

# Create logs directory
mkdir -p logs

# Write our PID
echo $$ > "$PID_FILE"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=================================="
log "Update Wrapper Started (PID: $$)"
log "=================================="

# Change to project directory
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

log "Project directory: $PROJECT_DIR"
log "Executing update.sh..."

# Run the actual update script and capture both stdout and stderr
# Use || true to prevent early exit, then check exit code manually
bash ./update.sh --silent >> "$LOG_FILE" 2>&1 || EXIT_CODE=$?

# Check if EXIT_CODE was set (meaning update.sh failed)
if [ -z "$EXIT_CODE" ]; then
    EXIT_CODE=0
fi

if [ $EXIT_CODE -eq 0 ]; then
    log "✅ Update completed successfully!"
else
    log "❌ Update failed with exit code: $EXIT_CODE"
    log "Check the log above for details"
fi

# Clean up PID file
rm -f "$PID_FILE"

log "Update wrapper finished"

exit $EXIT_CODE
