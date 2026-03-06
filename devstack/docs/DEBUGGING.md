# DevStack v3 - Debugging & Direct Access Guide

When something doesn't work or you need direct VM access, you can use Multipass or the CLI debug commands directly.

## 🔍 VM Access

### Shell Access

```bash
# Standard shell (as ubuntu user)
./devstack shell
# or
multipass shell devstack

# As root
multipass exec devstack -- sudo -i

# As stack user (for OpenStack commands)
multipass exec devstack -- sudo -u stack bash
```

### Execute Single Commands

```bash
# As ubuntu user
multipass exec devstack -- <command>

# As root
multipass exec devstack -- sudo <command>

# As stack user
multipass exec devstack -- sudo -u stack <command>
```

## 📊 VM Status & Info

### Check VM Status

```bash
# Using CLI (recommended)
./devstack status
./devstack info

# Direct multipass commands
multipass list
multipass info devstack
multipass info devstack --format json
```

**What you see:**
- State (Running, Stopped, etc.)
- IPv4/IPv6 addresses
- Release (Ubuntu version)
- Image hash
- CPU, Memory, Disk usage
- Mount points
- Snapshots

### Resource Monitoring

```bash
# In VM: top/htop
multipass exec devstack -- top

# In VM: Disk usage
multipass exec devstack -- df -h

# In VM: Memory
multipass exec devstack -- free -h

# In VM: Running processes
multipass exec devstack -- ps aux | grep devstack
```

## 📝 Logs & Debugging

### DevStack Logs

```bash
# Using CLI (recommended)
./devstack logs                # Last 50 lines
./devstack logs tail           # Follow in real-time
./devstack logs stack          # Stack.sh log (last 50 lines)
./devstack logs stack-tail     # Follow stack.sh log

# Direct access to stack.sh log (main installation)
multipass exec devstack -- tail -f /opt/stack/logs/stack.sh.log

# Last 100 lines
multipass exec devstack -- tail -100 /opt/stack/logs/stack.sh.log

# Search for errors
multipass exec devstack -- grep -i error /opt/stack/logs/stack.sh.log

# Service-specific logs
multipass exec devstack -- ls -la /opt/stack/logs/

# Example: Nova logs
multipass exec devstack -- tail -f /opt/stack/logs/n-api.log
multipass exec devstack -- tail -f /opt/stack/logs/n-cpu.log

# Example: Neutron logs
multipass exec devstack -- tail -f /opt/stack/logs/q-svc.log
multipass exec devstack -- tail -f /opt/stack/logs/q-agt.log
```

### System Logs

```bash
# Systemd journal for all DevStack services
multipass exec devstack -- journalctl -u 'devstack@*' -f

# Only for one service (e.g. Nova API)
multipass exec devstack -- journalctl -u devstack@n-api -f

# System log
multipass exec devstack -- journalctl -f

# Kernel messages
multipass exec devstack -- dmesg | tail -50
```

### Cloud-init Logs (for setup problems)

```bash
# Cloud-init status
multipass exec devstack -- cloud-init status

# Cloud-init logs
multipass exec devstack -- cat /var/log/cloud-init.log
multipass exec devstack -- cat /var/log/cloud-init-output.log
```

## 🔧 Service Management

### Using CLI Debug Commands

```bash
# Show service logs
./devstack debug logs <service>       # e.g., nova, keystone, neutron

# Show service status
./devstack debug status               # All services
./devstack debug status <service>     # Specific service

# Complete service diagnostics
./devstack debug all <service>        # Status + logs + config
```

### Systemd Services (Direct)

```bash
# List all DevStack services
multipass exec devstack -- systemctl list-units 'devstack@*'

# Check service status
multipass exec devstack -- systemctl status devstack@n-api

# Restart service
multipass exec devstack -- sudo systemctl restart devstack@n-api

# Service logs
multipass exec devstack -- journalctl -u devstack@n-api -n 50
```

### DevStack Scripts

```bash
# As stack user in devstack directory
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && pwd"

# Stop services
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && ./unstack.sh"

# Start services
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && ./stack.sh"

# OpenStack status
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && ./tools/openstack-status.sh"
```

## 🌐 Networking

### Using CLI Debug Commands

