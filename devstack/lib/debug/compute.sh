#!/bin/bash
# Debug Module: Compute

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared libraries
source "$SCRIPT_DIR/../output.sh"

# This module will be sourced by lib/debug.sh
# VM_NAME is available from parent

debug_compute() {
    echo -e "${CYAN}=== Compute Node Debug ===${NC}"
    echo ""

    # Show hypervisor information
    echo -e "${CYAN}Hypervisor Information:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    multipass exec "$VM_NAME" -- bash -c '
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin

            # Get hypervisor stats
            if openstack hypervisor list &>/dev/null; then
                echo "Hypervisor List:"
                openstack hypervisor list
                echo ""

                # Get detailed stats for first hypervisor
                hypervisor_id=$(openstack hypervisor list -f value -c ID 2>/dev/null | head -1)
                if [ -n "$hypervisor_id" ]; then
                    echo "Hypervisor Details:"
                    openstack hypervisor show "$hypervisor_id"
                fi
            else
                echo "Unable to retrieve hypervisor information"
            fi
        else
            echo "OpenStack credentials not available"
        fi
    '
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Show running instances
    echo -e "${CYAN}Running Instances:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin

            instance_count=$(openstack server list --all-projects -f value 2>/dev/null | wc -l)
            echo "Total instances: $instance_count"
            echo ""

            if [ "$instance_count" -gt 0 ]; then
                openstack server list --all-projects --long
            else
                echo "No instances running"
            fi
        fi
    '
    echo ""

    # Show libvirt domains
    echo -e "${CYAN}Libvirt Domains:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        if command -v virsh &>/dev/null; then
            echo "Active domains:"
            sudo virsh list --all 2>/dev/null || echo "Unable to list libvirt domains"
        else
            echo "Libvirt not available (might be using LXC or other driver)"
        fi
    '
    echo ""

    # Show compute service status
    echo -e "${CYAN}Compute Services:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin
            openstack compute service list 2>/dev/null || echo "Unable to list compute services"
        fi
    '
    echo ""

    # Show resource usage
    echo -e "${CYAN}Resource Usage:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    multipass exec "$VM_NAME" -- bash -c '
        RED="\033[0;31m"
        GREEN="\033[0;32m"
        YELLOW="\033[1;33m"
        NC="\033[0m"

        # CPU usage
        echo "CPU Usage:"
        cpu_idle=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/")
        cpu_used=$(echo "100 - $cpu_idle" | bc)
        echo "  Used: ${cpu_used}%"
        echo "  Idle: ${cpu_idle}%"

        # Show top CPU consumers
        echo ""
        echo "Top CPU Processes:"
        ps aux --sort=-%cpu | head -6 | tail -5 | awk "{printf \"  %-20s %5s%%  %s\n\", \$11, \$3, \$2}"

        echo ""

        # Memory usage
        echo "Memory Usage:"
        free -h | grep "Mem:" | awk "{
            printf \"  Total: %s\n\", \$2
            printf \"  Used: %s\n\", \$3
            printf \"  Free: %s\n\", \$4
            printf \"  Available: %s\n\", \$7
        }"

        # Calculate memory percentage
        mem_total=$(free | grep "Mem:" | awk "{print \$2}")
        mem_used=$(free | grep "Mem:" | awk "{print \$3}")
        mem_percent=$(echo "scale=1; $mem_used * 100 / $mem_total" | bc)
        echo "  Usage: ${mem_percent}%"

        echo ""

        # Disk usage
        echo "Disk Usage:"
        df -h / | tail -1 | awk "{
            printf \"  Total: %s\n\", \$2
            printf \"  Used: %s (%s)\n\", \$3, \$5
            printf \"  Available: %s\n\", \$4
        }"

        # Check instance storage
        if [ -d /opt/stack/data/nova/instances ]; then
            echo ""
            echo "Instance Storage:"
            instance_size=$(sudo du -sh /opt/stack/data/nova/instances 2>/dev/null | awk "{print \$1}" || echo "N/A")
            echo "  Location: /opt/stack/data/nova/instances"
            echo "  Size: $instance_size"
        fi
    '
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Show nova compute logs (last few entries)
    echo -e "${CYAN}Recent Nova Compute Logs:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        echo "Last 10 log entries from nova-compute:"
        journalctl -u "devstack@n-cpu.service" -n 10 --no-pager 2>/dev/null || \
            echo "Unable to retrieve nova-compute logs"
    '
    echo ""

    # Check for common issues
    echo -e "${CYAN}Health Checks:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        RED="\033[0;31m"
        GREEN="\033[0;32m"
        YELLOW="\033[1;33m"
        NC="\033[0m"

        # Check if nova-compute is running
        echo -n "Nova compute service: "
        if systemctl is-active devstack@n-cpu.service &>/dev/null; then
            echo -e "${GREEN}✓ running${NC}"
        else
            echo -e "${RED}✗ not running${NC}"
        fi

        # Check if libvirt is running (if available)
        if command -v virsh &>/dev/null; then
            echo -n "Libvirt daemon: "
            if sudo virsh version &>/dev/null; then
                echo -e "${GREEN}✓ running${NC}"
            else
                echo -e "${RED}✗ not running${NC}"
            fi
        fi

        # Check compute service registration
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin
            echo -n "Compute service registered: "
            if openstack compute service list --service nova-compute -f value 2>/dev/null | grep -q "enabled"; then
                echo -e "${GREEN}✓ yes${NC}"

                # Check if compute service is up
                echo -n "Compute service status: "
                status=$(openstack compute service list --service nova-compute -f value -c State 2>/dev/null)
                if [ "$status" = "up" ]; then
                    echo -e "${GREEN}✓ up${NC}"
                else
                    echo -e "${RED}✗ down${NC}"
                fi
            else
                echo -e "${RED}✗ no${NC}"
            fi
        fi

        # Check disk space
        echo -n "Disk space: "
        disk_usage=$(df / | tail -1 | awk "{print \$5}" | sed "s/%//")
        if [ "$disk_usage" -lt 80 ]; then
            echo -e "${GREEN}✓ sufficient (${disk_usage}% used)${NC}"
        elif [ "$disk_usage" -lt 90 ]; then
            echo -e "${YELLOW}⚠ warning (${disk_usage}% used)${NC}"
        else
            echo -e "${RED}✗ critical (${disk_usage}% used)${NC}"
        fi
    '
    echo ""

    success "Compute debug completed"
}
