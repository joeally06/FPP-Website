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
echo "✅ Installation complete!"
echo ""
echo "To start the server:"
echo "  npm run dev    # Development mode"
echo "  npm run build  # Build for production"
echo "  npm start      # Production mode"
echo ""
echo "🎅 Visit http://localhost:3000 to get started!"
