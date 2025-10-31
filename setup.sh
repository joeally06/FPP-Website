#!/bin/bash

set -e

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

confirm() {
    while true; do
        read -p "$1 (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            return 0
        elif [[ $REPLY =~ ^[Nn]$ ]]; then
            return 1
        else
            print_warning "Please answer 'y' or 'n'"
        fi
    done
}

# Main setup script
clear
print_header "🎄 FPP Control Center - Interactive Setup 🎅"

echo -e "${GREEN}Welcome to the FPP Control Center setup wizard!${NC}"
echo ""
echo "This wizard will guide you through setting up your Christmas light"
echo "control center with jukebox, Santa letter generation, and device monitoring."
echo ""
echo "This will take about 10-15 minutes."
echo ""

if ! confirm "Ready to begin?"; then
    echo "Setup cancelled."
    exit 0
fi

# ═══════════════════════════════════════════════════════════
# STEP 1: Check System Requirements
# ═══════════════════════════════════════════════════════════
print_header "Step 1/8: Checking System Requirements"

print_step "Checking operating system..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_success "Linux detected"
    OS_TYPE="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    print_success "macOS detected"
    OS_TYPE="mac"
else
    print_error "Unsupported operating system: $OSTYPE"
    echo "This setup script is for Linux and macOS only."
    echo "For Windows, please run: powershell -ExecutionPolicy Bypass -File setup.ps1"
    exit 1
fi

print_step "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo ""
    echo "Please install Node.js 20+ first:"
    echo ""
    if [[ "$OS_TYPE" == "linux" ]]; then
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt-get install -y nodejs"
    elif [[ "$OS_TYPE" == "mac" ]]; then
        echo "  brew install node@20"
    fi
    echo ""
    echo "Then run this setup script again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js 20+ is required (found: $(node -v))"
    echo "Please upgrade Node.js and run this script again."
    exit 1
fi
print_success "Node.js $(node -v) detected"

print_step "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v) detected"

print_step "Checking Git..."
if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    echo ""
    echo "Please install Git first:"
    if [[ "$OS_TYPE" == "linux" ]]; then
        echo "  sudo apt-get install -y git"
    elif [[ "$OS_TYPE" == "mac" ]]; then
        echo "  brew install git"
    fi
    exit 1
fi
print_success "Git $(git --version | cut -d' ' -f3) detected"

# ═══════════════════════════════════════════════════════════
# STEP 2: Choose Installation Type
# ═══════════════════════════════════════════════════════════
print_header "Step 2/8: Choose Installation Type"

echo "How do you plan to use FPP Control Center?"
echo ""
echo "  1) Local Network Only (default)"
echo "     - Access from devices on your home network"
echo "     - No public internet access"
echo "     - Simpler setup"
echo ""
echo "  2) Public Internet Access"
echo "     - Access from anywhere in the world"
echo "     - Requires domain name"
echo "     - Uses Cloudflare Tunnel for security"
echo ""

while true; do
    read -p "Choose (1 or 2): " -n 1 -r
    echo
    if [[ $REPLY == "1" ]]; then
        INSTALL_TYPE="local"
        print_success "Local network installation selected"
        break
    elif [[ $REPLY == "2" ]]; then
        INSTALL_TYPE="public"
        print_success "Public internet installation selected"
        break
    else
        print_warning "Please choose 1 or 2"
    fi
done

# ═══════════════════════════════════════════════════════════
# STEP 3: Install Dependencies
# ═══════════════════════════════════════════════════════════
print_header "Step 3/8: Installing Dependencies"

print_step "Installing Node.js packages..."
npm install
print_success "Dependencies installed"

print_step "Checking for PM2 (process manager)..."
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 not found. Installing globally..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# ═══════════════════════════════════════════════════════════
# STEP 4: Database Setup
# ═══════════════════════════════════════════════════════════
print_header "Step 4/8: Setting Up Database"

if [ -f "fpp-control.db" ]; then
    print_warning "Existing database found!"
    if confirm "Delete existing database and start fresh?"; then
        mv fpp-control.db fpp-control-backup-$(date +%Y%m%d_%H%M%S).db
        print_info "Old database backed up"
    else
        print_info "Keeping existing database"
    fi
fi

print_step "Initializing database..."
npm run setup
print_success "Database initialized"

# ═══════════════════════════════════════════════════════════
# STEP 5: Google OAuth Setup
# ═══════════════════════════════════════════════════════════
print_header "Step 5/8: Google OAuth Configuration"

echo "FPP Control Center uses Google OAuth for admin authentication."
echo "This keeps your admin panel secure without managing passwords."
echo ""
echo "You'll need to create a Google OAuth application:"
echo ""
echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
echo "  2. Create a new project (or select existing)"
echo "  3. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
echo "  4. Choose 'Web application'"
echo "  5. Add authorized redirect URIs:"

