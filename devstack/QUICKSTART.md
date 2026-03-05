# DevStack v3 - Quick Start Guide

## Prerequisites

1. Install Multipass:
   ```bash
   # macOS
   brew install multipass

   # Linux
   sudo snap install multipass

   # Windows
   choco install multipass
   # or download from https://multipass.run/install
   ```

2. Verify installation:
   ```bash
   multipass version
   ```

## Installation

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (optional)
   vim .env
   ```

   **Key settings to consider:**
   - `UBUNTU_VERSION` - Ubuntu version (22.04 recommended, 24.04, 20.04, or lts)
   - `DEVSTACK_VERSION` - DevStack branch (stable/2025.1, stable/2024.2, etc.)
   - `VM_CPUS`, `VM_MEMORY`, `VM_DISK` - VM resources
   - `ADMIN_PASSWORD` - OpenStack admin password

2. **Create and provision VM:**
   ```bash
   ./devstack.sh setup
   ```

   This will:
   - Create Ubuntu VM with specified version and resources
   - Install DevStack dependencies
   - Start DevStack installation in background
   - Takes ~15-20 minutes total

3. **Monitor installation:**
   ```bash
   # Watch setup log
   ./devstack.sh logs tail

   # Or watch DevStack log from VM
   ./devstack.sh logs stack-tail
   ```

4. **Check status:**
   ```bash
   ./devstack.sh status
   ```

## Usage

### Access Services

Get VM IP and access Horizon:
```bash
# Check status (includes VM IP)
./devstack.sh status

# Or get detailed VM info
./devstack.sh info
```

Access Horizon Dashboard:
```bash
# Replace <VM_IP> with actual IP from status
open http://<VM_IP>/dashboard
```

Credentials:
- **Username:** `admin`
- **Password:** `password` (or value from `.env`)

### OpenStack CLI

```bash
# Shell into VM
./devstack.sh shell

# Source credentials
source /home/stack/devstack/openrc admin admin

# Run commands
openstack service list
openstack network list
openstack image list
```

### Common Commands

```bash
# Check VM and DevStack status
./devstack.sh status

# Start/stop VM
./devstack.sh start
./devstack.sh stop
./devstack.sh restart

# Open shell in VM
./devstack.sh shell

# View logs
./devstack.sh logs              # Installation log
./devstack.sh logs tail         # Tail installation log
./devstack.sh logs stack        # DevStack log from VM
./devstack.sh logs stack-tail   # Tail DevStack log

# Create snapshot (recommended after successful install!)
./devstack.sh snapshot create clean-install

# Restore snapshot
./devstack.sh snapshot restore clean-install

# List snapshots
./devstack.sh snapshot list

# Update configuration (after editing .env)
./devstack.sh update-config     # Updates config without rebuild

# Rebuild VM completely
./devstack.sh rebuild           # Deletes and recreates VM

# Delete VM
./devstack.sh cleanup

# Show all available commands
./devstack.sh help
```

## Troubleshooting

### Installation hangs or fails

```bash
# Check installation log
./devstack.sh logs tail

# Check DevStack log inside VM
./devstack.sh logs stack-tail

# Shell into VM and check manually
./devstack.sh shell
tail -f /opt/stack/logs/stack.sh.log
```

### Services not accessible

```bash
# Get VM IP
./devstack.sh status

# Test from host
curl http://<VM_IP>

# Test from inside VM
./devstack.sh shell
curl http://localhost
```

### Reset everything

```bash
./devstack.sh cleanup
./devstack.sh setup
```

## Directory Structure

```
devstack-v3/
├── .env                      # Configuration (copy from .env.example)
├── .env.example              # Configuration template
├── README.md                 # Full documentation
├── QUICKSTART.md             # This file
├── VERSIONS.md               # Available DevStack versions
├── devstack.sh               # ⭐ Central management CLI
├── lib/                      # Internal scripts (don't call directly)
│   ├── setup.sh              # VM creation and provisioning
│   ├── rebuild.sh            # Rebuild VM
│   ├── update-config.sh      # Update config without rebuild
│   ├── status.sh             # Check status
│   ├── cleanup.sh            # Delete VM
│   ├── snapshot.sh           # Snapshot management
│   └── logs.sh               # Log management
└── scripts/                  # Scripts that run inside VM
    ├── generate-local-conf.sh   # Generate DevStack config
    └── install-devstack.sh      # DevStack installation script
```

## Next Steps

After installation completes:

1. **Explore Horizon Dashboard:**
   - Browse the web interface
   - Create networks, instances, etc.

2. **Learn OpenStack CLI:**
   ```bash
   multipass shell devstack
   source /home/stack/devstack/openrc admin admin
   openstack --help
   ```

3. **Create resources:**
   - Networks
   - Instances (VMs)
   - Volumes
   - Security groups

4. **Take a snapshot:**
   ```bash
   multipass snapshot devstack --name clean-install
   ```

   You can restore to this state anytime!

## Support

- DevStack docs: https://docs.openstack.org/devstack/latest/
- Multipass docs: https://multipass.run/docs
- OpenStack docs: https://docs.openstack.org/

## Comparison to v1/v2

| Feature | v1/v2 (Docker/WSL2) | v3 (Multipass) |
|---------|---------------------|----------------|
| Setup | Complex | Simple |
| OpenVSwitch | ❌ Broken | ✅ Works |
| Neutron | ❌ Limited | ✅ Full support |
| Snapshots | Manual | Built-in |
| Cross-platform | Linux/Windows only | Windows/macOS/Linux |
| Kernel | Limited | Full Ubuntu kernel |
