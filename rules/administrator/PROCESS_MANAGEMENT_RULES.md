# Process Management Rules

## View Processes

### PowerShell Commands
```powershell
# List all processes
Get-Process

# Filter by name
Get-Process -Name "node"
Get-Process -Name "chrome"

# Sort by memory
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, @{N='Memory(MB)';E={[math]::Round($_.WorkingSet64/1MB,2)}}

# Sort by CPU
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, CPU

# Find process by PID
Get-Process -Id 1234

# Get detailed info
Get-Process -Name "node" | Select-Object *
```

### Task Manager Alternatives
```powershell
# tasklist
tasklist
tasklist | findstr node

# wmic
wmic process where "name='node.exe'" get processid,commandline
```

## Kill Processes

### By Name
```powershell
# Stop specific process
Stop-Process -Name "node" -Force

# Stop all instances
Get-Process -Name "node" | Stop-Process -Force

# With confirmation
Stop-Process -Name "notepad" -Confirm
```

### By PID
```powershell
Stop-Process -Id 1234 -Force
taskkill /F /PID 1234
```

### By Command Line Pattern
```powershell
# Kill node processes running specific script
Get-WmiObject Win32_Process | 
    Where-Object { $_.CommandLine -like "*server.js*" } | 
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

### Kill All Development Processes
```powershell
# Nuclear option - kill all node
taskkill /F /IM node.exe

# Kill all Chrome (headless testing)
taskkill /F /IM chrome.exe

# Kill all Electron
taskkill /F /IM electron.exe
```

## Process Monitoring

### Real-time CPU/Memory
```powershell
# Watch process
while ($true) {
    $proc = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($proc) {
        $cpu = ($proc | Measure-Object -Property CPU -Sum).Sum
        $mem = ($proc | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB
        Write-Host "Node: CPU=$([math]::Round($cpu,2))s, Memory=$([math]::Round($mem,2))MB"
    }
    Start-Sleep -Seconds 2
    Clear-Host
}
```

### Resource Monitor
```powershell
# Open Resource Monitor
resmon

# Open Task Manager
taskmgr

# Open Performance Monitor
perfmon
```

## Process Priority

### Set Priority
```powershell
# Get process and set priority
$proc = Get-Process -Name "node"
$proc.PriorityClass = "High"  # Options: Idle, BelowNormal, Normal, AboveNormal, High, RealTime
```

### Process Affinity
```powershell
# Set CPU affinity (which cores to use)
$proc = Get-Process -Name "node"
$proc.ProcessorAffinity = 15  # Binary mask: 15 = 1111 = cores 0,1,2,3
```

## Background Jobs

### Start Background Process
```powershell
# Start process in background
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Hidden

# Start with output capture
Start-Process -FilePath "node" -ArgumentList "server.js" -RedirectStandardOutput "output.log" -RedirectStandardError "error.log" -NoNewWindow
```

### PowerShell Jobs
```powershell
# Start job
$job = Start-Job -ScriptBlock { node server.js }

# Check status
Get-Job
Get-Job -Id 1 | Select-Object *

# Get output
Receive-Job -Id 1

# Stop job
Stop-Job -Id 1
Remove-Job -Id 1
```

## Process Cleanup Script

```powershell
# Development cleanup script
function Clear-DevProcesses {
    Write-Host "Cleaning up development processes..." -ForegroundColor Yellow
    
    $processes = @("node", "chrome", "chromedriver", "firefox", "geckodriver")
    
    foreach ($proc in $processes) {
        $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
        if ($running) {
            $count = $running.Count
            Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed $count $proc process(es)" -ForegroundColor Red
        }
    }
    
    Write-Host "Cleanup complete!" -ForegroundColor Green
}

# Run cleanup
Clear-DevProcesses
```

## Orphan Process Detection

```powershell
# Find node processes that might be orphaned
function Find-OrphanedNode {
    $nodes = Get-WmiObject Win32_Process | Where-Object { $_.Name -eq "node.exe" }
    
    foreach ($node in $nodes) {
        $parent = Get-Process -Id $node.ParentProcessId -ErrorAction SilentlyContinue
        if (-not $parent) {
            Write-Host "Orphaned: PID $($node.ProcessId) - $($node.CommandLine)" -ForegroundColor Yellow
        }
    }
}
```

## Process Limits

### Set Memory Limit (via Job Object)
```powershell
# Note: This requires external tools or code
# Use Windows Job Objects for advanced limits
```

### Monitor and Kill High Memory
```powershell
# Kill node if using more than 2GB
Get-Process -Name "node" | Where-Object { $_.WorkingSet64 -gt 2GB } | Stop-Process -Force
```
