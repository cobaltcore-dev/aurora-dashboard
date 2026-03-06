#!/bin/bash
# DevStack v3 - Snapshot Management Script

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

# Check if VM exists
require_vm_exists "$VM_NAME"

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
        print_header "Cleanup Automatic Snapshots"

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

        if ! confirm "Delete all automatic snapshots?"; then
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
