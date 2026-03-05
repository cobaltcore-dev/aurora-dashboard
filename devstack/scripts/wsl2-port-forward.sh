#!/bin/bash
# WSL2 to Windows Port Forwarding Script
# This script forwards ports from the Multipass VM through WSL2 to Windows

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        WSL2 to Windows Port Forwarding Setup              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running under WSL2
if ! grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null; then
    error "This script must be run in WSL2"
    info "On native Linux/macOS, access DevStack directly via VM IP:"
    info "  VM_IP=\$(multipass info $VM_NAME | grep IPv4 | awk '{print \$2}')"
    info "  echo \"Horizon: http://\${VM_IP}/dashboard\""
    exit 1
fi

# Check if socat is installed
if ! command -v socat &> /dev/null; then
    warning "socat is not installed"
    info "Installing socat..."
    sudo apt-get update -qq && sudo apt-get install -y socat
    success "socat installed"
fi

# Load VM name from .env
cd "$(dirname "$0")/.."
if [ -f .env ]; then
    source .env
fi

VM_NAME=${VM_NAME:-devstack}

# Check if VM is running
if ! multipass list | grep -q "^${VM_NAME}.*Running"; then
    error "VM '${VM_NAME}' is not running"
    info "Start it with: ./devstack.sh start"
    exit 1
fi

# Get VM IP
VM_IP=$(multipass info "$VM_NAME" | grep IPv4 | awk '{print $2}')
if [ -z "$VM_IP" ]; then
    error "Could not determine VM IP address"
    exit 1
fi

# Get WSL2 IP
WSL_IP=$(hostname -I | awk '{print $1}')

success "VM IP: $VM_IP"
success "WSL IP: $WSL_IP"
echo ""

info "Note: Binding to 0.0.0.0 (all interfaces) for Windows accessibility"
echo ""

# Define ports to forward
# Format: WSL_PORT:VM_PORT:SERVICE_NAME:PRIORITY
# Priority: critical ports should keep their standard port numbers
declare -a PORTS=(
    "8080:80:Horizon Dashboard:flexible"
    "5000:5000:Keystone (Identity):critical"
    "8774:8774:Nova (Compute):critical"
    "9292:9292:Glance (Image):critical"
    "9696:9696:Neutron (Network):critical"
    "8776:8776:Cinder (Volume):critical"
    "8778:8778:Placement:critical"
    "6080:6080:NoVNC Console:flexible"
)

# Check if any socat processes are already running
EXISTING_SOCAT=$(pgrep -f "socat.*$VM_IP" || true)
if [ -n "$EXISTING_SOCAT" ]; then
    warning "Found existing port forwarding processes"
    info "Killing existing processes..."
    pkill -f "socat.*$VM_IP" || true
    sleep 1
    success "Stopped existing port forwarding"
    echo ""
fi

# Function to check if port is in use (cross-platform)
check_port_in_use() {
    local port=$1

    # Try different methods depending on what's available

    # Method 1: ss (modern Linux)
    if command -v ss &>/dev/null; then
        if ss -tuln 2>/dev/null | grep -q ":${port} "; then
            return 0  # Port is in use
        fi
    fi

    # Method 2: netstat (Linux/macOS)
    if command -v netstat &>/dev/null; then
        if netstat -an 2>/dev/null | grep -E "(:${port}|\.${port})" | grep -E "(LISTEN|ESTABLISHED)" &>/dev/null; then
            return 0  # Port is in use
        fi
    fi

    # Method 3: lsof (macOS/Linux - most reliable but slower)
    if command -v lsof &>/dev/null; then
        if lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null | grep -q ":${port}"; then
            return 0  # Port is in use
        fi
    fi

    # Method 4: nc (netcat) - try to connect
    if command -v nc &>/dev/null; then
        if nc -z localhost ${port} 2>/dev/null; then
            return 0  # Port is in use
        fi
    fi

    return 1  # Port is free
}

# Function to find next available port
find_available_port() {
    local start_port=$1
    local port=$start_port

    while check_port_in_use $port; do
        port=$((port + 1))
        if [ $port -gt 65535 ]; then
            return 1  # No port available
        fi
    done

    echo $port
    return 0
}

# Check port availability and find alternatives
info "Checking port availability..."
echo ""

declare -A FINAL_PORTS
declare -A PORT_MAPPINGS
declare -A FAILED_CRITICAL_PORTS

