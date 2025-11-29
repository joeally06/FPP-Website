#!/bin/bash

set -e

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Progress tracking
TOTAL_STEPS=8
CURRENT_STEP=0

# ═══════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════

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

# Progress bar function
show_progress() {
    CURRENT_STEP=$1
    STEP_NAME=$2
    PERCENT=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    FILLED=$((PERCENT / 5))
    EMPTY=$((20 - FILLED))
    
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    printf "${BOLD}Step %d/%d${NC} [" "$CURRENT_STEP" "$TOTAL_STEPS"
    for ((i=0; i<FILLED; i++)); do printf "${GREEN}█${NC}"; done
    for ((i=0; i<EMPTY; i++)); do printf "${BLUE}░${NC}"; done
    printf "] %d%% - ${CYAN}%s${NC}\n" "$PERCENT" "$STEP_NAME"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
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

# Retry function for failed steps
retry_or_skip() {
    local step_name="$1"
    local is_required="$2"
    
    echo ""
    if [ "$is_required" = true ]; then
        print_error "$step_name failed!"
        if confirm "Retry this step?"; then
            return 0  # Retry
        else
            print_error "Cannot continue without $step_name"
            exit 1
        fi
    else
        print_warning "$step_name failed (optional)"
        if confirm "Retry this step?"; then
            return 0  # Retry
        else
            print_info "Skipping $step_name - you can configure this later"
            return 1  # Skip
        fi
    fi
}

# ═══════════════════════════════════════════════════════════
# FPP Detection Functions
# ═══════════════════════════════════════════════════════════

# Verify a device is actually FPP (not just any HTTP server)
verify_fpp_device() {
    local ip="$1"
    local port="${2:-80}"
    local url="http://$ip:$port"
    
    # Try to get FPP system status
    local response=$(curl -s -m 3 "$url/api/system/status" 2>/dev/null)
    
    if [ -z "$response" ]; then
        return 1
    fi
    
    # Check for FPP-specific fields in the response
    # FPP returns JSON with fields like: fppd, mode, current_sequence, etc.
    if echo "$response" | grep -qE '"(fppd|JEEVES|current_sequence|current_playlist|mode_name)"'; then
        return 0  # Confirmed FPP device
    fi
    
    # Secondary check: try /api/fppd/status which is FPP-specific
    local fppd_response=$(curl -s -m 2 "$url/api/fppd/status" 2>/dev/null)
    if echo "$fppd_response" | grep -qE '"(status|current_sequence|mode_name)"'; then
        return 0  # Confirmed FPP device
    fi
    
    return 1
}

# Get FPP device info for display
get_fpp_info() {
    local ip="$1"
    local port="${2:-80}"
    local url="http://$ip:$port"
    
    local response=$(curl -s -m 3 "$url/api/system/status" 2>/dev/null)
    
    if [ -n "$response" ]; then
        # Extract hostname if available (works with grep -oP or sed fallback)
        local hostname=$(echo "$response" | grep -oP '"hostname"\s*:\s*"\K[^"]+' 2>/dev/null || \
                        echo "$response" | sed -n 's/.*"hostname"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' || echo "FPP")
        # Extract version if available  
        local version=$(echo "$response" | grep -oP '"(fpp_version|version)"\s*:\s*"\K[^"]+' 2>/dev/null || \
                       echo "$response" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' || echo "Unknown")
        # Extract mode
        local mode=$(echo "$response" | grep -oP '"mode_name"\s*:\s*"\K[^"]+' 2>/dev/null || \
                    echo "$response" | sed -n 's/.*"mode_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' || echo "")
        
        # Ensure we have something
        [ -z "$hostname" ] && hostname="FPP"
        [ -z "$version" ] && version="Unknown"
        
        echo "$hostname|$version|$mode"
    else
        echo "FPP|Unknown|"
    fi
}

# Load existing config values
load_existing_config() {
    if [ -f ".env.local" ]; then
        EXISTING_ADMIN_EMAIL=$(grep "^ADMIN_EMAILS=" .env.local 2>/dev/null | cut -d'=' -f2 | grep -v "your-" || echo "")
        EXISTING_FPP_URL=$(grep "^FPP_URL=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_TIMEZONE=$(grep "^NEXT_PUBLIC_TIMEZONE=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_GOOGLE_ID=$(grep "^GOOGLE_CLIENT_ID=" .env.local 2>/dev/null | cut -d'=' -f2 | grep -v "your-" || echo "")
        EXISTING_SPOTIFY_ID=$(grep "^SPOTIFY_CLIENT_ID=" .env.local 2>/dev/null | cut -d'=' -f2 | grep -v "your-" || echo "")
        EXISTING_OLLAMA_URL=$(grep "^OLLAMA_URL=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
        EXISTING_SMTP_HOST=$(grep "^SMTP_HOST=" .env.local 2>/dev/null | cut -d'=' -f2 | grep -v "your-" || echo "")
        return 0
    fi
    return 1
}

# ═══════════════════════════════════════════════════════════
# Dependency Installation Functions
# ═══════════════════════════════════════════════════════════

install_dependencies_mac() {
    print_header "Installing Dependencies (macOS)"
    
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
            sudo apt-get remove -y nodejs
            print_step "Adding NodeSource repository..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            print_step "Installing Node.js 20..."
            sudo apt-get install -y nodejs
            print_success "Node.js upgraded successfully"
        fi
    fi
    
    if ! command -v git &> /dev/null; then
        print_step "Installing Git..."
        sudo apt-get install -y git
        print_success "Git installed successfully"
    fi
}

install_dependencies_redhat() {
    print_header "Installing Dependencies (RHEL/CentOS/Fedora)"
    
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
            sudo yum remove -y nodejs
            print_step "Adding NodeSource repository..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            print_step "Installing Node.js 20..."
            sudo yum install -y nodejs
            print_success "Node.js upgraded successfully"
        fi
    fi
    
    if ! command -v git &> /dev/null; then
        print_step "Installing Git..."
        sudo yum install -y git
        print_success "Git installed successfully"
    fi
}

install_dependencies() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  This script will automatically install:                 ║"
    echo "║  • Node.js 20+ (includes npm)                            ║"
    echo "║  • Git                                                    ║"
    echo "║                                                           ║"
    echo "║  You may be prompted for your sudo password.             ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    if ! confirm "Continue with automatic installation?"; then
        print_info "Installation cancelled by user"
        exit 1
    fi
    
    if [[ "$OS_TYPE" == "linux" ]]; then
        if [ -f /etc/debian_version ]; then
            install_dependencies_debian
        elif [ -f /etc/redhat-release ]; then
            install_dependencies_redhat
        else
            print_error "Unsupported Linux distribution"
            exit 1
        fi
    elif [[ "$OS_TYPE" == "mac" ]]; then
        install_dependencies_mac
    fi
}

# ═══════════════════════════════════════════════════════════
# MAIN SCRIPT START
# ═══════════════════════════════════════════════════════════

clear
print_header "🎄 FPP Control Center - Interactive Setup 🎅"

echo -e "${GREEN}Welcome to the FPP Control Center setup wizard!${NC}"
echo ""
echo "This wizard will guide you through setting up your Christmas light"
echo "control center with jukebox, Santa letter generation, and device monitoring."
echo ""

# Check for existing configuration
REUSE_CONFIG=false
if load_existing_config; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Existing configuration detected!                         ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Found existing settings:"
    [ -n "$EXISTING_ADMIN_EMAIL" ] && echo "  • Admin Email: $EXISTING_ADMIN_EMAIL"
    [ -n "$EXISTING_FPP_URL" ] && echo "  • FPP Server: $EXISTING_FPP_URL"
    [ -n "$EXISTING_NEXTAUTH_URL" ] && echo "  • Access URL: $EXISTING_NEXTAUTH_URL"
    [ -n "$EXISTING_GOOGLE_ID" ] && echo "  • Google OAuth: Configured ✓"
    [ -n "$EXISTING_SPOTIFY_ID" ] && echo "  • Spotify API: Configured ✓"
    echo ""
    
    if confirm "Would you like to reuse these settings where possible?"; then
        REUSE_CONFIG=true
        print_success "Will reuse existing settings"
    else
        print_info "Starting fresh configuration"
    fi
    echo ""
fi

# Quick Setup Option
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Choose Setup Mode                                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  1) ${GREEN}Quick Setup${NC} (Recommended for most users)"
echo "     - Auto-detect FPP server"
echo "     - Minimal prompts"
echo "     - ~5 minutes"
echo ""
echo "  2) ${BLUE}Full Setup${NC} (Advanced users)"
echo "     - Configure all options"
echo "     - Ollama AI, SMTP, etc."
echo "     - ~10-15 minutes"
echo ""

SETUP_MODE=""
while true; do
    read -p "Choose setup mode (1 or 2) [1]: " -r
    SETUP_MODE=${REPLY:-1}
    if [[ "$SETUP_MODE" == "1" ]]; then
        print_success "Quick Setup selected"
        break
    elif [[ "$SETUP_MODE" == "2" ]]; then
        print_success "Full Setup selected"
        break
    else
        print_warning "Please choose 1 or 2"
    fi
done

echo ""
if ! confirm "Ready to begin?"; then
    echo "Setup cancelled."
    exit 0
fi

# ═══════════════════════════════════════════════════════════
# STEP 1: System Requirements
# ═══════════════════════════════════════════════════════════
show_progress 1 "System Requirements"

print_step "Detecting operating system..."
OS_TYPE=""
case "$(uname -s)" in
    Linux*)     OS_TYPE="linux";;
    Darwin*)    OS_TYPE="mac";;
    *)          OS_TYPE="unknown";;
