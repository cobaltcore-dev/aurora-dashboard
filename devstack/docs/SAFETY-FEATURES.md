# DevStack Safety Features Overview

This document provides an overview of safety features and confirmations in the DevStack CLI.

## Summary Table

| Command | Destructive | Confirmation | What's Protected | Data Loss |
|---------|------------|--------------|------------------|-----------|
| `setup` | ⚠️ Partial | ✅ Yes (if exists) | Existing VM | Previous VM |
| `start` | ❌ No | ❌ No | - | None |
| `stop` | ❌ No | ❌ No | - | None |
| `restart` | ❌ No | ❌ No | - | None |
| `shell` | ❌ No | ❌ No | - | None |
| `status` | ❌ No | ❌ No | - | None |
| `info` | ❌ No | ❌ No | - | None |
| `rebuild` | ✅ Yes | ✅ Yes | .env config | Everything in VM |
| `cleanup` | ✅ Yes | ✅ Yes | Nothing | Everything |
| `config show` | ❌ No | ❌ No | - | None |
| `config set` | ❌ No | ❌ No | - | None (only .env) |
| `config apply` | ✅ Yes | ✅ Yes | .env config | Everything in VM |
| `config resize cpus` | ⚠️ Partial | ✅ Yes | Data/DevStack | None (brief restart) |
| `config resize memory` | ⚠️ Partial | ✅ Yes | Data/DevStack | None (brief restart) |
| `config resize disk` | ⚠️ Partial | ✅ Yes | Data/DevStack | None (irreversible) |
| `version show` | ❌ No | ❌ No | - | None |
| `version list` | ❌ No | ❌ No | - | None |
| `version switch` | ⚠️ Partial | ✅ Yes | VM/Ubuntu | OpenStack data |
| `services *` | ❌ No | ❌ No | - | None (only .env) |
| `update-config` | ⚠️ Partial | ❌ No | VM/data | Config reset |
| `snapshot create` | ❌ No | ❌ No | - | None |
| `snapshot restore` | ✅ Yes | ✅ Yes | Snapshot | Current state |
| `snapshot delete` | ✅ Yes | ✅ Yes | Other snapshots | Snapshot only |

Legend:
- ✅ Yes = Full destructive operation
- ⚠️ Partial = Potentially disruptive but recoverable
- ❌ No = Safe, read-only or non-destructive

## Automatic Safety Snapshots

Before any destructive operation, the system automatically asks if you want to create a snapshot:

```bash
ℹ Create automatic safety snapshot before switching?
  Snapshot name: before-switch-to-stable-2024.2

Create snapshot? (Y/n):
```

**Features:**
- ✅ Opt-out (default is YES)
- ✅ Automatic naming
- ✅ Two-stage confirmation (snapshot + operation)
- ✅ Can be skipped if desired

**Applies to:**
- `version switch`
- `config apply`
- `rebuild`

## Recovery Options

If you accidentally proceed with a destructive action:

1. **Recent Snapshots**:
   ```bash
   ./devstack snapshot list
   ./devstack snapshot restore <name>
   ```

2. **Rebuild from .env**:
   ```bash
   ./devstack rebuild
   ```

3. **Clean Start**:
   ```bash
   ./devstack cleanup
   ./devstack setup
   ```
