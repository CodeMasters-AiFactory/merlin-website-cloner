# Firewall & Network Rules

## Windows Firewall

### View Firewall Status
```powershell
# Check status
Get-NetFirewallProfile | Select-Object Name, Enabled

# List all rules
Get-NetFirewallRule | Select-Object Name, Enabled, Direction, Action

# Find specific rules
Get-NetFirewallRule -DisplayName "*Node*"
Get-NetFirewallRule | Where-Object {$_.Enabled -eq $true}
```

### Create Firewall Rules

#### Allow Inbound Port
```powershell
# Allow TCP port
New-NetFirewallRule -DisplayName "Allow Port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Allow multiple ports
New-NetFirewallRule -DisplayName "Allow Dev Ports" -Direction Inbound -Protocol TCP -LocalPort 3000,5000,5173,8080 -Action Allow

# Allow application
New-NetFirewallRule -DisplayName "Allow Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

#### Allow Outbound
```powershell
New-NetFirewallRule -DisplayName "Allow Outbound 443" -Direction Outbound -Protocol TCP -RemotePort 443 -Action Allow
```

### Modify Firewall Rules
```powershell
# Enable rule
Enable-NetFirewallRule -DisplayName "Rule Name"

# Disable rule
Disable-NetFirewallRule -DisplayName "Rule Name"

# Remove rule
Remove-NetFirewallRule -DisplayName "Rule Name"
```

### Development Firewall Rules
```powershell
# Create all dev rules at once
$devPorts = @(3000, 5000, 5173, 5432, 6379, 8080, 27017)

foreach ($port in $devPorts) {
    New-NetFirewallRule -DisplayName "Dev Port $port" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow
}
```

## Port Management

### Check Port Usage
```powershell
# List all listening ports
netstat -ano | findstr LISTENING

# Check specific port
netstat -ano | findstr :3000

# Get process using port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

### Kill Process on Port
```powershell
# Find PID
$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess

# Kill process
if ($pid) {
    Stop-Process -Id $pid -Force
    Write-Host "Killed process $pid on port 3000"
}
```

### Port Usage Script
```powershell
function Get-PortUsage {
    param([int]$Port)
    
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $process = Get-Process -Id $conn.OwningProcess
        Write-Host "Port $Port is used by $($process.ProcessName) (PID: $($conn.OwningProcess))"
    } else {
        Write-Host "Port $Port is available"
    }
}

# Usage
Get-PortUsage -Port 3000
```

## Network Configuration

### View Network Adapters
```powershell
Get-NetAdapter
Get-NetIPAddress
Get-NetIPConfiguration
```

### DNS Configuration
```powershell
# View DNS servers
Get-DnsClientServerAddress

# Set DNS servers
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("8.8.8.8","8.8.4.4")

# Flush DNS cache
Clear-DnsClientCache
ipconfig /flushdns
```

### IP Configuration
```powershell
# View IP
ipconfig /all

# Release/Renew DHCP
ipconfig /release
ipconfig /renew
```

## Network Testing

### Connectivity Tests
```powershell
# Ping
Test-Connection google.com

# Test port
Test-NetConnection -ComputerName localhost -Port 3000
Test-NetConnection -ComputerName google.com -Port 443

# Trace route
Test-NetConnection -ComputerName google.com -TraceRoute
```

### HTTP Testing
```powershell
# Quick test
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET

# With headers
$headers = @{
    "Authorization" = "Bearer token"
    "Content-Type" = "application/json"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/test" -Headers $headers -Method POST -Body '{"test":true}'
```

## SSL/TLS Certificates

### View Certificates
```powershell
# List certificates
Get-ChildItem Cert:\LocalMachine\My
Get-ChildItem Cert:\CurrentUser\My
```

### Create Self-Signed Certificate
```powershell
New-SelfSignedCertificate -DnsName "localhost","local.merlin.dev" -CertStoreLocation "Cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)
```

### Trust Certificate
```powershell
# Export certificate
$cert = Get-ChildItem Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*localhost*"}
Export-Certificate -Cert $cert -FilePath "C:\certs\localhost.cer"

# Import to Trusted Root
Import-Certificate -FilePath "C:\certs\localhost.cer" -CertStoreLocation Cert:\LocalMachine\Root
```

## Common Development Ports

| Port | Service |
|------|---------|
| 3000 | Node.js backend |
| 5000 | Alternative backend |
| 5173 | Vite dev server |
| 5432 | PostgreSQL |
| 27017 | MongoDB |
| 6379 | Redis |
| 8080 | Alternative HTTP |
| 443 | HTTPS |
| 80 | HTTP |