esac

if [[ "$OS_TYPE" == "unknown" ]]; then
    print_error "Unsupported operating system: $(uname -s)"
    exit 1
fi
print_success "Operating system: $OS_TYPE"

# Check dependencies
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
    print_warning "npm is not installed"
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

if [ "$MISSING_DEPS" = true ]; then
    echo ""
    print_warning "Some required dependencies are missing or outdated"
    
    if confirm "Would you like to install missing dependencies automatically?"; then
        install_dependencies
        
        # Verify installation
        print_header "Verifying Installation"
        
        if ! command -v node &> /dev/null; then
            print_error "Node.js installation failed"
            exit 1
        fi
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_error "Node.js 20+ is required"
            exit 1
        fi
        print_success "Node.js $(node -v) installed"
        
        if ! command -v npm &> /dev/null; then
            print_error "npm installation failed"
            exit 1
        fi
        print_success "npm $(npm -v) installed"
        
        if ! command -v git &> /dev/null; then
            print_error "Git installation failed"
            exit 1
        fi
        print_success "Git $(git --version | cut -d' ' -f3) installed"
        
        print_success "All dependencies installed successfully!"
    else
        print_error "Cannot continue without required dependencies"
        exit 1
    fi
fi

# ═══════════════════════════════════════════════════════════
# STEP 2: Installation Type
# ═══════════════════════════════════════════════════════════
show_progress 2 "Installation Type"

