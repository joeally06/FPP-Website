#!/bin/bash

# FPP Control Center - Update Status Checker
# Quick CLI tool to check update status, git info, and PM2 services

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$HOME/FPP-Control-Center"
STATUS_FILE="$PROJECT_DIR/logs/update_status"
LOG_FILE="$PROJECT_DIR/logs/update.log"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           FPP Control Center - Update Status             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if status file exists
if [ -f "$STATUS_FILE" ]; then
    STATUS=$(cat "$STATUS_FILE")
    echo -e "${YELLOW}📊 Current Status:${NC} $STATUS"
else
    echo -e "${RED}❌ No status file found${NC}"
    STATUS="UNKNOWN"
fi

echo ""

# Get git info
cd "$PROJECT_DIR" || exit 1

CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE_COMMIT=$(git rev-parse origin/master 2>/dev/null || echo "unknown")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

echo -e "${BLUE}🔍 Git Information:${NC}"
echo -e "   Branch: ${GREEN}$BRANCH${NC}"
echo -e "   Current Commit: ${GREEN}${CURRENT_COMMIT:0:7}${NC}"
echo -e "   Remote Commit:  ${GREEN}${REMOTE_COMMIT:0:7}${NC}"

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo -e "   ${GREEN}✅ Up to date${NC}"
else
    COMMITS_BEHIND=$(git rev-list --count HEAD..origin/master 2>/dev/null || echo "?")
    echo -e "   ${YELLOW}📦 $COMMITS_BEHIND commit(s) available${NC}"
fi

echo ""

# Check PM2 status
echo -e "${BLUE}🚀 PM2 Services:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 jlist 2>/dev/null | jq -r '.[] | "   \(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 status | grep -E "fpp-control|update-daemon" | awk '{print "   "$2": "$10}'
else
    echo -e "   ${RED}PM2 not installed${NC}"
fi

echo ""

# Show last 10 log lines
if [ -f "$LOG_FILE" ]; then
    echo -e "${BLUE}📝 Recent Update Logs (last 10 lines):${NC}"
    tail -n 10 "$LOG_FILE" | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  No update log file found${NC}"
fi

echo ""

# Show next scheduled update
echo -e "${BLUE}⏰ Next Automatic Update:${NC}"
CRON_SCHEDULE="Every 6 hours (12am, 6am, 12pm, 6pm)"
echo -e "   $CRON_SCHEDULE"

echo ""

# Action recommendations based on status
case "$STATUS" in
    "SUCCESS"|"UP_TO_DATE"|"COMPLETED")
        echo -e "${GREEN}✅ System is healthy and up to date${NC}"
        ;;
    "FAILED")
        echo -e "${RED}❌ Last update failed - check logs above${NC}"
        echo -e "   Run: ${YELLOW}tail -f $LOG_FILE${NC}"
        ;;
    "DOWNLOADING"|"INSTALLING"|"BUILDING"|"RESTARTING"|"STARTING"|"BACKING_UP"|"STOPPING"|"UPDATING"|"VERIFYING")
        echo -e "${YELLOW}⏳ Update in progress - please wait${NC}"
        echo -e "   Watch live: ${YELLOW}tail -f $LOG_FILE${NC}"
        ;;
    *)
        echo -e "${BLUE}💡 To manually check for updates:${NC}"
        echo -e "   ${YELLOW}cd $PROJECT_DIR${NC}"
        echo -e "   ${YELLOW}git fetch origin master${NC}"
        echo -e "   ${YELLOW}git status${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
