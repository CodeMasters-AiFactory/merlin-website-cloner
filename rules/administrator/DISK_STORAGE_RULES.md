# Disk & Storage Management Rules

## Check Disk Space

### PowerShell
```powershell
# Quick check
Get-PSDrive -PSProvider FileSystem

# Detailed
Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID, 
    @{N='Size(GB)';E={[math]::Round($_.Size/1GB,2)}},
    @{N='Free(GB)';E={[math]::Round($_.FreeSpace/1GB,2)}},
    @{N='Free%';E={[math]::Round($_.FreeSpace/$_.Size*100,2)}}
```

### Command Line
```powershell
# wmic
wmic logicaldisk get size,freespace,caption

# fsutil
fsutil volume diskfree c:
```

## Find Large Files/Folders

### Find Large Files
```powershell
# Find files > 100MB
Get-ChildItem -Path "C:\" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 100MB } |
    Sort-Object Length -Descending |
    Select-Object FullName, @{N='Size(MB)';E={[math]::Round($_.Length/1MB,2)}} -First 20
```

### Find Large Folders
```powershell
# Get folder sizes
function Get-FolderSize {
    param([string]$Path)
    
    Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $size = (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{
            Folder = $_.FullName
            SizeMB = [math]::Round($size/1MB, 2)
            SizeGB = [math]::Round($size/1GB, 2)
        }
    } | Sort-Object SizeMB -Descending
}

# Usage
Get-FolderSize -Path "C:\Cursor Projects" | Select-Object -First 10
```

## Cleanup Operations

### Windows Cleanup
```powershell
# Disk Cleanup (interactive)
cleanmgr /d C:

# Disk Cleanup (automated)
cleanmgr /sagerun:1  # Must first run: cleanmgr /sageset:1 to configure
```

### Development Cleanup
```powershell
# Clear npm cache
npm cache clean --force

# Clear yarn cache
yarn cache clean

# Clear pip cache
pip cache purge

# Clear NuGet cache
dotnet nuget locals all --clear
```

### Project-Specific Cleanup
```powershell
# Node modules (dangerous - know what you're doing)
Get-ChildItem -Path "C:\Cursor Projects" -Recurse -Directory -Filter "node_modules" |
    ForEach-Object { 
        Write-Host "Removing $($_.FullName)"
        Remove-Item $_.FullName -Recurse -Force 
    }

# Build artifacts
Get-ChildItem -Path "C:\Cursor Projects" -Recurse -Directory | 
    Where-Object { $_.Name -in @("dist", "build", ".next", "coverage") } |
    ForEach-Object {
        Write-Host "Removing $($_.FullName)"
        Remove-Item $_.FullName -Recurse -Force
    }
```

### Temp Files
```powershell
# Clear Windows temp
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue

# Clear user temp
Remove-Item -Path "$env:LOCALAPPDATA\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
```

## Drive Management

### View Drives
```powershell
# List all drives
Get-Partition | Select-Object DriveLetter, Size, Type
Get-Volume | Select-Object DriveLetter, FileSystemLabel, Size, SizeRemaining
```

### Map Network Drive
```powershell
# Map drive
New-PSDrive -Name "Z" -PSProvider FileSystem -Root "\\server\share" -Persist

# Remove mapped drive
Remove-PSDrive -Name "Z"

# Or using net use
net use Z: \\server\share
net use Z: /delete
```

## File Operations

### Copy Large Files
```powershell
# Robocopy (robust copy)
robocopy "C:\Source" "D:\Destination" /E /Z /MT:16 /R:3 /W:5

# With progress
robocopy "C:\Source" "D:\Destination" /E /Z /MT:16 /ETA

# Mirror (exact copy, deletes extras)
robocopy "C:\Source" "D:\Destination" /MIR /MT:16
```

### Backup Directory
```powershell
# Create timestamped backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$source = "C:\Cursor Projects\Merlin website clone"
$dest = "D:\Backups\Merlin_$timestamp"

robocopy $source $dest /E /Z /MT:16 /XD node_modules .git
```

## Disk Health

### Check Disk Health
```powershell
# Get SMART status
Get-PhysicalDisk | Select-Object FriendlyName, MediaType, HealthStatus, OperationalStatus

# Check filesystem
chkdsk C: /scan

# WMIC disk status
wmic diskdrive get status, model
```

### SSD TRIM
```powershell
# Check TRIM status
fsutil behavior query DisableDeleteNotify

# Enable TRIM (0 = enabled)
fsutil behavior set DisableDeleteNotify 0
```

## Disk Space Alerts

```powershell
# Alert if drive < 10GB free
function Check-DiskSpace {
    $threshold = 10GB
    
    Get-WmiObject Win32_LogicalDisk | ForEach-Object {
        if ($_.FreeSpace -lt $threshold) {
            Write-Host "WARNING: Drive $($_.DeviceID) has only $([math]::Round($_.FreeSpace/1GB,2))GB free!" -ForegroundColor Red
        }
    }
}

Check-DiskSpace
```

## Symbolic Links

```powershell
# Create symbolic link (directory)
New-Item -ItemType SymbolicLink -Path "C:\link" -Target "C:\actual\folder"

# Create symbolic link (file)
New-Item -ItemType SymbolicLink -Path "C:\link.txt" -Target "C:\actual\file.txt"

# Create junction (directory only)
New-Item -ItemType Junction -Path "C:\junction" -Target "C:\actual\folder"

# Or using cmd
mklink /D C:\link C:\actual\folder
mklink /J C:\junction C:\actual\folder
```
