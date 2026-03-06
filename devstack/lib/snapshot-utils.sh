#!/bin/bash
# Snapshot Creation and Management Utilities

# Source required libraries if not already loaded
if ! declare -f error &>/dev/null; then
    _SNAPSHOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$_SNAPSHOT_DIR/output.sh"
fi

if ! declare -f confirm_yes &>/dev/null; then
    _SNAPSHOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$_SNAPSHOT_DIR/utils.sh"
fi

# Ask user if they want to create a safety snapshot
# Usage: ask_create_snapshot "operation-name"
# Returns: 0 if user wants snapshot, 1 if not
# Sets: CREATE_SNAPSHOT variable (true/false)
ask_create_snapshot() {
    local operation_name="$1"

    echo ""
    info "Create automatic safety snapshot before ${operation_name}?"
    echo "  Snapshot name: ${operation_name}"
    echo ""

    if confirm_yes "Create snapshot?"; then
        CREATE_SNAPSHOT=true
        return 0
    else
        CREATE_SNAPSHOT=false
        warning "Proceeding without snapshot - VM cannot be easily restored!"
        echo ""
        return 1
    fi
}

# Create a snapshot with error handling and user feedback
# Usage: create_snapshot "vm-name" "snapshot-name"
# Returns: 0 on success, asks user to continue on failure
create_snapshot() {
    local vm_name="$1"
    local snapshot_name="$2"

    info "Creating snapshot: $snapshot_name"

    if multipass snapshot "$vm_name" --name "$snapshot_name" >/dev/null 2>&1; then
        success "Snapshot created: $snapshot_name"
        info "To restore: ./devstack snapshot restore $snapshot_name"
        echo ""
        info "Snapshot will be kept for manual cleanup"
        info "List snapshots: ./devstack snapshot list"
        info "Delete old snapshots: ./devstack snapshot delete <name>"
        return 0
    else
        error "Failed to create snapshot"
        echo ""
        if confirm "Continue anyway?"; then
            return 0
        else
            info "Cancelled"
            exit 0
        fi
    fi
}

# Create a timestamped snapshot for destructive operations
# Usage: create_timestamped_snapshot "vm-name" "prefix"
# Returns: 0 on success, exits on user cancellation
# Example: create_timestamped_snapshot "devstack" "before-rebuild"
create_timestamped_snapshot() {
    local vm_name="$1"
    local prefix="$2"

    if ask_create_snapshot "$prefix"; then
        local snapshot_name="${prefix}-$(date +%Y%m%d-%H%M%S)-$$"
        create_snapshot "$vm_name" "$snapshot_name"
    fi
}

# Create a named snapshot with collision detection for version switches
# Usage: create_version_snapshot "vm-name" "target-version"
# Returns: 0 on success, exits on user cancellation
create_version_snapshot() {
    local vm_name="$1"
    local target_version="$2"

    # Create base snapshot name
    local base_snapshot_name="before-switch-to-$(echo "$target_version" | tr '/' '-')"
    local snapshot_name="$base_snapshot_name"

    # Check if snapshot already exists
    if multipass info "$vm_name" 2>/dev/null | grep -q "^$snapshot_name"; then
        # Add timestamp to avoid collision
        snapshot_name="${base_snapshot_name}-$(date +%Y%m%d-%H%M%S)"
        info "Snapshot '$base_snapshot_name' already exists"
        info "Using unique name: $snapshot_name"
        echo ""
    fi

    info "Create automatic safety snapshot before switching?"
    echo "  Snapshot name: $snapshot_name"
    echo ""

    if confirm_yes "Create snapshot?"; then
        create_snapshot "$vm_name" "$snapshot_name"
    else
        warning "Proceeding without snapshot - cannot easily revert version!"
        echo ""
    fi
}
