#!/bin/bash
set -e

# Get script directory and change to parent
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Source VM check functions
source "$SCRIPT_DIR/vm-check.sh"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
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
    echo -e "${RED}✗${NC} $1" >&2
}

# Load environment
if [ -f .env ]; then
    source .env
fi

VM_NAME="${VM_NAME:-devstack-vm}"

# Get list of all devstack services
get_devstack_services() {
    multipass exec "$VM_NAME" -- bash -c "systemctl list-units 'devstack@*' --all --no-pager --no-legend | awk '{print \$1}' | sed 's/devstack@//;s/\.service//'" 2>/dev/null || true
}

# Map service name to systemd units
get_service_units() {
    local service="$1"
    case "$service" in
        nova)
            echo "n-api n-cond n-sch n-cpu"
            ;;
        neutron)
            echo "q-svc q-agt q-dhcp q-l3 q-meta"
            ;;
        glance)
            echo "g-api"
            ;;
        cinder)
            echo "c-api c-sch c-vol"
            ;;
        keystone)
            echo "keystone"
            ;;
        placement)
            echo "placement-api"
            ;;
        horizon)
            echo "horizon"
            ;;
        *)
            # Try to auto-detect if service exists
            local units=$(get_devstack_services | grep -iF "${service}" || true)
            if [ -n "$units" ]; then
                echo "$units"
            else
                return 1
            fi
            ;;
    esac
}

