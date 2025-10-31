#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

clear
print_header "☁️  Cloudflare Tunnel Setup"

echo "This wizard will set up Cloudflare Tunnel to provide secure,"
echo "public HTTPS access to your FPP Control Center without"
echo "opening ports on your router."
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    print_step "Installing Cloudflare Tunnel (cloudflared)..."
    
    # Detect OS and install
    if [[ -f /etc/debian_version ]]; then
        # Debian/Ubuntu
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [[ -f /etc/redhat-release ]]; then
        # RHEL/CentOS/Fedora
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
        sudo rpm -i cloudflared-linux-x86_64.rpm
        rm cloudflared-linux-x86_64.rpm
    else
        print_error "Unsupported Linux distribution"
        echo "Please install cloudflared manually from:"
        echo "https://github.com/cloudflare/cloudflared"
        exit 1
    fi
    
    print_success "Cloudflared installed"
else
    print_success "Cloudflared already installed"
fi

# Check for existing tunnel
if [ -d "$HOME/.cloudflared" ] && [ -f "$HOME/.cloudflared/cert.pem" ]; then
    print_warning "Existing Cloudflare authentication found"
    if confirm "Use existing authentication?"; then
        print_info "Using existing Cloudflare account"
    else
        print_info "Removing old authentication..."
        rm -rf "$HOME/.cloudflared"
    fi
fi

# Authenticate with Cloudflare
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    print_header "Step 1: Authenticate with Cloudflare"
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}║  IMPORTANT: Authentication URL Coming Up!                ║${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}║  Since you're on a server without a web browser:         ║${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}║  1. Copy the URL that appears below                      ║${NC}"
    echo -e "${CYAN}║  2. Paste it into a browser on ANY device                ║${NC}"
    echo -e "${CYAN}║     (your phone, laptop, etc.)                            ║${NC}"
    echo -e "${CYAN}║  3. Log in to Cloudflare (or create free account)        ║${NC}"
    echo -e "${CYAN}║  4. Authorize the connection                              ║${NC}"
    echo -e "${CYAN}║  5. Come back here - setup will continue automatically   ║${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    read -p "Press Enter to generate your authentication URL..."
    echo ""
    
    print_info "Generating authentication URL..."
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Run cloudflared login and capture output
    cloudflared tunnel login 2>&1 | while IFS= read -r line; do
        # Highlight the URL
        if [[ $line == *"https://"* ]]; then
            echo -e "${YELLOW}👉 COPY THIS URL:${NC}"
            echo -e "${GREEN}$line${NC}"
            echo ""
            echo -e "${CYAN}📱 Open this URL on your phone, laptop, or any device with a browser${NC}"
        else
            echo "$line"
        fi
    done
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Wait for authentication to complete
    print_info "Waiting for you to complete authentication in your browser..."
    
    # Check if cert.pem was created (with timeout)
    TIMEOUT=300  # 5 minutes
    ELAPSED=0
    while [ ! -f "$HOME/.cloudflared/cert.pem" ] && [ $ELAPSED -lt $TIMEOUT ]; do
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        echo -n "."
    done
    echo ""
    
    if [ -f "$HOME/.cloudflared/cert.pem" ]; then
        print_success "Authentication successful!"
    else
        print_error "Authentication timed out or failed"
        echo ""
        echo "Please try again or visit:"
        echo "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/"
        exit 1
    fi
fi

# Get domain name
print_header "Step 2: Configure Your Domain"

echo "Enter the domain you want to use for your FPP Control Center."
echo ""
echo "Examples:"
echo "  • lights.yourdomain.com"
echo "  • fpp.yourdomain.com"
echo "  • christmas.yourdomain.com"
echo ""
echo -e "${YELLOW}Note: Domain must already exist in your Cloudflare account${NC}"
echo ""

