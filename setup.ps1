# FPP Control Center - Interactive Setup for Windows
# Run this script with: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"

# Colors
function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($text) {
    Write-Host "▶ $text" -ForegroundColor Blue
}

function Write-Success($text) {
    Write-Host "✓ $text" -ForegroundColor Green
}

function Write-ErrorCustom($text) {
    Write-Host "✗ $text" -ForegroundColor Red
}

function Write-WarningCustom($text) {
    Write-Host "⚠ $text" -ForegroundColor Yellow
}

function Write-Info($text) {
    Write-Host "ℹ $text" -ForegroundColor Cyan
}

function Confirm-Action($prompt) {
    $response = Read-Host "$prompt (y/n)"
    return $response -match "^[Yy]$"
}

# Main setup
Clear-Host
Write-Header "🎄 FPP Control Center - Interactive Setup 🎅"

Write-Host "Welcome to the FPP Control Center setup wizard!" -ForegroundColor Green
Write-Host ""
Write-Host "This wizard will guide you through setting up your Christmas light"
Write-Host "control center with jukebox, Santa letter generation, and device monitoring."
Write-Host ""
Write-Host "This will take about 10-15 minutes."
Write-Host ""

if (-not (Confirm-Action "Ready to begin?")) {
    Write-Host "Setup cancelled."
    exit
}

# ═══════════════════════════════════════════════════════════
# STEP 1: Check System Requirements
# ═══════════════════════════════════════════════════════════
Write-Header "Step 1/8: Checking System Requirements"

Write-Step "Checking operating system..."
Write-Success "Windows detected"

Write-Step "Checking Node.js..."
try {
    $nodeVersion = (node -v).TrimStart('v').Split('.')[0]
    if ([int]$nodeVersion -lt 20) {
        Write-ErrorCustom "Node.js 20+ is required (found: $(node -v))"
        Write-Host ""
        Write-Host "Please download and install Node.js 20 LTS from:"
        Write-Host "https://nodejs.org/"
        exit 1
    }
    Write-Success "Node.js $(node -v) detected"
} catch {
    Write-ErrorCustom "Node.js is not installed"
    Write-Host ""
    Write-Host "Please download and install Node.js 20 LTS from:"
    Write-Host "https://nodejs.org/"
    exit 1
}

Write-Step "Checking npm..."
try {
    $npmVersion = npm -v
    Write-Success "npm $npmVersion detected"
} catch {
    Write-ErrorCustom "npm is not installed"
    exit 1
}

Write-Step "Checking Git..."
try {
    $gitVersion = (git --version).Split(' ')[2]
    Write-Success "Git $gitVersion detected"
} catch {
    Write-ErrorCustom "Git is not installed"
    Write-Host ""
    Write-Host "Please download and install Git from:"
    Write-Host "https://git-scm.com/download/win"
    exit 1
}

# ═══════════════════════════════════════════════════════════
# STEP 2: Choose Installation Type
# ═══════════════════════════════════════════════════════════
Write-Header "Step 2/8: Choose Installation Type"

Write-Host "How do you plan to use FPP Control Center?"
Write-Host ""
Write-Host "  1) Local Network Only (default)"
Write-Host "     - Access from devices on your home network"
Write-Host "     - No public internet access"
Write-Host "     - Simpler setup"
Write-Host ""
Write-Host "  2) Public Internet Access"
Write-Host "     - Access from anywhere in the world"
Write-Host "     - Requires domain name"
Write-Host "     - Uses Cloudflare Tunnel for security"
Write-Host ""

do {
    $choice = Read-Host "Choose (1 or 2)"
    if ($choice -eq "1") {
        $installType = "local"
        Write-Success "Local network installation selected"
        break
    } elseif ($choice -eq "2") {
        $installType = "public"
        Write-Success "Public internet installation selected"
        break
    } else {
        Write-WarningCustom "Please choose 1 or 2"
    }
} while ($true)

# ═══════════════════════════════════════════════════════════
# STEP 3: Install Dependencies
# ═══════════════════════════════════════════════════════════
Write-Header "Step 3/8: Installing Dependencies"

Write-Step "Installing Node.js packages..."
npm install
Write-Success "Dependencies installed"

Write-Info "Note: PM2 is not required for Windows development mode"
Write-Info "For production on Windows, consider using Windows Services or Docker"

# ═══════════════════════════════════════════════════════════
# STEP 4: Database Setup
# ═══════════════════════════════════════════════════════════
Write-Header "Step 4/8: Setting Up Database"

if (Test-Path "fpp-control.db") {
    Write-WarningCustom "Existing database found!"
    if (Confirm-Action "Delete existing database and start fresh?") {
        $backupName = "fpp-control-backup-$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
        Move-Item "fpp-control.db" $backupName
        Write-Info "Old database backed up to $backupName"
    } else {
        Write-Info "Keeping existing database"
    }
}

