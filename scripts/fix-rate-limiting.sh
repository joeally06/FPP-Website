#!/bin/bash

echo "🔧 Fixing Rate Limiting Issues"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check for old database
echo "🔍 Step 1: Checking for old database..."
if [ -f "fpp-control.db" ]; then
    echo -e "${YELLOW}⚠️  Found old fpp-control.db database${NC}"
    echo "   Creating backup..."
    cp fpp-control.db "fpp-control.db.backup-$(date +%s)"
    echo -e "${GREEN}   ✅ Backup created${NC}"
    echo ""
    echo "   Removing old database..."
    rm fpp-control.db
    echo -e "${GREEN}   ✅ Old database removed${NC}"
else
    echo -e "${GREEN}✅ No old fpp-control.db found${NC}"
fi

echo ""

# 2. Run diagnostic script
echo "🔍 Step 2: Running diagnostic check..."
node scripts/check-old-tables.js

echo ""
echo "==================================="
echo ""

# 3. Run cleanup script
echo "🧹 Step 3: Running cleanup script..."
node scripts/cleanup-old-rate-limits.js

echo ""
echo "==================================="
echo ""

# 4. Restart application
echo "🔄 Step 4: Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart fpp-control 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ PM2 restarted successfully${NC}"
    else
        echo -e "${YELLOW}   ⚠️  PM2 restart had issues - trying restart all${NC}"
        pm2 restart all
    fi
else
    echo -e "${YELLOW}   ⚠️  PM2 not found - please restart manually:${NC}"
    echo "      pm2 restart fpp-control"
    echo "      or: npm start"
fi

echo ""
echo "==================================="
echo -e "${GREEN}✅ Fix complete!${NC}"
echo ""
echo "📋 Please test:"
echo "   1. Go to the jukebox page"
echo "   2. Make a few song requests"
echo "   3. Check the request count stays consistent (not jumping)"
echo ""
echo "🔍 To verify everything is clean:"
echo "   node scripts/check-old-tables.js"
echo ""
