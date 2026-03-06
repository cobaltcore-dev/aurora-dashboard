# DevStack Documentation

This directory contains detailed documentation for DevStack v3.

## Documentation Files

### [VM-CONFIG.md](VM-CONFIG.md)
VM configuration management guide.

**Contents:**
- VM resource configuration (CPUs, memory, disk)
- Ubuntu version selection
- Configuration methods (set, resize, apply)
- Configuration comparison tables
- Safety features and best practices

**Use when:** Configuring VM resources, changing Ubuntu version, or understanding configuration options.

---

### [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md)
DevStack version switching and management.

**Contents:**
- Version management commands
- Switching between versions
- Version compatibility matrix
- Automatic safety snapshots
- Workflows and best practices

**Use when:** Switching DevStack versions, checking compatibility, or understanding version management.

---

### [SAFETY-FEATURES.md](SAFETY-FEATURES.md)
Safety features and confirmation prompts overview.

**Contents:**
- Command safety levels (destructive, partial, safe)
- Automatic snapshot creation
- Confirmation prompts
- Recovery options

**Use when:** Understanding which commands are safe, what requires confirmation, or recovery procedures.

---

### [DOCKER-ACCESS.md](DOCKER-ACCESS.md)
Accessing DevStack from Docker containers in WSL2.

**Contents:**
- Docker networking in WSL2
- Using host.docker.internal
- Port forwarding setup
- Network flow diagrams

**Use when:** Running containers in WSL2 that need to access DevStack services.

---

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
3. Configure VM resources in [VM-CONFIG.md](VM-CONFIG.md)
4. Review [SERVICES.md](SERVICES.md) to plan your services
5. Follow [ENABLE-SERVICES.md](ENABLE-SERVICES.md) to configure services

**Configuration:**
1. [VM-CONFIG.md](VM-CONFIG.md) - VM resources and Ubuntu version
2. [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) - DevStack version management
3. [SERVICES.md](SERVICES.md) - Service reference
4. [ENABLE-SERVICES.md](ENABLE-SERVICES.md) - Enable/disable services

**Troubleshooting:**
1. Check [DEBUGGING.md](DEBUGGING.md) for debugging commands
2. Review [WSL2-PORT-FORWARDING.md](WSL2-PORT-FORWARDING.md) if on WSL2
3. Review [DOCKER-ACCESS.md](DOCKER-ACCESS.md) if using Docker in WSL2

**Safety & Recovery:**
- [SAFETY-FEATURES.md](SAFETY-FEATURES.md) - Safety features overview

**Reference:**
- [SERVICES.md](SERVICES.md) - Service reference
- [VERSIONS.md](VERSIONS.md) - Version information

## Main Documentation

For general usage, commands, and quick start, see [../README.md](../README.md).
