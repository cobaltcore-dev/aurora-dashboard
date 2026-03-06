#!/bin/bash
# Debug Module: OVS

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared libraries
source "$SCRIPT_DIR/../output.sh"

# This module will be sourced by lib/debug.sh
# VM_NAME is available from parent

debug_ovs() {
    echo -e "${CYAN}=== Open vSwitch Debug ===${NC}"
    echo ""

    # Check if OVS is installed
    if ! multipass exec "$VM_NAME" -- which ovs-vsctl &>/dev/null; then
        error "Open vSwitch is not installed"
        return 1
    fi

    # Show OVS version
    info "Open vSwitch Version:"
    multipass exec "$VM_NAME" -- sudo ovs-vsctl --version | head -1
    echo ""

    # Show all bridges
    echo -e "${CYAN}Bridges:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    multipass exec "$VM_NAME" -- bash -c '
        bridges=$(sudo ovs-vsctl list-br)
        if [ -z "$bridges" ]; then
            echo "No bridges found"
        else
            for bridge in $bridges; do
                echo "Bridge: $bridge"

                # Show ports
                echo "  Ports:"
                sudo ovs-vsctl list-ports "$bridge" | while read port; do
                    # Get port details
                    ofport=$(sudo ovs-vsctl get Interface "$port" ofport 2>/dev/null || echo "N/A")
                    port_type=$(sudo ovs-vsctl get Interface "$port" type 2>/dev/null | tr -d "\"" || echo "system")

                    if [ "$port_type" = "internal" ]; then
                        echo "    - $port (ofport: $ofport, type: internal)"
                    elif [ "$port_type" = "vxlan" ]; then
                        remote_ip=$(sudo ovs-vsctl get Interface "$port" options:remote_ip 2>/dev/null | tr -d "\"" || echo "N/A")
                        echo "    - $port (ofport: $ofport, type: vxlan, remote: $remote_ip)"
                    elif [ "$port_type" = "patch" ]; then
                        peer=$(sudo ovs-vsctl get Interface "$port" options:peer 2>/dev/null | tr -d "\"" || echo "N/A")
                        echo "    - $port (ofport: $ofport, type: patch, peer: $peer)"
                    else
                        echo "    - $port (ofport: $ofport)"
                    fi
                done

                # Show datapath
                dp_type=$(sudo ovs-vsctl get bridge "$bridge" datapath_type 2>/dev/null | tr -d "\"" || echo "system")
                echo "  Datapath: $dp_type"
                echo ""
            done
        fi
    '
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Show flow counts per bridge
    echo -e "${CYAN}Flow Statistics:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        for bridge in $(sudo ovs-vsctl list-br); do
            flow_count=$(sudo ovs-ofctl dump-flows "$bridge" 2>/dev/null | grep -v NXST | wc -l)
            echo "  $bridge: $flow_count flows"
        done
    '
    echo ""

    # Show VXLAN tunnels
    echo -e "${CYAN}VXLAN Tunnels:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        vxlan_ports=$(sudo ovs-vsctl --columns=name,type list Interface | grep -B1 "type.*vxlan" | grep "name" | awk "{print \$3}" | tr -d "\"" || true)

        if [ -z "$vxlan_ports" ]; then
            echo "No VXLAN tunnels found"
        else
            for port in $vxlan_ports; do
                bridge=$(sudo ovs-vsctl port-to-br "$port" 2>/dev/null || echo "unknown")
                remote_ip=$(sudo ovs-vsctl get Interface "$port" options:remote_ip 2>/dev/null | tr -d "\"" || echo "N/A")
                local_ip=$(sudo ovs-vsctl get Interface "$port" options:local_ip 2>/dev/null | tr -d "\"" || echo "N/A")
                key=$(sudo ovs-vsctl get Interface "$port" options:key 2>/dev/null | tr -d "\"" || echo "N/A")

                echo "  Port: $port"
                echo "    Bridge: $bridge"
                echo "    Local IP: $local_ip"
                echo "    Remote IP: $remote_ip"
                echo "    VNI/Key: $key"

                # Check tunnel status
                link_state=$(sudo ovs-vsctl get Interface "$port" link_state 2>/dev/null | tr -d "\"" || echo "unknown")
                echo "    Link State: $link_state"
                echo ""
            done
        fi
    '

    # Show OpenFlow version info
    echo -e "${CYAN}OpenFlow Versions:${NC}"
    multipass exec "$VM_NAME" -- bash -c '
        for bridge in $(sudo ovs-vsctl list-br); do
            protocols=$(sudo ovs-vsctl get bridge "$bridge" protocols 2>/dev/null | tr -d "[]\"" || echo "default")
            echo "  $bridge: $protocols"
        done
    '
    echo ""

    success "OVS debug completed"
}
