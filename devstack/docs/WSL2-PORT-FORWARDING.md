# WSL2 Port Forwarding Guide

When running DevStack in Multipass under WSL2, network traffic needs to be forwarded through multiple layers to be accessible from Windows or external networks.

## Network Architecture

```
External Network / Other Computers
            ↓
    Windows Host (localhost)
            ↓ [windows-port-forward.ps1]
          WSL2
            ↓ [wsl2-port-forward.sh]
    Multipass VM (DevStack)
```

## Two Forwarding Scripts

### 1. `wsl2-port-forward.sh` (WSL2 → Windows)

**Location**: `scripts/wsl2-port-forward.sh`

**Purpose**: Forwards ports from the Multipass VM through WSL2 to Windows localhost

**Use Case**: You want to access DevStack services from your Windows browser

**How to Use**:
```bash
# From the devstack directory in WSL2
./scripts/wsl2-port-forward.sh

# No sudo required! All ports are non-privileged (≥1024)
```

**What It Does**:
- Detects the Multipass VM IP address
- Checks if ports are available on WSL2
- **Automatically finds the next free port** if a port is already in use
- Uses `socat` to forward ports from WSL2 to the VM
- Makes services accessible at `http://localhost:<port>` on Windows

**When You Need This**:
- ✅ You want to access Horizon dashboard from Windows browser
- ✅ You want to use OpenStack CLI tools from Windows
- ✅ You are developing/testing locally on Windows
- ✅ **This is the most common use case**
- ✅ **Handles port conflicts automatically** by finding the next free port

**Example**:
```bash
$ ./scripts/wsl2-port-forward.sh

╔════════════════════════════════════════════════════════════╗
║        WSL2 to Windows Port Forwarding Setup              ║
╚════════════════════════════════════════════════════════════╝

✓ VM IP: 10.140.232.45
✓ WSL IP: 172.28.224.12

ℹ Checking port availability on WSL2...

⚠ Port 8080 is already in use (Horizon Dashboard)
ℹ Using alternative port: 8081 → VM:80
✓ Port 5000 is available (Keystone)
...

ℹ Starting port forwarding...

✓ Port 8081 -> 10.140.232.45:80 (Horizon Dashboard)
✓ Port 5000 -> 10.140.232.45:5000 (Keystone)
...

Services accessible from Windows browser:

  🌐 Horizon:    http://localhost:8081/dashboard
  🔐 Keystone:   http://localhost:5000
  ...
```

**Note**: If a port is already in use, the script automatically selects the next available port.

**Keep Running**: The script must stay running. Press Ctrl+C to stop.

---

### 2. `windows-port-forward.ps1` (Windows → WSL2)

**Location**: `scripts/windows-port-forward.ps1`

**Purpose**: Forwards ports from Windows network interfaces into WSL2

**Use Case**: You want to access DevStack from other computers on your network

**How to Use**:
```powershell
# In PowerShell as Administrator (on Windows host)
cd \\wsl$\Ubuntu\home\<username>\workspace\aurora-dashboard\devstack
.\scripts\windows-port-forward.ps1
```

**What It Does**:
- Uses Windows `netsh` to create port forwarding rules
- Forwards from Windows network interface to WSL2 IP
- Makes services accessible from external computers

**When You Need This**:
- ❌ **Most users DON'T need this**
- ✅ You want to access DevStack from another computer on your network
- ✅ You want to share your DevStack with colleagues
- ✅ You are running automated tests from external systems
- ✅ You need to access DevStack from mobile devices

**Example**:
```powershell
PS> .\scripts\windows-port-forward.ps1

╔════════════════════════════════════════════════════════════╗
║        Windows to WSL2 Port Forwarding Setup              ║
╚════════════════════════════════════════════════════════════╝

WSL IP: 172.28.224.12

✓ Port 80 is available
✓ Port 5000 is available
...

✓ Forwarding Windows:80 -> WSL:80 -> VM:80
✓ Forwarding Windows:5000 -> WSL:5000 -> VM:5000
...

Services accessible from Windows:
  🌐 Horizon:    http://localhost/dashboard
  🔐 Keystone:   http://localhost:5000
  ...
```

**Persistent**: Rules persist until removed with `netsh interface portproxy reset`

---

## Common Scenarios

### Scenario 1: Local Development (Most Common)

**Goal**: Access DevStack from Windows browser

**Solution**: Use `wsl2-port-forward.sh` only

```bash
# In WSL2
./scripts/wsl2-port-forward.sh
```

Access in Windows browser: `http://localhost:8080/dashboard`

---

### Scenario 2: Team Sharing / External Access

**Goal**: Allow colleagues to access your DevStack from their computers

**Solution**: Use both scripts

```bash
# Step 1: In WSL2 terminal
./scripts/wsl2-port-forward.sh
```

```powershell
# Step 2: In Windows PowerShell (as Administrator)
.\scripts\windows-port-forward.ps1
```

Access from other computers: `http://<your-windows-ip>:8080/dashboard`

---

### Scenario 3: Native Linux / macOS

**Goal**: Access DevStack (no WSL2 involved)

**Solution**: No port forwarding needed!

DevStack services are directly accessible at the VM IP:

```bash
# Get VM IP
VM_IP=$(multipass info devstack | grep IPv4 | awk '{print $2}')

# Access directly
echo "Horizon: http://${VM_IP}/dashboard"
```

---

## Troubleshooting

### Port Already in Use

**Problem**: A port you need is already in use by another application

**Solution**: The script automatically detects this and uses the next available port!

```bash
./scripts/wsl2-port-forward.sh
# If port 8080 is busy, it will use 8081, 8082, etc.
```

The script will show you which alternative ports were selected in the output.

### Can't Access from Windows

**Problem**: `http://localhost` doesn't work in Windows browser

