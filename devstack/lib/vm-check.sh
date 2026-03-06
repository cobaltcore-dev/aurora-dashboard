#!/bin/bash
# Central VM existence and state checking

# Source output functions if not already loaded
if ! declare -f error &>/dev/null; then
    _VM_CHECK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$_VM_CHECK_DIR/output.sh"
fi

# Check if VM exists at all
# Usage: check_vm_exists ["vm-name"]
# Returns: 0 if exists, 1 otherwise
check_vm_exists() {
    local vm_name="${1:-devstack}"

    if ! multipass list 2>/dev/null | grep -q "^${vm_name}"; then
        error "VM '${vm_name}' does not exist"
        echo ""
        info "Create VM with: ./devstack setup"
        echo ""
        return 1
    fi
    return 0
}

# Check if VM is running
# Usage: check_vm_running ["vm-name"]
# Returns: 0 if running, 1 otherwise
check_vm_running() {
    local vm_name="${1:-devstack}"

    # First check if VM exists
    if ! check_vm_exists "$vm_name"; then
        return 1
    fi

    if ! multipass list 2>/dev/null | grep -q "^${vm_name}.*Running"; then
        error "VM '${vm_name}' exists but is not running"
        echo ""
        info "Start VM with: ./devstack start"
        echo ""
        return 1
    fi
    return 0
}

# Check if DevStack is installed in VM
# Usage: check_devstack_installed ["vm-name"]
# Returns: 0 if installed, 1 otherwise
check_devstack_installed() {
    local vm_name="${1:-devstack}"

    # First check if VM is running
    if ! check_vm_running "$vm_name"; then
        return 1
    fi

    if ! multipass exec "$vm_name" -- test -f /opt/stack/.devstack-installed 2>/dev/null; then
        error "DevStack is not installed in VM '${vm_name}'"
        echo ""
        info "VM exists but DevStack installation is incomplete or failed"
        info "Check logs: ./devstack logs"
        info "Or rebuild: ./devstack rebuild"
        echo ""
        return 1
    fi
    return 0
}

# Check if VM exists (simple check, no output)
# Usage: vm_exists ["vm-name"]
# Returns: 0 if exists, 1 otherwise
vm_exists() {
    local vm_name="${1:-devstack}"
    multipass list 2>/dev/null | grep -q "^${vm_name}"
}

# Check if VM is running (simple check, no output)
# Usage: vm_running ["vm-name"]
# Returns: 0 if running, 1 otherwise
vm_running() {
    local vm_name="${1:-devstack}"
    multipass list 2>/dev/null | grep -q "^${vm_name}.*Running"
}

# Get VM state
# Usage: get_vm_state ["vm-name"]
# Returns: "Running", "Stopped", "NotFound", etc.
get_vm_state() {
    local vm_name="${1:-devstack}"

    if ! vm_exists "$vm_name"; then
        echo "NotFound"
        return 1
    fi

    local state=$(multipass list 2>/dev/null | grep "^${vm_name}" | awk '{print $2}')
    echo "$state"
}

# Require VM to exist (exit if not)
# Usage: require_vm_exists ["vm-name"]
require_vm_exists() {
    local vm_name="${1:-devstack}"

    if ! check_vm_exists "$vm_name"; then
        exit 1
    fi
}

# Require VM to be running (exit if not)
# Usage: require_vm_running ["vm-name"]
require_vm_running() {
    local vm_name="${1:-devstack}"

    if ! check_vm_running "$vm_name"; then
        exit 1
    fi
}

# Require DevStack to be installed (exit if not)
# Usage: require_devstack_installed ["vm-name"]
require_devstack_installed() {
    local vm_name="${1:-devstack}"

    if ! check_devstack_installed "$vm_name"; then
        exit 1
    fi
}

# Get VM information
# Usage: get_vm_info ["vm-name"]
# Returns: multipass info output
get_vm_info() {
    local vm_name="${1:-devstack}"
    multipass info "$vm_name" 2>/dev/null
}

# Extract CPU count from VM info
# Usage: extract_vm_cpus "vm-info-output"
extract_vm_cpus() {
    local vm_info="$1"
    echo "$vm_info" | grep "CPU(s):" | awk '{print $2}'
}

# Extract memory from VM info
# Usage: extract_vm_memory "vm-info-output"
extract_vm_memory() {
    local vm_info="$1"
    echo "$vm_info" | grep "Memory usage:" | awk '{print $6$7}'
}

# Extract disk from VM info
# Usage: extract_vm_disk "vm-info-output"
extract_vm_disk() {
    local vm_info="$1"
    echo "$vm_info" | grep "Disk usage:" | awk '{print $6$7}'
}

# Extract VM IP address
# Usage: extract_vm_ip "vm-info-output"
extract_vm_ip() {
    local vm_info="$1"
    echo "$vm_info" | grep "IPv4:" | head -1 | awk '{print $2}'
}