echo "How do you plan to use FPP Control Center?"
echo ""
echo "  1) Local Network Only (default)"
echo "     - Access from devices on your home network"
echo "     - Simpler setup"
echo ""
echo "  2) Public Internet Access"
echo "     - Access from anywhere in the world"
echo "     - Uses Cloudflare Tunnel for security"
echo ""

while true; do
    read -p "Choose (1 or 2) [1]: " -r
    REPLY=${REPLY:-1}
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
show_progress 3 "Installing Dependencies"

print_step "Installing npm dependencies..."
npm install

print_step "Updating dependencies..."
npm update
npm audit fix --force 2>/dev/null || true

print_success "Dependencies installed and updated"

print_step "Checking for PM2..."
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2 globally..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# ═══════════════════════════════════════════════════════════
# STEP 4: Database Setup
# ═══════════════════════════════════════════════════════════
show_progress 4 "Database Setup"

print_step "Initializing database..."
npm run setup
print_success "Database initialized"

# ═══════════════════════════════════════════════════════════
# STEP 5: FPP Server Configuration
# ═══════════════════════════════════════════════════════════
show_progress 5 "FPP Server Configuration"

FPP_URL=""
FPP_CONFIRMED=false

# Try auto-discovery first (in Quick Setup mode or if user wants)
if [ "$SETUP_MODE" == "1" ]; then
    echo ""
    if confirm "Would you like to auto-discover your FPP server?"; then
        print_step "Scanning for FPP devices on your network..."
        
        # Get network prefix from local IP
        NETWORK_PREFIX=$(hostname -I 2>/dev/null | awk '{print $1}' | cut -d'.' -f1-3)
        if [ -z "$NETWORK_PREFIX" ]; then
            NETWORK_PREFIX="192.168.1"
        fi
        
        echo ""
        echo "Scanning $NETWORK_PREFIX.x for FPP devices..."
        echo "(This takes about 15-30 seconds)"
        echo ""
        
        FOUND_DEVICES=()
        
        # Check common FPP IP addresses (most users use low IPs or round numbers)
        COMMON_IPS="2 3 4 5 10 15 20 25 30 50 100 101 102 150 200 201 202 250"
        
        for last_octet in $COMMON_IPS; do
            full_ip="$NETWORK_PREFIX.$last_octet"
            printf "\r  Checking %-15s" "$full_ip..."
            
            if verify_fpp_device "$full_ip" "80"; then
                FPP_INFO=$(get_fpp_info "$full_ip" "80")
                FPP_HOSTNAME=$(echo "$FPP_INFO" | cut -d'|' -f1)
                FPP_VERSION=$(echo "$FPP_INFO" | cut -d'|' -f2)
                FPP_MODE=$(echo "$FPP_INFO" | cut -d'|' -f3)
                
                printf "\r                                          \r"
                print_success "Found FPP: $full_ip"
                echo "          Hostname: $FPP_HOSTNAME"
                echo "          Version:  $FPP_VERSION"
                [ -n "$FPP_MODE" ] && echo "          Mode:     $FPP_MODE"
                echo ""
                
                FOUND_DEVICES+=("$full_ip|$FPP_HOSTNAME|$FPP_VERSION")
            fi
        done
        printf "\r                                          \r"
        
        # Display results
        if [ ${#FOUND_DEVICES[@]} -eq 0 ]; then
            print_warning "No FPP devices found automatically"
            print_info "This could mean:"
            echo "    • FPP is on a different IP range"
            echo "    • FPP is not powered on"
            echo "    • Firewall is blocking the scan"
            echo ""
            print_info "You can enter the IP address manually below"
        elif [ ${#FOUND_DEVICES[@]} -eq 1 ]; then
            # Single device found - use it
            FOUND_IP=$(echo "${FOUND_DEVICES[0]}" | cut -d'|' -f1)
            FOUND_NAME=$(echo "${FOUND_DEVICES[0]}" | cut -d'|' -f2)
            
            if confirm "Use this FPP server ($FOUND_IP)?"; then
                FPP_URL="http://$FOUND_IP:80"
                FPP_CONFIRMED=true
                print_success "FPP server configured: $FPP_URL"
            fi
        else
            # Multiple devices found - let user choose
            echo ""
            print_success "Found ${#FOUND_DEVICES[@]} FPP devices:"
            echo ""
            
            i=1
            for device in "${FOUND_DEVICES[@]}"; do
                DEV_IP=$(echo "$device" | cut -d'|' -f1)
                DEV_NAME=$(echo "$device" | cut -d'|' -f2)
                DEV_VERSION=$(echo "$device" | cut -d'|' -f3)
                echo "  $i) $DEV_IP - $DEV_NAME (v$DEV_VERSION)"
                ((i++))
            done
            echo "  $i) Enter manually"
            echo ""
            
            while true; do
                read -p "Select FPP server (1-$i): " CHOICE
                if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "$i" ]; then
                    if [ "$CHOICE" -eq "$i" ]; then
                        # Manual entry
                        break
                    else
                        SELECTED_DEVICE="${FOUND_DEVICES[$((CHOICE-1))]}"
                        FOUND_IP=$(echo "$SELECTED_DEVICE" | cut -d'|' -f1)
                        FPP_URL="http://$FOUND_IP:80"
                        FPP_CONFIRMED=true
                        print_success "Selected: $FPP_URL"
                        break
                    fi
                else
                    print_warning "Please enter a number between 1 and $i"
                fi
            done
        fi
    fi
fi

# Manual entry if not found or user wants to enter manually
if [ -z "$FPP_URL" ] || [ "$FPP_CONFIRMED" != "true" ]; then
    echo ""
    print_header "FPP Server Configuration"
    echo "Enter your FPP (Falcon Player) server details."
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  • 192.168.1.2:80 (most common)"
    echo "  • 192.168.5.2:80"
    echo ""
    
    DEFAULT_FPP=""
    if [ "$REUSE_CONFIG" = true ] && [ -n "$EXISTING_FPP_URL" ]; then
        DEFAULT_FPP=$(echo "$EXISTING_FPP_URL" | sed 's|http://||')
    fi
    
    while true; do
        if [ -n "$DEFAULT_FPP" ]; then
            read -p "FPP Server IP:Port [$DEFAULT_FPP]: " FPP_INPUT
            FPP_INPUT=${FPP_INPUT:-$DEFAULT_FPP}
        else
            read -p "FPP Server IP:Port [192.168.1.2:80]: " FPP_INPUT
            FPP_INPUT=${FPP_INPUT:-192.168.1.2:80}
        fi
        
        # Parse IP and port
        if [[ $FPP_INPUT == *":"* ]]; then
            FPP_IP=$(echo "$FPP_INPUT" | cut -d':' -f1)
            FPP_PORT=$(echo "$FPP_INPUT" | cut -d':' -f2)
        else
            FPP_IP="$FPP_INPUT"
            FPP_PORT="80"
        fi
        
        print_step "Verifying FPP at http://$FPP_IP:$FPP_PORT..."
        
        if verify_fpp_device "$FPP_IP" "$FPP_PORT"; then
            FPP_INFO=$(get_fpp_info "$FPP_IP" "$FPP_PORT")
            FPP_HOSTNAME=$(echo "$FPP_INFO" | cut -d'|' -f1)
            FPP_VERSION=$(echo "$FPP_INFO" | cut -d'|' -f2)
            
            print_success "Verified FPP device!"
            echo "          Hostname: $FPP_HOSTNAME"
            echo "          Version:  $FPP_VERSION"
            FPP_URL="http://$FPP_IP:$FPP_PORT"
            break
        else
            # Check if it responds at all
            if curl -s -m 3 "http://$FPP_IP:$FPP_PORT/" > /dev/null 2>&1; then
                print_warning "Device responded but doesn't appear to be FPP"
                print_info "FPP should have /api/system/status and /api/fppd/status endpoints"
            else
                print_warning "Could not connect to http://$FPP_IP:$FPP_PORT"
            fi
            
            echo ""
            if confirm "Continue anyway? (You can update FPP_URL in .env.local later)"; then
                FPP_URL="http://$FPP_IP:$FPP_PORT"
                break
            fi
        fi
    done
fi

# ═══════════════════════════════════════════════════════════
# STEP 6: Core Configuration
# ═══════════════════════════════════════════════════════════
show_progress 6 "Core Configuration"

# Backup existing .env.local
if [ -f ".env.local" ]; then
    mv .env.local .env.local.backup-$(date +%Y%m%d_%H%M%S)
    print_info "Backed up existing .env.local"
fi

# Generate secret
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Admin Email
echo ""
print_header "Admin Email Configuration"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Enter the Google email(s) that will have admin access."
echo ""
echo "• This email MUST match the Google account you'll use to log in"
echo "• Multiple admins: separate with commas (no spaces)"
echo ""
echo -e "${GREEN}Examples:${NC}"
echo "  Single admin:   admin@gmail.com"
echo "  Multiple:       admin@gmail.com,helper@gmail.com"
echo ""

if [ "$REUSE_CONFIG" = true ] && [ -n "$EXISTING_ADMIN_EMAIL" ]; then
    read -p "Admin email(s) [$EXISTING_ADMIN_EMAIL]: " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-$EXISTING_ADMIN_EMAIL}
else
    read -p "Admin email(s): " ADMIN_EMAIL
fi

# Validate email format
IFS=',' read -ra EMAIL_ARRAY <<< "$ADMIN_EMAIL"
for email in "${EMAIL_ARRAY[@]}"; do
    email=$(echo "$email" | xargs)
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid email format: $email"
        exit 1
    fi
done
ADMIN_EMAIL=$(echo "$ADMIN_EMAIL" | tr -d ' ')
print_success "Admin email(s): $ADMIN_EMAIL"

# Google OAuth
echo ""
print_header "Google OAuth Setup"

SKIP_OAUTH=false
if [ "$REUSE_CONFIG" = true ] && [ -n "$EXISTING_GOOGLE_ID" ]; then
    print_info "Existing Google OAuth credentials found"
    if confirm "Keep existing Google OAuth credentials?"; then
        GOOGLE_CLIENT_ID="KEEP_EXISTING"
        GOOGLE_CLIENT_SECRET="KEEP_EXISTING"
    else
        if confirm "Do you have your Google OAuth credentials ready?"; then
            read -p "Google Client ID: " GOOGLE_CLIENT_ID
            read -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
            print_success "OAuth credentials configured"
        else
            print_warning "Skipping OAuth - configure later in .env.local"
            GOOGLE_CLIENT_ID="your-google-client-id"
            GOOGLE_CLIENT_SECRET="your-google-client-secret"
            SKIP_OAUTH=true
        fi
    fi
elif confirm "Do you have your Google OAuth credentials ready?"; then
    read -p "Google Client ID: " GOOGLE_CLIENT_ID
    read -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
    print_success "OAuth credentials configured"
else
    print_warning "Skipping OAuth - configure later in .env.local"
    GOOGLE_CLIENT_ID="your-google-client-id"
    GOOGLE_CLIENT_SECRET="your-google-client-secret"
    SKIP_OAUTH=true
fi

# Spotify API
echo ""
print_header "Spotify API Setup"
echo "Spotify API is REQUIRED for jukebox song metadata."
echo ""

SKIP_SPOTIFY=false
if [ "$REUSE_CONFIG" = true ] && [ -n "$EXISTING_SPOTIFY_ID" ]; then
    print_info "Existing Spotify credentials found"
    if confirm "Keep existing Spotify credentials?"; then
        SPOTIFY_CLIENT_ID="KEEP_EXISTING"
        SPOTIFY_CLIENT_SECRET="KEEP_EXISTING"
    else
        if confirm "Do you have your Spotify API credentials ready?"; then
            read -p "Spotify Client ID: " SPOTIFY_CLIENT_ID
            read -p "Spotify Client Secret: " SPOTIFY_CLIENT_SECRET
        else
            print_warning "Skipping Spotify - jukebox won't show metadata"
            SPOTIFY_CLIENT_ID="your-spotify-client-id"
            SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
            SKIP_SPOTIFY=true
        fi
    fi
elif confirm "Do you have your Spotify API credentials ready?"; then
    read -p "Spotify Client ID: " SPOTIFY_CLIENT_ID
    read -p "Spotify Client Secret: " SPOTIFY_CLIENT_SECRET
else
    print_warning "Skipping Spotify - jukebox won't show metadata"
    SPOTIFY_CLIENT_ID="your-spotify-client-id"
    SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
    SKIP_SPOTIFY=true
fi

# Timezone
echo ""
echo "Common US timezones:"
echo "  - America/New_York (Eastern)"
echo "  - America/Chicago (Central)"
echo "  - America/Denver (Mountain)"
echo "  - America/Los_Angeles (Pacific)"
echo ""

DEFAULT_TZ="America/Chicago"
if [ "$REUSE_CONFIG" = true ] && [ -n "$EXISTING_TIMEZONE" ]; then
    DEFAULT_TZ="$EXISTING_TIMEZONE"
fi
read -p "Enter your timezone [$DEFAULT_TZ]: " TIMEZONE
TIMEZONE=${TIMEZONE:-$DEFAULT_TZ}

# Access URL Configuration
echo ""
print_header "Access URL Configuration"

if [[ "$INSTALL_TYPE" == "public" ]]; then
    read -p "Enter your domain name (e.g., fpp.example.com): " DOMAIN
    NEXTAUTH_URL="https://$DOMAIN"
else
    echo "Choose your primary access method:"
    echo ""
    echo "1) Only from this server (localhost)"
    echo "2) From network devices (phones, tablets, etc.)"
    echo ""
    read -p "Enter choice (1 or 2) [2]: " ACCESS_CHOICE
    ACCESS_CHOICE=${ACCESS_CHOICE:-2}
    
    if [[ "$ACCESS_CHOICE" == "1" ]]; then
        NEXTAUTH_URL="http://localhost:3000"
    else
        SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -z "$SERVER_IP" ]; then
            SERVER_IP="YOUR_SERVER_IP"
        fi
        
        echo ""
        read -p "Server IP or domain [$SERVER_IP]: " ACCESS_DOMAIN
        ACCESS_DOMAIN=${ACCESS_DOMAIN:-$SERVER_IP}
        ACCESS_DOMAIN=$(echo "$ACCESS_DOMAIN" | sed -e 's|^https\?://||' -e 's|/$||')
        NEXTAUTH_URL="http://$ACCESS_DOMAIN:3000"
    fi
fi
print_success "Access URL: $NEXTAUTH_URL"

# ═══════════════════════════════════════════════════════════
# STEP 6b: Advanced Options (Full Setup Only)
# ═══════════════════════════════════════════════════════════
OLLAMA_URL="http://localhost:11434"
NEXT_PUBLIC_OLLAMA_URL="http://localhost:11434"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

if [ "$SETUP_MODE" == "2" ]; then
    echo ""
    print_header "Advanced Options"
    
    # Ollama Configuration
    if confirm "Configure Ollama for AI Santa letters?"; then
        read -p "Ollama server IP [localhost]: " OLLAMA_IP
        OLLAMA_IP=${OLLAMA_IP:-localhost}
        
        if [[ "$OLLAMA_IP" == "localhost" ]]; then
            OLLAMA_URL="http://localhost:11434"
        else
            OLLAMA_URL="http://$OLLAMA_IP:11434"
        fi
        NEXT_PUBLIC_OLLAMA_URL="$OLLAMA_URL"
        print_success "Ollama URL: $OLLAMA_URL"
    fi
    
    # SMTP Configuration
    echo ""
    if confirm "Configure email notifications (SMTP)?"; then
        read -p "SMTP Host [smtp.gmail.com]: " SMTP_HOST_INPUT
        SMTP_HOST=${SMTP_HOST_INPUT:-smtp.gmail.com}
        
        read -p "SMTP Port [587]: " SMTP_PORT_INPUT
        SMTP_PORT=${SMTP_PORT_INPUT:-587}
        
        if [[ "$SMTP_PORT" == "465" ]]; then
            SMTP_SECURE="true"
        else
            SMTP_SECURE="false"
        fi
        
        read -p "SMTP Email: " SMTP_USER
        read -s -p "SMTP Password: " SMTP_PASS
        echo ""
        SMTP_PASS="${SMTP_PASS// /}"
        
        print_success "SMTP configured: $SMTP_HOST:$SMTP_PORT"
    fi
fi

# ═══════════════════════════════════════════════════════════
# Create .env.local
# ═══════════════════════════════════════════════════════════
print_step "Creating configuration file..."

# Handle KEEP_EXISTING values
if [ "$GOOGLE_CLIENT_ID" == "KEEP_EXISTING" ]; then
    GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env.local.backup-* 2>/dev/null | tail -1 | cut -d'=' -f2)
    GOOGLE_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" .env.local.backup-* 2>/dev/null | tail -1 | cut -d'=' -f2)
