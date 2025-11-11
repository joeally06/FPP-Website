#!/bin/bash

# FPP Control Center - Production Setup Check
# Run this after pulling updates to ensure everything is configured correctly

set -e

echo "🔧 FPP Control Center - Production Setup Check"
echo "================================================"
echo ""

PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR" || exit 1

echo "📁 Working directory: $PROJECT_DIR"
echo ""

# 1. Make all scripts executable
echo "📝 Setting script permissions..."
chmod +x scripts/*.sh 2>/dev/null || echo "   ⚠️  No scripts found in scripts/"
chmod +x .githooks/* 2>/dev/null || echo "   ⚠️  No hooks found in .githooks/"
echo "   ✅ Script permissions updated"
echo ""

# 2. Configure Git hooks
echo "🔗 Configuring Git hooks..."
git config core.hooksPath .githooks
echo "   ✅ Git hooks configured (.githooks directory)"
echo ""

# 3. Create logs directory if missing
echo "📁 Ensuring log directory exists..."
mkdir -p logs
echo "   ✅ Log directory ready"
echo ""

# 4. Check PM2 configuration
echo "🚀 Checking PM2 processes..."
if command -v pm2 &> /dev/null; then
    pm2 describe fpp-control > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        FPP_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="fpp-control") | .pm2_env.status' 2>/dev/null || echo "unknown")
        echo "   ✅ fpp-control: $FPP_STATUS"
    else
        echo "   ⚠️  fpp-control not configured"
        echo "      Run: pm2 start ecosystem.config.js"
    fi

    pm2 describe update-daemon > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        DAEMON_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="update-daemon") | .pm2_env.status' 2>/dev/null || echo "unknown")
        echo "   ✅ update-daemon: $DAEMON_STATUS"
    else
        echo "   ⚠️  update-daemon not configured"
        echo "      Run: pm2 start ecosystem.config.js --only update-daemon"
    fi
else
    echo "   ⚠️  PM2 not installed"
    echo "      Install: npm install -g pm2"
fi
echo ""

# 5. Verify Node.js and npm
echo "📦 Checking Node.js environment..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   Node.js: $NODE_VERSION"
else
    echo "   ❌ Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   npm: $NPM_VERSION"
else
    echo "   ❌ npm not found"
fi
echo ""

# 6. Check if dependencies need updating
echo "🔍 Checking dependencies..."
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo "   ✅ node_modules exists"
        read -p "   Run npm install? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm install --production
            echo "   ✅ Dependencies updated"
        else
            echo "   ⏭️  Skipped npm install"
        fi
    else
        echo "   ⚠️  node_modules missing - running npm install..."
        npm install --production
        echo "   ✅ Dependencies installed"
    fi
else
    echo "   ❌ package.json not found"
fi
echo ""

# 7. Verify .env.local exists
echo "🔐 Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "   ✅ .env.local configured"
else
    echo "   ⚠️  .env.local missing"
    if [ -f ".env.example" ]; then
        echo "      Copy from: .env.example"
    fi
fi
echo ""

# 8. Check if build exists
echo "🏗️  Checking build status..."
if [ -d ".next" ]; then
    echo "   ✅ Build directory exists"
    read -p "   Rebuild application? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run build
        echo "   ✅ Application rebuilt"
    else
        echo "   ⏭️  Skipped build"
    fi
else
    echo "   ⚠️  No build found - building..."
    npm run build
    echo "   ✅ Application built"
fi
echo ""

# 9. Git status
echo "🔍 Git status..."
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null | cut -c1-7 || echo "unknown")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "   Branch: $BRANCH"
echo "   Commit: $CURRENT_COMMIT"

# Check for uncommitted changes
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "   ✅ Working directory clean"
else
    echo "   ⚠️  Uncommitted changes detected"
fi
echo ""

echo "================================================"
echo "✅ Setup check complete!"
echo ""
echo "Next steps:"
echo "  1. If you updated dependencies or .env.local: npm run build"
echo "  2. Restart services: pm2 restart ecosystem.config.js"
echo "  3. Check logs: pm2 logs"
echo "  4. Check update status: ./scripts/check-update-status.sh"
echo ""
