#!/bin/bash
# DevStack v3 - Rebuild Script
# Deletes existing VM and creates a new one with current .env configuration

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
echo "║              DevStack v3 - Rebuild VM                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

warning "This will DELETE the existing VM '${VM_NAME}' and create a new one."
warning "All data in the VM will be lost!"
echo ""

# Check if VM exists
if ! multipass list | grep -q "^${VM_NAME}"; then
    error "VM '${VM_NAME}' does not exist."
    info "Use './devstack setup' to create a new VM."
    exit 1
fi

# Ask about snapshot
info "Create automatic safety snapshot before rebuilding?"
echo "  Snapshot name: before-rebuild"
echo ""
read -p "Create snapshot? (Y/n): " -n 1 -r
echo
echo

CREATE_SNAPSHOT=true
if [[ $REPLY =~ ^[Nn]$ ]]; then
    CREATE_SNAPSHOT=false
    warning "Proceeding without snapshot - VM cannot be easily restored!"
    echo ""
fi

read -p "Are you sure you want to rebuild? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "Rebuild cancelled."
    exit 0
fi

echo ""

# Create snapshot if requested
if [ "$CREATE_SNAPSHOT" = true ]; then
    # Generate unique snapshot name with PID to avoid collisions
    SNAPSHOT_NAME="before-rebuild-$(date +%Y%m%d-%H%M%S)-$$"
    info "Creating snapshot: $SNAPSHOT_NAME"
    if multipass snapshot "$VM_NAME" --name "$SNAPSHOT_NAME" >/dev/null 2>&1; then
        success "Snapshot created: $SNAPSHOT_NAME"
        info "To restore: ./devstack snapshot restore $SNAPSHOT_NAME"
        echo ""
        info "Snapshot will be kept for manual cleanup"
        info "List snapshots: ./devstack snapshot list"
        info "Delete old snapshots: ./devstack snapshot delete <name>"
    else
        error "Failed to create snapshot"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Rebuild cancelled."
            exit 0
        fi
    fi
    echo ""
fi

info "Deleting existing VM..."
multipass delete "$VM_NAME"
multipass purge
success "VM deleted"

echo ""
info "Creating new VM with current .env configuration..."
./lib/setup.sh

success "Rebuild complete!"
