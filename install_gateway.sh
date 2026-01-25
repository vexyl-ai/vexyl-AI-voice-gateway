#!/bin/bash

# Vexyl Gateway Installation Script
# Installs Vexyl Gateway with Node.js and PM2 on Ubuntu/Debian

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Prerequisites Check
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root. Please use sudo."
   exit 1
fi

log_info "Starting Vexyl Gateway Installation..."


# 2. Confirmation
echo -e "\n${BLUE}This script will perform the following actions:${NC}"
echo "1. Install system dependencies (curl, unzip)"
echo "2. Install Node.js v20 (if not present)"
echo "3. Install PM2 process manager"
echo "4. Create directory /opt/vexyl"
echo "5. Download and install Vexyl Gateway"
echo "6. Configure system service"

read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Installation cancelled by user."
    exit 1
fi

# 3. Dependency Installation
log_info "Step 1/5: Checking and installing dependencies..."

# Install curl and unzip if missing
if ! command -v curl &> /dev/null || ! command -v unzip &> /dev/null; then
    log_info "Installing base dependencies (curl, unzip)..."
    apt-get update
    apt-get install -y curl unzip
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    log_info "Node.js not found. Installing Node.js v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node -v)
    log_info "Node.js is already installed: $NODE_VERSION"
fi

# Check for PM2
if ! command -v pm2 &> /dev/null; then
    log_info "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
else
    log_info "PM2 is already installed."
fi

# 4. Directory Setup
INSTALL_DIR="/opt/vexyl"
log_info "Step 2/5: Setting up installation directory..."

if [ -d "$INSTALL_DIR" ]; then
    log_info "Installation directory $INSTALL_DIR already exists."
else
    log_info "Creating directory $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# 5. Download & Extract
DOWNLOAD_URL="https://vexyl.ai/downloads/vexyl-gateway.zip"
ZIP_FILE="vexyl-gateway.zip"

log_info "Step 3/5: Downloading Vexyl Gateway..."
log_info "Source: $DOWNLOAD_URL"
curl -L -o "$ZIP_FILE" "$DOWNLOAD_URL"

log_info "Extracting files..."
unzip -o "$ZIP_FILE"
rm "$ZIP_FILE"

# Handle potential nested directory structure (common in zips)
if [ -d "vexyl-gateway" ]; then
    log_info "Adjusting directory structure..."
    mv vexyl-gateway/* .
    mv vexyl-gateway/.* . 2>/dev/null || true
    rmdir vexyl-gateway
fi

log_info "Making binary executable..."
chmod +x vexyl-gateway

# 6. Configuration
log_info "Step 4/5: Configuring environment..."
if [ ! -f ".env" ]; then
    log_info "Creating default .env configuration..."
    if [ -f ".env-example" ]; then
        cp .env-example .env
    else
        touch .env
        echo "HTTP_PORT=8081" >> .env
        echo "AUDIOSOCKET_PORT=8080" >> .env
        # WEBSOCKET ports will be handled below based on user input
    fi
    log_success "Created .env file."
else
    log_info ".env configuration already exists. Skipping creation."
fi

# Optional: WebSocket Audio Configuration
echo
read -p "Do you want to enable the Browser WebSocket Audio Server? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Enabling WebSocket Audio Server..."
    
    # Check if lines exist, if so replace, else append
    if grep -q "WEBSOCKET_AUDIO_ENABLED" .env; then
        sed -i 's/^WEBSOCKET_AUDIO_ENABLED=.*/WEBSOCKET_AUDIO_ENABLED=true/' .env
    else
        echo "WEBSOCKET_AUDIO_ENABLED=true" >> .env
    fi

    if grep -q "WEBSOCKET_AUDIO_PORT" .env; then
        sed -i 's/^WEBSOCKET_AUDIO_PORT=.*/WEBSOCKET_AUDIO_PORT=8082/' .env
    else
        echo "WEBSOCKET_AUDIO_PORT=8082" >> .env
    fi

    if grep -q "WEBSOCKET_AUDIO_HOST" .env; then
        sed -i 's/^WEBSOCKET_AUDIO_HOST=.*/WEBSOCKET_AUDIO_HOST=0.0.0.0/' .env
    else
        echo "WEBSOCKET_AUDIO_HOST=0.0.0.0" >> .env
    fi

    # Add the extra alias port requested
    if grep -q "WEBSOCKET_PORT" .env; then
        sed -i 's/^WEBSOCKET_PORT=.*/WEBSOCKET_PORT=8082/' .env
    else
        echo "WEBSOCKET_PORT=8082" >> .env
    fi
else
    log_info "Disabling WebSocket Audio Server..."
    if grep -q "WEBSOCKET_AUDIO_ENABLED" .env; then
        sed -i 's/^WEBSOCKET_AUDIO_ENABLED=.*/WEBSOCKET_AUDIO_ENABLED=false/' .env
    else
        echo "WEBSOCKET_AUDIO_ENABLED=false" >> .env
    fi
fi

# Create PM2 Ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'vexyl-gateway',
    script: './vexyl-gateway',
    cwd: '/opt/vexyl',
    interpreter: 'none', // Important for binaries
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF
log_info "Created ecosystem.config.js"

# 7. Service Startup
log_info "Step 5/5: Starting service..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | awk '/sudo/ { print $0 }' | bash || true

log_success "Vexyl Gateway installation completed successfully!"


echo -e "\n${BLUE}====================================================${NC}"
echo -e "${BLUE}              POST-INSTALLATION STEPS               ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo "1. Configure your API keys:"
echo "   Edit the configuration file: sudo nano /opt/vexyl/.env"
echo "   Refer to '03-configuration.md' in the documentation for details."
echo ""
echo "2. Apply changes:"
echo "   Restart the service: pm2 restart vexyl-gateway"
echo ""
echo "3. Verify installation:"
echo "   Run: curl http://localhost:8081/health"
echo "   View logs: pm2 logs vexyl-gateway"
echo -e "${BLUE}====================================================${NC}"

