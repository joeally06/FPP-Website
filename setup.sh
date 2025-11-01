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
# Dependency Installation Functions
# ═══════════════════════════════════════════════════════════

install_dependencies_mac() {
    print_header "Installing Dependencies (macOS)"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed"
        echo ""
        echo "Homebrew is required to install Node.js on macOS."
        echo "Install it from: https://brew.sh"
        echo ""
        echo "Or run this command:"
        echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        echo ""
        exit 1
    fi
    
    print_step "Updating Homebrew..."
    brew update
    
    # Install Node.js
    if ! command -v node &> /dev/null; then
        print_step "Installing Node.js 20..."
        brew install node@20
        brew link node@20
        print_success "Node.js installed successfully"
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_step "Upgrading Node.js to version 20..."
            brew upgrade node@20
            brew link --overwrite node@20
            print_success "Node.js upgraded successfully"
        fi
    fi
    
    # Install Git if needed
    if ! command -v git &> /dev/null; then
        print_step "Installing Git..."
        brew install git
        print_success "Git installed successfully"
    fi
}

install_dependencies_debian() {
    print_header "Installing Dependencies (Debian/Ubuntu)"
    
    print_step "Updating package lists..."
    sudo apt-get update
    
    # Install Node.js
    if ! command -v node &> /dev/null; then
        print_step "Adding NodeSource repository..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        
        print_step "Installing Node.js 20..."
        sudo apt-get install -y nodejs
        print_success "Node.js installed successfully"
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_warning "Node.js $(node -v) is too old. Upgrading to version 20..."
            
            # Remove old Node.js
            sudo apt-get remove -y nodejs
            
            # Add NodeSource repository
            print_step "Adding NodeSource repository..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            
            # Install Node.js 20
            print_step "Installing Node.js 20..."
            sudo apt-get install -y nodejs
            print_success "Node.js upgraded successfully"
        fi
    fi
    
    # Install Git if needed
    if ! command -v git &> /dev/null; then
        print_step "Installing Git..."
        sudo apt-get install -y git
        print_success "Git installed successfully"
    fi
}

install_dependencies_redhat() {
    print_header "Installing Dependencies (RHEL/CentOS/Fedora)"
    
    # Install Node.js
    if ! command -v node &> /dev/null; then
        print_step "Adding NodeSource repository..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        
        print_step "Installing Node.js 20..."
        sudo yum install -y nodejs
        print_success "Node.js installed successfully"
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_warning "Node.js $(node -v) is too old. Upgrading to version 20..."
            
            # Remove old Node.js
            sudo yum remove -y nodejs
            
            # Add NodeSource repository
            print_step "Adding NodeSource repository..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            
            # Install Node.js 20
            print_step "Installing Node.js 20..."
            sudo yum install -y nodejs
            print_success "Node.js upgraded successfully"
        fi
    fi
    
    # Install Git if needed
    if ! command -v git &> /dev/null; then
        print_step "Installing Git..."
        sudo yum install -y git
        print_success "Git installed successfully"
    fi
}

install_dependencies() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║  This script will automatically install:                 ║"
    echo "║  • Node.js 20+ (includes npm)                            ║"
    echo "║  • Git                                                    ║"
    echo "║                                                           ║"
    echo "║  You may be prompted for your sudo password.             ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    if ! confirm "Continue with automatic installation?"; then
        print_info "Installation cancelled by user"
        echo ""
        echo "To install manually:"
        if [[ "$OS_TYPE" == "linux" ]]; then
            echo ""
            echo "Node.js 20:"
            echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "  sudo apt-get install -y nodejs"
            echo ""
            echo "Git:"
            echo "  sudo apt-get install -y git"
        elif [[ "$OS_TYPE" == "mac" ]]; then
            echo ""
            echo "Node.js 20:"
            echo "  brew install node@20"
            echo ""
            echo "Git:"
            echo "  brew install git"
        fi
        echo ""
        exit 1
    fi
    
    # Detect Linux distribution
    if [[ "$OS_TYPE" == "linux" ]]; then
        if [ -f /etc/debian_version ]; then
            install_dependencies_debian
        elif [ -f /etc/redhat-release ]; then
            install_dependencies_redhat
        else
            print_error "Unsupported Linux distribution"
            echo ""
            echo "This script supports:"
            echo "  • Debian/Ubuntu (apt-get)"
            echo "  • RHEL/CentOS/Fedora (yum)"
            echo ""
            echo "Please install Node.js 20+ and Git manually:"
            echo "  https://nodejs.org"
            echo "  https://git-scm.com"
            exit 1
        fi
    elif [[ "$OS_TYPE" == "mac" ]]; then
        install_dependencies_mac
    fi
}

