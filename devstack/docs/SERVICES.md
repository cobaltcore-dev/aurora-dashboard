# OpenStack Services Configuration

DevStack supports various OpenStack services. This document explains which services are available and how to enable them.

## Service Categories

### Core Services (Always Enabled)

These services are automatically installed and configured in every DevStack installation:

| Service | Description | Port | VM Units |
|---------|-------------|------|----------|
| **Keystone** | Identity Service - Authentication & Authorization | 5000 | keystone |
| **Nova** | Compute Service - Virtual Machine Management | 8774 | n-api, n-cond, n-sch, n-cpu |
| **Neutron** | Networking Service - Virtual Networks | 9696 | q-svc, q-agt, q-dhcp, q-l3, q-meta |
| **Glance** | Image Service - VM Images & Snapshots | 9292 | g-api |
| **Placement** | Resource Placement Service | 8778 | placement-api |
| **Horizon** | Dashboard - Web UI | 80 | horizon |

### Common Optional Services

Enable these services by adding them to `ENABLE_SERVICES` in your `.env` file:

| Service | Description | Port | Use Case |
|---------|-------------|------|----------|
| **Cinder** | Block Storage - Persistent Volumes | 8776 | Attach persistent storage to VMs |
| **Swift** | Object Storage - S3-like Storage | 8080* | Store unstructured data (images, backups) |
| **Heat** | Orchestration - Infrastructure as Code | 8004 | Deploy stacks using templates (like CloudFormation) |
| **Octavia** | Load Balancer as a Service | 9876 | Create L7 load balancers |
| **Designate** | DNS as a Service | 9001 | Manage DNS zones and records |
| **Barbican** | Key Management - Secrets & Certificates | 9311 | Store API keys, certificates, passwords |
| **Manila** | Shared Filesystems - NFS/CIFS | 8786 | Shared storage between multiple VMs |
| **Ironic** | Bare Metal Provisioning | 6385 | Provision physical servers |

*Note: Swift's default port 8080 conflicts with Horizon. Our setup uses port 8888 by default.

## Configuration

### Enabling Services

Edit `.env` file:

```bash
# Enable single service
ENABLE_SERVICES=cinder

# Enable multiple services (comma-separated)
ENABLE_SERVICES=cinder,heat,barbican

# Full featured environment
ENABLE_SERVICES=cinder,swift,heat,octavia,designate,barbican,manila
```

### Port Configuration

Each service has a configurable port in `.env` for WSL2 port forwarding:

```bash
# Core Services
HORIZON_PORT=8080       # Dashboard
KEYSTONE_PORT=5000      # Identity
NOVA_PORT=8774          # Compute
NEUTRON_PORT=9696       # Networking
GLANCE_PORT=9292        # Image
PLACEMENT_PORT=8778     # Placement

# Optional Services (customize if needed)
CINDER_PORT=8776        # Block Storage
SWIFT_PORT=8888         # Object Storage (8888 to avoid conflict)
HEAT_PORT=8004          # Orchestration
OCTAVIA_PORT=9876       # Load Balancer
DESIGNATE_PORT=9001     # DNS
BARBICAN_PORT=9311      # Key Management
MANILA_PORT=8786        # Shared Filesystems
IRONIC_PORT=6385        # Bare Metal
```

## Common Use Cases

### Minimal Development Setup (Default)
```bash
# Only core services
ENABLE_SERVICES=
```

**Suitable for:** Basic VM testing, networking experiments

---

### Storage Development
```bash
ENABLE_SERVICES=cinder,swift
```

**Suitable for:** Working with persistent volumes, object storage testing

---

### Infrastructure as Code
```bash
ENABLE_SERVICES=cinder,heat
```

**Suitable for:** Template development, stack orchestration, automation

---

### Full Web Application Stack
```bash
ENABLE_SERVICES=cinder,swift,heat,octavia,designate,barbican
```

**Suitable for:**
- Web applications with load balancing
- DNS management
- Secret/certificate management
- Complete infrastructure automation

---

### Network Services Development
```bash
ENABLE_SERVICES=cinder,octavia,designate
```

**Suitable for:** Load balancer development, DNS integration, networking features

## Service Dependencies

Some services have dependencies on others:

