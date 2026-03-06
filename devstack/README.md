# DevStack v3 - Multipass VM

Production-ready DevStack setup using Multipass VMs with full OpenVSwitch and networking support.

## Why v3?

**v1 & v2 Problems:**
- ❌ WSL2/Docker kernel limitations
- ❌ OpenVSwitch doesn't work (no kernel modules)
- ❌ Neutron networking broken
- ❌ Platform-specific issues (WSL2 on Windows, Docker Desktop on macOS)

**v3 Solution:**
- ✅ Real Ubuntu VM with full kernel
- ✅ OpenVSwitch works natively
- ✅ Full Neutron networking support
- ✅ Works identically on Windows, macOS, Linux
- ✅ Snapshots for quick restore
- ✅ Easy to reproduce

## Prerequisites

Install Multipass:

**macOS:**
```bash
brew install multipass
```

**Linux:**
```bash
sudo snap install multipass
```

**Windows:**
```powershell
# Download from https://multipass.run/install
# Or use Chocolatey
choco install multipass
```

**Note for Windows/WSL2 users:** See [docs/WSL2-PORT-FORWARDING.md](docs/WSL2-PORT-FORWARDING.md) for port forwarding setup to access services from Windows host.

**Note for Docker container users in WSL2:** The same port forwarding script works for Docker containers too! See [docs/DOCKER-ACCESS.md](docs/DOCKER-ACCESS.md) for details on accessing DevStack from containers via `host.docker.internal`.

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. (Optional) Adjust settings
vim .env

# 3. Create and provision VM
./devstack setup

# 4. Wait for installation (~15-20 minutes)

# 5. Check status
./devstack status

# 6. Access Horizon
# Get VM IP from status output, then open:
open http://<VM_IP>/dashboard
# Username: admin
# Password: password (or from .env)
```

## Configuration

Edit `.env` file or use the `./devstack config` commands.

### Quick Config Management

```bash
# Show current configuration
./devstack config show

# Set VM resources
./devstack config set cpus 8
./devstack config set memory 16G
./devstack config set disk 60G

# Resize running VM (fast, preserves data)
./devstack config resize cpus 8

# Apply .env changes (recreates VM, slow)
./devstack config apply
```

**See [docs/VM-CONFIG.md](docs/VM-CONFIG.md) for detailed configuration management guide.**

### Manual .env Configuration

Edit `.env` file:

```bash
# VM Resources
VM_NAME=devstack
VM_CPUS=4
VM_MEMORY=8G
VM_DISK=40G

# Ubuntu Version (see Ubuntu Version Options below)
UBUNTU_VERSION=22.04

# DevStack Version (see docs/VERSIONS.md for all options)
DEVSTACK_VERSION=stable/2025.1

# Networking
PUBLIC_IP=localhost

# Ports (forwarded from VM to host)
HORIZON_PORT=8080
KEYSTONE_PORT=5000
NEUTRON_PORT=9696
NOVA_PORT=8774
GLANCE_PORT=9292

# Credentials
ADMIN_PASSWORD=password
DATABASE_PASSWORD=password
RABBIT_PASSWORD=password
SERVICE_PASSWORD=password

# Services
ENABLE_HORIZON=true
DISABLE_TEMPEST=true
DISABLE_DSTAT=true

# Additional OpenStack Services (comma-separated)
# Core services (keystone, nova, neutron, glance, placement) are always enabled
# Common optional services:
#   - cinder: Block Storage (persistent volumes)
#   - swift: Object Storage (S3-like)
#   - heat: Orchestration (templates/stacks)
#   - octavia: Load Balancer as a Service
#   - designate: DNS as a Service
#   - barbican: Key Management (secrets)
#   - manila: Shared Filesystems
#   - ironic: Bare Metal Provisioning
#
# Examples:
#   ENABLE_SERVICES=cinder
#   ENABLE_SERVICES=cinder,heat,barbican
ENABLE_SERVICES=
```

**See [docs/SERVICES.md](docs/SERVICES.md) for complete service list and [docs/ENABLE-SERVICES.md](docs/ENABLE-SERVICES.md) for configuration guide.**

### Ubuntu Version Options

Choose the Ubuntu version for your VM:

- **`22.04`** - Ubuntu 22.04 LTS (Jammy) - **Recommended** for DevStack stable/2025.1
- **`24.04`** - Ubuntu 24.04 LTS (Noble) - Latest LTS, may have compatibility issues with older DevStack versions
- **`20.04`** - Ubuntu 20.04 LTS (Focal) - Older, use for legacy DevStack versions
- **`lts`** - Automatically use the latest LTS version (currently 24.04)

**Compatibility Matrix:**

| DevStack Version | Recommended Ubuntu |
|------------------|-------------------|
| stable/2025.1, stable/2025.2 | 22.04 or 24.04 |
| stable/2024.2 | 22.04 |
| stable/2024.1 | 22.04 |
| Older versions | 20.04 |

### Checking Available Versions

```bash
# List all available versions from GitHub
./list-versions.sh

