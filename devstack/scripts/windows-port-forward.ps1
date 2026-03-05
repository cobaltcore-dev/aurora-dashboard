# Windows PowerShell Script - Port Forwarding to WSL2 Multipass VM
# Run this in PowerShell as Administrator

# Configuration
$wslIP = (wsl hostname -I).Trim()

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        Windows to WSL2 Port Forwarding Setup              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "WSL IP: $wslIP" -ForegroundColor Green
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ Error: This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Function to check if port is in use on Windows
function Test-PortInUse {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return ($null -ne $connections)
}

# Function to find next available port
function Find-AvailablePort {
    param([int]$StartPort)

    $port = $StartPort
    while (Test-PortInUse -Port $port) {
        $port++
        if ($port -gt 65535) {
            return 0
        }
    }
    return $port
}

# Try to read port mapping from WSL
Write-Host "Checking for port mapping from WSL..." -ForegroundColor Cyan
$portMappingFile = "\\wsl$\Ubuntu\home\$env:USERNAME\workspace\aurora-dashboard\devstack-v3\.port-mapping"

$portMappings = @{}

if (Test-Path $portMappingFile) {
    Write-Host "✓ Found port mapping file" -ForegroundColor Green
    Get-Content $portMappingFile | ForEach-Object {
        if ($_ -match '^\s*(\d+)=(\d+)\s*$') {
            $wslPort = [int]$Matches[1]
            $vmPort = [int]$Matches[2]
            $portMappings[$wslPort] = $vmPort
        }
    }
} else {
    Write-Host "⚠ No port mapping file found, using defaults" -ForegroundColor Yellow
    # Default ports
    $portMappings = @{
        8080 = 80
        5000 = 5000
        8774 = 8774
        9292 = 9292
        9696 = 9696
        8776 = 8776
        8778 = 8778
        6080 = 6080
    }
}

Write-Host ""
Write-Host "Checking port availability..." -ForegroundColor Cyan
Write-Host ""

# Check WSL2 ports first
Write-Host "Checking WSL2 ports..." -ForegroundColor Cyan
$wslPortsOk = $true
foreach ($wslPort in $portMappings.Keys) {
    try {
        $result = wsl bash -c "netstat -tuln 2>/dev/null | grep ':${wslPort} ' || ss -tuln 2>/dev/null | grep ':${wslPort} '"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "⚠  Port $wslPort is in use on WSL2" -ForegroundColor Yellow
            $wslPortsOk = $false
        } else {
            Write-Host "✓ Port $wslPort is available on WSL2" -ForegroundColor Green
        }
    } catch {
        Write-Host "✓ Port $wslPort is available on WSL2" -ForegroundColor Green
    }
}

if (-not $wslPortsOk) {
    Write-Host ""
    Write-Host "⚠  Warning: Some WSL2 ports are in use" -ForegroundColor Yellow
    Write-Host "   Make sure wsl2-port-forward.sh is running first" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Checking Windows ports..." -ForegroundColor Cyan
Write-Host ""

$forwardRules = @()

foreach ($wslPort in $portMappings.Keys) {
    $vmPort = $portMappings[$wslPort]
    $winPort = $wslPort  # Try to use same port on Windows

    # Check if port is available on Windows
    if (Test-PortInUse -Port $winPort) {
        $availablePort = Find-AvailablePort -StartPort $winPort

        if ($availablePort -eq 0) {
            Write-Host "❌ Error: Could not find available port for WSL port $wslPort" -ForegroundColor Red
            continue
        }

        Write-Host "⚠  Port $winPort is in use on Windows" -ForegroundColor Yellow
        Write-Host "   Using alternative port: $availablePort" -ForegroundColor Green
        $winPort = $availablePort
    } else {
        Write-Host "✓ Port $winPort is available on Windows" -ForegroundColor Green
    }

    $forwardRules += @{
        WinPort = $winPort
        WSLPort = $wslPort
        VMPort = $vmPort
    }
}

Write-Host ""
Write-Host "Setting up port forwarding..." -ForegroundColor Cyan
Write-Host ""

# Clear existing rules
try {
    netsh interface portproxy reset | Out-Null
    Write-Host "✓ Cleared existing port forwarding rules" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not clear existing rules (may not exist)" -ForegroundColor Yellow
}

# Add new rules
foreach ($rule in $forwardRules) {
    $winPort = $rule.WinPort
    $wslPort = $rule.WSLPort
    $vmPort = $rule.VMPort

    try {
        netsh interface portproxy add v4tov4 `
            listenport=$winPort `
            listenaddress=127.0.0.1 `
            connectport=$wslPort `
            connectaddress=$wslIP | Out-Null

        Write-Host "✓ Forwarding Windows:$winPort -> WSL:$wslPort -> VM:$vmPort" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to forward port $winPort" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Port Forwarding Configuration Complete!           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Services accessible from Windows:" -ForegroundColor Cyan
Write-Host ""

# Service mapping for display
$serviceInfo = @{
    8080 = @{ Name = "Horizon"; Path = "/dashboard"; Icon = "🌐" }
    5000 = @{ Name = "Keystone"; Path = ""; Icon = "🔐" }
    8774 = @{ Name = "Nova"; Path = ""; Icon = "💻" }
    9292 = @{ Name = "Glance"; Path = ""; Icon = "🖼️" }
    9696 = @{ Name = "Neutron"; Path = ""; Icon = "🔌" }
    8776 = @{ Name = "Cinder"; Path = ""; Icon = "💾" }
    8778 = @{ Name = "Placement"; Path = ""; Icon = "📍" }
    6080 = @{ Name = "NoVNC"; Path = ""; Icon = "🖥️" }
}

# Display each forwarded service
foreach ($rule in $forwardRules | Sort-Object VMPort) {
    $service = $serviceInfo[$rule.VMPort]
    if ($service) {
        $url = "http://localhost:$($rule.WinPort)$($service.Path)"
        $portInfo = ""

        # Show if port was remapped
        if ($rule.WinPort -ne $rule.VMPort) {
            $portInfo = " (remapped from :$($rule.VMPort))"
        }

        $serviceName = $service.Name.PadRight(12)
        Write-Host "  $($service.Icon) $serviceName $url" -ForegroundColor White -NoNewline
        if ($portInfo) {
            Write-Host $portInfo -ForegroundColor Yellow
        } else {
            Write-Host ""
        }
    }
}

Write-Host ""
Write-Host "Port Mapping Summary:" -ForegroundColor Gray
foreach ($rule in $forwardRules | Sort-Object VMPort) {
    Write-Host "  Windows:$($rule.WinPort) -> WSL:$($rule.WSLPort) -> VM:$($rule.VMPort)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Management commands:" -ForegroundColor Gray
Write-Host "  View rules:   netsh interface portproxy show all" -ForegroundColor Gray
Write-Host "  Remove rules: netsh interface portproxy reset" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ Done!" -ForegroundColor Green
