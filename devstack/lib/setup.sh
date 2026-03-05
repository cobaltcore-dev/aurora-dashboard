#!/bin/bash
# DevStack v3 - Multipass VM Setup Script
# Creates and provisions a Multipass VM with DevStack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

success() {
    echo -e "${GREEN}✓ ${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠ ${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running under WSL2
check_wsl2() {
    if grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null; then
        return 0
    fi
    return 1
}

# Show WSL2 port forwarding reminder
show_wsl2_reminder() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              WSL2 Port Forwarding Required                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    warning "You are running under WSL2!"
    echo ""
    info "To access the DevStack services from Windows, you need to:"
    echo ""
    echo "  1. Start the port forwarding script:"
    echo "     ./scripts/wsl2-port-forward.sh"
    echo ""
    echo "  2. Or manually forward ports in PowerShell (as Administrator):"
    echo "     netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=<VM_IP>"
    echo ""
    info "Without port forwarding, you can only access DevStack from within WSL2."
    echo ""
}

# Load environment variables
if [ ! -f .env ]; then
    error ".env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

source .env

# Validate required variables
if [ -z "$VM_NAME" ] || [ -z "$VM_CPUS" ] || [ -z "$VM_MEMORY" ] || [ -z "$VM_DISK" ]; then
    error "Missing required VM configuration. Check your .env file."
    exit 1
fi

# Set default Ubuntu version if not specified
UBUNTU_VERSION=${UBUNTU_VERSION:-22.04}

# Check if multipass is installed
if ! command -v multipass &> /dev/null; then
    error "Multipass is not installed. Please install it first:"
    echo ""
    echo "  macOS:      brew install multipass"
    echo "  Linux/WSL2: sudo snap install multipass"
    echo "  Windows:    choco install multipass"
    echo ""
    echo "Or visit: https://multipass.run/install"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         DevStack v3 - Multipass VM Setup                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

info "Configuration:"
echo "  VM Name:       $VM_NAME"
echo "  CPUs:          $VM_CPUS"
echo "  Memory:        $VM_MEMORY"
echo "  Disk:          $VM_DISK"
echo "  Ubuntu:        $UBUNTU_VERSION"
echo "  DevStack:      $DEVSTACK_VERSION"
echo "  Horizon:       http://${PUBLIC_IP}:${HORIZON_PORT}/dashboard"
echo ""

# Check if VM already exists
if multipass list | grep -q "^${VM_NAME}"; then
    warning "VM '${VM_NAME}' already exists."
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Deleting existing VM..."
        multipass delete "$VM_NAME"
        multipass purge
        success "VM deleted"
    else
        info "Keeping existing VM. Use 'multipass start ${VM_NAME}' to start it."
        exit 0
    fi
fi

# Create cloud-init config
info "Generating cloud-init configuration..."
cat > cloud-init.yaml <<EOF
#cloud-config

# Update and upgrade packages
package_update: true
package_upgrade: true

# Install required packages
packages:
  - git
  - python3-pip
  - python3-dev
  - libffi-dev
  - gcc
  - libssl-dev
  - python3-openstackclient

# Create stack user
users:
  - name: stack
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    groups: sudo

# Write DevStack local.conf
write_files:
  - path: /tmp/devstack-env
    content: |
      DEVSTACK_VERSION=${DEVSTACK_VERSION}
      ADMIN_PASSWORD=${ADMIN_PASSWORD}
      DATABASE_PASSWORD=${DATABASE_PASSWORD}
      RABBIT_PASSWORD=${RABBIT_PASSWORD}
      SERVICE_PASSWORD=${SERVICE_PASSWORD}
      ENABLE_HORIZON=${ENABLE_HORIZON}
      DISABLE_TEMPEST=${DISABLE_TEMPEST}
      DISABLE_DSTAT=${DISABLE_DSTAT}
      ENABLE_SERVICES=${ENABLE_SERVICES}

# Run DevStack installation
runcmd:
  - echo "Starting DevStack setup..."
  - mkdir -p /opt/stack
  - chown -R stack:stack /opt/stack
  - su - stack -c 'git clone https://github.com/openstack/devstack.git /home/stack/devstack'
  - su - stack -c 'cd /home/stack/devstack && git checkout ${DEVSTACK_VERSION}'
  - echo "DevStack cloned and checked out to ${DEVSTACK_VERSION}"
EOF

success "Cloud-init configuration generated"

# Launch VM
info "Launching VM (this may take a few minutes)..."
multipass launch \
    --name "$VM_NAME" \
    --cpus "$VM_CPUS" \
    --memory "$VM_MEMORY" \
    --disk "$VM_DISK" \
    --cloud-init cloud-init.yaml \
    "$UBUNTU_VERSION"

success "VM created successfully"

# Wait for VM to be ready
info "Waiting for VM to be ready..."
sleep 10

# Copy scripts to VM
info "Copying setup scripts to VM..."
multipass transfer scripts/generate-local-conf.sh "${VM_NAME}:/tmp/"
multipass transfer scripts/install-devstack.sh "${VM_NAME}:/tmp/"

# Make scripts executable
multipass exec "$VM_NAME" -- chmod +x /tmp/generate-local-conf.sh
multipass exec "$VM_NAME" -- chmod +x /tmp/install-devstack.sh

# Generate local.conf
info "Generating DevStack local.conf..."
multipass exec "$VM_NAME" -- sudo -u stack /tmp/generate-local-conf.sh

# Get VM IP
VM_IP=$(multipass info "$VM_NAME" | grep IPv4 | awk '{print $2}')
success "VM IP: $VM_IP"

echo ""
info "Starting DevStack installation in background..."
info "This will take approximately 15-20 minutes."
echo ""

# Start DevStack installation
multipass exec "$VM_NAME" -- sudo -u stack /tmp/install-devstack.sh > devstack-install.log 2>&1 &
INSTALL_PID=$!

success "DevStack installation started (PID: $INSTALL_PID)"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  DevStack installation is running in the background        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Monitor progress:"
echo "  tail -f devstack-install.log"
echo "  multipass exec $VM_NAME -- tail -f /opt/stack/logs/stack.sh.log"
echo ""
info "Check VM status:"
echo "  multipass info $VM_NAME"
echo ""
info "Shell into VM:"
echo "  multipass shell $VM_NAME"
echo ""
info "Access services (after installation completes):"
echo "  VM IP: http://${VM_IP}"
echo "  Horizon Dashboard: http://${VM_IP}/dashboard"
echo "  Username: admin"
echo "  Password: ${ADMIN_PASSWORD}"
echo ""

# Show WSL2 reminder if applicable
if check_wsl2; then
    show_wsl2_reminder
fi

success "Setup complete! Waiting for DevStack installation to finish..."