# ═══════════════════════════════════════════════════════════
# STEP 1: Dependency Checks
# ═══════════════════════════════════════════════════════════
print_header "Step 1/8: System Requirements"

print_step "Detecting operating system..."
OS_TYPE=""
case "$(uname -s)" in
    Linux*)     OS_TYPE="linux";;
    Darwin*)    OS_TYPE="mac";;
    *)          OS_TYPE="unknown";;
esac

if [[ "$OS_TYPE" == "unknown" ]]; then
    print_error "Unsupported operating system: $(uname -s)"
    echo "This setup script only supports Linux and macOS."
    exit 1
fi
print_success "Operating system: $OS_TYPE"

# Check dependencies and offer auto-install
MISSING_DEPS=false

print_step "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed"
    MISSING_DEPS=true
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_warning "Node.js 20+ is required (found: $(node -v))"
        MISSING_DEPS=true
    else
        print_success "Node.js $(node -v) detected"
    fi
fi

print_step "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_warning "npm is not installed (will be installed with Node.js)"
    MISSING_DEPS=true
else
    print_success "npm $(npm -v) detected"
fi

print_step "Checking Git..."
if ! command -v git &> /dev/null; then
    print_warning "Git is not installed"
    MISSING_DEPS=true
else
    print_success "Git $(git --version | cut -d' ' -f3) detected"
fi

# If dependencies are missing, offer to install them
if [ "$MISSING_DEPS" = true ]; then
    echo ""
    print_warning "Some required dependencies are missing or outdated"
    echo ""
    
    if confirm "Would you like to install missing dependencies automatically?"; then
        install_dependencies
        
        # Verify installation
        echo ""
        print_header "Verifying Installation"
        
        print_step "Checking Node.js..."
        if ! command -v node &> /dev/null; then
            print_error "Node.js installation failed"
            exit 1
        fi
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_error "Node.js 20+ is required (found: $(node -v))"
            exit 1
        fi
        print_success "Node.js $(node -v) installed"
        
        print_step "Checking npm..."
        if ! command -v npm &> /dev/null; then
            print_error "npm installation failed"
            exit 1
        fi
        print_success "npm $(npm -v) installed"
        
        print_step "Checking Git..."
        if ! command -v git &> /dev/null; then
            print_error "Git installation failed"
            exit 1
        fi
        print_success "Git $(git --version | cut -d' ' -f3) installed"
        
        echo ""
        print_success "All dependencies installed successfully!"
    else
        print_error "Cannot continue without required dependencies"
        echo ""
        echo "Please install manually and run this script again:"
        if [[ "$OS_TYPE" == "linux" ]]; then
            echo ""
            echo "Node.js 20:"
            echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "  sudo apt-get install -y nodejs"
            echo ""
            echo "Git:"
            echo "  sudo apt-get install -y git"
        elif [[ "$OS_TYPE" == "mac" ]]; then
            echo ""
            echo "Node.js 20:"
            echo "  brew install node@20"
            echo ""
            echo "Git:"
            echo "  brew install git"
        fi
        exit 1
    fi
fi

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

print_step "Installing dependencies..."
npm install

print_step "Updating dependencies to fix known vulnerabilities..."
npm update
npm audit fix --force 2>/dev/null || true

print_success "Dependencies installed and updated"

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

CONFIGURE_ENV=false
OAUTH_JUST_UPDATED=false

