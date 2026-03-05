#!/bin/bash
# DevStack v3 - Update Config Script
# Updates DevStack configuration without rebuilding the VM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Load environment variables
if [ ! -f .env ]; then
    error ".env file not found."
    exit 1
fi

source .env
VM_NAME=${VM_NAME:-devstack}

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          DevStack v3 - Update Configuration               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if VM exists and is running
if ! multipass list | grep -q "^${VM_NAME}.*Running"; then
    error "VM '${VM_NAME}' is not running."
    info "Start it with: ./devstack.sh start"
    exit 1
fi

info "This will:"
echo "  1. Update /tmp/devstack-env in VM with new .env values"
echo "  2. Regenerate local.conf"
echo "  3. Restart DevStack (unstack.sh && stack.sh)"
echo ""
warning "This will restart all OpenStack services (~10-15 minutes)"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "Update cancelled."
    exit 0
fi

echo ""
info "Updating environment variables in VM..."

# Create new devstack-env file
cat > /tmp/devstack-env-new <<EOF
DEVSTACK_VERSION=${DEVSTACK_VERSION}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
DATABASE_PASSWORD=${DATABASE_PASSWORD}
RABBIT_PASSWORD=${RABBIT_PASSWORD}
SERVICE_PASSWORD=${SERVICE_PASSWORD}
ENABLE_HORIZON=${ENABLE_HORIZON}
DISABLE_TEMPEST=${DISABLE_TEMPEST}
DISABLE_DSTAT=${DISABLE_DSTAT}
ENABLE_SERVICES=${ENABLE_SERVICES}
EOF

# Transfer to VM
multipass transfer /tmp/devstack-env-new "${VM_NAME}:/tmp/devstack-env"
rm /tmp/devstack-env-new

success "Environment variables updated"

info "Regenerating local.conf..."
multipass exec "$VM_NAME" -- sudo -u stack /tmp/generate-local-conf.sh
success "local.conf regenerated"

echo ""
info "Restarting DevStack..."
info "This will take approximately 10-15 minutes..."
echo ""

# Run unstack and stack in background, log to file
multipass exec "$VM_NAME" -- bash -c "cd /home/stack/devstack && ./unstack.sh && ./stack.sh" > devstack-update.log 2>&1 &
UPDATE_PID=$!

success "DevStack restart started (PID: $UPDATE_PID)"
echo ""
info "Monitor progress:"
echo "  tail -f devstack-update.log"
echo "  multipass exec $VM_NAME -- tail -f /opt/stack/logs/stack.sh.log"
echo ""
info "Check status when done:"
echo "  ./devstack.sh status"
echo ""
