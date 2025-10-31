Write-Host "☁️  FPP Control Center - Cloudflare Tunnel Setup" -ForegroundColor Cyan
Write-Host "=============================================="
Write-Host ""

# Step 1: Check if cloudflared is installed
$cloudflaredPath = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source

if (-not $cloudflaredPath) {
    Write-Host "📦 Step 1: Installing cloudflared..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please download and install cloudflared from:"
    Write-Host "https://github.com/cloudflare/cloudflared/releases/latest"
    Write-Host ""
    Write-Host "Download: cloudflared-windows-amd64.exe"
    Write-Host "Rename to: cloudflared.exe"
    Write-Host "Move to: C:\Windows\System32\ (or add to PATH)"
    Write-Host ""
    
    $download = Read-Host "Would you like to open the download page? (y/n)"
    if ($download -eq 'y') {
        Start-Process "https://github.com/cloudflare/cloudflared/releases/latest"
    }
    
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit
}

Write-Host "✅ cloudflared is installed" -ForegroundColor Green
Write-Host ""

# Step 2: Login to Cloudflare
Write-Host "📝 Step 2: Login to Cloudflare" -ForegroundColor Yellow
Write-Host "A browser window will open. Please login to your Cloudflare account."
Write-Host ""
Read-Host "Press Enter to continue"

cloudflared tunnel login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloudflare login failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in to Cloudflare" -ForegroundColor Green
Write-Host ""

# Step 3: Create tunnel
Write-Host "📝 Step 3: Creating tunnel..." -ForegroundColor Yellow
$tunnelName = Read-Host "Enter a name for your tunnel (e.g., fpp-control)"

if ([string]::IsNullOrWhiteSpace($tunnelName)) {
    $tunnelName = "fpp-control"
}

cloudflared tunnel create $tunnelName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create tunnel" -ForegroundColor Red
    exit 1
}

$tunnelList = cloudflared tunnel list | Select-String $tunnelName
$tunnelId = ($tunnelList -split '\s+')[0]

Write-Host "✅ Tunnel created: $tunnelId" -ForegroundColor Green
Write-Host ""

# Step 4: Get domain
Write-Host "📝 Step 4: Configure domain" -ForegroundColor Yellow
$domain = Read-Host "Enter your domain (e.g., fpp.example.com)"

if ([string]::IsNullOrWhiteSpace($domain)) {
    Write-Host "❌ Domain is required" -ForegroundColor Red
    exit 1
}

# Step 5: Create config file
Write-Host "📝 Step 5: Creating tunnel configuration..." -ForegroundColor Yellow

$configDir = "$env:USERPROFILE\.cloudflared"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: $domain
    service: http://localhost:3000
  - service: http_status:404
"@

$configContent | Out-File -FilePath "$configDir\config.yml" -Encoding UTF8

Write-Host "✅ Configuration created" -ForegroundColor Green
Write-Host ""

# Step 6: Route DNS
Write-Host "📝 Step 6: Configuring DNS..." -ForegroundColor Yellow
cloudflared tunnel route dns $tunnelName $domain

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  DNS routing failed. You may need to do this manually in Cloudflare dashboard." -ForegroundColor Yellow
} else {
    Write-Host "✅ DNS configured" -ForegroundColor Green
}

Write-Host ""

# Step 7: Install as service
Write-Host "📝 Step 7: Installing as Windows service..." -ForegroundColor Yellow
Write-Host "⚠️  This requires administrator privileges." -ForegroundColor Yellow
Write-Host ""

cloudflared service install

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Service installation may require administrator privileges." -ForegroundColor Yellow
    Write-Host "    Run PowerShell as Administrator and execute:" -ForegroundColor Yellow
    Write-Host "    cloudflared service install" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    Or run manually with:" -ForegroundColor Yellow
    Write-Host "    cloudflared tunnel run $tunnelName" -ForegroundColor Cyan
} else {
    Write-Host "✅ Service installed" -ForegroundColor Green
    Start-Service cloudflared -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✅ Cloudflare Tunnel Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  Tunnel Name: $tunnelName"
Write-Host "  Tunnel ID: $tunnelId"
Write-Host "  Domain: https://$domain"
Write-Host ""
Write-Host "🔍 Verify:" -ForegroundColor Cyan
Write-Host "  - Wait 1-2 minutes for DNS propagation"
Write-Host "  - Visit: https://$domain"
Write-Host "  - Check tunnel status: cloudflared tunnel info $tunnelName"
Write-Host ""
Write-Host "📊 Monitor:" -ForegroundColor Cyan
Write-Host "  - Service status: Get-Service cloudflared"
Write-Host "  - Logs: cloudflared tunnel run $tunnelName (in new terminal)"
Write-Host ""
Write-Host "⚠️  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Update .env.local with: NEXTAUTH_URL=https://$domain"
Write-Host "2. Update Google OAuth redirect URIs to include: https://$domain/api/auth/callback/google"
Write-Host "3. Restart your Next.js application: pm2 restart fpp-control"
Write-Host ""