if [[ "$INSTALL_TYPE" == "local" ]]; then
    echo "     - http://localhost:3000/api/auth/callback/google"
    echo "     - http://YOUR_SERVER_IP:3000/api/auth/callback/google"
else
    echo "     - https://yourdomain.com/api/auth/callback/google"
fi

echo ""
if ! confirm "Have you created your Google OAuth credentials?"; then
    print_info "No problem! You can do this later."
    print_info "The setup will continue, but admin login won't work until you configure OAuth."
    SKIP_OAUTH=true
else
    SKIP_OAUTH=false
fi

# ═══════════════════════════════════════════════════════════
# STEP 6: Environment Configuration
# ═══════════════════════════════════════════════════════════
print_header "Step 6/8: Configuring Environment Variables"

if [ -f ".env.local" ]; then
    print_warning "Existing .env.local found"
    if confirm "Keep existing configuration?"; then
        print_info "Using existing .env.local"
        CONFIGURE_ENV=false
    else
        mv .env.local .env.local.backup-$(date +%Y%m%d_%H%M%S)
        print_info "Backed up old configuration"
        CONFIGURE_ENV=true
    fi
else
    CONFIGURE_ENV=true
fi

if [ "$CONFIGURE_ENV" = true ]; then
    echo "Let's configure your environment variables..."
    echo ""
    
    # Generate secure random secret
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    
    # Get admin email
    echo ""
    read -p "Enter your email (for admin access): " ADMIN_EMAIL
    while [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; do
        print_error "Invalid email format"
        read -p "Enter your email: " ADMIN_EMAIL
    done
    
    # Get Google OAuth credentials
    if [ "$SKIP_OAUTH" = false ]; then
        echo ""
        read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
        read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
    else
        GOOGLE_CLIENT_ID="your-google-client-id"
        GOOGLE_CLIENT_SECRET="your-google-client-secret"
    fi
    
    # Get FPP server IP
    echo ""
    read -p "Enter your FPP server IP (e.g., 192.168.1.100): " FPP_IP
    
    # Get timezone
    echo ""
    echo "Common US timezones:"
    echo "  - America/New_York (Eastern)"
    echo "  - America/Chicago (Central)"
    echo "  - America/Denver (Mountain)"
    echo "  - America/Los_Angeles (Pacific)"
    echo ""
    read -p "Enter your timezone [America/Chicago]: " TIMEZONE
    TIMEZONE=${TIMEZONE:-America/Chicago}
    
    # SMTP configuration (optional)
    echo ""
    if confirm "Do you want to configure email notifications? (for Santa letters & alerts)"; then
        echo ""
        echo "For Gmail users:"
        echo "  1. Enable 2-Factor Authentication"
        echo "  2. Generate an App Password: https://myaccount.google.com/apppasswords"
        echo "  3. Use the App Password below (not your regular password)"
        echo ""
        read -p "SMTP Email: " SMTP_USER
        read -sp "SMTP App Password: " SMTP_PASS
        echo ""
        SMTP_HOST="smtp.gmail.com"
        SMTP_PORT="587"
    else
        SMTP_USER="your-email@gmail.com"
        SMTP_PASS="your-app-password"
        SMTP_HOST="smtp.gmail.com"
        SMTP_PORT="587"
    fi
    
    # Determine NEXTAUTH_URL based on installation type
    if [[ "$INSTALL_TYPE" == "public" ]]; then
        echo ""
        read -p "Enter your domain name (e.g., fpp.example.com): " DOMAIN
        NEXTAUTH_URL="https://$DOMAIN"
    else
        NEXTAUTH_URL="http://localhost:3000"
    fi
    
    # Create .env.local file
    cat > .env.local << EOF
# FPP Control Center - Environment Configuration
# Generated by setup.sh on $(date)

# NextAuth Configuration
NEXTAUTH_URL=$NEXTAUTH_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Google OAuth
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

# Admin Access
ADMIN_EMAILS=$ADMIN_EMAIL

# FPP Server
FPP_URL=http://$FPP_IP:80

# Spotify API (optional - leave as-is for now)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Ollama LLM (optional - leave as-is for now)
OLLAMA_URL=http://localhost:11434

# Email Configuration
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=false
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
ALERT_EMAIL=$ADMIN_EMAIL

# Timezone
NEXT_PUBLIC_TIMEZONE=$TIMEZONE

# Device Monitoring Schedule
MONITORING_START_TIME=17:30
MONITORING_END_TIME=22:00
EOF

    print_success "Environment configuration created"
fi

# ═══════════════════════════════════════════════════════════
# STEP 7: Build Application
# ═══════════════════════════════════════════════════════════
print_header "Step 7/8: Building Application"

print_step "Building Next.js application (this may take a minute)..."
npm run build
print_success "Application built successfully"

# ═══════════════════════════════════════════════════════════
# STEP 8: Cloudflare Tunnel Setup (if public)
# ═══════════════════════════════════════════════════════════
if [[ "$INSTALL_TYPE" == "public" ]]; then
    print_header "Step 8/8: Cloudflare Tunnel Setup"
    
    echo "Cloudflare Tunnel provides secure, public access to your FPP Control Center"
    echo "without opening ports on your router or exposing your home IP address."
    echo ""
    
    if confirm "Set up Cloudflare Tunnel now?"; then
        if [ -f "./scripts/setup-cloudflare-tunnel.sh" ]; then
            bash ./scripts/setup-cloudflare-tunnel.sh
        else
            print_warning "Cloudflare setup script not found"
            print_info "You can run it manually later: bash scripts/setup-cloudflare-tunnel.sh"
        fi
    else
        print_info "Skipping Cloudflare Tunnel setup"
        print_info "You can run it later: bash scripts/setup-cloudflare-tunnel.sh"
    fi
else
    print_header "Step 8/8: Final Configuration"
    print_info "Local network installation - Cloudflare Tunnel not needed"
fi

# ═══════════════════════════════════════════════════════════
# FINAL STEP: Start Application
# ═══════════════════════════════════════════════════════════
print_header "Starting Application"

print_step "Stopping any existing instances..."
pm2 stop fpp-control 2>/dev/null || true
pm2 delete fpp-control 2>/dev/null || true

print_step "Starting FPP Control Center with PM2..."
pm2 start npm --name "fpp-control" -- start
pm2 save

print_success "Application started!"

# Setup auto-start
echo ""
print_step "Setting up auto-start on system boot..."
pm2 startup
echo ""
print_info "If a command was shown above, run it to enable auto-start"

# ═══════════════════════════════════════════════════════════
# SUCCESS! Show Next Steps
# ═══════════════════════════════════════════════════════════
clear
print_header "🎉 Setup Complete! 🎉"

echo -e "${GREEN}FPP Control Center is now running!${NC}"
echo ""

# Show access URLs
if [[ "$INSTALL_TYPE" == "local" ]]; then
    SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "YOUR_SERVER_IP")
    echo -e "${CYAN}📡 Access your control center:${NC}"
    echo "   • From this computer: http://localhost:3000"
    echo "   • From other devices:  http://$SERVER_IP:3000"