fi

if [ "$SPOTIFY_CLIENT_ID" == "KEEP_EXISTING" ]; then
    SPOTIFY_CLIENT_ID=$(grep "^SPOTIFY_CLIENT_ID=" .env.local.backup-* 2>/dev/null | tail -1 | cut -d'=' -f2)
    SPOTIFY_CLIENT_SECRET=$(grep "^SPOTIFY_CLIENT_SECRET=" .env.local.backup-* 2>/dev/null | tail -1 | cut -d'=' -f2)
fi

cat > .env.local << 'ENV_FILE'
# NextAuth Configuration
NEXTAUTH_URL=PLACEHOLDER_NEXTAUTH_URL
NEXTAUTH_SECRET=PLACEHOLDER_NEXTAUTH_SECRET

# Google OAuth
GOOGLE_CLIENT_ID=PLACEHOLDER_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=PLACEHOLDER_GOOGLE_CLIENT_SECRET

# Admin Emails (comma-separated)
ADMIN_EMAILS=PLACEHOLDER_ADMIN_EMAIL

# FPP Server Configuration
FPP_URL=PLACEHOLDER_FPP_URL

# Spotify API
SPOTIFY_CLIENT_ID=PLACEHOLDER_SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=PLACEHOLDER_SPOTIFY_CLIENT_SECRET

