# Automation Scripts Rules

## PowerShell Script Basics

### Script Template
```powershell
#Requires -Version 5.1
<#
.SYNOPSIS
    Brief description of the script

.DESCRIPTION
    Detailed description of what the script does

.PARAMETER ParamName
    Description of parameter

.EXAMPLE
    .\script.ps1 -ParamName "value"

.NOTES
    Author: Rudolf
    Date: 2024-12-23
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$RequiredParam,
    
    [Parameter(Mandatory=$false)]
    [string]$OptionalParam = "default"
)

# Error handling
$ErrorActionPreference = "Stop"

try {
    # Main script logic
    Write-Host "Starting script..." -ForegroundColor Green
    
    # Your code here
    
    Write-Host "Script completed successfully" -ForegroundColor Green
}
catch {
    Write-Error "Script failed: $_"
    exit 1
}
```

### Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# Set for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Bypass for single script
PowerShell.exe -ExecutionPolicy Bypass -File .\script.ps1
```

## Development Automation

### Start Development Environment
```powershell
# start-dev.ps1
function Start-DevEnvironment {
    Write-Host "Starting development environment..." -ForegroundColor Cyan
    
    # Check prerequisites
    $services = @{
        "PostgreSQL" = "postgresql*"
        "Redis" = "Redis"
    }
    
    foreach ($name in $services.Keys) {
        $svc = Get-Service -Name $services[$name] -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -ne "Running") {
            Write-Host "Starting $name..." -ForegroundColor Yellow
            Start-Service -Name $services[$name]
        }
    }
    
    # Navigate to project
    Set-Location "C:\Cursor Projects\Merlin website clone"
    
    # Start services
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
    
    Write-Host "Development environment ready!" -ForegroundColor Green
}

Start-DevEnvironment
```

### Clean Development Environment
```powershell
# clean-dev.ps1
function Clean-DevEnvironment {
    Write-Host "Cleaning development environment..." -ForegroundColor Cyan
    
    # Kill all node processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Clear caches
    $projectPath = "C:\Cursor Projects\Merlin website clone"
    
    $cacheDirs = @("node_modules\.cache", ".next", "dist", "coverage", "cache", "cdn-cache")
    foreach ($dir in $cacheDirs) {
        $fullPath = Join-Path $projectPath $dir
        if (Test-Path $fullPath) {
            Write-Host "Removing $dir..." -ForegroundColor Yellow
            Remove-Item $fullPath -Recurse -Force
        }
    }
    
    # Clear npm cache
    npm cache clean --force
    
    Write-Host "Clean complete!" -ForegroundColor Green
}

Clean-DevEnvironment
```

### Git Automation
```powershell
# git-sync.ps1
function Sync-GitRepo {
    param(
        [string]$CommitMessage = "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    )
    
    # Check for changes
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "Changes detected, committing..." -ForegroundColor Yellow
        
        git add -A
        git commit -m $CommitMessage
        
        Write-Host "Changes committed" -ForegroundColor Green
    } else {
        Write-Host "No changes to commit" -ForegroundColor Cyan
    }
    
    # Pull and push
    Write-Host "Syncing with remote..." -ForegroundColor Yellow
    git pull --rebase
    git push
    
    Write-Host "Sync complete!" -ForegroundColor Green
}

