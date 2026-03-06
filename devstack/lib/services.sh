#!/bin/bash
# DevStack Services Management
set -e

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Source shared libraries
source "$SCRIPT_DIR/output.sh"
source "$SCRIPT_DIR/env-loader.sh"
source "$SCRIPT_DIR/utils.sh"

# Load environment
load_env

# Service definitions with metadata
declare -A SERVICE_INFO=(
    ["cinder"]="💾:Block Storage:Persistent volumes for VMs"
    ["swift"]="📦:Object Storage:S3-like object storage"
    ["heat"]="🔥:Orchestration:Infrastructure as Code templates"
    ["octavia"]="⚖️:Load Balancer:L7 Load Balancing as a Service"
    ["designate"]="🌍:DNS:DNS as a Service"
    ["barbican"]="🔑:Key Management:Secrets and certificate management"
    ["manila"]="📁:Shared Filesystems:NFS/CIFS as a Service"
    ["ironic"]="🔨:Bare Metal:Physical server provisioning"
)

# Get current services from .env
get_current_services() {
    local services=$(grep "^ENABLE_SERVICES=" .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'" | xargs)
    echo "$services"
}

# Update .env file with new services
update_env_services() {
    local new_services="$1"

    # Check if ENABLE_SERVICES exists in .env
    if grep -q "^ENABLE_SERVICES=" .env; then
        # Update existing line
        fix_sed "s/^ENABLE_SERVICES=.*/ENABLE_SERVICES=$new_services/" .env
    else
        # Add new line
        echo "ENABLE_SERVICES=$new_services" >> .env
    fi
}

# Validate service name
is_valid_service() {
    local service="$1"
    [[ -n "${SERVICE_INFO[$service]}" ]]
}

# Show available services
show_available() {
    echo ""
    echo -e "${CYAN}Available OpenStack Services:${NC}"
    echo ""

    for service in $(echo "${!SERVICE_INFO[@]}" | tr ' ' '\n' | sort); do
        IFS=':' read -r icon name description <<< "${SERVICE_INFO[$service]}"
        printf "  ${icon} %-12s - %s\n" "$service" "$name"
        printf "     %s\n" "$description"
        echo ""
    done

    echo -e "${YELLOW}Core Services (always enabled):${NC}"
    echo "  🔐 keystone   - Identity (Authentication)"
    echo "  💻 nova       - Compute (Virtual Machines)"
    echo "  🔌 neutron    - Networking"
    echo "  🖼️ glance     - Images"
    echo "  📍 placement  - Resource Placement"
    echo "  🌐 horizon    - Dashboard (Web UI)"
    echo ""
}

# Show currently enabled services
show_list() {
    local current=$(get_current_services)

    echo ""
    if [ -z "$current" ]; then
        echo -e "${YELLOW}No additional services configured${NC}"
        echo ""
        echo -e "${CYAN}Core Services (always enabled):${NC}"
        echo "  🔐 keystone   - Identity & Authentication"
        echo "  💻 nova       - Compute (Virtual Machines)"
        echo "  🔌 neutron    - Networking"
        echo "  🖼️ glance     - Images"
        echo "  📍 placement  - Resource Placement"
        echo "  🌐 horizon    - Dashboard (Web UI)"
        echo ""
        info "Add services with: ./devstack services add <service>"
        info "See available services: ./devstack services available"
    else
        echo -e "${CYAN}Configured Additional Services:${NC}"
        echo ""

        IFS=',' read -ra SERVICES <<< "$current"
        for service in "${SERVICES[@]}"; do
            service=$(echo "$service" | xargs) # trim
            if [[ -n "${SERVICE_INFO[$service]}" ]]; then
                IFS=':' read -r icon name description <<< "${SERVICE_INFO[$service]}"
                printf "  ${icon} %-12s - %s\n" "$service" "$name"
                printf "     ${description}\n"
                echo ""
            else
                printf "  ❓ %-12s - Unknown service\n" "$service"
                echo ""
            fi
        done

        echo -e "${CYAN}Core Services (always enabled):${NC}"
        echo "  🔐 keystone   - Identity & Authentication"
        echo "  💻 nova       - Compute (Virtual Machines)"
        echo "  🔌 neutron    - Networking"
        echo "  🖼️ glance     - Images"
        echo "  📍 placement  - Resource Placement"
        echo "  🌐 horizon    - Dashboard (Web UI)"
        echo ""
    fi
}

# Add services
add_services() {
    local services_to_add=("$@")

    if [ ${#services_to_add[@]} -eq 0 ]; then
        error "No services specified"
        info "Usage: ./devstack services add <service1> [service2] [...]"
        echo ""

        # Get current services
        local current=$(get_current_services)
        local current_array=()
        if [ -n "$current" ]; then
            IFS=',' read -ra current_array <<< "$current"
        fi

        # Show available (not yet enabled) services
        local available=()
        for service in $(echo "${!SERVICE_INFO[@]}" | tr ' ' '\n' | sort); do
            if [[ ! " ${current_array[*]} " =~ " ${service} " ]]; then
                available+=("$service")
            fi
        done

        if [ ${#available[@]} -gt 0 ]; then
            echo -e "${CYAN}Available services to add:${NC}"
            for service in "${available[@]}"; do
                IFS=':' read -r icon name description <<< "${SERVICE_INFO[$service]}"
                printf "  ${icon} %-12s - %s\n" "$service" "$name"
            done
        else
            echo -e "${GREEN}All services are already enabled!${NC}"
        fi
        echo ""
        info "Example: ./devstack services add cinder heat"
        exit 1
    fi

    # Validate all services first
    local invalid_services=()
    for service in "${services_to_add[@]}"; do
        if ! is_valid_service "$service"; then
            invalid_services+=("$service")
        fi
    done

    if [ ${#invalid_services[@]} -gt 0 ]; then
        error "Invalid service(s): ${invalid_services[*]}"
        echo ""
        info "Available services:"
        for service in $(echo "${!SERVICE_INFO[@]}" | tr ' ' '\n' | sort); do
            echo "  - $service"
        done
        exit 1
    fi

    # Get current services
    local current=$(get_current_services)
    local current_array=()
    if [ -n "$current" ]; then
        IFS=',' read -ra current_array <<< "$current"
    fi

    # Add new services (avoid duplicates)
    local added=()
    local already_enabled=()

    for service in "${services_to_add[@]}"; do
        if [[ " ${current_array[*]} " =~ " ${service} " ]]; then
            already_enabled+=("$service")
        else
            current_array+=("$service")
            added+=("$service")
        fi
    done

    if [ ${#already_enabled[@]} -gt 0 ]; then
        warning "Already enabled: ${already_enabled[*]}"
    fi

    if [ ${#added[@]} -eq 0 ]; then
        info "No changes made"
        exit 0
    fi

    # Update .env
    local new_services=$(IFS=','; echo "${current_array[*]}")
    update_env_services "$new_services"

    success "Added: ${added[*]}"
    echo ""
    info "Current services: $new_services"
    echo ""
    warning "VM rebuild required for changes to take effect"
    echo "  Run: ${GREEN}./devstack rebuild${NC}"
    echo ""
}

# Remove services
remove_services() {
    local services_to_remove=("$@")

    if [ ${#services_to_remove[@]} -eq 0 ]; then
        error "No services specified"
        info "Usage: ./devstack services remove <service1> [service2] [...]"
        info "Example: ./devstack services remove swift manila"
        exit 1
    fi

    # Get current services
    local current=$(get_current_services)

    if [ -z "$current" ]; then
        warning "No services configured"
        exit 0
    fi

    IFS=',' read -ra current_array <<< "$current"

    # Remove services
    local new_array=()
    local removed=()
    local not_found=()

    for service in "${current_array[@]}"; do
        service=$(echo "$service" | xargs) # trim
        if [[ " ${services_to_remove[*]} " =~ " ${service} " ]]; then
            removed+=("$service")
        else
            new_array+=("$service")
        fi
    done

    # Check for services that weren't found
    for service in "${services_to_remove[@]}"; do
        if [[ ! " ${removed[*]} " =~ " ${service} " ]]; then
            not_found+=("$service")
        fi
    done

    if [ ${#not_found[@]} -gt 0 ]; then
        warning "Not configured: ${not_found[*]}"
    fi

    if [ ${#removed[@]} -eq 0 ]; then
        info "No changes made"
        exit 0
    fi

    # Update .env
    local new_services=$(IFS=','; echo "${new_array[*]}")
    update_env_services "$new_services"

    success "Removed: ${removed[*]}"
    echo ""
    if [ -z "$new_services" ]; then
        info "Current services: (none)"
    else
        info "Current services: $new_services"
    fi
    echo ""
    warning "VM rebuild required for changes to take effect"
    echo "  Run: ${GREEN}./devstack rebuild${NC}"
    echo ""
}

# Set services (replace all)
enable_services() {
    local services_list="$1"

    if [ -z "$services_list" ]; then
        error "No services specified"
        info "Usage: ./devstack services enable <service1,service2,...>"
        info "Example: ./devstack services enable cinder,heat,barbican"
        exit 1
    fi

    # Parse and validate
    IFS=',' read -ra services_array <<< "$services_list"
    local invalid_services=()

    for service in "${services_array[@]}"; do
        service=$(echo "$service" | xargs) # trim
        if ! is_valid_service "$service"; then
            invalid_services+=("$service")
        fi
    done

    if [ ${#invalid_services[@]} -gt 0 ]; then
        error "Invalid service(s): ${invalid_services[*]}"
        exit 1
    fi

    # Get current for comparison
    local current=$(get_current_services)

    # Update .env
    update_env_services "$services_list"

    success "Services set to: $services_list"
    if [ -n "$current" ] && [ "$current" != "$services_list" ]; then
        warning "Previous services ($current) have been replaced"
    fi
    echo ""
    warning "VM rebuild required for changes to take effect"
    echo "  Run: ${GREEN}./devstack rebuild${NC}"
    echo ""
}

# Show help
show_help() {
    echo ""
    echo -e "${CYAN}DevStack Services Management${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./devstack services <command> [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  ${GREEN}list${NC}                         Show currently configured services"
    echo "  ${GREEN}available${NC}                    Show all available services"
    echo "  ${GREEN}add${NC} <service> [...]          Add one or more services"
    echo "  ${GREEN}remove${NC} <service> [...]       Remove one or more services"
    echo "  ${GREEN}enable${NC} <svc1,svc2,...>       Set services (replaces all)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./devstack services list"
    echo "  ./devstack services available"
    echo "  ./devstack services add cinder"
    echo "  ./devstack services add cinder heat barbican"
    echo "  ./devstack services remove swift"
    echo "  ./devstack services enable cinder,heat"
    echo ""
    echo -e "${YELLOW}Notes:${NC}"
    echo "  - Core services (keystone, nova, neutron, glance, placement, horizon)"
    echo "    are always enabled and cannot be removed"
    echo "  - Changes require VM rebuild: ./devstack rebuild"
    echo "  - See docs/SERVICES.md for detailed service information"
    echo ""
}

# Main command routing
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    list|ls)
        show_list
        ;;

    available|avail)
        show_available
        ;;

    add)
        add_services "$@"
        ;;

    remove|rm)
        remove_services "$@"
        ;;

    enable|set)
        enable_services "$1"
        ;;

    help|--help|-h|"")
        show_help
        ;;

    *)
        error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
