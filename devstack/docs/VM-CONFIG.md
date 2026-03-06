# VM Configuration Management

This guide explains how to manage DevStack VM configuration using the `./devstack config` commands.

## Commands Overview

```bash
./devstack config show              # Show current configuration
./devstack config set <key> <val>   # Set configuration value
./devstack config apply             # Apply changes (recreates VM)
./devstack config resize <res> <val> # Resize running VM
```

## Show Configuration

Display current configuration from `.env` and actual VM resources:

```bash
./devstack config show
```

Output includes:
- Configured values from `.env`
- Current VM state and IP
- Actual VM resources (CPUs, Memory, Disk usage)
- Configuration mismatch warnings

## Set Configuration

Update configuration values in `.env`:

```bash
# Set CPU cores
./devstack config set cpus 8

# Set memory
./devstack config set memory 16G

# Set disk size
./devstack config set disk 60G

# Set Ubuntu version
./devstack config set ubuntu 24.04
```

**Note**:
- Changes to `.env` don't affect existing VMs until you apply them.
- To change DevStack version, use `./devstack version switch <version>` (see [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md))

## Apply Configuration

Recreate the VM with new settings from `.env`:

```bash
./devstack config apply
```

**⚠️ Warning**: This will:
- Delete the existing VM
- Create a new VM with updated settings
- **All data in the VM will be lost**
- DevStack will need to be reinstalled

**When to use**:
- After changing Ubuntu version
- After changing DevStack version
- When you want to start fresh with new resources

**Alternative**: Use `resize` for resource changes without recreating the VM.

## Resize Running VM

Change VM resources without recreating it:

```bash
# Resize CPUs (requires VM restart)
./devstack config resize cpus 6

# Resize memory (requires VM restart)
./devstack config resize memory 12G

# Resize disk (no restart needed)
./devstack config resize disk 60G
```

**Safety Features**:
- ✅ Shows current vs new values before making changes
- ✅ Asks for confirmation before any resize
- ✅ Warns about VM restart and service interruption
- ✅ Warns about irreversible disk changes
- ✅ Can be cancelled with 'n' or Ctrl+C

**How it works**:
- Uses `multipass set` to change VM resources
- Automatically updates `.env` to match
- Restarts VM only when necessary (CPUs/memory)
- Preserves all data and DevStack installation

**Advantages over `apply`**:
- ✅ Much faster (no reinstall needed)
- ✅ Preserves DevStack installation and data
- ✅ Only restarts VM briefly

**Limitations**:
- ⚠️ Can only change resources (CPUs, memory, disk)
- ⚠️ Cannot change Ubuntu or DevStack versions
- ⚠️ Disk can only be increased, not decreased
- ⚠️ VM restart causes brief service interruption

## Examples

### Increase Resources for Development

```bash
# Check current config
./devstack config show

# Increase CPUs and memory
./devstack config resize cpus 8
./devstack config resize memory 16G

# Verify changes
./devstack config show
```

### Prepare for Snapshot/Restore

```bash
# Before creating snapshot, document config
./devstack config show > config-backup.txt

# After restoring snapshot, verify config
./devstack config show
```

### Change DevStack Version

DevStack version is managed separately via the version command:

```bash
# Show current version
./devstack version show

# Switch to different version (preserves VM, reinstalls DevStack)
./devstack version switch stable/2025.1
```

See [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) for details.

## Configuration Keys

| Key | Description | Example Values | Apply Method |
|-----|-------------|----------------|--------------|
| `cpus` | Number of CPU cores | `4`, `6`, `8` | `resize` or `apply` |
| `memory` | RAM allocation | `8G`, `16G`, `32G` | `resize` or `apply` |
| `disk` | Disk size | `40G`, `60G`, `80G` | `resize` or `apply` |
| `ubuntu` | Ubuntu version | `22.04`, `24.04` | `apply` only |

**Note:** To change DevStack version, use `./devstack version switch <version>` instead of config commands.

## Comparison: `resize` vs `apply`

