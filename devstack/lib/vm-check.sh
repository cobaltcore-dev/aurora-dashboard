#!/bin/bash
# Central VM existence and state checking

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if VM exists at all
check_vm_exists() {
    local vm_name="${1:-devstack}"

    if ! multipass list 2>/dev/null | grep -q "^${vm_name}"; then
        echo -e "${RED}✗${NC} VM '${vm_name}' does not exist"
        echo ""
        echo -e "${BLUE}ℹ ${NC} Create VM with: ${GREEN}./devstack setup${NC}"
        echo ""
        return 1
    fi
    return 0
}

# Check if VM is running
check_vm_running() {
    local vm_name="${1:-devstack}"

    # First check if VM exists
    if ! check_vm_exists "$vm_name"; then
        return 1
    fi

    if ! multipass list 2>/dev/null | grep -q "^${vm_name}.*Running"; then
        echo -e "${RED}✗${NC} VM '${vm_name}' exists but is not running"
        echo ""
        echo -e "${BLUE}ℹ ${NC} Start VM with: ${GREEN}./devstack start${NC}"
        echo ""
        return 1
    fi
    return 0
}

# Check if DevStack is installed in VM
check_devstack_installed() {
    local vm_name="${1:-devstack}"

    # First check if VM is running
    if ! check_vm_running "$vm_name"; then
        return 1
    fi

    if ! multipass exec "$vm_name" -- test -f /opt/stack/.devstack-installed 2>/dev/null; then
        echo -e "${RED}✗${NC} DevStack is not installed in VM '${vm_name}'"
        echo ""
        echo -e "${BLUE}ℹ ${NC} VM exists but DevStack installation is incomplete or failed"
        echo -e "${BLUE}ℹ ${NC} Check logs: ${GREEN}./devstack logs${NC}"
        echo -e "${BLUE}ℹ ${NC} Or rebuild: ${GREEN}./devstack rebuild${NC}"
        echo ""
        return 1
    fi
    return 0
}