else
    echo -e "${CYAN}📡 Access your control center:${NC}"
    echo "   • Public URL: https://$DOMAIN"
fi

echo ""
echo -e "${CYAN}🎛️  Available Features:${NC}"
echo "   • Jukebox - Song requests from visitors"
echo "   • Santa Letters - AI-generated responses"
echo "   • Device Monitoring - Track FPP status"
echo "   • Admin Dashboard - Manage everything"
echo ""

echo -e "${CYAN}🔧 Useful Commands:${NC}"
echo "   • View logs:       pm2 logs fpp-control"
echo "   • Restart:         pm2 restart fpp-control"
echo "   • Stop:            pm2 stop fpp-control"
echo "   • Status:          pm2 status"
echo ""

if [ "$SKIP_OAUTH" = true ]; then
    echo -e "${YELLOW}⚠️  Action Required:${NC}"
    echo ""
    echo "   You skipped Google OAuth setup. Admin login won't work until you:"
    echo "   1. Create OAuth credentials at: https://console.cloud.google.com/apis/credentials"
    echo "   2. Update .env.local with your Client ID and Secret"
    echo "   3. Restart: pm2 restart fpp-control"
    echo ""
fi

if [[ "$INSTALL_TYPE" == "public" ]] && [ "$SKIP_OAUTH" = false ]; then
    echo -e "${YELLOW}⚠️  Don't Forget:${NC}"
    echo ""
    echo "   Update your Google OAuth redirect URIs to include:"
    echo "   https://$DOMAIN/api/auth/callback/google"
    echo ""
fi

echo -e "${CYAN}📚 Documentation:${NC}"
echo "   • Full guide: README.md"
echo "   • Security:   SECURITY-IMPLEMENTATION.md"
echo "   • API docs:   docs/API.md"
echo ""

echo -e "${GREEN}Enjoy your Christmas light show! 🎄✨${NC}"
echo ""

# Ask if they want to view logs
if confirm "View application logs now?"; then
    pm2 logs fpp-control
fi