| Feature | `resize` | `apply` |
|---------|----------|---------|
| Speed | Fast (1-2 min) | Slow (15-20 min) |
| Data preservation | ✅ Yes | ❌ No |
| DevStack reinstall | ❌ No | ✅ Yes |
| Change CPUs/Memory | ✅ Yes | ✅ Yes |
| Change Disk | ✅ Yes (grow only) | ✅ Yes |
| Change Ubuntu version | ❌ No | ✅ Yes |
| Change DevStack version | ❌ No | ✅ Yes |
| VM restart required | ⚠️ Sometimes | ✅ Yes |

## Best Practices

### 1. Check Before Changing

Always check current configuration first:

```bash
./devstack config show
```

### 2. Use `resize` When Possible

For resource changes, prefer `resize` over `apply`:

```bash
# Good: Quick resize
./devstack config resize cpus 8

# Avoid: Slow rebuild
./devstack config set cpus 8
./devstack config apply
```

### 3. Snapshot Before Major Changes

Create a snapshot before applying configuration changes:

```bash
./devstack snapshot create before-config-change
./devstack config apply
# If something goes wrong:
./devstack snapshot restore before-config-change
```

### 4. Document Your Configuration

Keep track of configuration changes:

```bash
./devstack config show > config-$(date +%Y%m%d).txt
```

## Safety Features

All destructive operations include safety prompts:

### `config resize` Confirmation

```bash
$ ./devstack config resize cpus 8

ℹ Current CPUs: 4
ℹ New CPUs: 8

⚠ This will RESTART the VM
⚠ OpenStack services will be briefly unavailable

Continue? (y/N): _
```

### `config resize disk` Warning

```bash
$ ./devstack config resize disk 60G

ℹ Current Disk: 38.7GiB
ℹ New Disk: 60G

ℹ Disk can only be INCREASED, not decreased
⚠ This change is IRREVERSIBLE without rebuilding the VM

Continue? (y/N): _
```

### `config apply` Warning

```bash
$ ./devstack config apply

⚠ This will DELETE the current VM and recreate it with new settings
⚠ All data in the VM will be LOST!

ℹ Current .env configuration:
  CPUs:          8
  Memory:        16G
  Disk:          60G
  Ubuntu:        22.04

Continue? (y/N): _
```

**Cancellation**:
- Type `n` or `N` to cancel
- Press `Ctrl+C` to abort
- Only `y` or `Y` proceeds with the action

## Troubleshooting

### Configuration Mismatch Warning

```
⚠ CPU configuration mismatch detected!
ℹ Configured: 8 cores, Actual: 4 cores
```

**Cause**: `.env` has different values than the running VM.

**Solution**:
- Option A: Use `resize` to apply changes: `./devstack config resize cpus 8`
- Option B: Use `apply` to recreate VM: `./devstack config apply`
- Option C: Update `.env` to match VM: `./devstack config set cpus 4`

### Resize Failed

```
✗ Failed to resize resource
```

**Possible causes**:
1. VM is not stopped (for CPUs/memory)
2. Multipass version is too old
3. Disk shrinking not supported

**Solutions**:
```bash
# Ensure VM is stopped
./devstack stop

# Try resize again
./devstack config resize cpus 8

# If still failing, use apply instead
./devstack config apply
```

### Cannot Decrease Disk Size

Disk can only be increased, not decreased.

**Workaround**: Use `./devstack config apply` to recreate VM with smaller disk.

## Integration with Other Commands

```bash
# Full workflow example
./devstack config show              # Check current setup
./devstack config resize cpus 8     # Increase CPUs
./devstack status                   # Verify VM is running
./devstack services list            # Check services
./devstack snapshot create upsize   # Save state
```

## Under the Hood

### Configuration Storage

Configuration is stored in `.env`:

```bash
VM_NAME=devstack
VM_CPUS=4
VM_MEMORY=8G
VM_DISK=40G
UBUNTU_VERSION=22.04
DEVSTACK_VERSION=stable/2025.1
```

### Resize Implementation

Uses Multipass `set` command:

```bash
multipass set local.devstack.cpus=8
multipass set local.devstack.memory=16G
multipass set local.devstack.disk=60G
```

### Apply Implementation

Calls `./devstack rebuild` which:
1. Stops VM
2. Deletes VM
3. Creates new VM with `.env` settings
4. Installs DevStack
