#!/bin/bash
# Debug Module: Network

set -e

# This module will be sourced by lib/debug.sh
# VM_NAME and colors are available from parent

debug_network() {
    local instance="$1"

    echo -e "${CYAN}=== Network Debug ===${NC}"
    echo ""

    # Show network namespaces
    echo -e "${CYAN}Network Namespaces:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    multipass exec "$VM_NAME" -- bash -c '
        # Check if ip netns command is available
        if ! command -v ip &>/dev/null; then
            echo "Error: ip command not found"
            exit 1
        fi

        namespaces=$(sudo ip netns list 2>/dev/null | awk "{print \$1}" || true)
        if [ -z "$namespaces" ]; then
            echo "No network namespaces found"
        else
            for ns in $namespaces; do
                echo "Namespace: $ns"

                # Count interfaces
                iface_count=$(sudo ip netns exec "$ns" ip link show 2>/dev/null | grep -c "^[0-9]:" || echo "0")
                echo "  Interfaces: $iface_count"

                # Show brief interface info
                sudo ip netns exec "$ns" ip -br addr show 2>/dev/null | while read line; do
                    echo "    $line"
                done

                echo ""
            done
        fi
    '
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Show DHCP namespaces
    echo -e "${CYAN}DHCP Namespaces:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        dhcp_ns=$(sudo ip netns list 2>/dev/null | grep "qdhcp-" | awk "{print \$1}" || true)
        if [ -z "$dhcp_ns" ]; then
            echo "No DHCP namespaces found"
        else
            for ns in $dhcp_ns; do
                echo "  $ns"
                # Show DHCP process
                pid=$(sudo ip netns pids "$ns" 2>/dev/null | head -1 || true)
                if [ -n "$pid" ]; then
                    process=$(sudo ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
                    echo "    Process: $process (PID: $pid)"
                fi
            done
        fi
    '
    echo ""

    # Show router namespaces
    echo -e "${CYAN}Router Namespaces:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        router_ns=$(sudo ip netns list 2>/dev/null | grep "qrouter-" | awk "{print \$1}" || true)
        if [ -z "$router_ns" ]; then
            echo "No router namespaces found"
        else
            for ns in $router_ns; do
                echo "  $ns"

                # Show interfaces with IPs
                echo "    Interfaces:"
                sudo ip netns exec "$ns" ip -4 addr show 2>/dev/null | grep -E "^[0-9]+:|inet " | \
                    sed "s/^/      /"

                # Show routes
                echo "    Default route:"
                sudo ip netns exec "$ns" ip route show default 2>/dev/null | sed "s/^/      /" || \
                    echo "      No default route"

                echo ""
            done
        fi
    '
    echo ""

    # Show OpenStack network information
    echo -e "${CYAN}OpenStack Networks:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin
            openstack network list --long 2>/dev/null || echo "Unable to list networks"
        else
            echo "OpenStack credentials not available"
        fi
    '
    echo ""

    # Show security groups
    echo -e "${CYAN}Security Groups:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin
            openstack security group list 2>/dev/null || echo "Unable to list security groups"
        fi
    '
    echo ""

    # If instance specified, show instance networking details
    if [ -n "$instance" ]; then
        echo -e "${CYAN}Instance Network Details: $instance${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        multipass exec "$VM_NAME" -- bash -c "
            if [ -f /opt/stack/devstack/openrc ]; then
                source /opt/stack/devstack/openrc admin admin

                # Get instance details
                instance_id=\$(openstack server list --name '$instance' -f value -c ID 2>/dev/null | head -1)

                if [ -z \"\$instance_id\" ]; then
                    echo \"Instance '$instance' not found\"
                else
                    echo \"Instance ID: \$instance_id\"
                    echo \"\"

                    # Show instance ports
                    echo \"Ports:\"
                    openstack port list --server \"\$instance_id\" --long 2>/dev/null || \
                        echo \"Unable to list ports\"

                    echo \"\"

                    # Show instance console log (networking-related errors)
                    echo \"Console log (last 20 lines):\"
                    openstack console log show \"\$instance_id\" 2>/dev/null | tail -20 || \
                        echo \"Unable to retrieve console log\"
                fi
            fi
        "
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    fi

    # Show network connectivity test
    echo -e "${CYAN}Network Connectivity:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        echo "Testing connectivity to common endpoints:"

        # Test metadata service
        echo -n "  Metadata service (169.254.169.254): "
        if timeout 2 ping -c 1 169.254.169.254 &>/dev/null; then
            echo "✓ reachable"
        else
            echo "✗ unreachable"
        fi

        # Test external connectivity
        echo -n "  External (8.8.8.8): "
        if timeout 2 ping -c 1 8.8.8.8 &>/dev/null; then
            echo "✓ reachable"
        else
            echo "✗ unreachable"
        fi

        # Test DNS
        echo -n "  DNS resolution: "
        if timeout 2 nslookup google.com &>/dev/null; then
            echo "✓ working"
        else
            echo "✗ not working"
        fi
    '
    echo ""

    success "Network debug completed"
}