# Ollama LLM Configuration
OLLAMA_URL=PLACEHOLDER_OLLAMA_URL
NEXT_PUBLIC_OLLAMA_URL=PLACEHOLDER_NEXT_PUBLIC_OLLAMA_URL

# Email Configuration (SMTP)
SMTP_HOST=PLACEHOLDER_SMTP_HOST
SMTP_PORT=PLACEHOLDER_SMTP_PORT
SMTP_SECURE=PLACEHOLDER_SMTP_SECURE
SMTP_USER=PLACEHOLDER_SMTP_USER
SMTP_PASS=PLACEHOLDER_SMTP_PASS

# Timezone Configuration
NEXT_PUBLIC_TIMEZONE=PLACEHOLDER_TIMEZONE
ENV_FILE

# Replace placeholders
sed -i.bak "s|PLACEHOLDER_NEXTAUTH_URL|$NEXTAUTH_URL|g" .env.local
sed -i.bak "s|PLACEHOLDER_NEXTAUTH_SECRET|$NEXTAUTH_SECRET|g" .env.local
sed -i.bak "s|PLACEHOLDER_GOOGLE_CLIENT_ID|$GOOGLE_CLIENT_ID|g" .env.local
sed -i.bak "s|PLACEHOLDER_GOOGLE_CLIENT_SECRET|$GOOGLE_CLIENT_SECRET|g" .env.local
sed -i.bak "s|PLACEHOLDER_ADMIN_EMAIL|$ADMIN_EMAIL|g" .env.local
sed -i.bak "s|PLACEHOLDER_FPP_URL|$FPP_URL|g" .env.local
sed -i.bak "s|PLACEHOLDER_SPOTIFY_CLIENT_ID|$SPOTIFY_CLIENT_ID|g" .env.local
sed -i.bak "s|PLACEHOLDER_SPOTIFY_CLIENT_SECRET|$SPOTIFY_CLIENT_SECRET|g" .env.local
sed -i.bak "s|PLACEHOLDER_OLLAMA_URL|$OLLAMA_URL|g" .env.local
sed -i.bak "s|PLACEHOLDER_NEXT_PUBLIC_OLLAMA_URL|$NEXT_PUBLIC_OLLAMA_URL|g" .env.local
sed -i.bak "s|PLACEHOLDER_SMTP_HOST|$SMTP_HOST|g" .env.local
sed -i.bak "s|PLACEHOLDER_SMTP_PORT|$SMTP_PORT|g" .env.local
sed -i.bak "s|PLACEHOLDER_SMTP_SECURE|$SMTP_SECURE|g" .env.local
sed -i.bak "s|PLACEHOLDER_SMTP_USER|$SMTP_USER|g" .env.local
sed -i.bak "s|PLACEHOLDER_SMTP_PASS|$SMTP_PASS|g" .env.local
sed -i.bak "s|PLACEHOLDER_TIMEZONE|$TIMEZONE|g" .env.local
rm -f .env.local.bak

