# FPP Control Center - Update Script (Windows PowerShell)
# Version: 1.0.0

$ErrorActionPreference = "Stop"

Write-Host "🔄 FPP Control Center - Update Manager" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ This is not a Git repository!" -ForegroundColor Red
    Write-Host "Please clone from GitHub first." -ForegroundColor Yellow
    exit 1
}

# Backup current version
Write-Host "💾 Creating backup..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups\$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup database
if (Test-Path "votes.db") {
    Copy-Item "votes.db" "$backupDir\votes.db.backup"
    Write-Host "✅ Database backed up" -ForegroundColor Green
}

# Backup .env.local
if (Test-Path ".env.local") {
    Copy-Item ".env.local" "$backupDir\.env.local.backup"
    Write-Host "✅ Configuration backed up" -ForegroundColor Green
}

Write-Host "✅ Backup saved to: $backupDir" -ForegroundColor Green
Write-Host ""

# Fetch latest changes
Write-Host "📥 Fetching latest updates from GitHub..." -ForegroundColor Cyan
git fetch origin

# Check if there are updates
$local = git rev-parse HEAD
$remote = git rev-parse origin/master

if ($local -eq $remote) {
    Write-Host "✅ Already up to date!" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Show what's new
Write-Host ""
Write-Host "📋 New changes available:" -ForegroundColor Yellow
git log HEAD..origin/master --oneline --max-count=10
Write-Host ""

$continue = Read-Host "Continue with update? (y/n)"
if ($continue -ne 'y') {
    Write-Host "❌ Update cancelled" -ForegroundColor Red
    exit 1
}

# Check for local changes
$hasChanges = git diff-index --quiet HEAD -- 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Stashing local changes..." -ForegroundColor Cyan
    git stash
    $stashed = $true
}

# Pull changes
Write-Host "📥 Pulling updates..." -ForegroundColor Cyan
git pull origin master

# Restore stashed changes if any
if ($stashed) {
    Write-Host "📦 Restoring local changes..." -ForegroundColor Cyan
    try {
        git stash pop
    } catch {
        Write-Host "⚠️  Could not restore local changes - check git stash" -ForegroundColor Yellow
    }
}

# Install/update dependencies
Write-Host "📦 Updating dependencies..." -ForegroundColor Cyan
npm install

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Cyan
node scripts/migrate-database.js

# Rebuild application
Write-Host "🔨 Building application..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "✅ Update complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Backup location: $backupDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "To start the updated server:" -ForegroundColor Yellow
Write-Host "  npm start"
Write-Host ""
Write-Host "To rollback if needed:" -ForegroundColor Yellow
Write-Host "  .\rollback.ps1 $backupDir"
Write-Host ""