# Or check docs/VERSIONS.md for detailed information
cat docs/VERSIONS.md
```

## Commands

All commands are managed through the central `./devstack` script:

### VM Management

```bash
# Create and provision new VM
./devstack setup

# Start existing VM
./devstack start

# Stop VM
./devstack stop

# Restart VM
./devstack restart

# Open shell in VM
./devstack shell

# Show VM and DevStack status
./devstack status

# Show detailed VM information
./devstack info

# Delete and recreate VM (keeps .env)
./devstack rebuild

# Delete VM completely
./devstack cleanup
```

#### VM Configuration

```bash
# Show current VM configuration
./devstack config show

# Set configuration values in .env
./devstack config set cpus 8
./devstack config set memory 16G
./devstack config set disk 60G
./devstack config set ubuntu 24.04
./devstack config set devstack master

# Resize running VM (fast, preserves data)
./devstack config resize cpus 8
./devstack config resize memory 16G
./devstack config resize disk 60G

# Apply .env changes (recreates VM)
./devstack config apply
```

**See [docs/VM-CONFIG.md](docs/VM-CONFIG.md) for detailed guide.**

### Service Management

```bash
# Show configured services
./devstack services list

# Show all available services
./devstack services available

# Add services
./devstack services add cinder
./devstack services add heat,octavia

# Remove services
./devstack services remove swift

# Set services (replaces all)
./devstack services enable cinder,heat,barbican

# Update DevStack configuration without rebuilding VM
# Updates local.conf and restarts services (~10-15 min)
vim .env  # Make changes first
./devstack update-config
```

### Snapshot Management

```bash
# Create snapshot
./devstack snapshot create clean-install

# Restore from snapshot
./devstack snapshot restore clean-install

# List all snapshots
./devstack snapshot list

# Delete snapshot
./devstack snapshot delete clean-install
```

### Logs

```bash
# Show last 50 lines of installation log
./devstack logs

# Tail installation log in real-time
./devstack logs tail

# Show last 50 lines of stack.sh log from VM
./devstack logs stack

# Tail stack.sh log from VM in real-time
./devstack logs stack-tail
```

### Service Management

```bash
# List currently configured services
./devstack services list

# Show all available services
./devstack services available

# Add one or more services
./devstack services add cinder
./devstack services add cinder heat barbican

# Remove one or more services
./devstack services remove swift
./devstack services remove swift manila

# Set services (replaces all configured services)
./devstack services enable cinder,heat,barbican
```

**Note:** Changes to services require VM rebuild: `./devstack rebuild`

**Manual Configuration:**

You can also manually edit `.env` to configure services:

```bash
# Edit .env file
vim .env

# Add services (comma-separated, no spaces)
ENABLE_SERVICES=cinder,heat,barbican

# Or leave empty for core services only
ENABLE_SERVICES=

# Rebuild VM to apply changes
./devstack rebuild
```

**Available Services:**
- **cinder** - Block Storage (persistent volumes for VMs)
- **swift** - Object Storage (S3-like storage)
- **heat** - Orchestration (Infrastructure as Code templates)
- **octavia** - Load Balancer as a Service
- **designate** - DNS as a Service
- **barbican** - Key Management (secrets and certificates)
- **manila** - Shared Filesystems (NFS/CIFS)
- **ironic** - Bare Metal Provisioning

**Core services** (always enabled): keystone, nova, neutron, glance, placement, horizon

See [docs/SERVICES.md](docs/SERVICES.md) for detailed service information.

### Debugging

```bash
# Service-specific debugging
./devstack debug logs <service>       # Show service logs
./devstack debug status [service]     # Show service status
./devstack debug all <service>        # Complete service diagnostics

# Infrastructure debugging
./devstack debug ovs                  # OpenVSwitch diagnostics
./devstack debug api                  # Test all API endpoints
./devstack debug network              # Network diagnostics
./devstack debug compute              # Compute diagnostics

# Examples
./devstack debug logs nova            # Nova service logs
./devstack debug status               # All service status
./devstack debug all keystone         # Complete keystone diagnostics
```

### Maintenance

```bash
# Delete VM completely
./devstack cleanup

