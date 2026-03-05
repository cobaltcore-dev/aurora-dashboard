#!/bin/bash
# DevStack v3 - Central Management Script
# Wrapper for all DevStack VM operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if running under WSL2
check_wsl2() {
    if grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null; then
        return 0
    fi
    return 1
}

# Show WSL2 port forwarding reminder
show_wsl2_reminder() {
    if check_wsl2; then
        echo ""
        echo -e "${YELLOW}⚠${NC} Running under WSL2 detected!"
        echo -e "${BLUE}ℹ${NC} To access DevStack from Windows, start port forwarding:"
        echo "  ./scripts/wsl2-port-forward.sh"
        echo ""
    fi
}

show_help() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              DevStack v3 - Management CLI                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${CYAN}Usage:${NC}"
    echo "  ./devstack.sh <command> [options]"
    echo ""
    echo -e "${CYAN}VM Management:${NC}"
    echo "  setup                 Create and provision new VM"
    echo "  start                 Start existing VM"
    echo "  stop                  Stop running VM"
    echo "  restart               Restart VM"
    echo "  shell                 Open shell in VM"
    echo "  status                Show VM and DevStack status"
    echo "  info                  Show detailed VM information"
    echo ""
    echo -e "${CYAN}Services:${NC}"
    echo "  services list             Show configured services"
    echo "  services available        Show all available services"
    echo "  services add <svc>        Add service(s)"
    echo "  services remove <svc>     Remove service(s)"
    echo "  services enable <list>    Set services (comma-separated)"
    echo ""
    echo -e "${CYAN}Configuration:${NC}"
    echo "  rebuild               Delete and recreate VM (keeps .env)"
    echo "  update-config         Update DevStack config without rebuilding VM"
    echo ""
    echo -e "${CYAN}Snapshots:${NC}"
    echo "  snapshot create <name>    Create snapshot"
    echo "  snapshot restore <name>   Restore from snapshot"
    echo "  snapshot list             List all snapshots"
    echo "  snapshot delete <name>    Delete a snapshot"
    echo ""
    echo -e "${CYAN}Logs:${NC}"
    echo "  logs [show]           Show last 50 lines of installation log"
    echo "  logs tail             Tail installation log in real-time"
    echo "  logs stack            Show last 50 lines of stack.sh log from VM"
    echo "  logs stack-tail       Tail stack.sh log from VM in real-time"
    echo ""
    echo -e "${CYAN}Debugging:${NC}"
    echo "  debug logs <service>      Show service logs"
    echo "  debug status [service]    Show service status"
    echo "  debug ovs                 OpenVSwitch diagnostics"
    echo "  debug api                 Test API endpoints"
    echo "  debug network             Network diagnostics"
    echo "  debug compute             Compute diagnostics"
    echo "  debug all <service>       Complete service diagnostics"
    echo ""
    echo -e "${CYAN}Maintenance:${NC}"
    echo "  cleanup               Delete VM completely"
    echo "  help                  Show this help"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  ./devstack.sh setup"
    echo "  ./devstack.sh status"
    echo "  ./devstack.sh shell"
    echo "  ./devstack.sh snapshot create clean-install"
    echo "  ./devstack.sh logs tail"
    echo ""
}

# Check if multipass is installed
if ! command -v multipass &> /dev/null; then
    echo -e "${RED}✗${NC} Multipass is not installed. Please install it first:"
    echo ""
    echo "  macOS:      brew install multipass"
    echo "  Linux/WSL2: sudo snap install multipass"
    echo "  Windows:    choco install multipass"
    echo ""
    echo "Or visit: https://multipass.run/install"
    exit 1
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${BLUE}ℹ${NC} .env file not found, creating from .env.example..."
        cp .env.example .env
        echo -e "${GREEN}✓${NC} .env file created with default values"
        echo -e "${YELLOW}⚠${NC} You can customize settings in .env before running setup"
        echo ""
    else
        echo -e "${RED}✗${NC} .env.example not found"
        exit 1
    fi
fi

# Load environment variables
source .env

VM_NAME=${VM_NAME:-devstack}
COMMAND=$1
shift || true

case "$COMMAND" in
    setup)
        ./lib/setup.sh "$@"
        ;;

    start)
        echo -e "${BLUE}ℹ${NC} Starting VM '${VM_NAME}'..."
        multipass start "$VM_NAME"
        echo -e "${GREEN}✓${NC} VM started"
        show_wsl2_reminder
        ;;

    stop)
        echo -e "${BLUE}ℹ${NC} Stopping VM '${VM_NAME}'..."
        multipass stop "$VM_NAME"
        echo -e "${GREEN}✓${NC} VM stopped"
        ;;

    restart)
        echo -e "${BLUE}ℹ${NC} Restarting VM '${VM_NAME}'..."
        multipass restart "$VM_NAME"
        echo -e "${GREEN}✓${NC} VM restarted"
        ;;

    shell)
        multipass shell "$VM_NAME"
        ;;

    status)
        ./lib/status.sh "$@"
        ;;

    info)
        multipass info "$VM_NAME"
        ;;

    rebuild)
        ./lib/rebuild.sh "$@"
        ;;

    update-config)
        ./lib/update-config.sh "$@"
        ;;

    snapshot)
        ./lib/snapshot.sh "$@"
        ;;

    logs)
        ./lib/logs.sh "$@"
        ;;

    debug)
        ./lib/debug.sh "$@"
        ;;

    services)
        ./lib/services.sh "$@"
        ;;

    cleanup)
        ./lib/cleanup.sh "$@"
        ;;

    help|"")
        show_help
        ;;

    *)
        echo -e "${RED}✗${NC} Unknown command: $COMMAND"
        echo ""
        echo "Run './devstack.sh help' for usage information"
        exit 1
        ;;
esac
