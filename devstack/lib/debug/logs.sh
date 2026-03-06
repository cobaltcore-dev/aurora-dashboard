#!/bin/bash
# Debug Module: Logs

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared libraries
source "$SCRIPT_DIR/../output.sh"

# This module will be sourced by lib/debug.sh
# VM_NAME is available from parent

debug_logs() {
    local service="$1"

    echo -e "${CYAN}=== DevStack Service Logs ===${NC}"
    echo ""

    info "Tailing logs for service: $service"
    echo ""

    local units=$(get_service_units "$service")
    local unit_count=$(echo "$units" | wc -w)

    if [ $unit_count -eq 1 ]; then
        # Single unit - direct tail
        info "Following logs for: devstack@${units}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""
        multipass exec "$VM_NAME" -- journalctl -u "devstack@${units}.service" -f --no-pager
    else
        # Multiple units - show choice or follow all
        echo -e "${CYAN}Service '$service' has multiple units:${NC}"
        local i=1
        for unit in $units; do
            echo "  $i) devstack@${unit}"
            i=$((i+1))
        done
        echo "  a) All units (multiplexed)"
        echo ""

        # In non-interactive mode, follow all
        info "Following logs for all units (multiplexed)"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""

        # Create a combined journalctl command for all units
        local journalctl_cmd="journalctl -f --no-pager"
        for unit in $units; do
            journalctl_cmd="$journalctl_cmd -u devstack@${unit}.service"
        done

        multipass exec "$VM_NAME" -- bash -c "$journalctl_cmd"
    fi
}