```bash
# OpenVSwitch diagnostics
./devstack debug ovs

# Network diagnostics
./devstack debug network

# Test all API endpoints
./devstack debug api
```

### Check VM Networking (Direct)

```bash
# IP addresses
multipass exec devstack -- ip addr show

# Routing table
multipass exec devstack -- ip route show

# DNS configuration
multipass exec devstack -- cat /etc/resolv.conf

# Test connectivity
multipass exec devstack -- ping -c 3 google.com

# Port listening
multipass exec devstack -- sudo netstat -tulpn | grep LISTEN
# or
multipass exec devstack -- sudo ss -tulpn | grep LISTEN
```

### OpenVSwitch Status

```bash
# OVS bridges
multipass exec devstack -- sudo ovs-vsctl show

# OVS version
multipass exec devstack -- sudo ovs-vsctl --version

# OVS service status
multipass exec devstack -- systemctl status ovs-vswitchd
multipass exec devstack -- systemctl status ovsdb-server
```

### Firewall / iptables

```bash
# iptables rules
multipass exec devstack -- sudo iptables -L -n -v

# NAT rules
multipass exec devstack -- sudo iptables -t nat -L -n -v
```

## 📦 Files & Directories

### Important Directories

```bash
# DevStack installation
/home/stack/devstack/          # DevStack scripts
/opt/stack/                    # OpenStack code
/opt/stack/logs/               # All logs
/etc/                          # Config files

# Examples:
multipass exec devstack -- ls -la /home/stack/devstack/
multipass exec devstack -- ls -la /opt/stack/
multipass exec devstack -- ls -la /opt/stack/logs/
```

### Copy Files (Host <-> VM)

```bash
# From host to VM
multipass transfer /local/file.txt devstack:/tmp/file.txt

# From VM to host
multipass transfer devstack:/tmp/file.txt /local/file.txt

# Entire directory
multipass transfer -r /local/dir devstack:/tmp/dir
```

### Config Files

```bash
# DevStack local.conf
multipass exec devstack -- cat /home/stack/devstack/local.conf

# OpenStack configs
multipass exec devstack -- ls -la /etc/nova/
multipass exec devstack -- ls -la /etc/neutron/
multipass exec devstack -- ls -la /etc/keystone/

# Example: Nova config
multipass exec devstack -- cat /etc/nova/nova.conf
```

## 🐛 Common Debug Scenarios

### 1. DevStack Installation Hangs

```bash
# Check where it hangs
./devstack logs stack-tail
# or
multipass exec devstack -- tail -f /opt/stack/logs/stack.sh.log

# Check processes
multipass exec devstack -- ps aux | grep stack

# Check system resources
multipass exec devstack -- df -h
multipass exec devstack -- free -h
```

### 2. Service Won't Start

```bash
# Using CLI
./devstack debug all <service>

# Direct check
multipass exec devstack -- systemctl status devstack@n-api

# Service logs
multipass exec devstack -- journalctl -u devstack@n-api -n 100

# Check config
multipass exec devstack -- cat /etc/nova/nova.conf
```

### 3. OpenStack API Not Responding

```bash
# Test all APIs
./devstack debug api

# Check specific service
./devstack debug status keystone

# Direct checks
multipass exec devstack -- systemctl status devstack@keystone

# Check port
multipass exec devstack -- sudo netstat -tulpn | grep 5000

# Test from VM
multipass exec devstack -- curl http://localhost/identity

# Check logs
./devstack debug logs keystone
```

### 4. Horizon Dashboard Not Accessible

```bash
# Apache status
multipass exec devstack -- systemctl status apache2

# Apache logs
multipass exec devstack -- tail -f /var/log/apache2/error.log
multipass exec devstack -- tail -f /var/log/apache2/access.log

# Horizon logs
multipass exec devstack -- tail -f /opt/stack/logs/horizon.log
```

### 5. Neutron/OVS Problems

```bash
# Using CLI
./devstack debug ovs
./devstack debug network

# OVS bridges
multipass exec devstack -- sudo ovs-vsctl show

# Neutron agents
multipass exec devstack -- sudo -u stack bash -c "source /home/stack/devstack/openrc admin admin && openstack network agent list"

# Neutron logs
./devstack debug logs neutron
# or
multipass exec devstack -- tail -f /opt/stack/logs/q-svc.log
multipass exec devstack -- tail -f /opt/stack/logs/q-agt.log
```

