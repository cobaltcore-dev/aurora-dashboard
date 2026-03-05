# How to Enable Additional OpenStack Services

This guide explains how to enable additional OpenStack services in your DevStack installation.

## Quick Start

### Method 1: Using CLI Commands (Recommended)

```bash
# List available services
./devstack services available

# Add services
./devstack services add cinder heat barbican

# List configured services
./devstack services list

# Remove services
./devstack services remove swift

# Rebuild VM to apply changes
./devstack rebuild
```

### Method 2: Manual Configuration

1. **Edit `.env` file**:
   ```bash
   vim .env
   ```

2. **Add services** (comma-separated, no spaces):
   ```bash
   ENABLE_SERVICES=cinder,heat,barbican
   ```

3. **Build/Rebuild DevStack**:
   ```bash
   # For new installation:
   ./devstack setup

   # For existing VM:
   ./devstack rebuild
   ```

4. **Start port forwarding** (WSL2 only):
   ```bash
   ./scripts/wsl2-port-forward.sh
   ```

## Step-by-Step Examples

### Example 1: Adding Cinder (Block Storage) - CLI Method

```bash
# 1. Add service using CLI
./devstack services add cinder

# 2. Rebuild DevStack (takes ~20 minutes)
./devstack rebuild

# 3. Verify installation
./devstack status

# 4. Start port forwarding (WSL2)
./scripts/wsl2-port-forward.sh
```

**Result:**
- Cinder API available at `http://localhost:8776`
- Create volumes: `openstack volume create --size 1 my-volume`
- Attach to VMs for persistent storage

### Example 2: Adding Cinder (Block Storage) - Manual Method

```bash
# 1. Edit .env manually
vim .env
# Add this line:
ENABLE_SERVICES=cinder

# 2. Rebuild DevStack (takes ~20 minutes)
./devstack rebuild

# 3. Verify installation
./devstack status

# 4. Start port forwarding (WSL2)
./scripts/wsl2-port-forward.sh
```

**Result:**
- Cinder API available at `http://localhost:8776`
- Create volumes: `openstack volume create --size 1 my-volume`
- Attach to VMs for persistent storage

### Example 3: Full Featured Environment - CLI Method

```bash
# 1. Add multiple services at once
./devstack services add cinder heat octavia barbican

# 2. Increase VM resources (recommended)
vim .env
# Set:
VM_CPUS=6
VM_MEMORY=12G
VM_DISK=60G

# 3. Rebuild
./devstack rebuild

# 4. Wait ~30-40 minutes for installation

# 5. Verify all services
./devstack debug status
```

### Example 4: Full Featured Environment - Manual Method

```bash
# 1. Edit .env manually
vim .env
# Add this line:
ENABLE_SERVICES=cinder,heat,octavia,barbican

# Also increase VM resources:
VM_CPUS=6
VM_MEMORY=12G
VM_DISK=60G

# 2. Rebuild
./devstack rebuild

# 3. Wait ~30-40 minutes for installation

# 4. Verify all services
./devstack debug status
```

## Available Services

See [SERVICES.md](SERVICES.md) for complete list of services.

**Common Services:**
- `cinder` - Block Storage (volumes)
- `swift` - Object Storage
- `heat` - Orchestration (templates)
- `octavia` - Load Balancer
- `designate` - DNS
- `barbican` - Key Management
- `manila` - Shared Filesystems
- `ironic` - Bare Metal

## What Happens During Installation

When you run `./devstack setup` or `rebuild`:

1. **`.env` is read** - Your `ENABLE_SERVICES` setting is loaded
2. **`local.conf` is generated** - Script `scripts/generate-local-conf.sh` creates DevStack configuration
3. **Services are enabled** - Each service gets its DevStack components:
   - `cinder` → `c-api c-vol c-sch c-bak`
   - `heat` → `heat h-api h-api-cfn h-eng`
   - `octavia` → Plugin + `octavia o-cw o-hk o-hm o-api`
   - `swift` → `s-proxy s-object s-container s-account`
   - And more...