Write-Step "Initializing database..."
npm run setup
Write-Success "Database initialized"

# ═══════════════════════════════════════════════════════════
# STEP 5: Google OAuth Setup
# ═══════════════════════════════════════════════════════════
Write-Header "Step 5/8: Google OAuth Configuration"

Write-Host "FPP Control Center uses Google OAuth for admin authentication."
Write-Host "This keeps your admin panel secure without managing passwords."
Write-Host ""
Write-Host "You'll need to create a Google OAuth application:"
Write-Host ""
Write-Host "  1. Go to: https://console.cloud.google.com/apis/credentials"
Write-Host "  2. Create a new project (or select existing)"
Write-Host "  3. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
Write-Host "  4. Choose 'Web application'"
Write-Host "  5. Add authorized redirect URIs:"

if ($installType -eq "local") {
    Write-Host "     - http://localhost:3000/api/auth/callback/google"
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"})[0].IPAddress
    if ($localIp) {
        Write-Host "     - http://${localIp}:3000/api/auth/callback/google"
    }
} else {
    Write-Host "     - https://yourdomain.com/api/auth/callback/google"
}

Write-Host ""
if (-not (Confirm-Action "Have you created your Google OAuth credentials?")) {
    Write-Info "No problem! You can do this later."
    Write-Info "The setup will continue, but admin login won't work until you configure OAuth."
    $skipOAuth = $true
} else {
    $skipOAuth = $false
}

# ═══════════════════════════════════════════════════════════
# STEP 6: Environment Configuration
# ═══════════════════════════════════════════════════════════
Write-Header "Step 6/8: Configuring Environment Variables"

$configureEnv = $false
if (Test-Path ".env.local") {
    Write-WarningCustom "Existing .env.local found"
    if (Confirm-Action "Keep existing configuration?") {
        Write-Info "Using existing .env.local"
    } else {
        $backupName = ".env.local.backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Move-Item ".env.local" $backupName
        Write-Info "Backed up old configuration"
        $configureEnv = $true
    }
} else {
    $configureEnv = $true
}

if ($configureEnv) {
    Write-Host "Let's configure your environment variables..."
    Write-Host ""
    
    # Generate secure random secret
    $nextAuthSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    
    # Get admin email
    Write-Host ""
    do {
        $adminEmail = Read-Host "Enter your email (for admin access)"
    } while ($adminEmail -notmatch "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    
    # Get Google OAuth credentials
    if (-not $skipOAuth) {
        Write-Host ""
        $googleClientId = Read-Host "Enter Google Client ID"
        $googleClientSecret = Read-Host "Enter Google Client Secret"
    } else {
        $googleClientId = "your-google-client-id"
        $googleClientSecret = "your-google-client-secret"
    }
    
    # Get FPP server IP
    Write-Host ""
    $fppIp = Read-Host "Enter your FPP server IP (e.g., 192.168.1.100)"
    
    # Get timezone
    Write-Host ""
    Write-Host "Common US timezones:"
    Write-Host "  - America/New_York (Eastern)"
    Write-Host "  - America/Chicago (Central)"
    Write-Host "  - America/Denver (Mountain)"
    Write-Host "  - America/Los_Angeles (Pacific)"
    Write-Host ""
    $timezone = Read-Host "Enter your timezone [America/Chicago]"
    if ([string]::IsNullOrWhiteSpace($timezone)) {
        $timezone = "America/Chicago"
    }
    
    # SMTP configuration
    Write-Host ""
    if (Confirm-Action "Do you want to configure email notifications? (for Santa letters & alerts)") {
        Write-Host ""
        Write-Host "For Gmail users:"
        Write-Host "  1. Enable 2-Factor Authentication"
        Write-Host "  2. Generate an App Password: https://myaccount.google.com/apppasswords"
        Write-Host "  3. Use the App Password below (not your regular password)"
        Write-Host ""
        $smtpUser = Read-Host "SMTP Email"
        $smtpPass = Read-Host "SMTP App Password" -AsSecureString
        $smtpPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPass))
        $smtpHost = "smtp.gmail.com"
        $smtpPort = "587"
    } else {
        $smtpUser = "your-email@gmail.com"
        $smtpPassPlain = "your-app-password"
        $smtpHost = "smtp.gmail.com"
        $smtpPort = "587"
    }
    
    # Determine NEXTAUTH_URL
    if ($installType -eq "public") {
        Write-Host ""
        $domain = Read-Host "Enter your domain name (e.g., fpp.example.com)"
        $nextAuthUrl = "https://$domain"
    } else {
        $nextAuthUrl = "http://localhost:3000"
    }
    
    # Create .env.local file
    $envContent = @"
# FPP Control Center - Environment Configuration
# Generated by setup.ps1 on $(Get-Date)

