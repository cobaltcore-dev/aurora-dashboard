# Docker Container Access to DevStack WSL2

## Problem

Docker containers (like `ws-ide`) running in WSL2 cannot directly access the DevStack VM running in Multipass because they are on different networks:
- DevStack VM runs in Multipass with its own IP (e.g., `10.188.167.241`)
- Docker containers run in Docker's bridge network
- These networks are isolated from each other

## Solution

The existing `wsl2-port-forward.sh` script already solves this for BOTH Windows and Docker containers!

The script binds to `0.0.0.0` (all interfaces), which means:
- ✅ Windows can access via `localhost`
- ✅ Docker containers can access via `host.docker.internal`

## Usage

### 1. Start DevStack VM

```bash
cd devstack
./devstack start
./devstack status  # Verify VM is running
```

### 2. Start Port Forwarding (One Script for Everything)

In a separate terminal in WSL2:

```bash
cd devstack
./scripts/wsl2-port-forward.sh
```

This single script provides access to:
- ✅ **Windows Browser**: `http://localhost:8080/dashboard`
- ✅ **Docker Containers**: `http://host.docker.internal:8080/dashboard`

Forwarded ports:
- **8080**: Horizon Dashboard (VM port 80)
- **5000**: Keystone (Identity)
- **8774**: Nova (Compute)
- **9292**: Glance (Image)
- **9696**: Neutron (Network)
- **8778**: Placement
- **8776**: Cinder (Block Storage) *if enabled*

### 3. Access from Docker Container

From inside the `ws-ide` container:

```bash
# Test connection
curl http://host.docker.internal:8080/dashboard

# Use in your code
export KEYSTONE_URL=http://host.docker.internal:5000
export HORIZON_URL=http://host.docker.internal:8080/dashboard
export NOVA_URL=http://host.docker.internal:8774
export GLANCE_URL=http://host.docker.internal:9292
export NEUTRON_URL=http://host.docker.internal:9696
```

### 4. Stop Port Forwarding

Press `Ctrl+C` in the terminal running the script, or:

```bash
pkill -f "socat.*devstack"
```

## Network Flow

```
┌─────────────────────────────────────────────────────────┐
│ Windows Browser                                         │
│   └─> http://localhost:8080                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Docker Container (ws-ide)                               │
│   └─> http://host.docker.internal:8080                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ WSL2 Host (0.0.0.0:8080)                                │
│   socat forwards to VM                                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ DevStack VM (10.188.167.241:80)                        │
│   OpenStack services                                     │
└─────────────────────────────────────────────────────────┘
```

## Requirements

- WSL2 running under Windows
- `socat` (auto-installed by the script if missing)
- DevStack VM must be running
- Docker Desktop with WSL2 backend (provides `host.docker.internal`)

## Troubleshooting

### Cannot connect from container

**1. Check if `host.docker.internal` resolves:**

```bash
docker exec ws-ide getent hosts host.docker.internal
# Should show an IP address
```

**2. Check if port forwarding is running:**

```bash
# In WSL2
ps aux | grep socat
# Should show multiple socat processes
```

**3. Test from WSL2 first:**

```bash
# In WSL2 (not in container)
curl http://localhost:8080/dashboard
# Should return HTML
```

**4. Test from container:**

```bash
docker exec ws-ide curl -v http://host.docker.internal:8080/dashboard
```

### Port already in use

The script will detect and report port conflicts:

```bash
# Find what's using the port
sudo lsof -i :8080

# Kill the process
sudo kill <PID>
```