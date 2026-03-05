#!/bin/bash
# Debug Module: Status

set -e

# This module will be sourced by lib/debug.sh
# VM_NAME and colors are available from parent

debug_status() {
    local service="$1"

    # Source service mapping
    source "$(dirname "${BASH_SOURCE[0]}")/../service-map.sh"

    echo -e "${CYAN}=== DevStack Service Status ===${NC}"
    echo ""

    if [ -z "$service" ]; then
        # Show all devstack services
        info "Fetching all DevStack services..."
        echo ""

        local services=$(get_devstack_services)
        if [ -z "$services" ]; then
            warning "No DevStack services found"
            info "Make sure DevStack is installed and services are configured"
            return 1
        fi

        # Get status for all services
        multipass exec "$VM_NAME" -- bash -c '
            RED="\033[0;31m"
            GREEN="\033[0;32m"
            YELLOW="\033[1;33m"
            BLUE="\033[0;34m"
            NC="\033[0m"

            # Service emoji mapping (passed from host)
            declare -A SERVICE_EMOJI=(
                ["keystone"]="🔐"
                ["n-api"]="💻" ["n-cond"]="💻" ["n-sch"]="💻" ["n-cpu"]="💻"
                ["n-novnc"]="🖥️" ["n-api-meta"]="💻" ["n-super-cond"]="💻"
                ["n-cond-cell1"]="💻" ["n-novnc-cell1"]="🖥️"
                ["q-svc"]="🔌" ["q-agt"]="🔌" ["q-dhcp"]="🔌" ["q-l3"]="🔌" ["q-meta"]="🔌"
                ["g-api"]="🖼️"
                ["placement-api"]="📍"
                ["horizon"]="🌐"
                ["c-api"]="💾" ["c-vol"]="💾" ["c-sch"]="💾" ["c-bak"]="💾"
                ["s-proxy"]="📦" ["s-object"]="📦" ["s-container"]="📦" ["s-account"]="📦"
                ["h-api"]="🔥" ["h-api-cfn"]="🔥" ["h-eng"]="🔥" ["heat"]="🔥"
                ["o-api"]="⚖️" ["o-cw"]="⚖️" ["o-hk"]="⚖️" ["o-hm"]="⚖️" ["octavia"]="⚖️"
                ["etcd"]="⚙️"
            )

            echo -e "${GREEN}Service Status:${NC}"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            printf "%-3s %-25s %-15s %-10s\n" "" "SERVICE" "STATUS" "MEMORY"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

            for unit in $(systemctl list-units "devstack@*" --all --no-pager --no-legend | awk "{print \$1}"); do
                service_name=$(echo $unit | sed "s/devstack@//;s/\.service//")
                status=$(systemctl is-active $unit 2>/dev/null || echo "inactive")

                # Get emoji for service
                emoji="${SERVICE_EMOJI[$service_name]:-❓}"

                # Get memory usage if active
                mem_usage="-"
                if [ "$status" = "active" ]; then
                    mem_usage=$(systemctl show $unit -p MemoryCurrent --value 2>/dev/null)
                    if [ -n "$mem_usage" ] && [ "$mem_usage" != "[not set]" ] && [ "$mem_usage" != "0" ]; then
                        mem_mb=$((mem_usage / 1024 / 1024))
                        mem_usage="${mem_mb}M"
                    else
                        mem_usage="-"
                    fi
                fi

                # Color code status
                if [ "$status" = "active" ]; then
                    status_colored="${GREEN}active${NC}"
                elif [ "$status" = "inactive" ]; then
                    status_colored="${YELLOW}inactive${NC}"
                else
                    status_colored="${RED}$status${NC}"
                fi

                printf "%-3s %-25s %-25s %-10s\n" "$emoji" "$service_name" "$(echo -e $status_colored)" "$mem_usage"
            done

            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        '

        echo ""

        # Show system resources
        info "System Resources:"
        multipass exec "$VM_NAME" -- bash -c '
            echo ""
            echo "CPU Usage:"
            top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk "{print \"  Idle: \" \$1 \"%\"}"

            echo ""
            echo "Memory Usage:"
            free -h | grep "Mem:" | awk "{printf \"  Total: %s, Used: %s, Free: %s, Available: %s\n\", \$2, \$3, \$4, \$7}"

            echo ""
            echo "Disk Usage:"
            df -h / | tail -1 | awk "{printf \"  Total: %s, Used: %s (%s), Available: %s\n\", \$2, \$3, \$5, \$4}"
        '

    else
        # Show specific service status
        info "Checking status for service: $service"
        echo ""

        local units=$(get_service_units "$service")

        for unit in $units; do
            echo -e "${CYAN}Service: devstack@${unit}${NC}"

            multipass exec "$VM_NAME" -- bash -c "
                RED='\033[0;31m'
                GREEN='\033[0;32m'
                YELLOW='\033[1;33m'
                NC='\033[0m'

                # Check if service exists
                if ! systemctl list-unit-files | grep -q \"devstack@${unit}.service\"; then
                    echo -e \"\${RED}Service not found\${NC}\"
                    exit 0
                fi

                # Get detailed status
                status=\$(systemctl is-active devstack@${unit}.service 2>/dev/null || echo 'inactive')
                enabled=\$(systemctl is-enabled devstack@${unit}.service 2>/dev/null || echo 'disabled')

                echo -n \"  Status: \"
                if [ \"\$status\" = \"active\" ]; then
                    echo -e \"\${GREEN}\$status\${NC}\"
                else
                    echo -e \"\${RED}\$status\${NC}\"
                fi

                echo \"  Enabled: \$enabled\"

                # Show uptime if active
                if [ \"\$status\" = \"active\" ]; then
                    uptime=\$(systemctl show devstack@${unit}.service -p ActiveEnterTimestamp --value)
                    echo \"  Active since: \$uptime\"

                    # Show main PID and memory
                    pid=\$(systemctl show devstack@${unit}.service -p MainPID --value)
                    if [ -n \"\$pid\" ] && [ \"\$pid\" != \"0\" ]; then
                        echo \"  Main PID: \$pid\"

                        mem=\$(systemctl show devstack@${unit}.service -p MemoryCurrent --value 2>/dev/null)
                        if [ -n \"\$mem\" ] && [ \"\$mem\" != \"[not set]\" ] && [ \"\$mem\" != \"0\" ]; then
                            mem_mb=\$((mem / 1024 / 1024))
                            echo \"  Memory: \${mem_mb}M\"
                        fi
                    fi
                fi

                echo \"\"
            "
        done

        # Show recent log entries
        echo -e "${CYAN}Recent log entries (last 10 lines):${NC}"
        for unit in $units; do
            echo -e "${YELLOW}--- devstack@${unit} ---${NC}"
            multipass exec "$VM_NAME" -- journalctl -u "devstack@${unit}.service" -n 10 --no-pager 2>/dev/null || \
                echo "No logs available"
            echo ""
        done
    fi

    success "Status check completed"
}
