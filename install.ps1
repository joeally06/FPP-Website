# FPP Control Center - Installation Script (Windows PowerShell)
# Version: 1.0.0

$ErrorActionPreference = "Stop"

Write-Host "🎄 FPP Control Center - Installation Wizard" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check system dependencies
node scripts/check-dependencies.js
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "🔧 Running setup wizard..." -ForegroundColor Cyan
node scripts/setup-wizard.js

Write-Host ""
Write-Host "🗄️ Initializing database..." -ForegroundColor Cyan
node scripts/init-database.js

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server:" -ForegroundColor Yellow
Write-Host "  npm run dev    # Development mode"
Write-Host "  npm run build  # Build for production"
Write-Host "  npm start      # Production mode"
Write-Host ""
Write-Host "🎅 Visit http://localhost:3000 to get started!" -ForegroundColor Green
