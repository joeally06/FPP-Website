#!/bin/bash

# FPP Control Center - Installation Script
# Version: 1.0.0

set -e  # Exit on error

echo "🎄 FPP Control Center - Installation Wizard"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher required!"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed!"
    echo "Please install Git from: https://git-scm.com/"
    exit 1
fi

echo "✅ Git detected"
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
echo "✅ Installation complete!"
echo ""
echo "To start the server:"
echo "  npm run dev    # Development mode"
echo "  npm run build  # Build for production"
echo "  npm start      # Production mode"
echo ""
echo "🎅 Visit http://localhost:3000 to get started!"
