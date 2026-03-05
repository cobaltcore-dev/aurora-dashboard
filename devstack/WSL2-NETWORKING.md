# WSL2 Networking Guide

## Problem

When running Multipass in WSL2, the VM IP is only accessible from within WSL2, not from the Windows host.

```
Windows Host (can't reach VM)
    └─ WSL2 (can reach VM)
        └─ Multipass VM (10.188.167.x)
```

## Solution: Port Forwarding

To access DevStack services from Windows, you need two-level port forwarding:
1. **WSL2 → Multipass VM** (via socat)
2. **Windows → WSL2** (via netsh)

## Step 1: Start DevStack

```bash
# In WSL2
cd devstack-v3
./devstack.sh setup
# Wait for installation to complete
./devstack.sh status  # Note the VM IP
```

## Step 2: Forward Ports from WSL2 to VM

```bash
# In WSL2
./wsl-port-forward.sh
```

This forwards ports from WSL2 (localhost) to the Multipass VM.

**Services now accessible from WSL2:**
- `http://localhost/dashboard` → Horizon
- `http://localhost:5000` → Keystone
- etc.

**Keep this terminal open!** Or run in background:
```bash
nohup ./wsl-port-forward.sh > port-forward.log 2>&1 &
```

## Step 3: Forward Ports from Windows to WSL2

**In Windows PowerShell (as Administrator):**

```powershell
# Edit the script first to set correct VM IP
notepad windows-port-forward.ps1

# Run the script
.\windows-port-forward.ps1
```

**Services now accessible from Windows:**
- `http://localhost/dashboard` → Horizon
- `http://localhost:5000` → Keystone
- etc.

## Quick Commands

### Check if forwarding works

**From WSL2:**
```bash
curl http://localhost/dashboard
```

**From Windows PowerShell:**
```powershell
curl http://localhost/dashboard
```

**From Windows Browser:**
```
http://localhost/dashboard
```

### Stop forwarding

**WSL2 to VM:**
```bash
sudo pkill socat
```

**Windows to WSL2:**
```powershell
# In PowerShell as Administrator
netsh interface portproxy reset
```

### View current Windows forwarding rules

```powershell
netsh interface portproxy show all
```

## Alternative: Access via VM IP from WSL2

If you only need access from WSL2 (not Windows), skip port forwarding:

```bash
# Get VM IP
./devstack.sh status

# Access directly
curl http://10.188.167.241/dashboard
# Or open in WSL2 browser (if you have WSLg)
```

## Automatic Port Forwarding

To make port forwarding automatic, add to your workflow:

### Option 1: Add to devstack.sh

We could add a `./devstack.sh forward` command that:
1. Starts WSL2 → VM forwarding
2. Shows Windows PowerShell command to copy/paste

### Option 2: Systemd Service (WSL2)

Create a systemd service to auto-start port forwarding.

### Option 3: Windows Startup Script

Create a scheduled task to run `windows-port-forward.ps1` on boot.

## Ports Reference

| Service | Port | Description |
|---------|------|-------------|
| Horizon | 80 | Web Dashboard |
| Keystone | 5000 | Identity API |
| Nova | 8774 | Compute API |
| Glance | 9292 | Image API |
| Neutron | 9696 | Network API |
| Cinder | 8776 | Block Storage API |
| Placement | 8778 | Placement API |
| NoVNC | 6080 | VNC Console Proxy |

## Troubleshooting

### "Connection refused" from Windows

```powershell
# Check if Windows forwarding is active
netsh interface portproxy show all

# Should show rules for ports 80, 5000, etc.
```

### "Connection timeout" from WSL2

```bash
# Check if socat is running
ps aux | grep socat

# Check VM is running
./devstack.sh status

# Test VM directly
curl http://$(multipass info devstack | grep IPv4 | awk '{print $2}')/dashboard
```

### WSL2 IP changes on restart

The Windows port forwarding script detects WSL2 IP automatically. Just re-run it:

```powershell
.\windows-port-forward.ps1
```

### Port already in use

```bash
# WSL2: Find what's using the port
sudo lsof -i :80

# Windows: Find what's using the port
netstat -ano | findstr :80
```

## Performance Note

Port forwarding adds minimal latency (~1-5ms). For best performance, access directly from WSL2 when possible.

## Security Note

The Windows port forwarding binds to `0.0.0.0`, making services accessible from your local network.

To bind only to localhost:
```powershell
# Change in windows-port-forward.ps1:
netsh interface portproxy add v4tov4 listenport=$port listenaddress=127.0.0.1 connectport=$port connectaddress=$wslIP
```