print_success "Configuration file created"

# Show OAuth redirect URI if configured
if [ "$SKIP_OAUTH" = false ]; then
    echo ""
    print_header "⚠️  IMPORTANT: Update Google OAuth Settings"
    echo ""
    echo -e "${YELLOW}Add this redirect URI to your Google OAuth app:${NC}"
    echo ""
    echo -e "${GREEN}   $NEXTAUTH_URL/api/auth/callback/google${NC}"
    echo ""
    echo "Steps:"
    echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
    echo "  2. Click on your OAuth 2.0 Client ID"
    echo "  3. Add the URI above to 'Authorized redirect URIs'"
    echo "  4. Click 'Save'"
    echo ""
fi

# ═══════════════════════════════════════════════════════════
# STEP 7: Build Application
# ═══════════════════════════════════════════════════════════
show_progress 7 "Building Application"

if [ -d ".next" ]; then
    print_step "Cleaning previous build..."
    rm -rf .next
fi

print_step "Building Next.js application..."
print_info "This may take 1-2 minutes..."

if npm run build; then
    print_success "Application built successfully"
else
    if retry_or_skip "Build" true; then
        npm run build
    fi
fi

# ═══════════════════════════════════════════════════════════
# STEP 8: Start Application
# ═══════════════════════════════════════════════════════════
show_progress 8 "Starting Application"