# Show help
./devstack help
```

### Direct Multipass Commands (if needed)

```bash
# List all VMs
multipass list

# Get VM info
multipass info devstack

# Execute command in VM
multipass exec devstack -- <command>
```

## Architecture

### VM Setup
1. **Multipass creates Ubuntu VM** with specified version and resources
2. **Cloud-init provisions** the VM with DevStack dependencies
3. **Setup scripts run** DevStack installation automatically
4. **Services start** and become accessible via VM IP
5. **Management CLI** provides easy access to all operations

### Services

All core OpenStack services run in the VM:
- **Keystone** - Identity and Authentication
- **Nova** - Compute (Virtual Machines)
- **Neutron** - Networking (OpenVSwitch) - **Works natively!**
- **Glance** - Image Service
- **Placement** - Resource Placement
- **Cinder** - Block Storage
- **Horizon** - Web Dashboard (optional)

## Accessing Services

### From Host Machine

Get VM IP and access services:

```bash
# Get VM IP
./devstack status

# Horizon Dashboard
open http://<VM_IP>/dashboard

# OpenStack CLI (via devstack)
./devstack shell
source /opt/stack/devstack/openrc admin admin
openstack service list
```

### Inside VM

```bash
# Shell into VM
./devstack shell

# Source credentials
source /opt/stack/devstack/openrc admin admin

# Run OpenStack commands
openstack service list
openstack network list
openstack server list
```

## Troubleshooting

For detailed debugging and troubleshooting, see **[docs/DEBUGGING.md](docs/DEBUGGING.md)**.

### Quick Checks

```bash
# Check VM and DevStack status
./devstack status

# Check logs
./devstack logs tail
./devstack logs stack-tail

# Check services
multipass exec devstack -- systemctl status 'devstack@*'

# Check OpenVSwitch
multipass exec devstack -- sudo ovs-vsctl show
```

### Common Issues

**Services not starting:**
```bash
./devstack logs stack-tail
multipass exec devstack -- journalctl -u devstack@n-api -n 50
```

**Network issues:**
```bash
multipass exec devstack -- sudo ovs-vsctl show
./devstack shell
source /home/stack/devstack/openrc admin admin
openstack network agent list
```

**Reset everything:**
```bash
./devstack cleanup
./devstack setup
```

See **[docs/DEBUGGING.md](docs/DEBUGGING.md)** for comprehensive debugging guide.

### Restart services
```bash
multipass exec devstack -- /opt/stack/devstack/unstack.sh
multipass exec devstack -- /opt/stack/devstack/stack.sh
```

### Reset everything
```bash
multipass delete devstack
multipass purge
./setup.sh
```

## Snapshots

Take snapshots at important milestones:

```bash
# After successful installation
multipass snapshot devstack --name clean-install

# Before testing changes
multipass snapshot devstack --name before-experiment

# Restore to previous state
multipass restore devstack --snapshot clean-install
```

## Resource Management

### Check VM resource usage
```bash
multipass info devstack
```

### Resize VM (requires recreate)
```bash
# Update .env with new values
vim .env

# Recreate VM
multipass delete devstack
multipass purge
./setup.sh
```

## Platform-Specific Notes

### macOS
- Uses QEMU with Hypervisor.framework for acceleration
- Fast and efficient
- No additional setup needed

### Linux
- Can use LXD or libvirt/KVM depending on installation
- KVM provides best performance
- May need virtualization enabled in BIOS

### Windows
- Uses Hyper-V (Windows 10 Pro/Enterprise) or VirtualBox fallback
- Requires Hyper-V enabled: `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All`
- Or installs VirtualBox automatically

## Advantages over v1/v2

| Feature | v1/v2 (Docker) | v3 (Multipass) |
|---------|----------------|----------------|
| Kernel | Limited (WSL2/Container) | Full Ubuntu kernel |
| OpenVSwitch | Broken | ✅ Works natively |
| Neutron | Limited/broken | ✅ Fully functional |
| Platform support | Windows/Linux only | Windows/macOS/Linux |
| Networking | Complex workarounds | Native |
| Snapshots | Docker commit hack | Native VM snapshots |
| Resource isolation | Container limits | Full VM isolation |
| Setup complexity | High | Low |

## Next Steps

- Add more optional services (Cinder, Swift, Heat, etc.)
- Add automated tests
- Add CI/CD integration
- Create pre-built images for faster startup

## Resources

- [Multipass Documentation](https://multipass.run/docs)
- [DevStack Documentation](https://docs.openstack.org/devstack/latest/)
- [OpenStack Releases](https://releases.openstack.org/)
