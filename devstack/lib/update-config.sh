#!/bin/bash
# DevStack v3 - Update Config Script
# Updates DevStack configuration without rebuilding the VM

set -e

# Get script directory and navigate to root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Source shared libraries
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/env-loader.sh"
source "$SCRIPT_DIR/utils.sh"
source "$SCRIPT_DIR/vm-check.sh"

# Load environment variables
load_env_strict
VM_NAME=${VM_NAME:-devstack}

print_header "DevStack v3 - Update Configuration"

# Check if VM exists and is running
require_vm_running "$VM_NAME"

info "This will:"
echo "  1. Update /tmp/devstack-env in VM with new .env values"
echo "  2. Regenerate local.conf"
echo "  3. Restart DevStack (unstack.sh && stack.sh)"
echo ""
warning "This will restart all OpenStack services (~10-15 minutes)"
echo ""

if ! confirm "Continue?"; then
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
echo "  ./devstack status"
echo ""