- **Heat** → Requires core services for orchestration
- **Octavia** → Requires Neutron for network configuration
- **Manila** → Requires Cinder for backend storage
- **Designate** → Requires Neutron for DNS integration

Dependencies are automatically handled by DevStack.

## Performance Considerations

### Resource Requirements

| Services | CPUs | Memory | Disk | Notes |
|----------|------|--------|------|-------|
| Core only | 4 | 8GB | 40GB | Minimal setup |
| + Cinder | 4 | 8GB | 40GB | Adds volume management |
| + Swift | 4-6 | 10GB | 60GB | Object storage needs disk space |
| + Heat | 4-6 | 10GB | 40GB | Template processing |
| Full stack | 6-8 | 12-16GB | 80GB | All common services |

### Startup Time

More services = longer DevStack installation:

- **Core services**: ~15-20 minutes
- **+ Cinder**: +2-3 minutes
- **+ Swift**: +5-7 minutes
- **+ Heat**: +3-4 minutes
- **Full stack (8 services)**: ~30-40 minutes

## Service Management

### Check Service Status

```bash
./devstack.sh debug status [service]
```

### View Service Logs

```bash
./devstack.sh debug logs <service>
```

### Restart Services

Inside the VM:
```bash
multipass shell devstack
sudo systemctl restart devstack@<service>.service
```

## Port Forwarding (WSL2 Only)

When running in WSL2, services need port forwarding to be accessible from Windows:

```bash
./scripts/wsl2-port-forward.sh
```

The script automatically:
- ✅ Forwards all enabled services to localhost
- ✅ Handles port conflicts (finds alternative ports)
- ✅ Protects critical API ports
- ✅ Shows accessible URLs

**Example output:**
```
Services accessible from Windows browser:

  🌐 Horizon:          http://localhost:8080/dashboard
  🔐 Keystone:         http://localhost:5000
  💻 Nova:             http://localhost:8774
  🖼️  Glance:           http://localhost:9292
  🔌 Neutron:          http://localhost:9696
  💾 Cinder:           http://localhost:8776
  🔥 Heat:             http://localhost:8004
  🔑 Barbican:         http://localhost:9311
```

## Troubleshooting

### Service Won't Start

Check logs:
```bash
./devstack.sh debug logs <service>
```

Common issues:
- Port conflicts → Use alternative port in `.env`
- Missing dependencies → Check DevStack logs
- Out of memory → Increase `VM_MEMORY` in `.env`

### Service Shows as Inactive

Restart the service:
```bash
multipass exec devstack -- sudo systemctl restart devstack@<unit>.service
```

### Port Forwarding Not Working

Critical service ports must be available:
```bash
./scripts/wsl2-port-forward.sh
```

If a critical port is blocked, the script will tell you how to free it.

## API Documentation

Each service has an API endpoint:

| Service | API Base URL | Documentation |
|---------|--------------|---------------|
| Keystone | http://localhost:5000 | [docs.openstack.org/keystone](https://docs.openstack.org/keystone/latest/) |
| Nova | http://localhost:8774 | [docs.openstack.org/nova](https://docs.openstack.org/nova/latest/) |
| Neutron | http://localhost:9696 | [docs.openstack.org/neutron](https://docs.openstack.org/neutron/latest/) |
| Glance | http://localhost:9292 | [docs.openstack.org/glance](https://docs.openstack.org/glance/latest/) |
| Cinder | http://localhost:8776 | [docs.openstack.org/cinder](https://docs.openstack.org/cinder/latest/) |
| Heat | http://localhost:8004 | [docs.openstack.org/heat](https://docs.openstack.org/heat/latest/) |

## Best Practices

1. **Start minimal** - Begin with core services, add more as needed
2. **Monitor resources** - Check `./devstack.sh status` regularly
3. **Use snapshots** - Create VM snapshots after successful installation
4. **Port planning** - Document custom ports in your `.env`
5. **Test incrementally** - Add one service at a time when troubleshooting

## See Also

- [README.md](../README.md) - Main documentation
- [VERSIONS.md](VERSIONS.md) - DevStack version information
- [WSL2-PORT-FORWARDING.md](WSL2-PORT-FORWARDING.md) - Port forwarding details
