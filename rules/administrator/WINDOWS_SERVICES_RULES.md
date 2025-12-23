# Windows Services Management Rules

## Service Commands

### View Services
```powershell
# List all services
Get-Service

# Filter by status
Get-Service | Where-Object {$_.Status -eq "Running"}
Get-Service | Where-Object {$_.Status -eq "Stopped"}

# Find specific service
Get-Service -Name "postgresql*"
Get-Service -DisplayName "*SQL*"

# Detailed info
Get-Service -Name "ServiceName" | Select-Object *
```

### Control Services
```powershell
# Start service
Start-Service -Name "ServiceName"
net start "ServiceName"

# Stop service
Stop-Service -Name "ServiceName"
net stop "ServiceName"

# Restart service
Restart-Service -Name "ServiceName"

# Set startup type
Set-Service -Name "ServiceName" -StartupType Automatic
Set-Service -Name "ServiceName" -StartupType Manual
Set-Service -Name "ServiceName" -StartupType Disabled
```

### Create New Service
```powershell
# Using sc.exe
sc.exe create "MyService" binPath= "C:\path\to\service.exe" start= auto

# Using New-Service
New-Service -Name "MyService" -BinaryPathName "C:\path\to\service.exe" -DisplayName "My Service" -StartupType Automatic -Description "My custom service"
```

### Delete Service
```powershell
# Stop first
Stop-Service -Name "MyService"

# Then delete
sc.exe delete "MyService"
```

## Common Development Services

### PostgreSQL
```powershell
# Check status
Get-Service -Name "postgresql*"

# Start
Start-Service -Name "postgresql-x64-16"

# Stop
Stop-Service -Name "postgresql-x64-16"

# Auto start
Set-Service -Name "postgresql-x64-16" -StartupType Automatic
```

### MongoDB
```powershell
# Check status
Get-Service -Name "MongoDB"

# Start
Start-Service -Name "MongoDB"

# Stop
Stop-Service -Name "MongoDB"
```

### Redis
```powershell
# Redis (if installed as service)
Get-Service -Name "Redis"
Start-Service -Name "Redis"
Stop-Service -Name "Redis"
```

### Docker
```powershell
# Docker Desktop service
Get-Service -Name "com.docker.service"
Start-Service -Name "com.docker.service"
Restart-Service -Name "com.docker.service"
```

### SQL Server
```powershell
# SQL Server services
Get-Service -Name "MSSQL*"
Get-Service -Name "SQLAgent*"

# Start SQL Server
Start-Service -Name "MSSQLSERVER"
Start-Service -Name "SQLSERVERAGENT"
```

## Service Monitoring

### Check Service Status Script
```powershell
$services = @("postgresql-x64-16", "MongoDB", "Docker Desktop Service")

foreach ($service in $services) {
    $svc = Get-Service -Name $service -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "$service : $($svc.Status)" -ForegroundColor $(if($svc.Status -eq "Running"){"Green"}else{"Red"})
    } else {
        Write-Host "$service : Not Found" -ForegroundColor Yellow
    }
}
```

### Auto-Restart Service
```powershell
# Configure recovery options
sc.exe failure "ServiceName" reset= 86400 actions= restart/60000/restart/60000/restart/60000
```

## Scheduled Tasks

### View Tasks
```powershell
Get-ScheduledTask
Get-ScheduledTask -TaskName "*backup*"
```

### Create Task
```powershell
# Create action
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\scripts\backup.ps1"

# Create trigger (daily at 2 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 2am

# Register task
Register-ScheduledTask -TaskName "DailyBackup" -Action $action -Trigger $trigger -Description "Daily backup task"
```

### Modify Task
```powershell
# Disable task
Disable-ScheduledTask -TaskName "TaskName"

# Enable task
Enable-ScheduledTask -TaskName "TaskName"

# Remove task
Unregister-ScheduledTask -TaskName "TaskName" -Confirm:$false
```

## Service Best Practices

1. **Always check status before operations**
2. **Set appropriate startup types**
3. **Configure recovery options for critical services**
4. **Monitor service health**
5. **Document custom services**
6. **Use service accounts, not user accounts**
7. **Log service events**
