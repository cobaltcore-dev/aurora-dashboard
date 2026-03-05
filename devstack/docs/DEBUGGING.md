# DevStack v3 - Debugging & Direct Access Guide

Wenn etwas nicht funktioniert oder du direkten Zugriff auf die VM brauchst, kannst du Multipass direkt nutzen.

## 🔍 VM Zugriff

### Shell-Zugriff

```bash
# Standard Shell (als ubuntu user)
multipass shell devstack

# Als root
multipass exec devstack -- sudo -i

# Als stack user (für OpenStack commands)
multipass exec devstack -- sudo -u stack bash
```

### Einzelne Commands ausführen

```bash
# Als ubuntu user
multipass exec devstack -- <command>

# Als root
multipass exec devstack -- sudo <command>

# Als stack user
multipass exec devstack -- sudo -u stack <command>
```

## 📊 VM Status & Info

### Check VM Status

```bash
# Liste aller VMs
multipass list

# Detaillierte VM Info
multipass info devstack

# VM Info im JSON Format
multipass info devstack --format json
```

**Was du siehst:**
- State (Running, Stopped, etc.)
- IPv4/IPv6 Adressen
- Release (Ubuntu Version)
- Image hash
- CPU, Memory, Disk Nutzung
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
# Stack.sh log (Haupt-Installation)
multipass exec devstack -- tail -f /opt/stack/logs/stack.sh.log

# Letzte 100 Zeilen
multipass exec devstack -- tail -100 /opt/stack/logs/stack.sh.log

# Nach Fehlern suchen
multipass exec devstack -- grep -i error /opt/stack/logs/stack.sh.log

# Service-spezifische Logs
multipass exec devstack -- ls -la /opt/stack/logs/

# Beispiel: Nova logs
multipass exec devstack -- tail -f /opt/stack/logs/n-api.log
multipass exec devstack -- tail -f /opt/stack/logs/n-cpu.log

# Beispiel: Neutron logs
multipass exec devstack -- tail -f /opt/stack/logs/q-svc.log
multipass exec devstack -- tail -f /opt/stack/logs/q-agt.log
```

### System Logs

```bash
# Systemd journal für alle DevStack services
multipass exec devstack -- journalctl -u 'devstack@*' -f

# Nur für einen Service (z.B. Nova API)
multipass exec devstack -- journalctl -u devstack@n-api -f

# System log
multipass exec devstack -- journalctl -f

# Kernel messages
multipass exec devstack -- dmesg | tail -50
```

### Cloud-init Logs (bei Setup-Problemen)

```bash
# Cloud-init status
multipass exec devstack -- cloud-init status

# Cloud-init logs
multipass exec devstack -- cat /var/log/cloud-init.log
multipass exec devstack -- cat /var/log/cloud-init-output.log
```

## 🔧 Service Management

### Systemd Services

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
# Als stack user in devstack directory
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && pwd"

# Services stoppen
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && ./unstack.sh"

# Services starten
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && ./stack.sh"

# OpenStack status
multipass exec devstack -- sudo -u stack bash -c "cd /home/stack/devstack && ./tools/openstack-status.sh"
```

## 🌐 Networking

### Check VM Networking

```bash
# IP Adressen
multipass exec devstack -- ip addr show

# Routing table
multipass exec devstack -- ip route show

# DNS configuration
multipass exec devstack -- cat /etc/resolv.conf

# Test connectivity
multipass exec devstack -- ping -c 3 google.com

# Port listening
multipass exec devstack -- sudo netstat -tulpn | grep LISTEN
# oder
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

### Wichtige Verzeichnisse

```bash
# DevStack Installation
/home/stack/devstack/          # DevStack scripts
/opt/stack/                    # OpenStack code
/opt/stack/logs/               # Alle logs
/etc/                          # Config files

# Beispiele:
multipass exec devstack -- ls -la /home/stack/devstack/
multipass exec devstack -- ls -la /opt/stack/
multipass exec devstack -- ls -la /opt/stack/logs/
```

### Dateien kopieren (Host <-> VM)

```bash
# Von Host zur VM
multipass transfer /local/file.txt devstack:/tmp/file.txt

# Von VM zum Host
multipass transfer devstack:/tmp/file.txt /local/file.txt

# Ganzes Verzeichnis
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

# Beispiel: Nova config
multipass exec devstack -- cat /etc/nova/nova.conf
```

## 🐛 Common Debug Scenarios

### 1. DevStack Installation Hangs

```bash
# Check where it hangs
multipass exec devstack -- tail -f /opt/stack/logs/stack.sh.log

# Check processes
multipass exec devstack -- ps aux | grep stack

