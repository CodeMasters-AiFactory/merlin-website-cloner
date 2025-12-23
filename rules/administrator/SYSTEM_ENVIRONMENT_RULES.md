# System Environment Rules

## Environment Variables

### View Environment Variables
```powershell
# All environment variables
Get-ChildItem Env:

# Specific variable
$env:PATH
$env:USERPROFILE
$env:APPDATA

# System vs User variables
[System.Environment]::GetEnvironmentVariable("PATH", "Machine")
[System.Environment]::GetEnvironmentVariable("PATH", "User")
```

### Set Environment Variables

#### Temporary (Session Only)
```powershell
$env:MY_VAR = "value"
```

#### Permanent (User Level)
```powershell
[System.Environment]::SetEnvironmentVariable("MY_VAR", "value", "User")

# Or via setx
setx MY_VAR "value"
```

#### Permanent (System Level - Admin Required)
```powershell
[System.Environment]::SetEnvironmentVariable("MY_VAR", "value", "Machine")

# Or via setx
setx MY_VAR "value" /M
```

### Modify PATH

#### Add to User PATH
```powershell
$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
$newPath = "$currentPath;C:\new\path"
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
```

#### Add to System PATH
```powershell
$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
$newPath = "$currentPath;C:\new\path"
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
```

### Common Development Variables

```powershell
# Node.js
setx NODE_ENV "development"
setx NODE_OPTIONS "--max-old-space-size=4096"

# Database
setx DATABASE_URL "postgresql://user:pass@localhost:5432/db"
setx REDIS_URL "redis://localhost:6379"

# API Keys (Example - use actual keys)
setx OPENAI_API_KEY "sk-..."
setx ANTHROPIC_API_KEY "sk-..."
setx STRIPE_SECRET_KEY "sk_test_..."

# Paths
setx JAVA_HOME "C:\Program Files\Java\jdk-21"
setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
setx GOPATH "C:\Users\%USERNAME%\go"
```

## Hosts File

### Location
```
C:\Windows\System32\drivers\etc\hosts
```

### Edit Hosts File
```powershell
# Open in notepad as admin
Start-Process notepad "C:\Windows\System32\drivers\etc\hosts" -Verb RunAs

# Or via PowerShell
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n127.0.0.1`tlocalhost.custom"
```

### Common Hosts Entries
```
# Development
127.0.0.1       localhost
127.0.0.1       local.merlin.dev
127.0.0.1       api.merlin.dev

# Block sites (if needed)
# 0.0.0.0       blocked-site.com
```

## PowerShell Profile

### Profile Locations
```powershell
# Current user, current host
$PROFILE.CurrentUserCurrentHost
# Usually: C:\Users\<user>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1

# All users, all hosts
$PROFILE.AllUsersAllHosts
```

### Create/Edit Profile
```powershell
# Create if doesn't exist
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}

# Edit
notepad $PROFILE
```

### Useful Profile Content
```powershell
# Aliases
Set-Alias -Name g -Value git
Set-Alias -Name c -Value code
Set-Alias -Name k -Value kubectl

# Functions
function dev { Set-Location "C:\Cursor Projects" }
function merlin { Set-Location "C:\Cursor Projects\Merlin website clone" }

# Custom prompt
function prompt {
    $path = (Get-Location).Path.Replace($env:USERPROFILE, "~")
    "$path> "
}

# Auto-start
Write-Host "PowerShell ready. Type 'dev' to go to projects." -ForegroundColor Green
```

## Windows Registry (Advanced)

### View Registry
```powershell
# Get registry key
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion"

# List subkeys
Get-ChildItem -Path "HKCU:\SOFTWARE"
```

### Modify Registry
```powershell
# Set value
Set-ItemProperty -Path "HKCU:\SOFTWARE\MyApp" -Name "Setting" -Value "NewValue"

# Create new key
New-Item -Path "HKCU:\SOFTWARE\MyNewApp"

# Create new value
New-ItemProperty -Path "HKCU:\SOFTWARE\MyApp" -Name "NewSetting" -Value "Value" -PropertyType String
```

### ⚠️ Registry Caution
- Always backup before changes
- Test in HKCU before HKLM
- Document all changes
- Know how to restore

## System Information

```powershell
# System info
systeminfo

# OS version
[System.Environment]::OSVersion

# Computer name
$env:COMPUTERNAME

# User info
whoami
$env:USERNAME
$env:USERDOMAIN

# Hardware
Get-WmiObject Win32_ComputerSystem
Get-WmiObject Win32_Processor
Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
```
