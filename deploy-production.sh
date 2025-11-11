#!/bin/bash

set -e

echo "🚀 FPP Control Center - Production Deployment"
echo "=============================================="
echo ""

# Check if running with proper Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required (found: $(node -v))"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 2: Build Next.js application
echo "🔨 Step 2: Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build application"
    exit 1
fi

echo "✅ Application built successfully"
echo ""

# Step 3: Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Step 3: Installing PM2 globally..."
    npm install -g pm2
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2"
        echo "Try running with sudo: sudo npm install -g pm2"
        exit 1
    fi
    
    echo "✅ PM2 installed"
else
    echo "✅ PM2 is already installed"
fi

echo ""

# Step 4: Cloudflare Tunnel setup (optional)
echo "☁️  Step 4: Cloudflare Tunnel setup"
read -p "Do you want to set up Cloudflare Tunnel now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "./scripts/setup-cloudflare-tunnel.sh" ]; then
        bash ./scripts/setup-cloudflare-tunnel.sh
    else
        echo "⚠️  Cloudflare setup script not found"
        echo "Run manually: bash scripts/setup-cloudflare-tunnel.sh"
    fi
else
    echo "⚠️  Skipping Cloudflare Tunnel setup"
    echo "You can run it later: bash scripts/setup-cloudflare-tunnel.sh"
fi

echo ""

# Step 5: Start application with PM2
echo "🚀 Step 5: Starting application with PM2..."

# Stop existing instance if running
pm2 stop fpp-control 2>/dev/null || true
pm2 delete fpp-control 2>/dev/null || true

# Start new instance
pm2 start npm --name "fpp-control" -- start

if [ $? -ne 0 ]; then
    echo "❌ Failed to start application"
    exit 1
fi

echo "✅ Application started"
echo ""

# Step 6: Save PM2 configuration
echo "💾 Step 6: Saving PM2 configuration..."
pm2 save

# Setup PM2 startup (requires sudo on most systems)
echo ""
echo "🔧 Setting up PM2 auto-start..."
echo "⚠️  This may require administrator privileges"
echo ""
pm2 startup

echo ""
echo "ℹ️  If the command above shows a sudo command, run it to enable auto-start"
echo ""

# Display status
echo "✅ Deployment Complete!" 
echo ""
echo "📋 Summary:"
echo "  Application: FPP Control Center"
echo "  Process: fpp-control"
echo "  Port: 3000 (or from .env.local)"
echo ""
echo "🔍 Monitoring Commands:"
echo "  View logs:    pm2 logs fpp-control"
echo "  View status:  pm2 status"
echo "  Restart app:  pm2 restart fpp-control"
echo "  Stop app:     pm2 stop fpp-control"
echo ""

# Check if Cloudflare Tunnel is configured
if command -v cloudflared &> /dev/null; then
    echo "☁️  Cloudflare Tunnel Commands:"
    echo "  List tunnels:   cloudflared tunnel list"
    echo "  Check status:   cloudflared tunnel info <tunnel-name>"
    echo "  View logs:      journalctl -u cloudflared -f"
    echo ""
fi

echo "⚠️  IMPORTANT - Next Steps:"
echo ""
echo "1. Update .env.local:"
echo "   - Set NEXTAUTH_URL to your domain (https://yourdomain.com)"
echo "   - Verify all other environment variables"
echo ""
echo "2. Update Google OAuth:"
echo "   - Go to: https://console.cloud.google.com/apis/credentials"
echo "   - Add authorized redirect URI: https://yourdomain.com/api/auth/callback/google"
echo ""
echo "3. Restart application:"
echo "   pm2 restart fpp-control"
echo ""
echo "4. Verify deployment:"
echo "   - Visit: https://yourdomain.com"
echo "   - Test admin login"
echo "   - Check rate limiting (try 4+ song requests)"
echo "   - Test CSRF protection"
echo ""
echo "📚 Documentation: README.md"
echo ""
