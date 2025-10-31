#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}    Google OAuth Configuration Helper${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ .env.local not found!${NC}"
    echo ""
    echo "Please run the setup wizard first:"
    echo "  ./setup.sh"
    exit 1
fi

echo "This will update your Google OAuth credentials in .env.local"
echo ""
echo -e "${CYAN}📋 First, create OAuth credentials:${NC}"
echo ""
echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
echo "  2. Create a new project (or select existing)"
echo "  3. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
echo "  4. Choose 'Web application'"
echo "  5. Add authorized redirect URIs:"
echo "     - http://localhost:3000/api/auth/callback/google"
echo "     - http://YOUR_SERVER_IP:3000/api/auth/callback/google"
echo ""

read -p "Press Enter when you have your credentials ready..."

echo ""
read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET

# Backup existing .env.local
cp .env.local .env.local.backup-$(date +%Y%m%d_%H%M%S)

# Update the credentials
if command -v sed &> /dev/null; then
    sed -i.tmp "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" .env.local
    sed -i.tmp "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET|" .env.local
    rm -f .env.local.tmp
    echo ""
    echo -e "${GREEN}✓ OAuth credentials updated!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠ Could not auto-update. Please manually edit .env.local:${NC}"
    echo ""
    echo "  GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
    echo "  GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
fi

echo ""
echo -e "${CYAN}🔄 Next step: Restart your application${NC}"
echo ""
echo "  pm2 restart fpp-control"
echo ""
echo "  OR"
echo ""
echo "  Ctrl+C (stop) then: npm run dev"
echo ""
