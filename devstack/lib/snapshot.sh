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
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
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
            echo "Usage: ./devstack.sh snapshot create <name>"
            exit 1
        fi

        info "Creating snapshot '${SNAPSHOT_NAME}'..."
        multipass snapshot "$VM_NAME" --name "$SNAPSHOT_NAME"
        success "Snapshot '${SNAPSHOT_NAME}' created"
        ;;

    restore)
        if [ -z "$SNAPSHOT_NAME" ]; then
            error "Snapshot name required."
            echo "Usage: ./devstack.sh snapshot restore <name>"
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
            echo "Usage: ./devstack.sh snapshot delete <name>"
            exit 1
        fi

        info "Deleting snapshot '${SNAPSHOT_NAME}'..."
        multipass delete "${VM_NAME}.${SNAPSHOT_NAME}"
        success "Snapshot '${SNAPSHOT_NAME}' deleted"
        ;;

    *)
        error "Unknown snapshot action: $ACTION"
        echo ""
        echo "Usage:"
        echo "  ./devstack.sh snapshot create <name>   - Create a snapshot"
        echo "  ./devstack.sh snapshot restore <name>  - Restore from snapshot"
        echo "  ./devstack.sh snapshot list            - List all snapshots"
        echo "  ./devstack.sh snapshot delete <name>   - Delete a snapshot"
        exit 1
        ;;
esac
