#!/bin/bash
# DevStack v3 - Logs Management Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Load environment variables
if [ ! -f .env ]; then
    error ".env file not found."
    exit 1
fi

source .env
VM_NAME=${VM_NAME:-devstack}

ACTION=$1

case "$ACTION" in
    show|"")
        # Show last 50 lines of installation log
        if [ -f "devstack-install.log" ]; then
            info "DevStack installation log (last 50 lines):"
            echo ""
            tail -50 devstack-install.log
        else
            error "devstack-install.log not found"
            info "Log is created during initial setup"
        fi
        ;;

    tail)
        # Tail installation log in real-time
        if [ -f "devstack-install.log" ]; then
            info "Tailing devstack-install.log (Ctrl+C to exit)..."
            echo ""
            tail -f devstack-install.log
        else
            error "devstack-install.log not found"
        fi
        ;;

    stack)
        # Show stack.sh log from inside VM
        if ! multipass list | grep -q "^${VM_NAME}.*Running"; then
            error "VM '${VM_NAME}' is not running."
            exit 1
        fi

        info "DevStack stack.sh log (last 50 lines):"
        echo ""
        multipass exec "$VM_NAME" -- tail -50 /opt/stack/logs/stack.sh.log 2>/dev/null || {
            error "stack.sh.log not found in VM"
            info "Log is created when stack.sh runs"
        }
        ;;

    stack-tail)
        # Tail stack.sh log from inside VM
        if ! multipass list | grep -q "^${VM_NAME}.*Running"; then
            error "VM '${VM_NAME}' is not running."
            exit 1
        fi

        info "Tailing stack.sh log from VM (Ctrl+C to exit)..."
        echo ""
        multipass exec "$VM_NAME" -- tail -f /opt/stack/logs/stack.sh.log 2>/dev/null || {
            error "stack.sh.log not found in VM"
        }
        ;;

    *)
        error "Unknown logs action: $ACTION"
        echo ""
        echo "Usage:"
        echo "  ./devstack.sh logs [show]      - Show last 50 lines of installation log"
        echo "  ./devstack.sh logs tail        - Tail installation log in real-time"
        echo "  ./devstack.sh logs stack       - Show last 50 lines of stack.sh log from VM"
        echo "  ./devstack.sh logs stack-tail  - Tail stack.sh log from VM in real-time"
        exit 1
        ;;
esac
