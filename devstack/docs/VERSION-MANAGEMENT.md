# DevStack Version Management

Manage DevStack versions without recreating the VM.

## Commands

### Show Current Version

```bash
./devstack version show
```

Shows:
- Configured version in `.env`
- Installed version in VM (branch and commit)
- Version mismatch warnings

**Example Output:**

```
╔════════════════════════════════════════════════════════════╗
║              DevStack Version Information                  ║
╚════════════════════════════════════════════════════════════╝

Configured Version (in .env):
  stable/2025.1

Installed Version (in VM):
  Branch: stable/2025.1
  Commit: abc123d
```

### List Available Versions

```bash
./devstack version list
```

Shows:
- Stable releases (recommended)
- Development branches
- Legacy versions

**Common Versions:**

| Version | Release Name | Status | Recommended For |
|---------|-------------|--------|-----------------|
| `stable/2025.1` | Epoxy | Latest Stable | Production |
| `stable/2024.2` | Dalmatian | Stable | Production |
| `stable/2024.1` | Caracal | Stable | Production |
| `master` | - | Development | Testing only |

See `docs/VERSIONS.md` for complete list.

### Switch to Different Version

```bash
./devstack version switch <version>
```

**Examples:**

```bash
# Switch to latest stable
./devstack version switch stable/2025.1

# Switch to master (development)
./devstack version switch master

# Switch to specific stable release
./devstack version switch stable/2024.2
```

**What it does:**

1. ✅ Verifies version exists
2. ✅ Stops DevStack services (`unstack.sh`)
3. ✅ Cleans installation (`clean.sh`)
4. ✅ Checks out new version
5. ✅ Updates `.env` automatically
6. ✅ Regenerates `local.conf`
7. ✅ Runs `stack.sh` (15-20 min)
8. ✅ Verifies installation

**⚠️ Warning:** This reinstalls DevStack. All OpenStack data will be lost!

**Note:** This is the ONLY way to change DevStack version on a running system. The version in `.env` is automatically updated when you switch.

## Comparison: `switch` vs `rebuild`

| Method | Speed | VM Changed | DevStack Reinstalled | Data Lost | Use Case |
|--------|-------|------------|---------------------|-----------|----------|
| `version switch` | 15-20 min | ❌ No | ✅ Yes | ⚠️ OpenStack data only | Fast version change |
| `rebuild` | 20-25 min | ✅ Yes | ✅ Yes | ⚠️ Everything | Complete VM rebuild |

**Key Difference:**
- `version switch`: Keeps VM (Ubuntu, resources), reinstalls DevStack
- `rebuild`: Deletes and recreates entire VM, then installs DevStack

## Workflows

### Quick Version Upgrade

Fast upgrade without recreating VM:

```bash
# Check current version
./devstack version show

# Create snapshot first (optional but recommended)
./devstack snapshot create before-upgrade

# Switch version
./devstack version switch stable/2025.1

# If something goes wrong:
./devstack snapshot restore before-upgrade
```

**Time:** ~15-20 minutes

### Complete VM Rebuild with New Version

If you also want to change VM resources or Ubuntu version:

```bash
# First, manually set desired version in .env
vim .env  # Change DEVSTACK_VERSION=stable/2024.2

# Then rebuild entire VM
./devstack rebuild
```

**Time:** ~20-25 minutes

**When to use:** When you need to change Ubuntu version or want a completely clean VM.

### Test Development Version

Try master branch temporarily:

```bash
# Create snapshot
./devstack snapshot create stable-backup

# Switch to master
./devstack version switch master

# Test your changes...

# Restore stable version
./devstack snapshot restore stable-backup
```

## Version Compatibility

### Ubuntu Compatibility

**Official Policy:** DevStack supports the **two latest Ubuntu LTS releases**.

