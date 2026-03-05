#!/bin/bash
# WSL2 to Multipass VM Port Forwarding Script
# Run this inside WSL2

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get VM IP
VM_IP=$(multipass info devstack 2>/dev/null | grep IPv4 | awk '{print $2}')

if [ -z "$VM_IP" ]; then
    echo -e "${RED}❌ Error: Could not get VM IP. Is the VM running?${NC}"
    echo "   Run: ./devstack.sh status"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         WSL2 to Multipass VM Port Forwarding              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}VM IP: $VM_IP${NC}"
echo ""

# Check if socat is installed
if ! command -v socat &> /dev/null; then
    echo -e "${YELLOW}Installing socat...${NC}"
    sudo apt-get update -qq
    sudo apt-get install -y socat
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if sudo lsof -i :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to find next available port
find_available_port() {
    local start_port=$1
    local port=$start_port

    while check_port $port; do
        ((port++))
        if [ $port -gt 65535 ]; then
            echo "0"
            return
        fi
    done

    echo $port
}

# Service definitions: name, default_port
declare -A SERVICES=(
    ["Horizon"]=80
    ["Keystone"]=5000
    ["Nova"]=8774
    ["Glance"]=9292
    ["Neutron"]=9696
    ["Cinder"]=8776
    ["Placement"]=8778
    ["NoVNC"]=6080
)

# Service to port mapping (will be updated if ports are in use)
declare -A PORT_MAP

echo -e "${BLUE}Checking port availability...${NC}"
echo ""

# Kill existing socat processes
sudo pkill socat 2>/dev/null || true
sleep 1

# Check each port and find alternatives if needed
for service in "${!SERVICES[@]}"; do
    default_port=${SERVICES[$service]}

    if check_port $default_port; then
        # Port is in use, find alternative
        available_port=$(find_available_port $default_port)

        if [ "$available_port" = "0" ]; then
            echo -e "${RED}❌ Error: Could not find available port for $service${NC}"
            exit 1
        fi

        echo -e "${YELLOW}⚠  Port $default_port (${service}) is in use${NC}"
        echo -e "   Using alternative port: ${GREEN}$available_port${NC}"
        PORT_MAP[$service]=$available_port
    else
        echo -e "${GREEN}✓${NC} Port $default_port (${service}) is available"
        PORT_MAP[$service]=$default_port
    fi
done

echo ""
echo -e "${BLUE}Starting port forwarding...${NC}"
echo ""

# Start port forwarding with mapped ports
for service in "${!PORT_MAP[@]}"; do
    wsl_port=${PORT_MAP[$service]}
    vm_port=${SERVICES[$service]}

    echo -e "Forwarding ${GREEN}$service${NC}: WSL:$wsl_port -> VM:$vm_port"
    sudo socat TCP-LISTEN:$wsl_port,fork,reuseaddr TCP:$VM_IP:$vm_port &
done

echo ""
echo -e "${GREEN}✓ Port forwarding active!${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            Services Accessible from WSL2                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Display access URLs with port information
for service in Horizon Keystone Nova Glance Neutron Cinder Placement NoVNC; do
    if [ -n "${PORT_MAP[$service]}" ]; then
        wsl_port=${PORT_MAP[$service]}
        vm_port=${SERVICES[$service]}

        # Show if port was remapped
        port_info=""
        if [ "$wsl_port" != "$vm_port" ]; then
            port_info=" ${YELLOW}(remapped from :${vm_port})${NC}"
        fi

        case $service in
            Horizon)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}/dashboard${port_info}\n" "$service:"
                ;;
            Keystone)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
            Nova)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
            Glance)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
            Neutron)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
            Cinder)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
            Placement)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
            NoVNC)
                printf "  ${GREEN}%-12s${NC} http://localhost:${wsl_port}${port_info}\n" "$service:"
                ;;
        esac
    fi
done

echo ""
echo -e "${YELLOW}⚠  Keep this terminal open!${NC}"
echo -e "   Or run in background: ${BLUE}nohup ./wsl-port-forward.sh > port-forward.log 2>&1 &${NC}"
echo ""
echo -e "To stop forwarding: ${BLUE}sudo pkill socat${NC}"
echo ""

# Save port mapping to file for Windows script
cat > .port-mapping <<EOF
# Port mapping for Windows port forwarding
# Format: WSL_PORT=VM_PORT
$(for service in "${!PORT_MAP[@]}"; do
    echo "${PORT_MAP[$service]}=${SERVICES[$service]}"
done | sort -n)
EOF

echo -e "${BLUE}Port mapping saved to .port-mapping${NC}"
echo ""

# Keep running
wait
