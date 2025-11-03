#!/bin/bash

echo "📦 Installing Update Watcher Service"

# Make watcher executable
chmod +x "$(pwd)/scripts/update-watcher.sh"

# Create systemd service
sudo tee /etc/systemd/system/fpp-update-watcher.service > /dev/null <<EOF
[Unit]
Description=FPP Control Center Update Watcher
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/scripts/update-watcher.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable fpp-update-watcher
sudo systemctl start fpp-update-watcher

echo "✅ Update Watcher installed and running"
echo ""
echo "📊 Useful commands:"
echo "  Check status:  sudo systemctl status fpp-update-watcher"
echo "  View logs:     sudo journalctl -u fpp-update-watcher -f"
echo "  Restart:       sudo systemctl restart fpp-update-watcher"
echo "  Stop:          sudo systemctl stop fpp-update-watcher"
echo ""
echo "💡 The watcher checks for update requests every 30 seconds"
echo "   When you click 'Install Update' in the UI, the watcher will:"
echo "   1. Detect the signal file"
echo "   2. Run ./update.sh (which stops PM2 safely)"
echo "   3. Complete the update"
echo "   4. Restart the server"
