# System Monitoring Rules

## Resource Monitoring

### CPU Usage
```powershell
# Current CPU usage
Get-Counter '\Processor(_Total)\% Processor Time'

# Per-process CPU
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, CPU

# Continuous monitoring
while ($true) {
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    Write-Host "CPU: $([math]::Round($cpu, 2))%"
    Start-Sleep -Seconds 2
}
```

### Memory Usage
```powershell
# System memory
Get-CimInstance Win32_OperatingSystem | Select-Object @{N='TotalGB';E={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}, @{N='FreeGB';E={[math]::Round($_.FreePhysicalMemory/1MB,2)}}, @{N='UsedGB';E={[math]::Round(($_.TotalVisibleMemorySize-$_.FreePhysicalMemory)/1MB,2)}}

# Per-process memory
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, @{N='MemoryMB';E={[math]::Round($_.WorkingSet64/1MB,2)}}

# Total memory by process name
Get-Process | Group-Object Name | Select-Object Name, @{N='MemoryMB';E={[math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum/1MB,2)}} | Sort-Object MemoryMB -Descending
```

### Disk Usage
```powershell
# Disk space
Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}}, @{N='UsedPercent';E={[math]::Round(($_.Size-$_.FreeSpace)/$_.Size*100,2)}}

# Disk I/O
Get-Counter '\PhysicalDisk(*)\Disk Reads/sec', '\PhysicalDisk(*)\Disk Writes/sec'
```

### Network Usage
```powershell
# Network interfaces
Get-NetAdapter | Select-Object Name, Status, LinkSpeed

# Network statistics
Get-NetAdapterStatistics | Select-Object Name, ReceivedBytes, SentBytes

# Active connections
Get-NetTCPConnection | Where-Object {$_.State -eq 'Established'} | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State
```

## Event Logs

### View Logs
```powershell
# Application events (last 50)
Get-EventLog -LogName Application -Newest 50

# System events
Get-EventLog -LogName System -Newest 50

# Security events (requires admin)
Get-EventLog -LogName Security -Newest 50

# Filter by level
Get-EventLog -LogName Application -EntryType Error -Newest 20
```

### Search Events
```powershell
# Search by source
Get-EventLog -LogName Application -Source "MyApp" -Newest 100

# Search by time range
Get-EventLog -LogName Application -After (Get-Date).AddHours(-24)

# Search by message content
Get-EventLog -LogName Application | Where-Object {$_.Message -like "*error*"}
```

### Export Logs
```powershell
# Export to CSV
Get-EventLog -LogName Application -Newest 1000 | Export-Csv "application-events.csv" -NoTypeInformation

# Export to XML
Get-EventLog -LogName Application -Newest 1000 | Export-Clixml "application-events.xml"
```

## Performance Monitoring

### Performance Monitor (GUI)
```powershell
perfmon
```

### Resource Monitor (GUI)
```powershell
resmon
```

### Custom Monitoring Script
```powershell
function Get-SystemHealth {
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    $mem = Get-CimInstance Win32_OperatingSystem
    $memUsed = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize * 100, 2)
    $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
    $diskUsed = [math]::Round(($disk.Size - $disk.FreeSpace) / $disk.Size * 100, 2)
    
    [PSCustomObject]@{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        CPUPercent = [math]::Round($cpu, 2)
        MemoryPercent = $memUsed
        DiskPercent = $diskUsed
        Status = if ($cpu -gt 90 -or $memUsed -gt 90 -or $diskUsed -gt 90) { "WARNING" } else { "OK" }
    }
}

# Single check
Get-SystemHealth

# Continuous monitoring to file
while ($true) {
    Get-SystemHealth | Export-Csv -Path "system-health.csv" -Append -NoTypeInformation
    Start-Sleep -Seconds 60
}
```

## Process Monitoring

### Watch Specific Process
```powershell
function Watch-Process {
    param([string]$ProcessName)
    
    while ($true) {
        $procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
        if ($procs) {
            $cpu = ($procs | Measure-Object -Property CPU -Sum).Sum
            $mem = ($procs | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB
            Write-Host "$(Get-Date -Format 'HH:mm:ss') - $ProcessName: CPU=$([math]::Round($cpu,2))s, Memory=$([math]::Round($mem,2))MB, Count=$($procs.Count)"
        } else {
            Write-Host "$(Get-Date -Format 'HH:mm:ss') - $ProcessName: NOT RUNNING" -ForegroundColor Red
        }
        Start-Sleep -Seconds 5
        Clear-Host
    }
}

# Usage
Watch-Process -ProcessName "node"
```

## Service Monitoring

```powershell
function Watch-Services {
    $services = @("postgresql-x64-16", "MongoDB", "Redis")
    
    foreach ($svc in $services) {
        $status = (Get-Service -Name $svc -ErrorAction SilentlyContinue).Status
        $color = if ($status -eq "Running") { "Green" } elseif ($status) { "Yellow" } else { "Red" }
        $statusText = if ($status) { $status } else { "NOT FOUND" }
        Write-Host "$svc : $statusText" -ForegroundColor $color
    }
}

Watch-Services
```

## Alerting

### Email Alert (requires SMTP)
```powershell
function Send-Alert {
    param([string]$Subject, [string]$Body)
    
    $smtp = "smtp.gmail.com"
    $port = 587
    $from = "alerts@example.com"
    $to = "admin@example.com"
    $password = $env:SMTP_PASSWORD
    
    $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential ($from, $securePassword)
    
    Send-MailMessage -From $from -To $to -Subject $Subject -Body $Body -SmtpServer $smtp -Port $port -UseSsl -Credential $credential
}
```

### Disk Space Alert
```powershell
$threshold = 10GB
$disks = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.FreeSpace -lt $threshold }

if ($disks) {
    $message = "Low disk space alert:`n"
    foreach ($disk in $disks) {
        $message += "$($disk.DeviceID) - $([math]::Round($disk.FreeSpace/1GB,2))GB free`n"
    }
    Write-Host $message -ForegroundColor Red
    # Send-Alert -Subject "Disk Space Alert" -Body $message
}
```
