#!/bin/bash
# Generate DevStack local.conf based on environment variables

set -e

# Load environment variables
if [ -f /tmp/devstack-env ]; then
    source /tmp/devstack-env
fi

# Default values
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password}
DATABASE_PASSWORD=${DATABASE_PASSWORD:-password}
RABBIT_PASSWORD=${RABBIT_PASSWORD:-password}
SERVICE_PASSWORD=${SERVICE_PASSWORD:-password}
ENABLE_HORIZON=${ENABLE_HORIZON:-true}
DISABLE_TEMPEST=${DISABLE_TEMPEST:-true}
DISABLE_DSTAT=${DISABLE_DSTAT:-true}

echo "Generating local.conf for DevStack..."

cat > /home/stack/devstack/local.conf <<EOF
[[local|localrc]]

# Passwords
ADMIN_PASSWORD=${ADMIN_PASSWORD}
DATABASE_PASSWORD=${DATABASE_PASSWORD}
RABBIT_PASSWORD=${RABBIT_PASSWORD}
SERVICE_PASSWORD=${SERVICE_PASSWORD}

# Networking
HOST_IP=$(hostname -I | awk '{print $1}')
SERVICE_HOST=\$HOST_IP

# Logging
LOGFILE=/opt/stack/logs/stack.sh.log
LOGDIR=/opt/stack/logs
LOG_COLOR=False
VERBOSE=True

# Services - Base (always enabled)
# Keystone (Identity)
# Nova (Compute)
# Neutron (Networking with OVS)
# Glance (Image)
# Placement (Resource Placement)

# Horizon Dashboard
EOF

if [ "$ENABLE_HORIZON" = "true" ]; then
    cat >> /home/stack/devstack/local.conf <<EOF
enable_service horizon
EOF
else
    cat >> /home/stack/devstack/local.conf <<EOF
disable_service horizon
EOF
fi

# Disable optional services
if [ "$DISABLE_TEMPEST" = "true" ]; then
    cat >> /home/stack/devstack/local.conf <<EOF
disable_service tempest
EOF
fi

if [ "$DISABLE_DSTAT" = "true" ]; then
    cat >> /home/stack/devstack/local.conf <<EOF
disable_service dstat
EOF
fi

# Enable additional services if specified
if [ -n "$ENABLE_SERVICES" ]; then
    echo "" >> /home/stack/devstack/local.conf
    echo "# Additional Services" >> /home/stack/devstack/local.conf

    IFS=',' read -ra SERVICES <<< "$ENABLE_SERVICES"
    for service in "${SERVICES[@]}"; do
        service=$(echo "$service" | xargs) # trim whitespace

        case "$service" in
            cinder)
                echo "# Cinder - Block Storage" >> /home/stack/devstack/local.conf
                echo "enable_service c-api c-vol c-sch c-bak" >> /home/stack/devstack/local.conf
                ;;
            swift)
                echo "# Swift - Object Storage" >> /home/stack/devstack/local.conf
                echo "enable_service s-proxy s-object s-container s-account" >> /home/stack/devstack/local.conf
                echo "SWIFT_HASH=66a3d6b56c1f479c8b4e70ab5c2000f5" >> /home/stack/devstack/local.conf
                echo "SWIFT_REPLICAS=1" >> /home/stack/devstack/local.conf
                echo "SWIFT_DATA_DIR=\$DEST/data/swift" >> /home/stack/devstack/local.conf
                ;;
            heat)
                echo "# Heat - Orchestration" >> /home/stack/devstack/local.conf
                echo "enable_service heat h-api h-api-cfn h-eng" >> /home/stack/devstack/local.conf
                ;;
            octavia)
                echo "# Octavia - Load Balancer" >> /home/stack/devstack/local.conf
                echo "enable_plugin octavia https://opendev.org/openstack/octavia" >> /home/stack/devstack/local.conf
                echo "enable_service octavia o-cw o-hk o-hm o-api" >> /home/stack/devstack/local.conf
                ;;
            designate)
                echo "# Designate - DNS" >> /home/stack/devstack/local.conf
                echo "enable_plugin designate https://opendev.org/openstack/designate" >> /home/stack/devstack/local.conf
                echo "enable_service designate designate-central designate-api designate-worker designate-producer designate-mdns" >> /home/stack/devstack/local.conf
                ;;
            barbican)
                echo "# Barbican - Key Management" >> /home/stack/devstack/local.conf
                echo "enable_plugin barbican https://opendev.org/openstack/barbican" >> /home/stack/devstack/local.conf
                ;;
            manila)
                echo "# Manila - Shared Filesystems" >> /home/stack/devstack/local.conf
                echo "enable_plugin manila https://opendev.org/openstack/manila" >> /home/stack/devstack/local.conf
                echo "enable_service m-api m-sch m-shr m-dat" >> /home/stack/devstack/local.conf
                ;;
            ironic)
                echo "# Ironic - Bare Metal" >> /home/stack/devstack/local.conf
                echo "enable_plugin ironic https://opendev.org/openstack/ironic" >> /home/stack/devstack/local.conf
                ;;
            *)
                echo "# Unknown service: $service (skipping)" >> /home/stack/devstack/local.conf
                ;;
        esac
    done
fi

# Neutron configuration
cat >> /home/stack/devstack/local.conf <<EOF

# Neutron Configuration
Q_USE_SECGROUP=True
Q_ML2_PLUGIN_MECHANISM_DRIVERS=openvswitch
Q_AGENT=openvswitch

# Enable Neutron services
enable_service q-svc
enable_service q-agt
enable_service q-dhcp
enable_service q-l3
enable_service q-meta

# Networking options
FLOATING_RANGE=172.24.4.0/24
PUBLIC_NETWORK_GATEWAY=172.24.4.1
FIXED_RANGE=10.0.0.0/24
NETWORK_GATEWAY=10.0.0.1

# API rate limiting (disable for development)
API_RATE_LIMIT=False

# Performance tuning for VM
NOVA_VNC_ENABLED=True
NOVNCPROXY_URL="http://\$SERVICE_HOST:6080/vnc_lite.html"

# Git repositories (use HTTPS for better compatibility)
GIT_BASE=https://github.com

EOF

echo "local.conf generated successfully"
cat /home/stack/devstack/local.conf