### 6. Compute Problems

```bash
# Using CLI
./devstack debug compute

# Direct checks
./devstack debug status nova
./devstack debug logs nova
```

## 🔄 VM Management

### Using CLI (Recommended)

```bash
# Start VM
./devstack start

# Stop VM
./devstack stop

# Restart VM
./devstack restart

# Show status
./devstack status

# Show detailed info
./devstack info

# Delete VM
./devstack cleanup
```

### Direct Multipass Commands

```bash
# Start VM
multipass start devstack

# Stop VM (graceful shutdown)
multipass stop devstack

# Restart VM
multipass restart devstack

# Force stop (hard shutdown)
multipass stop devstack --force

# Delete VM (but keep in recycle bin)
multipass delete devstack

# Permanently delete
multipass purge
```

### Snapshots

```bash
# Using CLI (recommended)
./devstack snapshot create my-snapshot
./devstack snapshot list
./devstack snapshot restore my-snapshot
./devstack snapshot delete my-snapshot

# Direct multipass commands
multipass snapshot devstack --name my-snapshot
multipass info devstack | grep -A 20 "Snapshots:"
multipass restore devstack --snapshot my-snapshot
multipass delete devstack.my-snapshot
```

### VM Recovery

```bash
# Recover VM from recycle bin
multipass recover devstack

# Check VM status after crash
multipass list
./devstack status
```

## 🔑 OpenStack CLI Debugging

```bash
# In VM as stack user
./devstack shell
sudo su - stack
source /home/stack/devstack/openrc admin admin

# Verbose output for debugging
openstack --debug service list

# Without paging
openstack --fit-width service list

# As JSON (for parsing)
openstack service list -f json

# Test individual services
openstack token issue                    # Keystone
openstack image list                     # Glance
openstack network list                   # Neutron
openstack server list                    # Nova
openstack volume list                    # Cinder
```

## 📚 Useful Multipass Commands

```bash
# Multipass version
multipass version

# Multipass settings
multipass get local.driver

# Available Ubuntu images
multipass find

# VM suspend (saves RAM state)
multipass suspend devstack

# Help
multipass help
multipass help <command>
```

## 🚨 Emergency Recovery

### VM Not Responding

```bash
# Force stop and restart
multipass stop devstack --force
multipass start devstack

# If that doesn't help: Check logs from host
journalctl -u snap.multipass* -f
```

### Multipass Itself Has Problems

```bash
# Multipass daemon restart (Linux)
sudo snap restart multipass

# Multipass logs (Linux)
sudo journalctl -u snap.multipass* -n 100

# Multipass daemon status
sudo systemctl status snap.multipass.multipassd
```

### VM is Corrupted

```bash
# Restore from snapshot (if available)
./devstack snapshot restore clean-install

# Otherwise: Recreate VM
./devstack cleanup
./devstack setup
```

## 💡 Pro Tips

1. **Always create snapshots after successful installation:**
   ```bash
   ./devstack snapshot create clean-install
   ```

2. **For debugging: Tail multiple logs simultaneously:**
   ```bash
   # In separate terminals
   ./devstack logs tail
   ./devstack logs stack-tail
   ```

3. **Use screen/tmux in VM for persistent sessions:**
   ```bash
   ./devstack shell
   screen  # or tmux
   ```

4. **Search logs for errors:**
   ```bash
   multipass exec devstack -- grep -r "ERROR\|CRITICAL" /opt/stack/logs/
   ```

5. **Monitor resource usage:**
   ```bash
   multipass exec devstack -- htop
   # or
   multipass exec devstack -- watch -n 1 'free -h && df -h'
   ```

## 📖 Further Resources

- **Multipass Docs:** https://multipass.run/docs
- **DevStack Docs:** https://docs.openstack.org/devstack/latest/
- **OpenStack CLI Docs:** https://docs.openstack.org/python-openstackclient/latest/
- **Systemd Units:** `man systemd.unit`
- **OVS Commands:** `man ovs-vsctl`
