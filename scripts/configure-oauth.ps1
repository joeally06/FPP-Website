# Google OAuth Configuration Helper for Windows

function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

Write-Header "Google OAuth Configuration Helper"

if (-not (Test-Path ".env.local")) {
    Write-Host "⚠ .env.local not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run the setup wizard first:"
    Write-Host "  .\setup.ps1"
    exit 1
}

Write-Host "This will update your Google OAuth credentials in .env.local"
Write-Host ""
Write-Host "📋 First, create OAuth credentials:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Go to: https://console.cloud.google.com/apis/credentials"
Write-Host "  2. Create a new project (or select existing)"
Write-Host "  3. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
Write-Host "  4. Choose 'Web application'"
Write-Host "  5. Add authorized redirect URIs:"
Write-Host "     - http://localhost:3000/api/auth/callback/google"
Write-Host "     - http://YOUR_PC_IP:3000/api/auth/callback/google"
Write-Host ""

Read-Host "Press Enter when you have your credentials ready"

Write-Host ""
$googleClientId = Read-Host "Enter Google Client ID"
$googleClientSecret = Read-Host "Enter Google Client Secret"

# Backup existing .env.local
$backupName = ".env.local.backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item ".env.local" $backupName

# Update the credentials
$envContent = Get-Content ".env.local" -Raw
$envContent = $envContent -replace "GOOGLE_CLIENT_ID=.*", "GOOGLE_CLIENT_ID=$googleClientId"
$envContent = $envContent -replace "GOOGLE_CLIENT_SECRET=.*", "GOOGLE_CLIENT_SECRET=$googleClientSecret"
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host ""
Write-Host "✓ OAuth credentials updated!" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Next step: Restart your application" -ForegroundColor Cyan
Write-Host ""
Write-Host "  pm2 restart fpp-control"
Write-Host ""
Write-Host "  OR"
Write-Host ""
Write-Host "  Ctrl+C (stop) then: npm run dev"
Write-Host ""