4. **DevStack installs** - All configured services are installed (~15-40 min)
5. **Services start** - Systemd units are created and started automatically

### Service Name Mapping

The CLI/`.env` service names map to DevStack service components:

| Service Name | DevStack Components | Description |
|--------------|---------------------|-------------|
| `cinder` | `c-api c-vol c-sch c-bak` | Block Storage API, Volume, Scheduler, Backup |
| `swift` | `s-proxy s-object s-container s-account` | Object Storage components |
| `heat` | `heat h-api h-api-cfn h-eng` | Orchestration API and Engine |
| `octavia` | `octavia o-cw o-hk o-hm o-api` | Load Balancer components |
| `designate` | Plugin + `designate` | DNS as a Service |
| `barbican` | Plugin + `barbican` | Key Management Service |
| `manila` | Plugin + `manila` | Shared Filesystems |
| `ironic` | Plugin + `ironic` | Bare Metal Provisioning |

This mapping is handled automatically by `scripts/generate-local-conf.sh`.

## Generated Configuration

Example `local.conf` with `ENABLE_SERVICES=cinder,heat`:

```ini
[[local|localrc]]

# Passwords
ADMIN_PASSWORD=password
...

# Core services (always enabled)
enable_service keystone
enable_service nova
enable_service neutron
enable_service glance
...

# Additional Services
# Cinder - Block Storage
enable_service c-api c-vol c-sch c-bak

# Heat - Orchestration
enable_service heat h-api h-api-cfn h-eng
```

## Verifying Installation

### Check Service Status

```bash
# All services
./devstack debug status

# Specific service
./devstack debug status cinder
```

### Check Service Logs

```bash
# View logs
./devstack debug logs c-api

# Tail logs in real-time
./devstack logs stack-tail
```

### Test API Endpoints

```bash
# Inside VM or via port forwarding
curl http://localhost:8776/v3
curl http://localhost:8004

# Using OpenStack CLI
multipass exec devstack -- openstack volume service list
multipass exec devstack -- openstack orchestration service list
```

## Port Forwarding (WSL2)

The port forwarding script automatically detects enabled services:

```bash
./scripts/wsl2-port-forward.sh
```

**Output example:**
```
ℹ Additional services configured: cinder,heat,barbican

✓ Port 8776 is available (Cinder (Block Storage))
✓ Port 8004 is available (Heat (Orchestration))
✓ Port 9311 is available (Barbican (Key Management))

Services accessible from Windows browser:

  🌐 Horizon:          http://localhost:8081/dashboard
  🔐 Keystone:         http://localhost:5000
  💻 Nova:             http://localhost:8774
  💾 Cinder:           http://localhost:8776
  🔥 Heat:             http://localhost:8004
  🔑 Barbican:         http://localhost:9311
```

## Managing Services

### Using CLI Commands

**Add services:**
```bash
# Add single service
./devstack services add cinder

# Add multiple services
./devstack services add cinder heat barbican
```

**Remove services:**
```bash
# Remove single service
./devstack services remove swift

# Remove multiple services
./devstack services remove swift manila
```

**List services:**
```bash
# Show configured services
./devstack services list

# Show all available services
./devstack services available
```

**Set services (replaces all):**
```bash
# Replace all configured services with new list
./devstack services enable cinder,heat
```

### Manual Configuration

**Edit `.env` directly:**
```bash
vim .env

# Add or modify this line:
ENABLE_SERVICES=cinder,heat,barbican

# Important:
# - Use comma-separated list (no spaces!)
# - Leave empty for core services only: ENABLE_SERVICES=
# - Core services (keystone, nova, neutron, glance, placement, horizon) are always enabled
```

**Common mistakes:**
```bash
# ❌ Wrong - has spaces
ENABLE_SERVICES=cinder, heat, barbican

# ✅ Correct - no spaces
ENABLE_SERVICES=cinder,heat,barbican

# ✅ Also correct - empty for core only
ENABLE_SERVICES=
```