Source: [OpenStack DevStack Documentation](https://docs.openstack.org/devstack/latest/)

**Current LTS Releases:**
- Ubuntu 24.04 LTS (Noble) - Released April 2024
- Ubuntu 22.04 LTS (Jammy) - Released April 2022
- Ubuntu 20.04 LTS (Focal) - Older, limited support

**Compatibility Matrix:**

| DevStack Version | Supported Ubuntu | Recommended | Notes |
|------------------|-----------------|-------------|-------|
| **stable/2025.1** (Epoxy) | 22.04, 24.04 | 24.04 | Latest stable |
| **stable/2024.2** (Dalmatian) | 22.04, 24.04 | 22.04 | Stable |
| **stable/2024.1** (Caracal) | 22.04 | 22.04 | Stable |
| **stable/2023.2** (Bobcat) | 22.04 | 22.04 | Older stable |
| **stable/2023.1** (Antelope) | 22.04 | 22.04 | Older stable |
| **master** | 24.04 | 24.04 | Development |
| **Legacy (zed, yoga)** | 20.04, 22.04 | 22.04 | End of life soon |

**How to check:** Run `./devstack version list` to see Ubuntu compatibility for each version.

**Note:** If you need to change Ubuntu version, use `./devstack rebuild` as it recreates the VM.

### Service Compatibility

Some services may not be available in older versions:

```bash
# Check available services for your version
./devstack services available
```

## Best Practices

### 1. Always Create Snapshots Before Switching

```bash
./devstack snapshot create before-version-switch
./devstack version switch stable/2024.2
```

### 2. Check Version Compatibility

```bash
./devstack version list
# Check docs/VERSIONS.md for compatibility
```

### 3. Monitor Installation

```bash
# Terminal 1: Switch version
./devstack version switch stable/2025.1

# Terminal 2: Monitor logs (in another terminal)
./devstack shell
tail -f /opt/stack/logs/stack.sh.log
```

### 4. Verify After Switch

```bash
./devstack version show
./devstack status
```

## Safety Features

All destructive operations include comprehensive safety prompts:

### Automatic Safety Snapshots

Before any destructive operation, you will be asked if you want to create a safety snapshot:

```
ℹ Create automatic safety snapshot before switching?
  Snapshot name: before-switch-to-stable-2024.2

Create snapshot? (Y/n):
```

**Benefits:**
- ✅ Default is YES (just press Enter)
- ✅ Automatic naming with timestamp or target version
- ✅ Can restore if something goes wrong
- ✅ No need to remember to create snapshot manually

**Applies to:**
- `version switch` - Creates snapshot before switching
- `config apply` - Creates snapshot before rebuild
- `rebuild` - Creates snapshot before rebuild

**Snapshot names:**
- `before-switch-to-<version>` - Version switches
- `before-config-apply-<timestamp>-<pid>` - Config apply
- `before-rebuild-<timestamp>-<pid>` - Manual rebuild

**Collision Prevention:**
- Version switches: Checks if snapshot exists, adds timestamp if needed
- Config/Rebuild: Uses timestamp + PID for uniqueness

**Cleanup:**
Automatic snapshots are kept for manual review. To clean up:
```bash
# List all snapshots
./devstack snapshot list

# Delete specific snapshot
./devstack snapshot delete <name>

# Delete ALL automatic snapshots
./devstack snapshot cleanup
```

### Non-Destructive Commands

These commands do NOT require confirmation:
- `version show` - Read-only, displays current version
- `version list` - Read-only, shows available versions

**Note:** To manually set a version in `.env` without switching, edit the file directly:
```bash
vim .env  # Change DEVSTACK_VERSION=stable/2025.1
```
Then use `./devstack version switch` or `./devstack rebuild` to apply.

## Troubleshooting

### Version Not Found

```
✗ Version 'stable/2099.1' not found in repository
```

**Solution:** Check available versions with `./devstack version list`

### Switch Failed

```
✗ DevStack installation failed!
```

**Steps to recover:**

1. Check logs:
   ```bash
   ./devstack logs stack-tail
   ```

2. Restore from snapshot:
   ```bash
   ./devstack snapshot list
   ./devstack snapshot restore before-version-switch
   ```

3. Or retry with clean state:
   ```bash
   ./devstack rebuild
   ```

### Version Mismatch After Switch

If `.env` and VM versions don't match:

```bash
# Check installed version
./devstack version show

# Option 1: Update .env manually to match VM
vim .env  # Edit DEVSTACK_VERSION to match installed version

# Option 2: Update VM to match .env
./devstack version switch <configured-version>
```

## Integration with Other Commands

```bash
# Full workflow
./devstack version show              # Check current
./devstack snapshot create backup    # Safety first
./devstack version switch master     # Change version
./devstack status                    # Verify
./devstack services list             # Check services
```

## Advanced Usage

### Custom Branch

You can switch to any valid git reference:

```bash
# Specific commit (not recommended)
./devstack version switch abc123def

# Tag
./devstack version switch 2025.1.0
```

### Script the Version

```bash
#!/bin/bash
# Automated version testing

versions=("stable/2025.1" "stable/2024.2" "master")

for version in "${versions[@]}"; do
    echo "Testing $version..."
    ./devstack version switch "$version"
    ./devstack status
    # Run tests...
    ./devstack snapshot create "tested-$version"
done
```

## Related Commands

- `./devstack rebuild` - Rebuilds with current .env version
- `./devstack snapshot create` - Backup before version change
- `./devstack status` - Verify after version switch
- `./devstack config set ubuntu <version>` - Change Ubuntu version (requires `config apply`)
