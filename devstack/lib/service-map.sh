#!/bin/bash
# Service Mapping - Central service metadata for consistent display

# Service name to emoji and description mapping
# Format: "emoji:full_name:description"
declare -gA SERVICE_MAP=(
    # Core Services
    ["keystone"]="🔐:Keystone:Identity & Authentication"
    ["n-api"]="💻:Nova API:Compute API Server"
    ["n-cond"]="💻:Nova Conductor:Compute Orchestration"
    ["n-sch"]="💻:Nova Scheduler:Compute Scheduling"
    ["n-cpu"]="💻:Nova Compute:Hypervisor Manager"
    ["n-novnc"]="🖥️:NoVNC:Console Proxy"
    ["n-api-meta"]="💻:Nova Metadata:Metadata Service"
    ["n-super-cond"]="💻:Nova Super Conductor:Super Conductor"
    ["n-cond-cell1"]="💻:Nova Conductor Cell1:Cell1 Conductor"
    ["n-novnc-cell1"]="🖥️:NoVNC Cell1:Console Cell1"
    ["q-svc"]="🔌:Neutron API:Network API Server"
    ["q-agt"]="🔌:Neutron Agent:Network Agent"
    ["q-dhcp"]="🔌:Neutron DHCP:DHCP Agent"
    ["q-l3"]="🔌:Neutron L3:L3 Router Agent"
    ["q-meta"]="🔌:Neutron Metadata:Metadata Agent"
    ["g-api"]="🖼️:Glance API:Image Service"
    ["placement-api"]="📍:Placement:Resource Placement"
    ["horizon"]="🌐:Horizon:Web Dashboard"

    # Optional Services
    ["c-api"]="💾:Cinder API:Block Storage API"
    ["c-vol"]="💾:Cinder Volume:Volume Manager"
    ["c-sch"]="💾:Cinder Scheduler:Volume Scheduler"
    ["c-bak"]="💾:Cinder Backup:Volume Backup"
    ["s-proxy"]="📦:Swift Proxy:Object Storage Proxy"
    ["s-object"]="📦:Swift Object:Object Server"
    ["s-container"]="📦:Swift Container:Container Server"
    ["s-account"]="📦:Swift Account:Account Server"
    ["h-api"]="🔥:Heat API:Orchestration API"
    ["h-api-cfn"]="🔥:Heat CFN:CloudFormation API"
    ["h-eng"]="🔥:Heat Engine:Orchestration Engine"
    ["heat"]="🔥:Heat:Orchestration Service"
    ["o-api"]="⚖️:Octavia API:Load Balancer API"
    ["o-cw"]="⚖️:Octavia Worker:LB Controller Worker"
    ["o-hk"]="⚖️:Octavia Housekeeping:LB Housekeeping"
    ["o-hm"]="⚖️:Octavia Health:LB Health Manager"
    ["octavia"]="⚖️:Octavia:Load Balancer Service"

    # Other
    ["etcd"]="⚙️:etcd:Key-Value Store"
)

# Get service emoji
get_service_emoji() {
    local service="$1"
    local info="${SERVICE_MAP[$service]}"

    if [ -n "$info" ]; then
        echo "$info" | cut -d: -f1
    else
        echo "❓"
    fi
}

# Get service full name
get_service_name() {
    local service="$1"
    local info="${SERVICE_MAP[$service]}"

    if [ -n "$info" ]; then
        echo "$info" | cut -d: -f2
    else
        echo "$service"
    fi
}

# Get service description
get_service_description() {
    local service="$1"
    local info="${SERVICE_MAP[$service]}"

    if [ -n "$info" ]; then
        echo "$info" | cut -d: -f3
    else
        echo "OpenStack Service"
    fi
}

# Format service for display
format_service() {
    local service="$1"
    local emoji=$(get_service_emoji "$service")
    local name=$(get_service_name "$service")
    local desc=$(get_service_description "$service")

    printf "%s %-20s - %s\n" "$emoji" "$name" "$desc"
}

# Group services by category
get_service_category() {
    local service="$1"

    case "$service" in
        keystone)
            echo "identity"
            ;;
        n-*)
            echo "compute"
            ;;
        q-*)
            echo "network"
            ;;
        g-*)
            echo "image"
            ;;
        c-*)
            echo "block-storage"
            ;;
        s-*)
            echo "object-storage"
            ;;
        h-*|heat)
            echo "orchestration"
            ;;
        o-*|octavia)
            echo "load-balancer"
            ;;
        placement*)
            echo "placement"
            ;;
        horizon)
            echo "dashboard"
            ;;
        etcd)
            echo "infrastructure"
            ;;
        *)
            echo "other"
            ;;
    esac
}
