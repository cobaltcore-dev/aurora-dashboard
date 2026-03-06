#!/bin/bash
# DevStack Version Management

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
    show|current|"")
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║              DevStack Version Information                  ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        echo -e "${CYAN}Configured Version (in .env):${NC}"
        echo "  $DEVSTACK_VERSION"
        echo ""

        # Check if VM exists and get actual version
        if multipass list 2>/dev/null | grep -q "^${VM_NAME}.*Running"; then
            # Check if DevStack is installed
            if multipass exec "$VM_NAME" -- sudo test -d /home/stack/devstack 2>/dev/null; then
                echo -e "${CYAN}Installed Version (in VM):${NC}"

                INSTALLED_VERSION=$(multipass exec "$VM_NAME" -- sudo -u stack bash -c "cd /home/stack/devstack && git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null" || echo "unknown")
                INSTALLED_COMMIT=$(multipass exec "$VM_NAME" -- sudo -u stack bash -c "cd /home/stack/devstack && git rev-parse --short HEAD 2>/dev/null" || echo "unknown")

                echo "  Branch: $INSTALLED_VERSION"
                echo "  Commit: $INSTALLED_COMMIT"
                echo ""

                if [ "$DEVSTACK_VERSION" != "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" != "unknown" ]; then
                    warning "Version mismatch detected!"
                    info "Configured: $DEVSTACK_VERSION"
                    info "Installed:  $INSTALLED_VERSION"
                    echo ""
                    info "To update: ./devstack version switch $DEVSTACK_VERSION"
                fi
            else
                warning "DevStack is not installed in VM"
                info "Run './devstack setup' to install version: $DEVSTACK_VERSION"
            fi
        else
            warning "VM is not running or does not exist"
            info "Version will be installed on next setup"
        fi
        echo ""
        ;;

    list|available)
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║           Available DevStack Versions                      ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        # Version names mapping
        declare -A VERSION_NAMES
        VERSION_NAMES["stable/2025.2"]="Future"
        VERSION_NAMES["stable/2025.1"]="Epoxy (Latest)"
        VERSION_NAMES["stable/2024.2"]="Dalmatian"
        VERSION_NAMES["stable/2024.1"]="Caracal"
        VERSION_NAMES["stable/2023.2"]="Bobcat"
        VERSION_NAMES["stable/2023.1"]="Antelope"
        VERSION_NAMES["stable/zed"]="Zed"
        VERSION_NAMES["stable/yoga"]="Yoga"
        VERSION_NAMES["stable/xena"]="Xena"
        VERSION_NAMES["stable/wallaby"]="Wallaby"
        VERSION_NAMES["stable/victoria"]="Victoria"

        # Show stable releases (latest 5)
        echo -e "${CYAN}Stable Releases (Recommended):${NC}"
        printf "  %-20s %-20s %s\n" "Version" "Release Name" "Ubuntu"
        printf "  %-20s %-20s %s\n" "-------" "------------" "------"
        printf "  %-20s %-20s %s\n" "stable/2025.1" "${VERSION_NAMES[stable/2025.1]}" "22.04, 24.04"
        printf "  %-20s %-20s %s\n" "stable/2024.2" "${VERSION_NAMES[stable/2024.2]}" "22.04, 24.04"
        printf "  %-20s %-20s %s\n" "stable/2024.1" "${VERSION_NAMES[stable/2024.1]}" "22.04"
        printf "  %-20s %-20s %s\n" "stable/2023.2" "${VERSION_NAMES[stable/2023.2]}" "22.04"
        printf "  %-20s %-20s %s\n" "stable/2023.1" "${VERSION_NAMES[stable/2023.1]}" "22.04"
        echo ""

        # Show master
        echo -e "${CYAN}Development:${NC}"
        printf "  %-20s %-20s %s\n" "master" "Latest" "24.04"
        echo ""

        # Show legacy
        echo -e "${CYAN}Legacy (older releases):${NC}"
        printf "  %-20s %-20s %s\n" "stable/zed" "${VERSION_NAMES[stable/zed]}" "20.04, 22.04"
        printf "  %-20s %-20s %s\n" "stable/yoga" "${VERSION_NAMES[stable/yoga]}" "20.04, 22.04"
        printf "  %-20s %-20s %s\n" "stable/xena" "${VERSION_NAMES[stable/xena]}" "20.04"
        printf "  %-20s %-20s %s\n" "stable/wallaby" "${VERSION_NAMES[stable/wallaby]}" "20.04"
        printf "  %-20s %-20s %s\n" "stable/victoria" "${VERSION_NAMES[stable/victoria]}" "20.04"
        echo ""

        info "DevStack supports the two latest Ubuntu LTS releases"
        info "Source: https://docs.openstack.org/devstack/latest/"
        echo ""
        ;;

    switch|change|update)
        if [ $# -lt 1 ]; then
            error "Usage: ./devstack version switch <version>"
            echo ""
            echo "Examples:"
            echo "  ./devstack version switch stable/2025.1"
            echo "  ./devstack version switch master"
            echo ""
            echo "Use './devstack version list' to see available versions"
            exit 1
        fi

        NEW_VERSION=$1

        if ! multipass list 2>/dev/null | grep -q "^${VM_NAME}"; then
            error "VM does not exist. Run './devstack setup' first."
            exit 1
        fi

        if ! multipass list 2>/dev/null | grep -q "^${VM_NAME}.*Running"; then
            error "VM is not running. Start it with './devstack start'"
            exit 1
        fi

        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║           Switch DevStack Version                          ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        # Get current version
        CURRENT_VERSION=$(multipass exec "$VM_NAME" -- bash -c "cd /home/stack/devstack && git rev-parse --abbrev-ref HEAD" || echo "unknown")

        echo -e "${CYAN}Version Change:${NC}"
        echo "  Current: $CURRENT_VERSION"
        echo "  New:     $NEW_VERSION"
        echo ""

        warning "This will reinstall DevStack with the new version"
        warning "All OpenStack data (VMs, networks, volumes) will be LOST!"
        warning "DevStack configuration and services will be reset"
        echo ""
        info "What will be preserved:"
        echo "  ✓ VM resources (CPUs, RAM, Disk)"
        echo "  ✓ Ubuntu system"
        echo "  ✓ .env configuration"
        echo ""
        info "What will be lost:"
        echo "  ✗ All OpenStack VMs and instances"
        echo "  ✗ Networks, routers, security groups"
        echo "  ✗ Volumes and snapshots"
        echo "  ✗ Images (can be re-uploaded)"
        echo ""
        info "This process takes approximately 15-20 minutes"
        echo ""

        # Ask about snapshot
        info "Create automatic safety snapshot before switching?"
        echo "  Snapshot name: before-switch-to-$NEW_VERSION"
        echo ""
        read -p "Create snapshot? (Y/n): " -n 1 -r
        echo
        echo

        CREATE_SNAPSHOT=true
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            CREATE_SNAPSHOT=false
            warning "Proceeding without snapshot - changes cannot be easily reverted!"
            echo ""
        fi

        read -p "Continue with version switch? (y/N): " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Cancelled"
            exit 0
        fi

        echo ""

        # Create snapshot if requested
        if [ "$CREATE_SNAPSHOT" = true ]; then
            SNAPSHOT_NAME="before-switch-to-${NEW_VERSION//\//-}"

            # Check if snapshot already exists
            if multipass info "$VM_NAME" 2>/dev/null | grep -q "^${SNAPSHOT_NAME}"; then
                warning "Snapshot '$SNAPSHOT_NAME' already exists"
                # Add timestamp to make it unique
                SNAPSHOT_NAME="${SNAPSHOT_NAME}-$(date +%Y%m%d-%H%M%S)"
                info "Using unique name: $SNAPSHOT_NAME"
            fi

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
        info "Switching to DevStack $NEW_VERSION..."
        echo ""

        # Step 1: Check if version exists
        info "Verifying version exists in repository..."
        if ! multipass exec "$VM_NAME" -- bash -c "cd /home/stack/devstack && git fetch origin && git rev-parse --verify origin/$NEW_VERSION" >/dev/null 2>&1; then
            error "Version '$NEW_VERSION' not found in repository"
            info "Use './devstack version list' to see available versions"
            exit 1
        fi
        success "Version verified"

        # Step 2: Stop DevStack services
        info "Stopping DevStack services..."
        multipass exec "$VM_NAME" -- sudo -u stack bash -c "cd /home/stack/devstack && ./unstack.sh" 2>/dev/null || true
        success "Services stopped"

        # Step 3: Clean DevStack
        info "Cleaning previous installation..."
        multipass exec "$VM_NAME" -- sudo -u stack bash -c "cd /home/stack/devstack && ./clean.sh" 2>/dev/null || true
        success "Cleaned"

        # Step 4: Checkout new version
        info "Checking out $NEW_VERSION..."
        multipass exec "$VM_NAME" -- bash -c "cd /home/stack/devstack && git checkout $NEW_VERSION && git pull origin $NEW_VERSION"
        success "Checked out $NEW_VERSION"

        # Step 5: Update .env
        info "Updating .env configuration..."
        sed -i "s|^DEVSTACK_VERSION=.*|DEVSTACK_VERSION=$NEW_VERSION|" .env
        success ".env updated"

        # Step 6: Regenerate local.conf
        info "Regenerating local.conf..."
        multipass transfer scripts/generate-local-conf.sh "${VM_NAME}:/tmp/"
        multipass exec "$VM_NAME" -- chmod +x /tmp/generate-local-conf.sh
        multipass exec "$VM_NAME" -- sudo -u stack /tmp/generate-local-conf.sh
        success "local.conf regenerated"

        # Step 7: Run stack.sh
        info "Starting DevStack installation..."
        info "This will take approximately 15-20 minutes"
        echo ""

        multipass exec "$VM_NAME" -- sudo -u stack bash -c "cd /home/stack/devstack && ./stack.sh" || {
            error "DevStack installation failed!"
            echo ""
            info "Check logs with:"
            echo "  ./devstack logs stack-tail"
            echo "  ./devstack shell"
            echo "  tail -f /opt/stack/logs/stack.sh.log"
            exit 1
        }

        echo ""
        success "DevStack successfully updated to $NEW_VERSION!"
        echo ""

        info "Verifying installation..."
        ./lib/status.sh "$VM_NAME"
        ;;

    *)
        error "Unknown command: $COMMAND"
        echo ""
        echo "Usage: ./devstack version <command>"
        echo ""
        echo "Commands:"
        echo "  show              Show current DevStack version"
        echo "  list              Show available versions"
        echo "  switch <version>  Switch to different version (reinstalls DevStack)"
        echo ""
        echo "To set version in .env without changing VM:"
        echo "  ./devstack config set devstack <version>"
        echo ""
        exit 1
        ;;
esac
