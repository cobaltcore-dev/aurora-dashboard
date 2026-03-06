#!/bin/bash
# Debug Module: API

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared libraries
source "$SCRIPT_DIR/../output.sh"

# This module will be sourced by lib/debug.sh
# VM_NAME is available from parent

debug_api() {
    local service="$1"

    echo -e "${CYAN}=== API Endpoint Testing ===${NC}"
    echo ""

    info "Testing $service API endpoints..."
    echo ""

    # Source OpenStack credentials
    multipass exec "$VM_NAME" -- bash -c "
        # Load DevStack environment
        if [ -f /opt/stack/devstack/openrc ]; then
            source /opt/stack/devstack/openrc admin admin
        else
            echo 'Error: openrc file not found'
            exit 1
        fi

        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        CYAN='\033[0;36m'
        NC='\033[0m'

        # Test based on service type
        case '$service' in
            keystone)
                echo -e \"\${CYAN}Keystone (Identity) API:\${NC}\"
                echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"

                # Get token
                echo \"Testing authentication...\"
                if openstack token issue &>/dev/null; then
                    echo -e \"\${GREEN}✓ Authentication successful\${NC}\"
                    token_info=\$(openstack token issue -f value -c expires)
                    echo \"  Token expires: \$token_info\"
                else
                    echo -e \"\${RED}✗ Authentication failed\${NC}\"
                fi
                echo \"\"

                # List domains
                echo \"Testing domain list...\"
                domains=\$(openstack domain list -f value -c Name 2>/dev/null | wc -l)
                if [ \$domains -gt 0 ]; then
                    echo -e \"\${GREEN}✓ Found \$domains domain(s)\${NC}\"
                else
                    echo -e \"\${RED}✗ Failed to list domains\${NC}\"
                fi
                echo \"\"

                # List projects
                echo \"Testing project list...\"
                projects=\$(openstack project list -f value -c Name 2>/dev/null | wc -l)
                if [ \$projects -gt 0 ]; then
                    echo -e \"\${GREEN}✓ Found \$projects project(s)\${NC}\"
                    openstack project list --long
                else
                    echo -e \"\${RED}✗ Failed to list projects\${NC}\"
                fi
                echo \"\"

                # List users
                echo \"Testing user list...\"
                users=\$(openstack user list -f value -c Name 2>/dev/null | wc -l)
                if [ \$users -gt 0 ]; then
                    echo -e \"\${GREEN}✓ Found \$users user(s)\${NC}\"
                else
                    echo -e \"\${RED}✗ Failed to list users\${NC}\"
                fi
                ;;

            nova|n-api)
                echo -e \"\${CYAN}Nova (Compute) API:\${NC}\"
                echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"

                # Test service list
                echo \"Testing service list...\"
                if openstack compute service list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Compute service list successful\${NC}\"
                    openstack compute service list
                else
                    echo -e \"\${RED}✗ Failed to list compute services\${NC}\"
                fi
                echo \"\"

                # Test hypervisor list
                echo \"Testing hypervisor list...\"
                if openstack hypervisor list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Hypervisor list successful\${NC}\"
                    openstack hypervisor list
                else
                    echo -e \"\${RED}✗ Failed to list hypervisors\${NC}\"
                fi
                echo \"\"

                # Test flavor list
                echo \"Testing flavor list...\"
                flavors=\$(openstack flavor list -f value -c Name 2>/dev/null | wc -l)
                if [ \$flavors -gt 0 ]; then
                    echo -e \"\${GREEN}✓ Found \$flavors flavor(s)\${NC}\"
                    openstack flavor list
                else
                    echo -e \"\${RED}✗ Failed to list flavors\${NC}\"
                fi
                echo \"\"

                # Test server list
                echo \"Testing server list...\"
                if openstack server list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Server list successful\${NC}\"
                    servers=\$(openstack server list -f value -c Name 2>/dev/null | wc -l)
                    echo \"  Active servers: \$servers\"
                else
                    echo -e \"\${RED}✗ Failed to list servers\${NC}\"
                fi
                ;;

            neutron|q-svc)
                echo -e \"\${CYAN}Neutron (Network) API:\${NC}\"
                echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"

                # Test agent list
                echo \"Testing agent list...\"
                if openstack network agent list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Network agent list successful\${NC}\"
                    openstack network agent list
                else
                    echo -e \"\${RED}✗ Failed to list network agents\${NC}\"
                fi
                echo \"\"

                # Test network list
                echo \"Testing network list...\"
                networks=\$(openstack network list -f value -c Name 2>/dev/null | wc -l)
                if [ \$networks -gt 0 ]; then
                    echo -e \"\${GREEN}✓ Found \$networks network(s)\${NC}\"
                    openstack network list
                else
                    echo -e \"\${RED}✗ Failed to list networks\${NC}\"
                fi
                echo \"\"

                # Test subnet list
                echo \"Testing subnet list...\"
                subnets=\$(openstack subnet list -f value -c Name 2>/dev/null | wc -l)
                if [ \$subnets -gt 0 ]; then
                    echo -e \"\${GREEN}✓ Found \$subnets subnet(s)\${NC}\"
                    openstack subnet list
                else
                    echo -e \"\${RED}✗ Failed to list subnets\${NC}\"
                fi
                ;;

            glance|g-api)
                echo -e \"\${CYAN}Glance (Image) API:\${NC}\"
                echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"

                # Test image list
                echo \"Testing image list...\"
                if openstack image list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Image list successful\${NC}\"
                    images=\$(openstack image list -f value -c Name 2>/dev/null | wc -l)
                    echo \"  Available images: \$images\"
                    openstack image list --long
                else
                    echo -e \"\${RED}✗ Failed to list images\${NC}\"
                fi
                ;;

            cinder|c-api)
                echo -e \"\${CYAN}Cinder (Volume) API:\${NC}\"
                echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"

                # Test service list
                echo \"Testing service list...\"
                if openstack volume service list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Volume service list successful\${NC}\"
                    openstack volume service list
                else
                    echo -e \"\${RED}✗ Failed to list volume services\${NC}\"
                fi
                echo \"\"

                # Test volume list
                echo \"Testing volume list...\"
                if openstack volume list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Volume list successful\${NC}\"
                    volumes=\$(openstack volume list -f value -c Name 2>/dev/null | wc -l)
                    echo \"  Total volumes: \$volumes\"
                else
                    echo -e \"\${RED}✗ Failed to list volumes\${NC}\"
                fi
                ;;

            placement|placement-api)
                echo -e \"\${CYAN}Placement API:\${NC}\"
                echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"

                # Test resource providers
                echo \"Testing resource provider list...\"
                if openstack resource provider list &>/dev/null; then
                    echo -e \"\${GREEN}✓ Resource provider list successful\${NC}\"
                    openstack resource provider list
                else
                    echo -e \"\${RED}✗ Failed to list resource providers\${NC}\"
                fi
                ;;

            *)
                echo -e \"\${YELLOW}No specific API tests for service: $service\${NC}\"
                echo \"Performing generic endpoint discovery...\"
                echo \"\"
                openstack endpoint list --service \"\$service\" 2>/dev/null || \
                    echo \"No endpoints found for service: $service\"
                ;;
        esac
    "

    echo ""
    success "API testing completed"
}
