#!/bin/bash

# FPP Control Center - Installation Script
# Version: 1.0.0

set -e  # Exit on error

echo "🎄 FPP Control Center - Installation Wizard"
echo "============================================"
echo ""

# Check system dependencies
node scripts/check-dependencies.js || exit 1

echo ""
# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Running setup wizard..."
node scripts/setup-wizard.js

echo ""
echo "🗄️ Initializing database..."
node scripts/init-database.js

echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 Starting services with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Stop any existing processes
pm2 delete fpp-control 2>/dev/null || true
pm2 delete fpp-poller 2>/dev/null || true

# Start both services using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo ""
echo "📊 Service Status:"
pm2 status

# Verify both services started
sleep 3
CONTROL_RUNNING=$(pm2 jlist 2>/dev/null | grep -c '"name":"fpp-control".*"status":"online"' || echo "0")
POLLER_RUNNING=$(pm2 jlist 2>/dev/null | grep -c '"name":"fpp-poller".*"status":"online"' || echo "0")

echo ""
if [ "$CONTROL_RUNNING" -eq "1" ] && [ "$POLLER_RUNNING" -eq "1" ]; then
    echo "✅ Both services started successfully!"
    echo "   • fpp-control: Main application"
    echo "   • fpp-poller: Background FPP status poller"
else
    if [ "$CONTROL_RUNNING" -eq "0" ]; then
        echo "❌ fpp-control failed to start"
        pm2 logs fpp-control --lines 20 --nostream
    else
        echo "✅ fpp-control: Running"
    fi
    
    if [ "$POLLER_RUNNING" -eq "0" ]; then
        echo "⚠️  fpp-poller failed to start (app will still work with fallback)"
        pm2 logs fpp-poller --lines 20 --nostream
    else
        echo "✅ fpp-poller: Running"
    fi
fi

echo ""
echo "🌐 Application is now available at: http://localhost:3000"
echo ""
echo "💡 Useful commands:"
echo "   • View logs: pm2 logs"
echo "   • View status: pm2 status"
echo "   • Restart: pm2 restart all"
echo "   • Stop: pm2 stop all"
echo ""
echo "🎅 Visit http://localhost:3000 to get started!"