if [ -f ".env.local" ]; then
    print_warning "Existing .env.local found"
    
    # Check if Google OAuth is configured
    if grep -q "your-google-client-id" .env.local 2>/dev/null || ! grep -q "GOOGLE_CLIENT_ID=.*[^=]$" .env.local 2>/dev/null; then
        print_warning "Google OAuth credentials are not configured in your .env.local"
        if confirm "Would you like to configure Google OAuth now?"; then
            # Just update OAuth credentials
            echo ""
            read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
            read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
            
            # Update the .env.local file
            if command -v sed &> /dev/null; then
                # Check if the fields exist
                if grep -q "GOOGLE_CLIENT_ID=" .env.local; then
                    sed -i.bak "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID|" .env.local
                    sed -i.bak "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET|" .env.local
                    rm -f .env.local.bak
                else
                    # Add the fields if they don't exist
                    echo "" >> .env.local
                    echo "# Google OAuth" >> .env.local
                    echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env.local
                    echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> .env.local
                fi
                print_success "Google OAuth credentials updated in .env.local"
                OAUTH_JUST_UPDATED=true
                SKIP_OAUTH=false
            else
                print_warning "Could not auto-update. Please manually edit .env.local:"
                echo "  GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
                echo "  GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
                SKIP_OAUTH=true
            fi
        else
            print_info "Skipping OAuth configuration"
            SKIP_OAUTH=true
        fi
    else
        print_success "Google OAuth appears to be configured"
        SKIP_OAUTH=false
    fi
    
    # Only ask about full reconfiguration if OAuth wasn't just updated
    if [ "$OAUTH_JUST_UPDATED" = false ]; then
        # Check if other critical fields are missing
        if grep -q "your-" .env.local 2>/dev/null; then
            print_warning "Some configuration values appear to be placeholders"
            echo ""
            echo "Current .env.local contains placeholder values like 'your-spotify-client-id'"
            echo ""
            if confirm "Review and update all configuration values?"; then
                mv .env.local .env.local.backup-$(date +%Y%m%d_%H%M%S)
                print_info "Backed up old configuration"
                CONFIGURE_ENV=true
            else
                print_info "Keeping existing configuration"
                echo ""
                print_warning "To manually update later, edit: .env.local"
                CONFIGURE_ENV=false
            fi
        else
            if confirm "Keep existing configuration?"; then
                print_info "Using existing .env.local"
                CONFIGURE_ENV=false
            else
                mv .env.local .env.local.backup-$(date +%Y%m%d_%H%M%S)
                print_info "Backed up old configuration"
                CONFIGURE_ENV=true
            fi
        fi
    else
        # OAuth was just updated, keep the rest of the config
        print_success "Using existing configuration with updated OAuth credentials"
        CONFIGURE_ENV=false
    fi
else
    CONFIGURE_ENV=true
    SKIP_OAUTH=false
    SKIP_SPOTIFY=false
fi

