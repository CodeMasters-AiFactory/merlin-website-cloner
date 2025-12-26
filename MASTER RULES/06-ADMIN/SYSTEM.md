# System Administration Rules

## Process Management

### View Processes
```powershell
Get-Process                       # All processes
Get-Process -Name "node"          # Specific process
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
```

### Kill Processes
```powershell
Stop-Process -Name "node" -Force  # By name
Stop-Process -Id 1234 -Force      # By PID
taskkill /F /IM node.exe          # Kill all instances
taskkill /F /PID 1234             # By PID
```

### Find Process on Port
```powershell
netstat -ano | findstr :5000      # Find PID
Get-Process -Id <PID>             # Get process info
```

---

## Service Management

```powershell
# List services
Get-Service
Get-Service -Name "postgresql*"

# Start/Stop/Restart
Start-Service -Name "postgresql-x64-14"
Stop-Service -Name "postgresql-x64-14"
Restart-Service -Name "postgresql-x64-14"

# Set startup type
Set-Service -Name "service" -StartupType Automatic
Set-Service -Name "service" -StartupType Manual
Set-Service -Name "service" -StartupType Disabled
```

---

## Firewall

```powershell
# View rules
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*node*" }

# Add rule
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Port 5000 -Protocol TCP -Action Allow

# Remove rule
Remove-NetFirewallRule -DisplayName "Node.js"

# Enable/Disable rule
Enable-NetFirewallRule -DisplayName "Node.js"
Disable-NetFirewallRule -DisplayName "Node.js"
```

---

## Network

```powershell
# Test connection
Test-NetConnection localhost -Port 5000
Test-NetConnection google.com -Port 443

# Check ports in use
netstat -ano | findstr LISTENING

# DNS
Resolve-DnsName google.com
ipconfig /flushdns
```

---

## Hosts File

Location: `C:\Windows\System32\drivers\etc\hosts`

```powershell
# View
Get-Content C:\Windows\System32\drivers\etc\hosts

# Edit (requires admin PowerShell)
notepad C:\Windows\System32\drivers\etc\hosts

# Add entry programmatically
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "127.0.0.1 myapp.local"
```

---

## System Info

```powershell
# Full system info
systeminfo

# PowerShell system info
Get-ComputerInfo

# Disk space
Get-PSDrive -PSProvider FileSystem

# Memory
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, @{N='Memory(MB)';E={[math]::Round($_.WorkingSet64/1MB,2)}}
```

---

## Scheduled Tasks

```powershell
# List tasks
Get-ScheduledTask

# Create task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\scripts\task.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "MyTask"

# Run task
Start-ScheduledTask -TaskName "MyTask"

# Delete task
Unregister-ScheduledTask -TaskName "MyTask" -Confirm:$false
```

---

## Disk Cleanup

```powershell
# Clear temp files
Remove-Item $env:TEMP\* -Recurse -Force -ErrorAction SilentlyContinue

# Clear npm cache
npm cache clean --force

# Clear node_modules (specific project)
Remove-Item node_modules -Recurse -Force

# Disk usage
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum
```
