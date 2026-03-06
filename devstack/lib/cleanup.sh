#!/bin/bash
# Cleanup script - destroys the DevStack VM

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared libraries
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/utils.sh"

VM_NAME=${1:-devstack}

warning "WARNING: This will delete the VM: $VM_NAME"
echo ""

if ! confirm "Are you sure?"; then
    echo "Cancelled."
    exit 0
fi

info "Deleting VM: $VM_NAME"
multipass delete "$VM_NAME"
multipass purge

success "VM deleted and purged"
echo ""
echo "To recreate, run: ./setup.sh"
