# Backup & Recovery Rules

## Project Backup

### Quick Backup Script
```powershell
function Backup-Project {
    param(
        [string]$ProjectPath = "C:\Cursor Projects\Merlin website clone",
        [string]$BackupRoot = "D:\Backups"
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $projectName = Split-Path $ProjectPath -Leaf
    $backupPath = Join-Path $BackupRoot "$projectName`_$timestamp"
    
    Write-Host "Creating backup of $projectName..." -ForegroundColor Yellow
    
    # Create backup with robocopy (excludes node_modules, .git, etc.)
    robocopy $ProjectPath $backupPath /E /Z /MT:16 /XD node_modules .git dist coverage .next

    Write-Host "Backup completed: $backupPath" -ForegroundColor Green
    
    return $backupPath
}

# Usage
Backup-Project
```

### Scheduled Backup
```powershell
# Create scheduled task for daily backup
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\backup-project.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "DailyProjectBackup" -Action $action -Trigger $trigger -Description "Daily project backup"
```

## Git-Based Backup

### Push to Remote
```powershell
# Ensure all changes committed
git status
git add -A
git commit -m "Backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Push to multiple remotes
git push origin main
git push backup main  # If you have a backup remote
```

### Create Backup Branch
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
git checkout -b "backup/$timestamp"
git push origin "backup/$timestamp"
git checkout main
```

## Database Backup

### PostgreSQL
```powershell
function Backup-PostgreSQL {
    param(
        [string]$Database = "merlin",
        [string]$BackupPath = "D:\Backups\PostgreSQL"
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "$BackupPath\${Database}_$timestamp.dump"
    
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    
    & "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d $Database -F c -f $filename
    
    Write-Host "PostgreSQL backup: $filename" -ForegroundColor Green
    return $filename
}

Backup-PostgreSQL
```

### MongoDB
```powershell
function Backup-MongoDB {
    param(
        [string]$Database = "merlin",
        [string]$BackupPath = "D:\Backups\MongoDB"
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $outputPath = "$BackupPath\${Database}_$timestamp"
    
    mongodump --db $Database --out $outputPath
    
    Write-Host "MongoDB backup: $outputPath" -ForegroundColor Green
}
```

### SQLite
```powershell
function Backup-SQLite {
    param(
        [string]$DbPath,
        [string]$BackupPath = "D:\Backups\SQLite"
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = Split-Path $DbPath -Leaf
    $backupFile = "$BackupPath\${filename}_$timestamp"
    
    Copy-Item $DbPath $backupFile
    
    Write-Host "SQLite backup: $backupFile" -ForegroundColor Green
}
```

## Full System Backup

### Create System Restore Point
```powershell
# Create restore point (requires admin)
Checkpoint-Computer -Description "Before major changes" -RestorePointType "MODIFY_SETTINGS"

# List restore points
Get-ComputerRestorePoint
```

### Windows Backup
```powershell
# Open Windows Backup settings
start ms-settings:backup
```

## Restore Operations

### Restore Project from Backup
```powershell
function Restore-Project {
    param(
        [string]$BackupPath,
        [string]$RestoreTo = "C:\Cursor Projects\Merlin website clone"
    )
    
    # Create backup of current before restore
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $currentBackup = "$RestoreTo`_pre_restore_$timestamp"
    
    Write-Host "Backing up current state to $currentBackup..." -ForegroundColor Yellow
    Rename-Item $RestoreTo $currentBackup
    
    Write-Host "Restoring from $BackupPath..." -ForegroundColor Yellow
    Copy-Item -Path $BackupPath -Destination $RestoreTo -Recurse
    
    Write-Host "Restore complete. Previous state saved to $currentBackup" -ForegroundColor Green
}
```

### Restore PostgreSQL
```powershell
function Restore-PostgreSQL {
    param(
        [string]$BackupFile,
        [string]$Database = "merlin"
    )
    
    # Drop and recreate database
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS $Database;"
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE $Database;"
    
    # Restore
    & "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" -U postgres -d $Database -F c $BackupFile
    
    Write-Host "PostgreSQL restore complete" -ForegroundColor Green
}
```

## Backup Retention

### Cleanup Old Backups
```powershell
function Remove-OldBackups {
    param(
        [string]$BackupPath,
        [int]$RetainDays = 30
    )
    
    $cutoff = (Get-Date).AddDays(-$RetainDays)
    
    Get-ChildItem $BackupPath -Recurse | 
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Write-Host "Removing old backup: $($_.FullName)" -ForegroundColor Yellow
            Remove-Item $_.FullName -Recurse -Force
        }
    
    Write-Host "Cleanup complete" -ForegroundColor Green
}

# Keep last 30 days
Remove-OldBackups -BackupPath "D:\Backups" -RetainDays 30
```

## Disaster Recovery Plan

### Critical Files to Backup
1. **Code** - Git repository (remote)
2. **Database** - PostgreSQL dumps
3. **Environment** - .env files (secure storage)
4. **Configuration** - All config files
5. **Documentation** - Rules, notes, progress

### Recovery Priority
1. **P1** - Database (customer data)
2. **P2** - Code (can rebuild from git)
3. **P3** - Environment (can recreate)
4. **P4** - Configuration (can recreate)

### Recovery Steps
1. Set up clean environment
2. Restore database from latest backup
3. Clone code from git
4. Restore .env from secure storage
5. Install dependencies
6. Run migrations
7. Verify functionality
8. Resume operations