Sync-GitRepo
```

## System Automation

### Health Check Script
```powershell
# health-check.ps1
function Get-SystemHealth {
    $results = @()
    
    # CPU
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    $results += [PSCustomObject]@{ Check = "CPU Usage"; Value = "$([math]::Round($cpu,1))%"; Status = if ($cpu -gt 90) { "WARN" } else { "OK" } }
    
    # Memory
    $mem = Get-CimInstance Win32_OperatingSystem
    $memUsed = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize * 100, 1)
    $results += [PSCustomObject]@{ Check = "Memory Usage"; Value = "$memUsed%"; Status = if ($memUsed -gt 90) { "WARN" } else { "OK" } }
    
    # Disk
    $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
    $diskUsed = [math]::Round(($disk.Size - $disk.FreeSpace) / $disk.Size * 100, 1)
    $diskFree = [math]::Round($disk.FreeSpace / 1GB, 1)
    $results += [PSCustomObject]@{ Check = "Disk C: Usage"; Value = "$diskUsed% ($diskFree GB free)"; Status = if ($diskUsed -gt 90) { "WARN" } else { "OK" } }
    
    # Services
    $services = @("postgresql*", "MongoDB", "Redis")
    foreach ($svc in $services) {
        $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($service) {
            $results += [PSCustomObject]@{ Check = $service.DisplayName; Value = $service.Status; Status = if ($service.Status -eq "Running") { "OK" } else { "WARN" } }
        }
    }
    
    # Ports
    $ports = @(3000, 5000, 5432)
    foreach ($port in $ports) {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        $status = if ($conn) { "Listening" } else { "Not Listening" }
        $results += [PSCustomObject]@{ Check = "Port $port"; Value = $status; Status = if ($conn) { "OK" } else { "INFO" } }
    }
    
    return $results
}

$health = Get-SystemHealth
$health | Format-Table -AutoSize
```

### Scheduled Maintenance
```powershell
# maintenance.ps1
function Invoke-Maintenance {
    Write-Host "=== Starting Maintenance ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
    
    # 1. Clean temp files
    Write-Host "`n[1/5] Cleaning temp files..." -ForegroundColor Yellow
    Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    # 2. Clear npm cache
    Write-Host "[2/5] Clearing npm cache..." -ForegroundColor Yellow
    npm cache clean --force 2>$null
    
    # 3. Update npm packages check
    Write-Host "[3/5] Checking for outdated packages..." -ForegroundColor Yellow
    npm outdated -g
    
    # 4. Clear old logs
    Write-Host "[4/5] Cleaning old logs..." -ForegroundColor Yellow
    Get-ChildItem "C:\Cursor Projects\*\logs" -Recurse -ErrorAction SilentlyContinue | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        Remove-Item -Force
    
    # 5. Database vacuum (PostgreSQL)
    Write-Host "[5/5] Optimizing database..." -ForegroundColor Yellow
    # & "C:\Program Files\PostgreSQL\16\bin\vacuumdb.exe" -U postgres --all --analyze
    
    Write-Host "`n=== Maintenance Complete ===" -ForegroundColor Green
}

Invoke-Maintenance
```

## Task Scheduling

### Create Scheduled Task
```powershell
# Register scheduled tasks
function Register-DevTasks {
    # Daily backup at 2 AM
    $backupAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\backup.ps1"
    $backupTrigger = New-ScheduledTaskTrigger -Daily -At 2am
    Register-ScheduledTask -TaskName "DevBackup" -Action $backupAction -Trigger $backupTrigger -Description "Daily project backup"
    
    # Hourly health check
    $healthAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\health-check.ps1"
    $healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
    Register-ScheduledTask -TaskName "DevHealthCheck" -Action $healthAction -Trigger $healthTrigger -Description "Hourly health check"
    
    # Weekly cleanup on Sunday
    $cleanupAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\maintenance.ps1"
    $cleanupTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3am
    Register-ScheduledTask -TaskName "DevMaintenance" -Action $cleanupAction -Trigger $cleanupTrigger -Description "Weekly maintenance"
}
```

### Manage Scheduled Tasks
```powershell
# List tasks
Get-ScheduledTask | Where-Object {$_.TaskName -like "Dev*"}

# Run task manually
Start-ScheduledTask -TaskName "DevBackup"

# Disable task
Disable-ScheduledTask -TaskName "DevBackup"

# Remove task
Unregister-ScheduledTask -TaskName "DevBackup" -Confirm:$false
```
