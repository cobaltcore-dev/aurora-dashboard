#!/bin/bash
# Helper script to check DevStack installation status

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source VM check functions
source "$SCRIPT_DIR/vm-check.sh"

VM_NAME=${1:-devstack}

echo "Checking DevStack status in VM: $VM_NAME"
echo ""

# Check if VM is running (includes existence check)
if ! check_vm_running "$VM_NAME"; then
    exit 1
fi

echo "✅ VM is running"
echo ""

# Check if DevStack is installed
if ! check_devstack_installed "$VM_NAME"; then
    exit 1
fi

echo "✅ DevStack is installed"
echo ""

# Get VM IP
VM_IP=$(multipass info "$VM_NAME" | grep IPv4 | awk '{print $2}')
echo "VM IP: $VM_IP"
echo ""

# Check if services are running
echo "Checking OpenStack services..."
multipass exec "$VM_NAME" -- sudo -u stack bash -c "source /home/stack/devstack/openrc admin admin && openstack service list" 2>/dev/null && {
    echo ""
    echo "✅ OpenStack services are running"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Service Access Information                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🌐 Web Dashboard:"
    echo "   └─ Horizon:  http://${VM_IP}/dashboard"
    echo ""
    echo "🔌 API Endpoints:"
    echo "   ├─ Identity (Keystone):     http://${VM_IP}/identity"
    echo "   ├─ Compute (Nova):          http://${VM_IP}:8774"
    echo "   ├─ Image (Glance):          http://${VM_IP}:9292"
    echo "   ├─ Network (Neutron):       http://${VM_IP}:9696"
    echo "   ├─ Block Storage (Cinder):  http://${VM_IP}:8776"
    echo "   └─ Placement:               http://${VM_IP}:8778"
    echo ""
    echo "🔐 Credentials:"
    echo "   └─ Username: admin"
    echo "   └─ Password: password (or value from .env)"
    echo ""
    echo "💻 CLI Access:"
    echo "   └─ ./devstack shell"
    echo "   └─ source /home/stack/devstack/openrc admin admin"
    echo "   └─ openstack service list"
    echo ""
} || {
    echo "⚠️  OpenStack services may not be fully started yet"
    echo ""
    echo "Check logs with:"
    echo "  multipass exec $VM_NAME -- tail -f /opt/stack/logs/stack.sh.log"
}