# Cloudflare setup for public installations
if [[ "$INSTALL_TYPE" == "public" ]]; then
    echo ""
    if confirm "Set up Cloudflare Tunnel now?"; then
        if [ -f "./scripts/setup-cloudflare-tunnel.sh" ]; then
            bash ./scripts/setup-cloudflare-tunnel.sh
        else
            print_warning "Cloudflare setup script not found"
            print_info "Run later: bash scripts/setup-cloudflare-tunnel.sh"
        fi
    fi
fi

print_step "Stopping any existing instances..."
pm2 delete fpp-control 2>/dev/null || true
pm2 delete fpp-poller 2>/dev/null || true

print_step "Starting FPP Control Center services..."
pm2 start ecosystem.config.js
pm2 save

# Verify services
sleep 3
RUNNING=$(pm2 jlist 2>/dev/null | grep -c '"status":"online"' || echo "0")

if [ "$RUNNING" -ge 2 ]; then
    print_success "All services started successfully!"
else
    print_warning "Some services may not have started"
    print_info "Check logs: pm2 logs"
fi

# Setup auto-start
echo ""
print_step "Setting up auto-start on system boot..."
pm2 startup 2>/dev/null || true

# ═══════════════════════════════════════════════════════════
# SETUP COMPLETE
# ═══════════════════════════════════════════════════════════
clear
print_header "🎉 Setup Complete! 🎉"

