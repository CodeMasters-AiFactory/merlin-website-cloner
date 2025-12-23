# Compression & Archive Tools Rules

## Built-in Windows

### PowerShell Compress-Archive
```powershell
# Create zip
Compress-Archive -Path "C:\folder" -DestinationPath "C:\archive.zip"

# Add to existing zip
Compress-Archive -Path "C:\file.txt" -DestinationPath "C:\archive.zip" -Update

# Compress multiple items
Compress-Archive -Path "C:\file1.txt", "C:\file2.txt", "C:\folder" -DestinationPath "C:\archive.zip"

# With compression level
Compress-Archive -Path "C:\folder" -DestinationPath "C:\archive.zip" -CompressionLevel Optimal
# Levels: Fastest, NoCompression, Optimal
```

### PowerShell Expand-Archive
```powershell
# Extract zip
Expand-Archive -Path "C:\archive.zip" -DestinationPath "C:\extracted"

# Force overwrite
Expand-Archive -Path "C:\archive.zip" -DestinationPath "C:\extracted" -Force
```

## 7-Zip

### Installation
```powershell
winget install 7zip.7zip
choco install 7zip -y
```

### CLI Commands (7z)
```powershell
# Add to PATH after install
$env:PATH += ";C:\Program Files\7-Zip"

# Create archive
7z a archive.7z folder/
7z a archive.zip folder/
7z a archive.tar.gz folder/

# Extract
7z x archive.7z
7z x archive.zip -oC:\destination\

# List contents
7z l archive.7z

# Test archive
7z t archive.7z

# Extract specific file
7z e archive.7z file.txt

# Compression levels (0-9, 9=max)
7z a -mx9 archive.7z folder/

# Password protect
7z a -p"password" archive.7z folder/

# Split archive
7z a -v100m archive.7z folder/  # 100MB volumes

# Exclude files
7z a archive.7z folder/ -xr!node_modules -xr!.git
```

## tar (Built into Windows 10+)

### Commands
```powershell
# Create tar
tar -cvf archive.tar folder/

# Create tar.gz
tar -czvf archive.tar.gz folder/

# Extract tar
tar -xvf archive.tar

# Extract tar.gz
tar -xzvf archive.tar.gz

# Extract to specific directory
tar -xzvf archive.tar.gz -C C:\destination\

# List contents
tar -tvf archive.tar
```

## WinRAR

### Installation
```powershell
winget install RARLab.WinRAR
```

### CLI Commands
```powershell
# Add to PATH
$env:PATH += ";C:\Program Files\WinRAR"

# Create archive
rar a archive.rar folder/

# Extract
rar x archive.rar

# List contents
rar l archive.rar

# Password protect
rar a -p"password" archive.rar folder/
```

## gzip/gunzip

### Via Git Bash or WSL
```bash
# Compress
gzip file.txt         # Creates file.txt.gz, removes original

# Keep original
gzip -k file.txt

# Decompress
gunzip file.txt.gz
gzip -d file.txt.gz
```

## Common Patterns

### Backup Project (Exclude node_modules)
```powershell
# Using 7-Zip
7z a -mx5 project_backup.7z "C:\Cursor Projects\Merlin website clone" -xr!node_modules -xr!.git -xr!dist -xr!coverage

# Using tar
tar --exclude='node_modules' --exclude='.git' -czvf backup.tar.gz "project/"
```

### Daily Backup Script
```powershell
function Backup-ProjectCompressed {
    param(
        [string]$ProjectPath = "C:\Cursor Projects\Merlin website clone",
        [string]$BackupDir = "D:\Backups"
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $projectName = Split-Path $ProjectPath -Leaf
    $archiveName = "${projectName}_${timestamp}.7z"
    $archivePath = Join-Path $BackupDir $archiveName
    
    # Create backup
    & 7z a -mx5 $archivePath $ProjectPath -xr!node_modules -xr!.git -xr!dist -xr!coverage -xr!.next
    
    Write-Host "Backup created: $archivePath" -ForegroundColor Green
    
    # Cleanup old backups (keep last 7)
    Get-ChildItem $BackupDir -Filter "${projectName}_*.7z" | 
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 7 |
        Remove-Item -Force
}
```

### Extract and Process
```powershell
function Extract-AndProcess {
    param(
        [string]$ArchivePath,
        [string]$DestinationPath
    )
    
    # Create temp directory
    $tempDir = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    try {
        # Extract
        7z x $ArchivePath -o"$tempDir" -y
        
        # Process files...
        Get-ChildItem $tempDir -Recurse | ForEach-Object {
            Write-Host "Processing: $($_.Name)"
        }
        
        # Move to destination
        if ($DestinationPath) {
            Move-Item "$tempDir\*" $DestinationPath -Force
        }
    }
    finally {
        # Cleanup
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
```

## Archive Formats Comparison

| Format | Compression | Speed | Features |
|--------|-------------|-------|----------|
| ZIP | Good | Fast | Universal |
| 7z | Excellent | Slow | Best compression |
| tar.gz | Good | Medium | Unix standard |
| RAR | Very Good | Medium | Recovery records |
| tar.xz | Excellent | Very Slow | Max compression |
