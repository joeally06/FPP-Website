# FPP Control Center - Installation Script (Windows PowerShell)
# Version: 1.0.0

$ErrorActionPreference = "Stop"

Write-Host "🎄 FPP Control Center - Installation Wizard" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check Node version
$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js version 18 or higher required!" -ForegroundColor Red
    Write-Host "Current version: $nodeVersion" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if Git is installed
try {
    git --version | Out-Null
    Write-Host "✅ Git detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

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