echo -e "${GREEN}FPP Control Center is now running!${NC}"
echo ""

# Show access URLs
echo -e "${CYAN}📡 Access your control center:${NC}"
if [[ "$INSTALL_TYPE" == "local" ]]; then
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    echo "   • From this computer: http://localhost:3000"
    [ -n "$SERVER_IP" ] && echo "   • From other devices:  http://$SERVER_IP:3000"
else
    echo "   • Public URL: https://$DOMAIN"
fi

echo ""
echo -e "${CYAN}📋 Configuration Summary:${NC}"
echo "   • Admin Email: $ADMIN_EMAIL"
echo "   • FPP Server:  $FPP_URL"
echo "   • Access URL:  $NEXTAUTH_URL"
[ "$SKIP_OAUTH" = false ] && echo "   • Google OAuth: ✅ Configured"
[ "$SKIP_OAUTH" = true ] && echo "   • Google OAuth: ❌ Not configured"
[ "$SKIP_SPOTIFY" = false ] && echo "   • Spotify API:  ✅ Configured"
[ "$SKIP_SPOTIFY" = true ] && echo "   • Spotify API:  ❌ Not configured"

echo ""
echo -e "${CYAN}🔧 Useful Commands:${NC}"
echo "   • View logs:   pm2 logs fpp-control"
echo "   • Restart:     pm2 restart fpp-control"
echo "   • Status:      pm2 status"

if [ "$SKIP_OAUTH" = true ] || [ "$SKIP_SPOTIFY" = true ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Action Required:${NC}"
    [ "$SKIP_OAUTH" = true ] && echo "   • Configure Google OAuth in .env.local"
    [ "$SKIP_SPOTIFY" = true ] && echo "   • Configure Spotify API in .env.local"
    echo "   • Then run: pm2 restart fpp-control"
fi

echo ""
echo -e "${GREEN}Enjoy your Christmas light show! 🎄✨${NC}"
echo ""

if confirm "View application logs now?"; then
    pm2 logs fpp-control --lines 50
fi
