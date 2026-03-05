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

# Load environment variables if .env exists
if [ -f .env ]; then
    source .env
fi

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