### Applying Changes

**Both methods require VM rebuild:**
```bash
# After CLI commands or manual .env edit:
./devstack rebuild
```

**Why rebuild is needed:**
- DevStack needs to install new service components
- Configuration files must be regenerated
- Dependencies must be installed
- Services must be registered in Keystone

## Removing Services

### Using CLI

```bash
# 1. Remove service(s)
./devstack services remove swift manila

# 2. Rebuild
./devstack rebuild
```

### Manual Method

```bash
# 1. Edit .env - remove unwanted services
vim .env
# Change from: ENABLE_SERVICES=cinder,heat,barbican,swift
# To:          ENABLE_SERVICES=cinder,heat,barbican

# 2. Rebuild
./devstack rebuild
```

**Note:** You cannot just disable services - DevStack needs to be rebuilt without them.

## Resource Requirements

More services = more resources needed:

| Configuration | CPUs | Memory | Disk | Time |
|---------------|------|--------|------|------|
| Core only | 4 | 8GB | 40GB | 15-20 min |
| + Cinder | 4 | 8GB | 40GB | 20-25 min |
| + Heat | 4-6 | 10GB | 40GB | 25-30 min |
| + Octavia | 6 | 12GB | 50GB | 35-45 min |
| Full (6+ services) | 6-8 | 12-16GB | 60GB | 40-60 min |

**Recommendation:** Start with fewer services, add more incrementally.

## Troubleshooting

### Service Won't Install

**Check logs:**
```bash
./devstack logs stack
# Or
tail -f devstack-install.log
```

**Common issues:**
- Out of memory → Increase `VM_MEMORY`
- Disk full → Increase `VM_DISK`
- Network timeout → Retry `./devstack rebuild`

### Service Installed but Not Running

**Check systemd:**
```bash
multipass exec devstack -- systemctl status devstack@c-api
```

**Restart service:**
```bash
multipass exec devstack -- sudo systemctl restart devstack@c-api
```

### Port Forwarding Shows Service but Can't Access

**Verify service is listening:**
```bash
multipass exec devstack -- sudo netstat -tlnp | grep :8776
```

**Check firewall:**
```bash
# Inside VM
multipass exec devstack -- sudo ufw status
```

### Installation Fails Halfway

**Check available disk space:**
```bash
multipass exec devstack -- df -h
```

**Increase resources and rebuild:**
```bash
# Edit .env
VM_DISK=60G
VM_MEMORY=12G

# Rebuild
./devstack cleanup
./devstack setup
```

## Best Practices

1. **Start minimal** - Add services one at a time
2. **Use snapshots** - Create snapshot after successful installation:
   ```bash
   ./devstack snapshot create after-cinder
   ```
3. **Test incrementally** - Verify each service works before adding more
4. **Monitor resources** - Check `./devstack status` for memory/CPU usage
5. **Keep notes** - Document which services you need in your project README

## Common Service Combinations

### Web Application Development
```bash
ENABLE_SERVICES=cinder,swift,heat,octavia,barbican
```
**Use case:** Full web app with load balancing, storage, orchestration

### Storage Testing
```bash
ENABLE_SERVICES=cinder,swift,manila
```
**Use case:** Test block, object, and shared file storage

### Network Services
```bash
ENABLE_SERVICES=cinder,octavia,designate
```
**Use case:** Load balancing and DNS integration

### Minimal + Orchestration
```bash
ENABLE_SERVICES=cinder,heat
```
**Use case:** Infrastructure as Code testing with minimal resources

## See Also

- [SERVICES.md](SERVICES.md) - Complete service reference
- [README.md](../README.md) - Main documentation
- [WSL2-PORT-FORWARDING.md](WSL2-PORT-FORWARDING.md) - Port forwarding details
- [DevStack Documentation](https://docs.openstack.org/devstack/latest/)
