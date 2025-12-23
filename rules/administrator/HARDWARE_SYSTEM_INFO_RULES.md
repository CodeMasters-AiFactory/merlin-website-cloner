# Hardware & System Information Rules

## System Information

### Basic Info
```powershell
# System info summary
systeminfo

# Computer name
$env:COMPUTERNAME
hostname

# Windows version
[System.Environment]::OSVersion
Get-ComputerInfo | Select-Object WindowsVersion, WindowsBuildLabEx, OsArchitecture
```

### Detailed System Info
```powershell
Get-ComputerInfo | Select-Object `
    CsName,
    WindowsVersion,
    OsArchitecture,
    CsProcessors,
    CsNumberOfLogicalProcessors,
    CsTotalPhysicalMemory,
    OsLastBootUpTime
```

## CPU Information

```powershell
# Basic CPU info
Get-WmiObject Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed

# Detailed CPU info
Get-CimInstance Win32_Processor | Format-List *

# CPU usage
Get-Counter '\Processor(_Total)\% Processor Time'

# Per-core usage
Get-Counter '\Processor(*)\% Processor Time'
```

## Memory Information

```powershell
# Total and available memory
Get-CimInstance Win32_OperatingSystem | Select-Object `
    @{N='TotalMemoryGB';E={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}},
    @{N='FreeMemoryGB';E={[math]::Round($_.FreePhysicalMemory/1MB,2)}},
    @{N='UsedMemoryGB';E={[math]::Round(($_.TotalVisibleMemorySize-$_.FreePhysicalMemory)/1MB,2)}}

# Memory modules
Get-WmiObject Win32_PhysicalMemory | Select-Object BankLabel, Capacity, Speed, Manufacturer

# Total RAM
(Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB
```

## Disk Information

```powershell
# Logical disks
Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID, VolumeName, 
    @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}},
    @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}},
    FileSystem

# Physical disks
Get-PhysicalDisk | Select-Object FriendlyName, MediaType, Size, HealthStatus

# Disk health
Get-PhysicalDisk | Select-Object FriendlyName, OperationalStatus, HealthStatus

# SMART status
Get-Disk | Select-Object Number, FriendlyName, HealthStatus
```

## GPU Information

```powershell
# Basic GPU info
Get-WmiObject Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion, VideoProcessor

# Detailed GPU info
Get-CimInstance Win32_VideoController | Format-List *
```

## Network Adapters

```powershell
# List adapters
Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MacAddress

# IP configuration
Get-NetIPConfiguration

# Detailed adapter info
Get-NetAdapter | Get-NetAdapterAdvancedProperty
```

## BIOS Information

```powershell
# BIOS info
Get-WmiObject Win32_BIOS | Select-Object Manufacturer, Name, Version, ReleaseDate

# UEFI or Legacy
$firmware = Get-WmiObject -Class Win32_DiskPartition | Where-Object { $_.Type -eq "GPT: System" }
if ($firmware) { "UEFI" } else { "Legacy BIOS" }
```

## Motherboard Information

```powershell
Get-WmiObject Win32_BaseBoard | Select-Object Manufacturer, Product, SerialNumber, Version
```

## Battery Information (Laptops)

```powershell
# Battery status
Get-WmiObject Win32_Battery | Select-Object Name, EstimatedChargeRemaining, BatteryStatus

# Battery report
powercfg /batteryreport /output "C:\battery-report.html"
Start-Process "C:\battery-report.html"
```

## USB Devices

```powershell
# List USB devices
Get-WmiObject Win32_USBControllerDevice | ForEach-Object {
    [wmi]($_.Dependent)
} | Select-Object Name, DeviceID

# USB hubs
Get-WmiObject Win32_USBHub | Select-Object Name, DeviceID
```

## Audio Devices

```powershell
# Sound devices
Get-WmiObject Win32_SoundDevice | Select-Object Name, Status, Manufacturer
```

## Printer Information

```powershell
# List printers
Get-Printer | Select-Object Name, DriverName, PortName, Shared

# Default printer
Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true }
```

## System Health Check Script

```powershell
function Get-SystemHealthReport {
    $report = @{}
    
    # CPU
    $cpu = Get-WmiObject Win32_Processor
    $report["CPU"] = @{
        Name = $cpu.Name
        Cores = $cpu.NumberOfCores
        Usage = [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue, 2)
    }
    
    # Memory
    $mem = Get-CimInstance Win32_OperatingSystem
    $report["Memory"] = @{
        TotalGB = [math]::Round($mem.TotalVisibleMemorySize/1MB, 2)
        FreeGB = [math]::Round($mem.FreePhysicalMemory/1MB, 2)
        UsedPercent = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize * 100, 2)
    }
    
    # Disks
    $disks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"
    $report["Disks"] = $disks | ForEach-Object {
        @{
            Drive = $_.DeviceID
            SizeGB = [math]::Round($_.Size/1GB, 2)
            FreeGB = [math]::Round($_.FreeSpace/1GB, 2)
            UsedPercent = [math]::Round(($_.Size - $_.FreeSpace) / $_.Size * 100, 2)
        }
    }
    
    # Uptime
    $uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
    $report["Uptime"] = "$($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"
    
    return $report
}

# Generate report
$health = Get-SystemHealthReport
$health | ConvertTo-Json -Depth 3
```

## Export System Information

```powershell
# Export to file
systeminfo > "C:\system-info.txt"

# Export as HTML
Get-ComputerInfo | ConvertTo-Html | Out-File "C:\system-info.html"

# Export as JSON
Get-ComputerInfo | ConvertTo-Json | Out-File "C:\system-info.json"
```