**Check**:
1. Is `wsl2-port-forward.sh` running? (Keep terminal open)
2. Is the VM running? `./devstack.sh status`
3. Is Windows Firewall blocking? (Temporarily disable to test)

### Can't Access from Other Computers

**Problem**: External computers can't reach `http://<windows-ip>/dashboard`

**Check**:
1. Did you run `wsl2-port-forward.sh` first? (Required)
2. Did you run `windows-port-forward.ps1` as Administrator?
3. Is Windows Firewall blocking? (Allow incoming connections)
4. Is the other computer on the same network?

---

## Technical Details

### Port List

| Service   | Port | Description                | WSL2 Port |
|-----------|------|----------------------------|-----------|
| Horizon   | 80   | OpenStack Dashboard        | 8080      |
| Keystone  | 5000 | Identity Service (Auth)    | 5000      |
| Nova      | 8774 | Compute Service            | 8774      |
| Glance    | 9292 | Image Service              | 9292      |
| Neutron   | 9696 | Network Service            | 9696      |
| Cinder    | 8776 | Volume Service             | 8776      |
| Placement | 8778 | Placement Service          | 8778      |
| NoVNC     | 6080 | VNC Console Proxy          | 6080      |

**Note**: Horizon is mapped from VM port 80 to WSL2/Windows port 8080 to avoid requiring privileged access.

### How wsl2-port-forward.sh Works

Uses `socat` to create TCP forwarders:
```bash
socat TCP-LISTEN:8080,bind=<WSL-IP>,fork,reuseaddr TCP:<VM-IP>:80
```

- Listens on WSL2 IP address (port 8080)
- Forwards all traffic to Multipass VM IP (port 80)
- Runs in background for each port
- No sudo required (all ports ≥1024)

### How windows-port-forward.ps1 Works

Uses Windows `netsh` to create port proxy rules:
```powershell
netsh interface portproxy add v4tov4 `
    listenport=8080 `
    listenaddress=127.0.0.1 `
    connectport=8080 `
    connectaddress=<WSL-IP>
```

- Creates persistent forwarding rules
- Forwards from Windows to WSL2
- Survives reboots (until manually removed)

---

## Quick Reference

| Task | Command |
|------|---------|
| Start WSL2→Windows forwarding | `./scripts/wsl2-port-forward.sh` |
| Start Windows→WSL2 forwarding | `.\scripts\windows-port-forward.ps1` (as Admin) |
| Stop WSL2 forwarding | `Ctrl+C` or `pkill -f "socat.*devstack"` |
| Stop Windows forwarding | `netsh interface portproxy reset` |
| Check if VM is running | `./devstack.sh status` |
| Get VM IP | `multipass info devstack \| grep IPv4` |

---

## Best Practices

1. **Always start `wsl2-port-forward.sh` first** before `windows-port-forward.ps1`
2. **Keep the WSL2 terminal open** while using DevStack
3. **Use `./devstack.sh start`** - it will remind you about port forwarding
4. **Only use `windows-port-forward.ps1`** if you need external access
5. **Stop port forwarding** when not using DevStack to free resources

---

## Automatic Start (Optional)

### Auto-start wsl2-port-forward.sh

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Auto-start DevStack port forwarding if VM is running
if multipass list 2>/dev/null | grep -q "^devstack.*Running"; then
    if ! pgrep -f "socat.*devstack" >/dev/null; then
        echo "Starting DevStack port forwarding..."
        cd ~/workspace/aurora-dashboard/devstack
        nohup ./scripts/wsl2-port-forward.sh > /dev/null 2>&1 &
        disown
    fi
fi
```

**Note**: This will run in the background. To stop: `pkill -f "socat.*devstack"`

### Auto-start windows-port-forward.ps1

Create a Windows Task Scheduler task:
1. Open Task Scheduler
2. Create Task → Triggered by "At log on"
3. Action: Run PowerShell script
4. Script: `\\wsl$\Ubuntu\...\scripts\windows-port-forward.ps1`
5. Run with highest privileges

---

## FAQ

### Why is Horizon on port 8080 instead of 80?

Port 80 is a privileged port (< 1024) that requires root permissions to bind. To avoid requiring `sudo` for port forwarding, we map VM port 80 to WSL2/Windows port 8080 instead.

If you prefer port 80, you can:
1. Modify the script to use port 80 and run with `sudo`
2. Use `authbind` to allow non-root binding to privileged ports
3. Configure passwordless sudo for socat (see commented-out section in docs)

### Can I run both scripts at the same time?

Yes! In fact, you **must** run `wsl2-port-forward.sh` first if you want to use `windows-port-forward.ps1`.

The chain is: `VM → wsl2-port-forward.sh → WSL2 → windows-port-forward.ps1 → Windows → Network`

### Do I need to restart port forwarding after VM restart?

Yes. When you stop and start the VM:
1. The VM gets a new IP address
2. Stop the old port forwarding: `Ctrl+C` or `sudo pkill -f "socat.*devstack"`
3. Start new port forwarding: `./scripts/wsl2-port-forward.sh`

The `./devstack.sh start` command will remind you about this.

### Why can't I just access the VM IP directly from Windows?

WSL2 uses a virtual network adapter with NAT. The Multipass VM runs inside WSL2's network namespace, which is isolated from the Windows host. Direct access to VM IPs from Windows is not possible without port forwarding.

### What's the difference between wsl-port-forward.sh and wsl2-port-forward.sh?

- `wsl-port-forward.sh`: Old/deprecated script (if it exists)
- `wsl2-port-forward.sh`: New, improved script with sudo support for privileged ports

Always use `wsl2-port-forward.sh` (the one in the `scripts/` directory).

---

For more help, see the main [README.md](../README.md)
