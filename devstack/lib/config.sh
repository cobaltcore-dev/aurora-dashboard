#!/bin/bash
# VM Configuration Management

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

success() {
    echo -e "${GREEN}✓ ${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠ ${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Load .env
if [ ! -f .env ]; then
    error ".env file not found"
    exit 1
fi

source .env
VM_NAME=${VM_NAME:-devstack}

COMMAND=$1
shift || true

case "$COMMAND" in
    show|"")
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║              Current VM Configuration                      ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo -e "${CYAN}VM Resources:${NC}"
        echo "  Name:          $VM_NAME"
        echo "  CPUs:          ${VM_CPUS:-not set}"
        echo "  Memory:        ${VM_MEMORY:-not set}"
        echo "  Disk:          ${VM_DISK:-not set}"
        echo ""
        echo -e "${CYAN}System:${NC}"
        echo "  Ubuntu:        ${UBUNTU_VERSION:-22.04}"
        echo "  DevStack:      ${DEVSTACK_VERSION:-stable/2025.1}"
        echo ""

        # Check if VM exists and show actual resources
        if multipass list 2>/dev/null | grep -q "^${VM_NAME}"; then
            echo -e "${CYAN}Current VM Status:${NC}"
            VM_STATE=$(multipass list | grep "^${VM_NAME}" | awk '{print $2}')
            VM_IP=$(multipass info "$VM_NAME" 2>/dev/null | grep IPv4 | head -1 | awk '{print $2}')

            echo "  State:         $VM_STATE"
            if [ -n "$VM_IP" ]; then
                echo "  IP:            $VM_IP"
            fi

            # Get actual VM specs
            VM_INFO=$(multipass info "$VM_NAME" 2>/dev/null)
            ACTUAL_CPUS=$(echo "$VM_INFO" | grep "CPU(s):" | awk '{print $2}')
            ACTUAL_MEM=$(echo "$VM_INFO" | grep "Memory usage:" | awk '{print $6$7}')
            ACTUAL_DISK=$(echo "$VM_INFO" | grep "Disk usage:" | awk '{print $6$7}')

            echo ""
            echo -e "${CYAN}Actual VM Resources:${NC}"
            echo "  CPUs:          $ACTUAL_CPUS"
            echo "  Memory:        $ACTUAL_MEM"
            echo "  Disk:          $ACTUAL_DISK"
            echo ""

            # Check if configuration matches (only check CPUs for simplicity)
            if [ -n "$ACTUAL_CPUS" ] && [ "$VM_CPUS" != "$ACTUAL_CPUS" ]; then
                warning "CPU configuration mismatch detected!"
                info "Configured: $VM_CPUS cores, Actual: $ACTUAL_CPUS cores"
                info "Run './devstack config apply' to recreate VM with current settings"
            fi
        else
            info "VM does not exist yet. Run './devstack setup' to create it."
        fi
        echo ""
        ;;

    set)
        if [ $# -lt 2 ]; then
            error "Usage: ./devstack config set <key> <value>"
            echo ""
            echo "Available keys:"
            echo "  cpus           Number of CPU cores (e.g., 4)"
            echo "  memory         Amount of RAM (e.g., 8G, 16G)"
            echo "  disk           Disk size (e.g., 40G, 60G)"
            echo "  ubuntu         Ubuntu version (e.g., 22.04, 24.04)"
            echo ""
            info "To change DevStack version:"
            echo "  ./devstack version switch <version>"
            echo ""
            exit 1
        fi

        KEY=$1
        VALUE=$2

        case "$KEY" in
            cpus)
                sed -i "s/^VM_CPUS=.*/VM_CPUS=$VALUE/" .env
                success "VM_CPUS set to $VALUE"
                ;;
            memory|mem|ram)
                sed -i "s/^VM_MEMORY=.*/VM_MEMORY=$VALUE/" .env
                success "VM_MEMORY set to $VALUE"
                ;;
            disk)
                sed -i "s/^VM_DISK=.*/VM_DISK=$VALUE/" .env
                success "VM_DISK set to $VALUE"
                ;;
            ubuntu)
                sed -i "s|^UBUNTU_VERSION=.*|UBUNTU_VERSION=$VALUE|" .env
                success "UBUNTU_VERSION set to $VALUE"
                ;;
            *)
                error "Unknown configuration key: $KEY"
                echo ""
                echo "Available keys:"
                echo "  cpus           Number of CPU cores (e.g., 4)"
                echo "  memory         Amount of RAM (e.g., 8G, 16G)"
                echo "  disk           Disk size (e.g., 40G, 60G)"
                echo "  ubuntu         Ubuntu version (e.g., 22.04, 24.04)"
                echo ""
                info "To change DevStack version:"
                echo "  ./devstack version switch <version>"
                echo ""
                exit 1
                ;;
        esac

        echo ""
        info "Configuration updated in .env"

        # Check if VM exists
        if multipass list 2>/dev/null | grep -q "^${VM_NAME}"; then
            warning "VM already exists with old configuration"
            info "To apply changes, run: ./devstack config apply"
        fi
        ;;

    apply)
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║           Apply Configuration Changes                      ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        if ! multipass list 2>/dev/null | grep -q "^${VM_NAME}"; then
            error "VM does not exist. Run './devstack setup' first."
            exit 1
        fi

        warning "This will DELETE the current VM and recreate it with new settings"
        warning "All data in the VM will be LOST!"
        echo ""
        info "Current .env configuration:"
        echo "  CPUs:          $VM_CPUS"
        echo "  Memory:        $VM_MEMORY"
        echo "  Disk:          $VM_DISK"
        echo "  Ubuntu:        ${UBUNTU_VERSION:-22.04}"
        echo ""

        # Ask about snapshot
        info "Create automatic safety snapshot before rebuilding?"
        echo "  Snapshot name: before-config-apply"
        echo ""
        read -p "Create snapshot? (Y/n): " -n 1 -r
        echo
        echo

        CREATE_SNAPSHOT=true
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            CREATE_SNAPSHOT=false
            warning "Proceeding without snapshot - VM cannot be easily restored!"
            echo ""
        fi

        read -p "Continue with rebuild? (y/N): " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Cancelled"
            exit 0
        fi

        echo ""

        # Create snapshot if requested
        if [ "$CREATE_SNAPSHOT" = true ]; then
            # Generate unique snapshot name with nanoseconds to avoid collisions
            SNAPSHOT_NAME="before-config-apply-$(date +%Y%m%d-%H%M%S)-$$"
            info "Creating snapshot: $SNAPSHOT_NAME"
            if multipass snapshot "$VM_NAME" --name "$SNAPSHOT_NAME" >/dev/null 2>&1; then
                success "Snapshot created: $SNAPSHOT_NAME"
                info "To restore: ./devstack snapshot restore $SNAPSHOT_NAME"
                echo ""
                info "Snapshot will be kept for manual cleanup"
                info "List snapshots: ./devstack snapshot list"
                info "Delete old snapshots: ./devstack snapshot delete <name>"
            else
                error "Failed to create snapshot"
                read -p "Continue anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    info "Cancelled"
                    exit 0
                fi
            fi
            echo ""
        fi

        info "Applying configuration..."
        ./lib/rebuild.sh
        ;;

    resize)
        if [ $# -lt 2 ]; then
            error "Usage: ./devstack config resize <resource> <value>"
            echo ""
            echo "Resources:"
            echo "  cpus <number>       Resize CPU count (e.g., 4, 8)"
            echo "  memory <size>       Resize memory (e.g., 8G, 16G)"
            echo "  disk <size>         Resize disk (e.g., 60G, 80G)"
            echo ""
            echo "Note: Changes require VM restart and may need rebuild for some resources"
            exit 1
        fi

        RESOURCE=$1
        SIZE=$2

        if ! multipass list 2>/dev/null | grep -q "^${VM_NAME}"; then
            error "VM does not exist. Run './devstack setup' first."
            exit 1
        fi

        # Get current value
        VM_INFO=$(multipass info "$VM_NAME" 2>/dev/null)
        CURRENT_CPUS=$(echo "$VM_INFO" | grep "CPU(s):" | awk '{print $2}')
        CURRENT_MEM=$(echo "$VM_INFO" | grep "Memory usage:" | awk '{print $6$7}')
        CURRENT_DISK=$(echo "$VM_INFO" | grep "Disk usage:" | awk '{print $6$7}')

        case "$RESOURCE" in
            cpus)
                echo ""
                info "Current CPUs: $CURRENT_CPUS"
                info "New CPUs: $SIZE"
                echo ""
                warning "This will RESTART the VM"
                warning "OpenStack services will be briefly unavailable"
                echo ""
                read -p "Continue? (y/N): " -n 1 -r
                echo

                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    info "Cancelled"
                    exit 0
                fi

                info "Stopping VM..."
                multipass stop "$VM_NAME" 2>/dev/null || true

                info "Resizing CPUs to $SIZE..."
                multipass set "local.$VM_NAME.cpus=$SIZE"

                # Update .env
                sed -i "s/^VM_CPUS=.*/VM_CPUS=$SIZE/" .env

                info "Starting VM..."
                multipass start "$VM_NAME"

                success "CPUs resized to $SIZE"
                ;;

            memory|mem|ram)
                echo ""
                info "Current Memory: $CURRENT_MEM"
                info "New Memory: $SIZE"
                echo ""
                warning "This will RESTART the VM"
                warning "OpenStack services will be briefly unavailable"
                echo ""
                read -p "Continue? (y/N): " -n 1 -r
                echo

                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    info "Cancelled"
                    exit 0
                fi

                info "Stopping VM..."
                multipass stop "$VM_NAME" 2>/dev/null || true

                info "Resizing memory to $SIZE..."
                multipass set "local.$VM_NAME.memory=$SIZE"

                # Update .env
                sed -i "s/^VM_MEMORY=.*/VM_MEMORY=$SIZE/" .env

                info "Starting VM..."
                multipass start "$VM_NAME"

                success "Memory resized to $SIZE"
                ;;

            disk)
                echo ""
                info "Current Disk: $CURRENT_DISK"
                info "New Disk: $SIZE"
                echo ""
                info "Disk can only be INCREASED, not decreased"
                warning "This change is IRREVERSIBLE without rebuilding the VM"
                echo ""
                read -p "Continue? (y/N): " -n 1 -r
                echo

                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    info "Cancelled"
                    exit 0
                fi

                info "Resizing disk to $SIZE..."
                multipass set "local.$VM_NAME.disk=$SIZE"

                # Update .env
                sed -i "s/^VM_DISK=.*/VM_DISK=$SIZE/" .env

                success "Disk resized to $SIZE"
                info "VM restart not required for disk resize"
                ;;

            *)
                error "Unknown resource: $RESOURCE"
                exit 1
                ;;
        esac

        echo ""
        success "Configuration applied and .env updated"
        ;;

    *)
        error "Unknown command: $COMMAND"
        echo ""
        echo "Usage: ./devstack config <command>"
        echo ""
        echo "Commands:"
        echo "  show              Show current configuration"
        echo "  set <key> <val>   Set configuration value in .env"
        echo "  apply             Apply .env changes (recreates VM)"
        echo "  resize <res> <val> Resize running VM resources"
        echo ""
        exit 1
        ;;
esac