for PORT_CONFIG in "${PORTS[@]}"; do
    WSL_PORT=$(echo "$PORT_CONFIG" | cut -d: -f1)
    VM_PORT=$(echo "$PORT_CONFIG" | cut -d: -f2)
    SERVICE=$(echo "$PORT_CONFIG" | cut -d: -f3)
    PRIORITY=$(echo "$PORT_CONFIG" | cut -d: -f4)

    # Check if port is in use
    if check_port_in_use $WSL_PORT; then
        # Port is in use
        if [ "$PRIORITY" = "critical" ]; then
            error "Port $WSL_PORT is already in use ($SERVICE) - CRITICAL PORT"
            FAILED_CRITICAL_PORTS[$WSL_PORT]=$SERVICE
        else
            warning "Port $WSL_PORT is already in use ($SERVICE)"
            # Find next available port for flexible ports
            AVAILABLE_PORT=$(find_available_port $WSL_PORT)

            if [ -z "$AVAILABLE_PORT" ]; then
                error "Could not find available port for $SERVICE"
                exit 1
            fi

            info "Using alternative port: $AVAILABLE_PORT → VM:$VM_PORT"
            FINAL_PORTS[$VM_PORT]="$AVAILABLE_PORT:$VM_PORT:$SERVICE"
            PORT_MAPPINGS[$AVAILABLE_PORT]=$VM_PORT
        fi
    else
        success "Port $WSL_PORT is available ($SERVICE)"
        FINAL_PORTS[$VM_PORT]="$WSL_PORT:$VM_PORT:$SERVICE"
        PORT_MAPPINGS[$WSL_PORT]=$VM_PORT
    fi
done

# Check if any critical ports failed
if [ ${#FAILED_CRITICAL_PORTS[@]} -gt 0 ]; then
    echo ""
    error "Critical OpenStack service ports are in use!"
    echo ""
    warning "These ports are required for Horizon to work correctly:"
    for port in "${!FAILED_CRITICAL_PORTS[@]}"; do
        echo "  - Port $port: ${FAILED_CRITICAL_PORTS[$port]}"
    done
    echo ""
    info "To fix this, free these ports:"
    for port in "${!FAILED_CRITICAL_PORTS[@]}"; do
        echo "  sudo lsof -ti :$port | xargs kill -9"
    done
    echo ""
    error "Exiting. Please free the critical ports and try again."
    exit 1
fi

echo ""
info "Starting port forwarding..."
echo ""

# Start port forwarding for each port
for VM_PORT in "${!FINAL_PORTS[@]}"; do
    PORT_CONFIG="${FINAL_PORTS[$VM_PORT]}"
    WSL_PORT=$(echo "$PORT_CONFIG" | cut -d: -f1)
    VM_PORT=$(echo "$PORT_CONFIG" | cut -d: -f2)
    SERVICE=$(echo "$PORT_CONFIG" | cut -d: -f3-)

    # Start socat in background
    # Bind to 0.0.0.0 so Windows can access via localhost
    socat TCP-LISTEN:${WSL_PORT},bind=0.0.0.0,fork,reuseaddr TCP:${VM_IP}:${VM_PORT} &
    SOCAT_PID=$!

    # Wait a moment to check if it started successfully
    sleep 0.2

    if kill -0 $SOCAT_PID 2>/dev/null; then
        success "Port $WSL_PORT -> $VM_IP:$VM_PORT ($SERVICE)"
    else
        error "Failed to forward port $WSL_PORT ($SERVICE)"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Port Forwarding Active!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
info "Services accessible from Windows browser:"
echo ""

# Build output dynamically based on actual ports
for VM_PORT in $(echo "${!PORT_MAPPINGS[@]}" | tr ' ' '\n' | sort -n); do
    WSL_PORT=$VM_PORT
    ACTUAL_VM_PORT=${PORT_MAPPINGS[$VM_PORT]}

    case "$ACTUAL_VM_PORT" in
        80)
            echo "  🌐 Horizon:    http://localhost:${WSL_PORT}/dashboard"
            ;;
        5000)
            echo "  🔐 Keystone:   http://localhost:${WSL_PORT}"
            ;;
        8774)
            echo "  💻 Nova:       http://localhost:${WSL_PORT}"
            ;;
        9292)
            echo "  🖼️  Glance:     http://localhost:${WSL_PORT}"
            ;;
        9696)
            echo "  🔌 Neutron:    http://localhost:${WSL_PORT}"
            ;;
        8776)
            echo "  💾 Cinder:     http://localhost:${WSL_PORT}"
            ;;
        8778)
            echo "  📍 Placement:  http://localhost:${WSL_PORT}"
            ;;
        6080)
            echo "  🖥️  NoVNC:      http://localhost:${WSL_PORT}"
            ;;
    esac
done

echo ""
info "Port forwarding is running in the background"
echo ""
warning "Keep this terminal open or port forwarding will stop"
info "To stop port forwarding: pkill -f 'socat.*$VM_IP'"
echo ""

# Keep script running
info "Press Ctrl+C to stop port forwarding..."
wait