if [ "$CONFIGURE_ENV" = true ]; then
    echo "Let's configure your environment variables..."
    echo ""
    
    # Generate secure random secret
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    
    # Get admin email(s)
    echo ""
    print_header "Admin Email Configuration"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT:${NC} The email(s) you enter here will be used for admin login."
    echo ""
    echo "• This email MUST match the Google account you'll use to log in"
    echo "• Only these email addresses will have admin access"
    echo "• You can add multiple admins (comma-separated, no spaces)"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  Single admin:   joeally5@gmail.com"
    echo "  Multiple admins: joeally5@gmail.com,wife@gmail.com,helper@yahoo.com"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    read -p "Enter admin email(s): " ADMIN_EMAIL
    
    # Validate email format(s)
    IFS=',' read -ra EMAIL_ARRAY <<< "$ADMIN_EMAIL"
    for email in "${EMAIL_ARRAY[@]}"; do
        # Trim whitespace
        email=$(echo "$email" | xargs)
        if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            print_error "Invalid email format: $email"
            echo "Please enter valid email address(es)"
            exit 1
        fi
    done
    
    # Remove any spaces from the email list
    ADMIN_EMAIL=$(echo "$ADMIN_EMAIL" | tr -d ' ')
    
    print_success "Admin email(s) configured: $ADMIN_EMAIL"
    
    # Get Google OAuth credentials
    echo ""
    print_info "Google OAuth is required for admin authentication"
    if confirm "Do you have your Google OAuth credentials ready?"; then
        echo ""
        read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
        read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
        SKIP_OAUTH=false
    else
        print_warning "Google OAuth setup will be skipped"
        print_info "Admin login will NOT work until you configure OAuth"
        GOOGLE_CLIENT_ID="your-google-client-id"
        GOOGLE_CLIENT_SECRET="your-google-client-secret"
        SKIP_OAUTH=true
    fi
    
    # Get Spotify API credentials
    echo ""
    print_info "Spotify API is REQUIRED for jukebox song metadata (artist, album, artwork)"
    echo ""
    echo "To get Spotify API credentials:"
    echo "  1. Go to: https://developer.spotify.com/dashboard"
    echo "  2. Log in with your Spotify account (free account works)"
    echo "  3. Click 'Create App'"
    echo "  4. Fill in app details:"
    echo "     - App name: FPP Control Center"
    echo "     - App description: Christmas light show jukebox"
    echo "     - Redirect URI: http://localhost:3000"
    echo "     - API: Web API"
    echo "  5. Click Settings → Copy Client ID and Client Secret"
    echo ""
    
    if confirm "Do you have your Spotify API credentials ready?"; then
        echo ""
        read -p "Enter Spotify Client ID: " SPOTIFY_CLIENT_ID
        read -p "Enter Spotify Client Secret: " SPOTIFY_CLIENT_SECRET
        SKIP_SPOTIFY=false
    else
        print_warning "Spotify API setup will be skipped"
        print_info "Jukebox won't show song metadata until you configure this"
        SPOTIFY_CLIENT_ID="your-spotify-client-id"
        SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
        SKIP_SPOTIFY=true
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
        SMTP_SECURE="false"
    else
        SMTP_USER="your-email@gmail.com"
        SMTP_PASS="your-app-password"
        SMTP_HOST="smtp.gmail.com"
        SMTP_PORT="587"
        SMTP_SECURE="false"
    fi
    
    # Determine NEXTAUTH_URL based on installation type and access method
    echo ""
    print_header "Access Configuration"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "How will you access this FPP Control Center?"
    echo ""
    
    if [[ "$INSTALL_TYPE" == "public" ]]; then
        echo "You selected PUBLIC installation (Cloudflare Tunnel)"
        echo ""
        read -p "Enter your domain name (e.g., fpp.example.com): " DOMAIN
        NEXTAUTH_URL="https://$DOMAIN"
        SETUP_URL="https://$DOMAIN"
        print_success "NEXTAUTH_URL set to: $NEXTAUTH_URL"
    else
        echo "You selected LOCAL NETWORK installation"
        echo ""
        echo "Choose your primary access method:"
        echo ""
        echo "1) Only from this server (localhost)"
        echo "   - Use http://localhost:3000"
        echo "   - Best for: Testing, development"
        echo ""
        echo "2) From network devices (phones, tablets, computers)"
        echo "   - Use http://YOUR_DOMAIN_OR_IP:3000"
        echo "   - Best for: Production servers accessed by visitors"
        echo ""
        read -p "Enter choice (1 or 2): " ACCESS_CHOICE
        
        if [[ "$ACCESS_CHOICE" == "1" ]]; then
            NEXTAUTH_URL="http://localhost:3000"
            SETUP_URL="http://localhost:3000"
            print_success "NEXTAUTH_URL set to: $NEXTAUTH_URL"
        else
            echo ""
            echo "Enter the domain or IP address visitors will use to access your site:"
            echo ""
            echo -e "${GREEN}Examples:${NC}"
            echo "  - lewisfamilylightshow.com (if using a domain)"
            echo "  - 192.168.2.107 (if using IP address)"
            echo ""
            echo -e "${YELLOW}NOTE:${NC} Do NOT include http:// or port numbers"
            echo ""
            read -p "Domain or IP: " ACCESS_DOMAIN
            
            # Remove http://, https://, and trailing slashes
            ACCESS_DOMAIN=$(echo "$ACCESS_DOMAIN" | sed -e 's|^https\?://||' -e 's|/$||')
            
            NEXTAUTH_URL="http://$ACCESS_DOMAIN:3000"
            SETUP_URL="http://$ACCESS_DOMAIN:3000"
            
            echo ""
            print_success "NEXTAUTH_URL set to: $NEXTAUTH_URL"
            echo ""
            print_warning "IMPORTANT: Visitors must access your site at: $SETUP_URL"
            echo ""
        fi
    fi
    
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    
    # Show OAuth redirect URI instructions if OAuth was configured
    if [ "$SKIP_OAUTH" = false ]; then
        echo ""
        print_header "⚠️  IMPORTANT: Update Google OAuth Settings"
        echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}You MUST add this redirect URI to your Google OAuth app:${NC}"
        echo ""
        echo -e "${GREEN}   $NEXTAUTH_URL/api/auth/callback/google${NC}"
        echo ""
        echo "Steps:"
        echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
        echo "  2. Click on your OAuth 2.0 Client ID"
        echo "  3. Under 'Authorized redirect URIs', click '+ ADD URI'"
        echo "  4. Paste the URL above"
        echo "  5. Click 'Save'"
        echo ""
        echo -e "${RED}OAuth will NOT work until you complete this step!${NC}"
        echo ""
        echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
        echo ""
        
        if ! confirm "Have you added the redirect URI (or will you do it now)?"; then
            print_warning "Remember to add the redirect URI before trying to log in!"
        fi
        echo ""
    fi
    
    # Create .env.local file
    cat > .env.local << 'ENV_FILE'