while true; do
    read -p "Enter your domain: " DOMAIN
    if [[ $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        break
    else
        print_error "Invalid domain format. Please try again."
    fi
done

# Create tunnel
print_header "Step 3: Creating Tunnel"

TUNNEL_NAME="fpp-control-$(date +%s)"

print_step "Creating tunnel: $TUNNEL_NAME"
cloudflared tunnel create $TUNNEL_NAME

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    print_error "Failed to create tunnel"
    exit 1
fi

print_success "Tunnel created: $TUNNEL_ID"

# Create config file
print_step "Creating tunnel configuration..."

mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:3000
  - service: http_status:404
EOF

print_success "Configuration created"

# Create DNS record
print_header "Step 4: Configuring DNS"

print_info "Setting up DNS record for $DOMAIN..."

# Try to create DNS route, but don't fail if it already exists
if cloudflared tunnel route dns $TUNNEL_NAME $DOMAIN 2>&1 | grep -q "record.*already exists"; then
    print_warning "DNS record already exists - skipping creation"
    print_info "Existing DNS record will be used"
elif cloudflared tunnel route dns $TUNNEL_NAME $DOMAIN; then
    print_success "DNS record created"
else
    print_warning "DNS routing encountered an issue"
    echo ""
    echo "You may need to configure DNS manually in Cloudflare dashboard:"
    echo "  1. Go to your domain in Cloudflare"
    echo "  2. DNS → Add record"
    echo "  3. Type: CNAME"
    echo "  4. Name: $(echo $DOMAIN | cut -d. -f1)"
    echo "  5. Target: $TUNNEL_ID.cfargotunnel.com"
    echo "  6. Proxy status: Proxied (orange cloud)"
    echo ""
    if ! confirm "Continue anyway?"; then
        exit 1
    fi
fi

# Update .env.local
print_header "Step 5: Updating Environment Configuration"

if [ -f ".env.local" ]; then
    # Backup existing .env.local
    cp .env.local .env.local.backup-$(date +%Y%m%d_%H%M%S)
    
    # Update NEXTAUTH_URL
    if grep -q "NEXTAUTH_URL=" .env.local; then
        sed -i.bak "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" .env.local
        rm -f .env.local.bak
        print_success "Updated NEXTAUTH_URL to https://$DOMAIN"
    else
        echo "NEXTAUTH_URL=https://$DOMAIN" >> .env.local
        print_success "Added NEXTAUTH_URL to .env.local"
    fi
else
    print_warning ".env.local not found - you'll need to set NEXTAUTH_URL=https://$DOMAIN manually"
fi

# Install as service
print_header "Step 6: Installing Tunnel Service"

print_step "Installing cloudflared as a system service..."

# Install service with explicit config path
sudo cloudflared --config ~/.cloudflared/config.yml service install

print_success "Service installed"

# Start the tunnel
print_step "Starting tunnel..."

sudo systemctl start cloudflared
sudo systemctl enable cloudflared

print_success "Tunnel started and enabled"

# Final instructions
clear
print_header "🎉 Cloudflare Tunnel Setup Complete!"

echo ""
echo -e "${GREEN}Your FPP Control Center is now accessible at:${NC}"
echo ""
echo -e "    ${CYAN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Update Google OAuth${NC}"
echo ""
echo "You need to add this redirect URI to your Google OAuth app:"
echo ""
echo -e "    ${CYAN}https://$DOMAIN/api/auth/callback/google${NC}"
echo ""
echo "Steps:"
echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
echo "  2. Select your OAuth 2.0 Client ID"
echo "  3. Add the redirect URI above to 'Authorized redirect URIs'"
echo "  4. Save changes"
echo ""
echo -e "${CYAN}� Useful Commands:${NC}"
echo ""
echo "  • Check status:    sudo systemctl status cloudflared"
echo "  • View logs:       sudo journalctl -u cloudflared -f"
echo "  • Restart tunnel:  sudo systemctl restart cloudflared"
echo "  • Stop tunnel:     sudo systemctl stop cloudflared"
echo ""
echo -e "${CYAN}📊 Tunnel Details:${NC}"
echo ""
echo "  • Tunnel ID:   $TUNNEL_ID"
echo "  • Tunnel Name: $TUNNEL_NAME"
echo "  • Domain:      $DOMAIN"
echo "  • Local Port:  3000"
echo ""

# Smart application restart
echo ""
print_header "Application Restart"

if command -v pm2 &> /dev/null; then
    # Check if PM2 has fpp-control process
    if pm2 list | grep -q "fpp-control"; then
        # Process exists, ask to restart
        if confirm "Restart FPP Control Center now to apply changes?"; then
            pm2 restart fpp-control
            print_success "Application restarted"
            echo ""
            print_info "Application is running with PM2"
            echo "  • View status: pm2 status"
            echo "  • View logs:   pm2 logs fpp-control"
        fi
    else
        # Process doesn't exist in PM2
        print_warning "FPP Control Center is not running in PM2"
        echo ""
        echo "To start your application with PM2:"
        echo ""
        echo -e "  ${CYAN}cd $(pwd)${NC}"
        echo -e "  ${CYAN}npm run build${NC}"
        echo -e "  ${CYAN}pm2 start npm --name fpp-control -- start${NC}"
        echo -e "  ${CYAN}pm2 save${NC}"
        echo ""
        
        if confirm "Would you like to start it now?"; then
            print_step "Building application..."
            npm run build
            
            print_step "Starting with PM2..."
            pm2 start npm --name fpp-control -- start
            pm2 save
            
            print_success "Application started with PM2"
        fi
    fi
else
    # PM2 not installed
    print_warning "PM2 is not installed"
    echo ""
    
    # Check if node/npm process is running on port 3000
    if lsof -i:3000 &> /dev/null; then
        print_info "Application appears to be running on port 3000"
        echo ""
        echo "Please restart your application manually to apply changes:"
        echo "  • Stop current process (Ctrl+C in terminal)"
        echo "  • Run: npm run build"
        echo "  • Run: npm start"
    else
        print_warning "Application is not running"
        echo ""
        echo "To start your application:"
        echo ""
        echo -e "  ${CYAN}cd $(pwd)${NC}"
        echo -e "  ${CYAN}npm run build${NC}"
        echo -e "  ${CYAN}npm start${NC}"
        echo ""
        
        if confirm "Would you like to build and get start command?"; then
            print_step "Building application..."
            npm run build
            
            print_success "Build complete!"
            echo ""
            echo "Start your application with:"
            echo -e "  ${CYAN}npm start${NC}"
            echo ""
            echo "Or for production with PM2 (recommended):"
            echo -e "  ${CYAN}sudo npm install -g pm2${NC}"
            echo -e "  ${CYAN}pm2 start npm --name fpp-control -- start${NC}"
            echo -e "  ${CYAN}pm2 save${NC}"
        fi
    fi
fi

echo ""
print_success "Setup complete! Your site should be live at https://$DOMAIN in a few moments."
echo ""
