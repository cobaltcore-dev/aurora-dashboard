#!/bin/bash
# DevStack v3 - Rebuild Script
# Deletes existing VM and creates a new one with current .env configuration

set -e

# Get script directory and navigate to root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Source shared libraries
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/env-loader.sh"
source "$SCRIPT_DIR/utils.sh"
source "$SCRIPT_DIR/vm-check.sh"
source "$SCRIPT_DIR/snapshot-utils.sh"

# Load environment variables
load_env_strict
VM_NAME=${VM_NAME:-devstack}

print_header "DevStack v3 - Rebuild VM"

warning "This will DELETE the existing VM '${VM_NAME}' and create a new one."
warning "All data in the VM will be lost!"
echo ""

# Check if VM exists
require_vm_exists "$VM_NAME"

# Create snapshot if requested
create_timestamped_snapshot "$VM_NAME" "before-rebuild"

if ! confirm "Are you sure you want to rebuild?"; then
    info "Rebuild cancelled."
    exit 0
fi

echo ""

info "Deleting existing VM..."
multipass delete "$VM_NAME"
multipass purge
success "VM deleted"

echo ""
info "Creating new VM with current .env configuration..."
./lib/setup.sh

success "Rebuild complete!"
