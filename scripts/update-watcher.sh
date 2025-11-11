#!/bin/bash

# Update Watcher - Monitors for update requests
# Runs as a separate systemd service or cron job

UPDATE_SIGNAL="$HOME/FPP-Website/.update-requested"
PROJECT_DIR="$HOME/FPP-Website"

echo "🔍 Update Watcher started - checking every 30 seconds"

while true; do
  if [ -f "$UPDATE_SIGNAL" ]; then
    echo "🚨 Update requested! Starting update process..."
    
    # Remove signal file
    rm -f "$UPDATE_SIGNAL"
    
    # Change to project directory
    cd "$PROJECT_DIR" || exit 1
    
    # Run the full update script (which safely stops PM2)
    ./update.sh
    
    echo "✅ Update complete!"
  fi
  
  # Check every 30 seconds
  sleep 30
done
