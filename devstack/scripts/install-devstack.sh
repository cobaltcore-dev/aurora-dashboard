#!/bin/bash
# Install DevStack in the VM
# This script runs as the stack user

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       🚀 DevStack Installation - Educational Mode          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${CYAN}This script will guide you through the DevStack installation"
echo -e "process, explaining each step so you understand how OpenStack works.${NC}"
echo ""

# Check if already installed
if [ -f /opt/stack/.devstack-installed ]; then
    echo -e "${YELLOW}⚠ DevStack already installed${NC}"
    echo ""
    echo "To reinstall, run:"
    echo "  cd /home/stack/devstack && ./unstack.sh && ./clean.sh"
    echo "  rm /opt/stack/.devstack-installed"
    echo "  /tmp/install-devstack.sh"
    exit 0
fi

# Move to devstack directory
cd /home/stack/devstack

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Phase 1: System Preparation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🔍 What's happening:"
echo "  • Checking system requirements"
echo "  • Validating local.conf configuration"
echo "  • Preparing log directories"
echo ""

# Create log directory
sudo mkdir -p /opt/stack/logs
sudo chown -R stack:stack /opt/stack/logs

echo -e "${GREEN}✓ System preparation complete${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Phase 2: OpenStack Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📦 DevStack will now install the following components:"
echo ""
echo "  1. 🔐 Keystone (Identity Service)"
echo "     └─ Provides authentication and service catalog"
echo ""
echo "  2. 🖼️  Glance (Image Service)"
echo "     └─ Manages virtual machine images"
echo ""
echo "  3. 🔌 Neutron (Networking Service)"
echo "     └─ Provides network connectivity with OpenVSwitch"
echo ""
echo "  4. 💻 Nova (Compute Service)"
echo "     └─ Manages virtual machine lifecycle"
echo ""
echo "  5. 📍 Placement (Resource Placement)"
echo "     └─ Tracks resource inventory and usage"
echo ""
echo "  6. 🌐 Horizon (Dashboard) [if enabled]"
echo "     └─ Web-based management interface"
echo ""
echo -e "${YELLOW}⏱️  This will take approximately 15-20 minutes...${NC}"
echo ""
echo "The installation log will be available at:"
echo "  /opt/stack/logs/stack.sh.log"
echo ""

# ASCII Art for installation
cat << "EOF"
     ┌────────────────────────────────────────┐
     │  Installing OpenStack Components...   │
     │                                        │
     │  ┌──────────────────────────────────┐ │
     │  │ Keystone ██████████████░░░░░░░░ │ │
     │  │ Glance   ████████░░░░░░░░░░░░░░ │ │
     │  │ Neutron  ███░░░░░░░░░░░░░░░░░░░ │ │
     │  │ Nova     ░░░░░░░░░░░░░░░░░░░░░░ │ │
     │  │ Horizon  ░░░░░░░░░░░░░░░░░░░░░░ │ │
     │  └──────────────────────────────────┘ │
     └────────────────────────────────────────┘
EOF

echo ""
echo -e "${CYAN}Starting stack.sh...${NC}"
echo ""

# Run stack.sh
./stack.sh

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Phase 3: Post-Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Mark as installed
sudo touch /opt/stack/.devstack-installed

# Get VM IP
VM_IP=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}✅ DevStack installation complete!${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              🎉 Installation Successful!                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Access Information:"
echo ""
echo "  🌐 Horizon Dashboard:"
echo "     └─ http://${VM_IP}/dashboard"
echo ""
echo "  🔐 Credentials:"
echo "     └─ Username: admin"
echo "     └─ Password: \${ADMIN_PASSWORD}"
echo ""
echo "  🔧 API Endpoints:"
echo "     ├─ Identity (Keystone): http://${VM_IP}/identity"
echo "     ├─ Compute (Nova):      http://${VM_IP}:8774"
echo "     ├─ Image (Glance):      http://${VM_IP}:9292"
echo "     └─ Network (Neutron):   http://${VM_IP}:9696"
echo ""
echo "  📝 OpenStack CLI:"
echo "     └─ source /home/stack/devstack/openrc admin admin"
echo "     └─ openstack service list"
echo ""
echo "  📋 Logs:"
echo "     └─ /opt/stack/logs/"
echo ""
echo "  🔄 Service Management:"
echo "     └─ Restart: ./unstack.sh && ./stack.sh"
echo "     └─ Status:  systemctl status 'devstack@*'"
echo ""
echo -e "${CYAN}🎓 What you've learned:${NC}"
echo ""
echo "  • OpenStack consists of multiple independent services"
echo "  • Each service has a specific role (identity, compute, networking, etc.)"
echo "  • Services communicate via REST APIs"
echo "  • Keystone provides authentication for all services"
echo "  • Neutron uses OpenVSwitch for virtual networking"
echo "  • All services are managed by systemd"
echo ""
echo -e "${GREEN}Happy OpenStack Development! 🚀${NC}"
echo ""