# NextAuth Configuration
NEXTAUTH_URL=$nextAuthUrl
NEXTAUTH_SECRET=$nextAuthSecret

# Google OAuth
GOOGLE_CLIENT_ID=$googleClientId
GOOGLE_CLIENT_SECRET=$googleClientSecret

# Admin Access
ADMIN_EMAILS=$adminEmail

# FPP Server
FPP_URL=http://${fppIp}:80

# Spotify API (optional - leave as-is for now)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Ollama LLM (optional - leave as-is for now)
OLLAMA_URL=http://localhost:11434

# Email Configuration
SMTP_HOST=$smtpHost
SMTP_PORT=$smtpPort
SMTP_SECURE=false
SMTP_USER=$smtpUser
SMTP_PASS=$smtpPassPlain
ALERT_EMAIL=$adminEmail

# Timezone
NEXT_PUBLIC_TIMEZONE=$timezone

# Device Monitoring Schedule
MONITORING_START_TIME=17:30
MONITORING_END_TIME=22:00
"@

    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Success "Environment configuration created"
}

# ═══════════════════════════════════════════════════════════
# STEP 7: Build Application
# ═══════════════════════════════════════════════════════════
Write-Header "Step 7/8: Building Application"

Write-Step "Building Next.js application (this may take a minute)..."
npm run build
Write-Success "Application built successfully"

# ═══════════════════════════════════════════════════════════
# STEP 8: Cloudflare Tunnel (if public)
# ═══════════════════════════════════════════════════════════
if ($installType -eq "public") {
    Write-Header "Step 8/8: Cloudflare Tunnel Setup"
    
    Write-Host "Cloudflare Tunnel provides secure, public access to your FPP Control Center"
    Write-Host "without opening ports on your router or exposing your home IP address."
    Write-Host ""
    
    if (Confirm-Action "Set up Cloudflare Tunnel now?") {
        if (Test-Path ".\scripts\setup-cloudflare-tunnel.ps1") {
            & ".\scripts\setup-cloudflare-tunnel.ps1"
        } else {
            Write-WarningCustom "Cloudflare setup script not found"
            Write-Info "You can set it up manually later"
        }
    } else {
        Write-Info "Skipping Cloudflare Tunnel setup"
    }
} else {
    Write-Header "Step 8/8: Final Configuration"
    Write-Info "Local network installation - Cloudflare Tunnel not needed"
}

# ═══════════════════════════════════════════════════════════
# Start Application
# ═══════════════════════════════════════════════════════════
Write-Header "Starting Application"

Write-Step "Starting FPP Control Center..."
Write-Info "Application will run in development mode"
Write-Info "Press Ctrl+C to stop the server when needed"

Write-Success "Setup complete! Starting server..."

# ═══════════════════════════════════════════════════════════
# SUCCESS!
# ═══════════════════════════════════════════════════════════
Clear-Host
Write-Header "🎉 Setup Complete! 🎉"

Write-Host "FPP Control Center is ready to run!" -ForegroundColor Green
Write-Host ""

if ($installType -eq "local") {
    Write-Host "📡 Access your control center:" -ForegroundColor Cyan
    Write-Host "   • From this computer: http://localhost:3000"
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"})[0].IPAddress
    if ($localIp) {
        Write-Host "   • From other devices:  http://${localIp}:3000"
    }
} else {
    Write-Host "📡 Access your control center:" -ForegroundColor Cyan
    Write-Host "   • Public URL: https://$domain"
}

Write-Host ""
Write-Host "🎛️  Available Features:" -ForegroundColor Cyan
Write-Host "   • Jukebox - Song requests from visitors"
Write-Host "   • Santa Letters - AI-generated responses"
Write-Host "   • Device Monitoring - Track FPP status"
Write-Host "   • Admin Dashboard - Manage everything"
Write-Host ""

Write-Host "🔧 To Start the Application:" -ForegroundColor Cyan
Write-Host "   npm run dev"
Write-Host ""

if ($skipOAuth) {
    Write-Host "⚠️  Action Required:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   You skipped Google OAuth setup. Admin login won't work until you:"
    Write-Host "   1. Create OAuth credentials at: https://console.cloud.google.com/apis/credentials"
    Write-Host "   2. Update .env.local with your Client ID and Secret"
    Write-Host "   3. Restart the application"
    Write-Host ""
}

if (($installType -eq "public") -and (-not $skipOAuth)) {
    Write-Host "⚠️  Don't Forget:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Update your Google OAuth redirect URIs to include:"
    Write-Host "   https://$domain/api/auth/callback/google"
    Write-Host ""
}

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   • Full guide: README.md"
Write-Host "   • Security:   SECURITY-IMPLEMENTATION.md"
Write-Host ""

Write-Host "Enjoy your Christmas light show! 🎄✨" -ForegroundColor Green
Write-Host ""

if (Confirm-Action "Start the development server now?") {
    npm run dev
}