# FPP Control Center - Environment Configuration
# Generated by setup.sh

# NextAuth Configuration
# For local network access, change to http://YOUR_SERVER_IP:3000
# For production with Cloudflare Tunnel, change to https://yourdomain.com
NEXTAUTH_URL=PLACEHOLDER_NEXTAUTH_URL
NEXTAUTH_SECRET=PLACEHOLDER_NEXTAUTH_SECRET

# Google OAuth
GOOGLE_CLIENT_ID=PLACEHOLDER_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=PLACEHOLDER_GOOGLE_CLIENT_SECRET

# Admin Access
ADMIN_EMAILS=PLACEHOLDER_ADMIN_EMAIL

# FPP Server Configuration
FPP_URL=PLACEHOLDER_FPP_URL

# Spotify API (REQUIRED for jukebox metadata)
SPOTIFY_CLIENT_ID=PLACEHOLDER_SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=PLACEHOLDER_SPOTIFY_CLIENT_SECRET

# Ollama LLM Configuration (optional - configure later if needed)
OLLAMA_URL=http://localhost:11434

# Email Configuration (SMTP)
SMTP_HOST=PLACEHOLDER_SMTP_HOST
SMTP_PORT=PLACEHOLDER_SMTP_PORT
SMTP_SECURE=PLACEHOLDER_SMTP_SECURE
SMTP_USER=PLACEHOLDER_SMTP_USER
SMTP_PASS=PLACEHOLDER_SMTP_PASS

# Timezone Configuration
NEXT_PUBLIC_TIMEZONE=PLACEHOLDER_TIMEZONE

# Device Monitoring Schedule
MONITORING_START_TIME=17:30
MONITORING_END_TIME=22:00
ENV_FILE

    # Replace placeholders with actual values
    sed -i.bak "s|PLACEHOLDER_NEXTAUTH_URL|$NEXTAUTH_URL|g" .env.local
    sed -i.bak "s|PLACEHOLDER_NEXTAUTH_SECRET|$NEXTAUTH_SECRET|g" .env.local
    sed -i.bak "s|PLACEHOLDER_GOOGLE_CLIENT_ID|$GOOGLE_CLIENT_ID|g" .env.local
    sed -i.bak "s|PLACEHOLDER_GOOGLE_CLIENT_SECRET|$GOOGLE_CLIENT_SECRET|g" .env.local
    sed -i.bak "s|PLACEHOLDER_ADMIN_EMAIL|$ADMIN_EMAIL|g" .env.local
    sed -i.bak "s|PLACEHOLDER_FPP_URL|http://$FPP_IP:80|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SPOTIFY_CLIENT_ID|$SPOTIFY_CLIENT_ID|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SPOTIFY_CLIENT_SECRET|$SPOTIFY_CLIENT_SECRET|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SMTP_HOST|$SMTP_HOST|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SMTP_PORT|$SMTP_PORT|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SMTP_SECURE|$SMTP_SECURE|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SMTP_USER|$SMTP_USER|g" .env.local
    sed -i.bak "s|PLACEHOLDER_SMTP_PASS|$SMTP_PASS|g" .env.local
    sed -i.bak "s|PLACEHOLDER_TIMEZONE|$TIMEZONE|g" .env.local
    rm -f .env.local.bak

    print_success "Environment configuration created"
    
    # Validate required fields
    echo ""
    print_step "Validating configuration..."
    
    VALIDATION_FAILED=false
    MISSING_FIELDS=()
    
    # Check for placeholder values in REQUIRED fields
    if grep -q "your-google-client-id" .env.local || grep -q "GOOGLE_CLIENT_ID=\s*$" .env.local 2>/dev/null; then
        MISSING_FIELDS+=("Google OAuth Client ID")
        VALIDATION_FAILED=true
    fi
    
    if grep -q "your-google-client-secret" .env.local || grep -q "GOOGLE_CLIENT_SECRET=\s*$" .env.local 2>/dev/null; then
        MISSING_FIELDS+=("Google OAuth Client Secret")
        VALIDATION_FAILED=true
    fi
    
    if grep -q "your-spotify-client-id" .env.local || grep -q "SPOTIFY_CLIENT_ID=\s*$" .env.local 2>/dev/null; then
        MISSING_FIELDS+=("Spotify Client ID")
        VALIDATION_FAILED=true
    fi
    
    if grep -q "your-spotify-client-secret" .env.local || grep -q "SPOTIFY_CLIENT_SECRET=\s*$" .env.local 2>/dev/null; then
        MISSING_FIELDS+=("Spotify Client Secret")
        VALIDATION_FAILED=true
    fi
    
    if [ "$VALIDATION_FAILED" = true ]; then
        echo ""
        print_warning "Some REQUIRED fields are not configured:"
        for field in "${MISSING_FIELDS[@]}"; do
            echo "  ❌ $field"
        done
        echo ""
        print_info "These fields MUST be configured before the app will work properly"
        print_info "Edit .env.local and add the missing credentials, then run:"
        echo ""
        echo "  npm run build"
        echo "  pm2 restart fpp-control"
        echo ""
    else
        print_success "All required fields validated!"
    fi
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
# Configuration Summary
# ═══════════════════════════════════════════════════════════
echo ""
print_header "📋 Configuration Summary"