# Check system resources
multipass exec devstack -- df -h
multipass exec devstack -- free -h
```

### 2. Service Won't Start

```bash
# Check service status
multipass exec devstack -- systemctl status devstack@n-api

# Service logs
multipass exec devstack -- journalctl -u devstack@n-api -n 100

# Check config
multipass exec devstack -- cat /etc/nova/nova.conf
```

### 3. OpenStack API Not Responding

```bash
# Check if service is running
multipass exec devstack -- systemctl status devstack@keystone

# Check port
multipass exec devstack -- sudo netstat -tulpn | grep 5000

# Test from VM
multipass exec devstack -- curl http://localhost/identity

# Check logs
multipass exec devstack -- tail -f /opt/stack/logs/keystone.log
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

### 5. Neutron/OVS Probleme

```bash
# OVS bridges
multipass exec devstack -- sudo ovs-vsctl show

# Neutron agents
multipass exec devstack -- sudo -u stack bash -c "source /home/stack/devstack/openrc admin admin && openstack network agent list"

# Neutron logs
multipass exec devstack -- tail -f /opt/stack/logs/q-svc.log
multipass exec devstack -- tail -f /opt/stack/logs/q-agt.log
```

## 🔄 VM Management

### VM Start/Stop/Restart

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

### Snapshots (direkt mit multipass)

```bash
# Snapshot erstellen
multipass snapshot devstack --name my-snapshot

# List all snapshots
multipass info devstack | grep -A 20 "Snapshots:"

# Snapshot wiederherstellen
multipass restore devstack --snapshot my-snapshot

# Snapshot löschen
multipass delete devstack.my-snapshot
```

### VM Recovery

```bash
# VM aus recycle bin wiederherstellen
multipass recover devstack

# Check VM status after crash
multipass list
multipass info devstack
```

## 🔑 OpenStack CLI Debugging

```bash
# In VM als stack user
multipass shell devstack
sudo su - stack
source /home/stack/devstack/openrc admin admin

# Verbose output für debugging
openstack --debug service list

# Ohne Paging
openstack --fit-width service list

# Als JSON (für parsing)
openstack service list -f json

# Test einzelner Services
openstack token issue                    # Keystone
openstack image list                     # Glance
openstack network list                   # Neutron
openstack server list                    # Nova
openstack volume list                    # Cinder
```

## 📚 Nützliche Multipass Commands

```bash
# Multipass Version
multipass version

# Multipass Einstellungen
multipass get local.driver

# Verfügbare Ubuntu Images
multipass find

# VM suspend (speichert RAM state)
multipass suspend devstack

# Hilfe
multipass help
multipass help <command>
```

## 🚨 Notfall-Recovery

### VM Not Responding

```bash
# Force stop und restart
multipass stop devstack --force
multipass start devstack

# Wenn das nicht hilft: Logs vom Host anschauen
journalctl -u snap.multipass* -f
```

### Multipass selbst hat Probleme

```bash
# Multipass daemon restart (Linux)
sudo snap restart multipass

# Multipass logs (Linux)
sudo journalctl -u snap.multipass* -n 100

# Multipass daemon status
sudo systemctl status snap.multipass.multipassd
```

### VM ist korrupt

```bash
# Restore von Snapshot (wenn vorhanden)
multipass restore devstack --snapshot clean-install

# Sonst: VM neu erstellen
multipass delete devstack
multipass purge
./devstack setup
```

## 💡 Pro Tips

1. **Erstelle immer Snapshots nach erfolgreicher Installation:**
   ```bash
   ./devstack snapshot create clean-install
   ```

2. **Bei Debugging: Tail mehrere Logs gleichzeitig:**
   ```bash
   # In separaten Terminals
   multipass exec devstack -- tail -f /opt/stack/logs/stack.sh.log
   multipass exec devstack -- journalctl -u 'devstack@*' -f
   ```

3. **Nutze screen/tmux in der VM für persistente Sessions:**
   ```bash
   multipass shell devstack
   screen  # oder tmux
   ```

4. **Logs nach Fehlern durchsuchen:**
   ```bash
   multipass exec devstack -- grep -r "ERROR\|CRITICAL" /opt/stack/logs/
   ```

5. **Resource-Nutzung monitoren:**
   ```bash
   multipass exec devstack -- htop
   # oder
   multipass exec devstack -- watch -n 1 'free -h && df -h'
   ```

## 📖 Weiterführende Ressourcen

- **Multipass Docs:** https://multipass.run/docs
- **DevStack Docs:** https://docs.openstack.org/devstack/latest/
- **OpenStack CLI Docs:** https://docs.openstack.org/python-openstackclient/latest/
- **Systemd Units:** `man systemd.unit`
- **OVS Commands:** `man ovs-vsctl`
