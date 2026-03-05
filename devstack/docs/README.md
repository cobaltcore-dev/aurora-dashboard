# DevStack Documentation

This directory contains detailed documentation for DevStack v3.

## Documentation Files

### [DEBUGGING.md](DEBUGGING.md)
Comprehensive debugging guide with direct VM access commands.

**Contents:**
- Direct VM debugging commands
- Service logs access
- Network debugging (OpenVSwitch)
- Database queries
- API endpoint testing
- Performance monitoring
- Common issues and solutions

**Use when:** Troubleshooting issues, investigating service problems, or debugging networking.

---

### [VERSIONS.md](VERSIONS.md)
DevStack version information and compatibility matrix.

**Contents:**
- Available DevStack versions (stable releases, master)
- OpenStack release names and versions
- Ubuntu compatibility matrix
- Version selection guide

**Use when:** Choosing a DevStack version, checking compatibility, or understanding release cycles.

---

### [SERVICES.md](SERVICES.md)
Complete reference for all available OpenStack services.

**Contents:**
- Core services (always enabled)
- Common optional services with use cases
- Special services
- Service descriptions and purposes
- Port information

**Use when:** Planning your DevStack setup, understanding what services to enable, or looking up service details.

---

### [ENABLE-SERVICES.md](ENABLE-SERVICES.md)
Step-by-step guide for configuring additional OpenStack services.

**Contents:**
- Quick start (CLI and manual methods)
- Example configurations
- Service management commands
- What happens during installation
- Verification and troubleshooting
- Resource requirements
- Common service combinations

**Use when:** Adding or removing services, configuring your DevStack installation.

---

### [WSL2-PORT-FORWARDING.md](WSL2-PORT-FORWARDING.md)
Port forwarding setup for accessing DevStack from Windows (WSL2 environments).

**Contents:**
- WSL2 networking explanation
- Automated port forwarding script
- Critical vs flexible port system
- Port conflict resolution
- Manual port forwarding
- Troubleshooting

**Use when:** Running DevStack in WSL2 and need to access it from Windows host.

---

## Quick Navigation

**Getting Started:**
1. Read [../README.md](../README.md) for setup instructions
2. Check [VERSIONS.md](VERSIONS.md) for version compatibility
3. Review [SERVICES.md](SERVICES.md) to plan your services
4. Follow [ENABLE-SERVICES.md](ENABLE-SERVICES.md) to configure services

**Troubleshooting:**
1. Check [DEBUGGING.md](DEBUGGING.md) for debugging commands
2. Review [WSL2-PORT-FORWARDING.md](WSL2-PORT-FORWARDING.md) if on WSL2

**Reference:**
- [SERVICES.md](SERVICES.md) - Service reference
- [VERSIONS.md](VERSIONS.md) - Version information

## Main Documentation

For general usage, commands, and quick start, see [../README.md](../README.md).