# Validate service exists
validate_service() {
    local service="$1"

    # Validate service name contains only safe characters
    if ! [[ "$service" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        error "Invalid service name: $service"
        error "Service names must contain only alphanumeric characters, dashes, and underscores"
        exit 1
    fi

    if ! get_service_units "$service" &>/dev/null; then
        error "Unknown service: $service"
        echo ""
        info "Available services:"
        echo "  - nova (n-api, n-cond, n-sch, n-cpu)"
        echo "  - neutron (q-svc, q-agt, q-dhcp, q-l3, q-meta)"
        echo "  - glance (g-api)"
        echo "  - cinder (c-api, c-sch, c-vol)"
        echo "  - keystone"
        echo "  - placement (placement-api)"
        echo "  - horizon"
        echo ""
        info "Or use specific unit names from:"
        get_devstack_services | sed 's/^/  - /'
        exit 1
    fi
}

# Show help
show_help() {
    echo -e ""
    echo -e "${CYAN}DevStack Debug Toolkit${NC}"
    echo -e ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ./devstack.sh debug <subcommand> [options]"
    echo -e ""
    echo -e "${YELLOW}Subcommands:${NC}"
    echo -e "  ${GREEN}logs${NC} [service]              View service logs (tail -f)"
    echo -e "                               Examples: logs nova, logs n-api"
    echo -e ""
    echo -e "  ${GREEN}status${NC} [service]            Show service status"
    echo -e "                               Examples: status, status neutron"
    echo -e ""
    echo -e "  ${GREEN}ovs${NC}                         Debug Open vSwitch"
    echo -e "                               - Show bridges and ports"
    echo -e "                               - Display flow rules"
    echo -e "                               - Check VXLAN tunnels"
    echo -e ""
    echo -e "  ${GREEN}api${NC} <service>               Test API endpoints"
    echo -e "                               Examples: api nova, api keystone"
    echo -e ""
    echo -e "  ${GREEN}network${NC} [instance]          Debug networking"
    echo -e "                               - Network namespaces"
    echo -e "                               - IP addresses and routes"
    echo -e "                               - Security groups"
    echo -e "                               - Instance networking (if specified)"
    echo -e ""
    echo -e "  ${GREEN}compute${NC}                     Debug compute node"
    echo -e "                               - Running instances"
    echo -e "                               - Resource usage"
    echo -e "                               - Hypervisor info"
    echo -e ""
    echo -e "  ${GREEN}all${NC}                         Run all debug checks"
    echo -e ""
    echo -e "  ${GREEN}help${NC}                        Show this help"
    echo -e ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  ./devstack.sh debug logs nova"
    echo -e "  ./devstack.sh debug status"
    echo -e "  ./devstack.sh debug ovs"
    echo -e "  ./devstack.sh debug api keystone"
    echo -e "  ./devstack.sh debug network"
    echo -e "  ./devstack.sh debug compute"
    echo -e "  ./devstack.sh debug all"
    echo -e ""
    echo -e "${YELLOW}Service Names:${NC}"
    echo -e "  - nova (compute)"
    echo -e "  - neutron (networking)"
    echo -e "  - glance (images)"
    echo -e "  - cinder (volumes)"
    echo -e "  - keystone (identity)"
    echo -e "  - placement (resource tracking)"
    echo -e "  - horizon (dashboard)"
    echo -e ""
}

# Main command routing
SUBCOMMAND="${1:-help}"
shift || true

case "$SUBCOMMAND" in
    logs)
        check_vm_running "$VM_NAME" "$VM_NAME"
        SERVICE="${1:-}"
        if [ -z "$SERVICE" ]; then
            error "Service name required"
            info "Usage: ./devstack.sh debug logs <service>"
            echo ""
            info "Available services (currently running):"
            services=$(get_devstack_services)
            if [ -n "$services" ]; then
                echo "$services" | sed 's/^/  - /'
            else
                warning "No devstack services found"
            fi
            echo ""
            info "Common service groups:"
            echo "  💻 nova      - Compute (n-api, n-cond, n-sch, n-cpu)"
            echo "  🔌 neutron   - Networking (q-svc, q-agt, q-dhcp, q-l3, q-meta)"
            echo "  🖼️  glance    - Image (g-api)"
            echo "  💾 cinder    - Block Storage (c-api, c-sch, c-vol)"
            echo "  🔐 keystone  - Identity"
            echo "  📍 placement - Resource Placement"
            exit 1
        fi
        validate_service "$SERVICE"
        source lib/debug/logs.sh
        debug_logs "$SERVICE"
        ;;

    status)
        check_vm_running "$VM_NAME"
        SERVICE="${1:-}"
        source lib/debug/status.sh
        debug_status "$SERVICE"
        ;;

    ovs)
        check_vm_running "$VM_NAME"
        source lib/debug/ovs.sh
        debug_ovs
        ;;

    api)
        check_vm_running "$VM_NAME"
        SERVICE="${1:-}"
        if [ -z "$SERVICE" ]; then
            error "Service name required"
            info "Usage: ./devstack.sh debug api <service>"
            echo ""
            info "Available services (currently running):"
            services=$(get_devstack_services)
            if [ -n "$services" ]; then
                echo "$services" | sed 's/^/  - /'
            else
                warning "No devstack services found"
            fi
            echo ""
            info "Common API services:"
            echo "  💻 nova      - Compute API (n-api)"
            echo "  🔌 neutron   - Networking API (q-svc)"
            echo "  🖼️  glance    - Image API (g-api)"
            echo "  💾 cinder    - Volume API (c-api)"
            echo "  🔐 keystone  - Identity API"
            echo "  📍 placement - Placement API (placement-api)"
            exit 1
        fi
        validate_service "$SERVICE"
        source lib/debug/api.sh
        debug_api "$SERVICE"
        ;;

    network)
        check_vm_running "$VM_NAME"
        INSTANCE="${1:-}"
        source lib/debug/network.sh
        debug_network "$INSTANCE"
        ;;

    compute)
        check_vm_running "$VM_NAME"
        source lib/debug/compute.sh
        debug_compute
        ;;

    all)
        check_vm_running "$VM_NAME"
        info "Running all debug checks..."
        echo ""

        info "=== Service Status ==="
        source lib/debug/status.sh
        debug_status ""
        echo ""

        info "=== Open vSwitch ==="
        source lib/debug/ovs.sh
        debug_ovs
        echo ""

        info "=== Network Debug ==="
        source lib/debug/network.sh
        debug_network ""
        echo ""

        info "=== Compute Debug ==="
        source lib/debug/compute.sh
        debug_compute
        echo ""

        success "All debug checks completed"
        ;;

    help|--help|-h)
        show_help
        ;;

    *)
        error "Unknown subcommand: $SUBCOMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
