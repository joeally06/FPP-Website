#!/bin/bash

echo "☁️  FPP Control Center - Cloudflare Tunnel Setup"
echo "=============================================="
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "ℹ️  For Windows/Mac, please use the PowerShell script:"
    echo "   .\scripts\setup-cloudflare-tunnel.ps1"
    exit 1
fi

# Step 1: Install cloudflared
echo "📦 Step 1: Installing cloudflared..."

# Detect distribution
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
elif [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Fedora
    curl -L --output cloudflared.rpm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
    sudo rpm -i cloudflared.rpm
    rm cloudflared.rpm
else
    echo "❌ Unsupported distribution. Please install manually:"
    echo "   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

echo "✅ cloudflared installed"
echo ""

# Step 2: Login to Cloudflare
echo "📝 Step 2: Login to Cloudflare"
echo "A browser window will open. Please login to your Cloudflare account."
echo ""
read -p "Press Enter to continue..."

cloudflared tunnel login

if [ $? -ne 0 ]; then
    echo "❌ Cloudflare login failed"
    exit 1
fi

echo "✅ Logged in to Cloudflare"
echo ""

# Step 3: Create tunnel
echo "📝 Step 3: Creating tunnel..."
read -p "Enter a name for your tunnel (e.g., fpp-control): " TUNNEL_NAME

if [ -z "$TUNNEL_NAME" ]; then
    TUNNEL_NAME="fpp-control"
fi

cloudflared tunnel create "$TUNNEL_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Failed to create tunnel"
    exit 1
fi

TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

echo "✅ Tunnel created: $TUNNEL_ID"
echo ""

# Step 4: Get domain
echo "📝 Step 4: Configure domain"
read -p "Enter your domain (e.g., fpp.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

# Step 5: Create config file
echo "📝 Step 5: Creating tunnel configuration..."

CONFIG_DIR="$HOME/.cloudflared"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/config.yml" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "✅ Configuration created"
echo ""

# Step 6: Route DNS
echo "📝 Step 6: Configuring DNS..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN"

if [ $? -ne 0 ]; then
    echo "⚠️  DNS routing failed. You may need to do this manually in Cloudflare dashboard."
else
    echo "✅ DNS configured"
fi

echo ""

# Step 7: Install as service
echo "📝 Step 7: Installing as system service..."
sudo cloudflared service install

if [ $? -ne 0 ]; then
    echo "⚠️  Service installation failed. You can run manually with: cloudflared tunnel run $TUNNEL_NAME"
else
    echo "✅ Service installed"
    sudo systemctl start cloudflared
    sudo systemctl enable cloudflared
fi

echo ""
echo "✅ Cloudflare Tunnel Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  Tunnel Name: $TUNNEL_NAME"
echo "  Tunnel ID: $TUNNEL_ID"
echo "  Domain: https://$DOMAIN"
echo ""
echo "🔍 Verify:"
echo "  - Wait 1-2 minutes for DNS propagation"
echo "  - Visit: https://$DOMAIN"
echo "  - Check tunnel status: cloudflared tunnel info $TUNNEL_NAME"
echo ""
echo "📊 Monitor:"
echo "  - Service status: sudo systemctl status cloudflared"
echo "  - Logs: sudo journalctl -u cloudflared -f"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Update .env.local with: NEXTAUTH_URL=https://$DOMAIN"
echo "2. Update Google OAuth redirect URIs to include: https://$DOMAIN/api/auth/callback/google"
echo "3. Restart your Next.js application: pm2 restart fpp-control"
echo ""