# Read .env.local to check what's configured
if [ -f ".env.local" ]; then
    echo ""
    echo -e "${CYAN}Checking your configuration...${NC}"
    echo ""
    
    # Check each required field
    ADMIN_EMAILS_SET=$(grep "^ADMIN_EMAILS=" .env.local | grep -v "your-" | wc -l)
    GOOGLE_OAUTH_SET=$(grep "^GOOGLE_CLIENT_ID=" .env.local | grep -v "your-" | wc -l)
    SPOTIFY_SET=$(grep "^SPOTIFY_CLIENT_ID=" .env.local | grep -v "your-" | wc -l)
    SMTP_SET=$(grep "^SMTP_USER=" .env.local | grep -v "your-" | wc -l)
    
    # Display status
    if [ "$ADMIN_EMAILS_SET" -gt 0 ]; then
        ADMIN_EMAIL_VALUE=$(grep "^ADMIN_EMAILS=" .env.local | cut -d'=' -f2)
        echo -e "   ${GREEN}✅ Admin Email:${NC} $ADMIN_EMAIL_VALUE"
    else
        echo -e "   ${RED}❌ Admin Email:${NC} Not configured"
    fi
    
    if [ "$GOOGLE_OAUTH_SET" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Google OAuth:${NC} Configured"
    else
        echo -e "   ${YELLOW}⚠️  Google OAuth:${NC} Not configured - Admin login won't work"
    fi
    
    if [ "$SPOTIFY_SET" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Spotify API:${NC} Configured"
    else
        echo -e "   ${YELLOW}⚠️  Spotify API:${NC} Not configured - Jukebox won't show metadata"
    fi
    
    if [ "$SMTP_SET" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Email (SMTP):${NC} Configured"
    else
        echo -e "   ${CYAN}ℹ  Email (SMTP):${NC} Not configured (optional)"
    fi
    
    # Show NEXTAUTH_URL
    NEXTAUTH_URL_VALUE=$(grep "^NEXTAUTH_URL=" .env.local | cut -d'=' -f2)
    echo -e "   ${GREEN}✅ Access URL:${NC} $NEXTAUTH_URL_VALUE"
    
    FPP_URL_VALUE=$(grep "^FPP_URL=" .env.local | cut -d'=' -f2)
    echo -e "   ${GREEN}✅ FPP Server:${NC} $FPP_URL_VALUE"
    
    echo ""
fi

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

if [ "$SKIP_OAUTH" = true ] || [ "$SKIP_SPOTIFY" = true ]; then
    echo -e "${YELLOW}⚠️  Action Required:${NC}"
    echo ""
    
    if [ "$SKIP_OAUTH" = true ]; then
        echo "   ❌ Google OAuth (Admin Login):"
        echo "      1. Create OAuth credentials at: https://console.cloud.google.com/apis/credentials"
        echo "      2. Update .env.local with your Client ID and Secret"
        echo ""
    fi
    
    if [ "$SKIP_SPOTIFY" = true ]; then
        echo "   ❌ Spotify API (Jukebox Metadata - REQUIRED):"
        echo "      1. Create app at: https://developer.spotify.com/dashboard"
        echo "      2. Update .env.local with your Client ID and Secret"
        echo ""
    fi
    
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
