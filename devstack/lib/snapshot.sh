#!/bin/bash
# DevStack v3 - Snapshot Management Script

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

# Check if VM exists
if ! multipass list | grep -q "^${VM_NAME}"; then
    error "VM '${VM_NAME}' does not exist."
    exit 1
fi

ACTION=$1
SNAPSHOT_NAME=$2

case "$ACTION" in
    create)
        if [ -z "$SNAPSHOT_NAME" ]; then
            error "Snapshot name required."
            echo "Usage: ./devstack snapshot create <name>"
            exit 1
        fi

        info "Creating snapshot '${SNAPSHOT_NAME}'..."
        multipass snapshot "$VM_NAME" --name "$SNAPSHOT_NAME"
        success "Snapshot '${SNAPSHOT_NAME}' created"
        ;;

    restore)
        if [ -z "$SNAPSHOT_NAME" ]; then
            error "Snapshot name required."
            echo "Usage: ./devstack snapshot restore <name>"
            exit 1
        fi

        info "Restoring snapshot '${SNAPSHOT_NAME}'..."
        multipass restore "$VM_NAME" --snapshot "$SNAPSHOT_NAME"
        success "Snapshot '${SNAPSHOT_NAME}' restored"
        ;;

    list)
        info "Snapshots for VM '${VM_NAME}':"
        echo ""
        multipass info "$VM_NAME" | grep -A 100 "Snapshots:" || echo "No snapshots found"
        ;;

    delete)
        if [ -z "$SNAPSHOT_NAME" ]; then
            error "Snapshot name required."
            echo "Usage: ./devstack snapshot delete <name>"
            exit 1
        fi

        info "Deleting snapshot '${SNAPSHOT_NAME}'..."
        multipass delete "${VM_NAME}.${SNAPSHOT_NAME}"
        success "Snapshot '${SNAPSHOT_NAME}' deleted"
        ;;

    cleanup)
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║              Cleanup Automatic Snapshots                   ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        # List all automatic snapshots (created by system)
        AUTO_SNAPSHOTS=$(multipass info "$VM_NAME" 2>/dev/null | grep -E "^(before-switch|before-config|before-rebuild)" | awk '{print $1}' || true)

        if [ -z "$AUTO_SNAPSHOTS" ]; then
            info "No automatic snapshots found"
            echo ""
            info "Automatic snapshots are prefixed with:"
            echo "  - before-switch-to-*"
            echo "  - before-config-apply-*"
            echo "  - before-rebuild-*"
            exit 0
        fi

        echo "Found automatic snapshots:"
        echo ""
        echo "$AUTO_SNAPSHOTS" | while read snap; do
            echo "  • $snap"
        done
        echo ""

        SNAP_COUNT=$(echo "$AUTO_SNAPSHOTS" | wc -l)
        info "Total: $SNAP_COUNT automatic snapshots"
        echo ""

        read -p "Delete all automatic snapshots? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Cleanup cancelled"
            exit 0
        fi

        echo ""
        info "Deleting automatic snapshots..."
        echo ""

        DELETED=0
        echo "$AUTO_SNAPSHOTS" | while read snap; do
            if multipass delete "${VM_NAME}.${snap}" 2>/dev/null; then
                success "Deleted: $snap"
                ((DELETED++)) || true
            else
                error "Failed to delete: $snap"
            fi
        done

        echo ""
        success "Cleanup complete"
        ;;

    *)
        error "Unknown snapshot action: $ACTION"
        echo ""
        echo "Usage:"
        echo "  ./devstack snapshot create <name>   - Create a snapshot"
        echo "  ./devstack snapshot restore <name>  - Restore from snapshot"
        echo "  ./devstack snapshot list            - List all snapshots"
        echo "  ./devstack snapshot delete <name>   - Delete a snapshot"
        echo "  ./devstack snapshot cleanup         - Delete all automatic snapshots"
        exit 1
        ;;
esac
