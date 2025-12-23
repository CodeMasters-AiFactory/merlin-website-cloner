# Windows Features & Settings Rules

## Windows Features

### View Features
```powershell
# List all features
Get-WindowsOptionalFeature -Online | Select-Object FeatureName, State

# Check specific feature
Get-WindowsOptionalFeature -Online -FeatureName "Microsoft-Hyper-V-All"
```

### Enable Features
```powershell
# Enable feature (requires admin)
Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Hyper-V-All" -All
Enable-WindowsOptionalFeature -Online -FeatureName "Containers" -All
Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Windows-Subsystem-Linux"
Enable-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform"

# Via DISM
dism /online /enable-feature /featurename:Microsoft-Hyper-V /all
```

### Disable Features
```powershell
Disable-WindowsOptionalFeature -Online -FeatureName "FeatureName"
```

### Common Development Features
```powershell
# WSL
Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Windows-Subsystem-Linux" -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform" -NoRestart

# Hyper-V
Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Hyper-V-All" -NoRestart

# Containers
Enable-WindowsOptionalFeature -Online -FeatureName "Containers" -NoRestart

# .NET Framework 3.5
Enable-WindowsOptionalFeature -Online -FeatureName "NetFx3" -NoRestart

# IIS
Enable-WindowsOptionalFeature -Online -FeatureName "IIS-WebServerRole" -NoRestart

# Telnet Client
Enable-WindowsOptionalFeature -Online -FeatureName "TelnetClient" -NoRestart

# SSH Client (usually enabled by default)
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# SSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

## Windows Settings

### Open Settings Pages
```powershell
# Main Settings
start ms-settings:

# Specific pages
start ms-settings:display
start ms-settings:network
start ms-settings:windowsupdate
start ms-settings:apps-volume
start ms-settings:defaultapps
start ms-settings:developers
start ms-settings:privacy
start ms-settings:backup
start ms-settings:storagesense
start ms-settings:personalization
start ms-settings:sound
start ms-settings:bluetooth
start ms-settings:dateandtime
start ms-settings:regionformatting
```

### Developer Mode
```powershell
# Enable Developer Mode
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1"
```

### File Explorer Options
```powershell
# Show hidden files
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "Hidden" -Value 1

# Show file extensions
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "HideFileExt" -Value 0

# Show protected system files
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowSuperHidden" -Value 1
```

## Startup Programs

### View Startup Programs
```powershell
# Using Get-CimInstance
Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location

# Startup folders
explorer shell:startup          # Current user
explorer shell:common startup   # All users
```

### Manage Startup
```powershell
# Disable startup item (via registry)
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "ProgramName"

# Add startup item
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "MyApp" -Value "C:\path\to\app.exe"
```

## Power Settings

### Power Plans
```powershell
# List power plans
powercfg /list

# Set active plan
powercfg /setactive SCHEME_MIN    # Power saver
powercfg /setactive SCHEME_MAX    # High performance
powercfg /setactive SCHEME_BALANCED

# Create custom plan
powercfg /duplicatescheme SCHEME_MAX MyCustomPlan
```

### Sleep/Hibernate
```powershell
# Disable hibernate
powercfg /hibernate off

# Enable hibernate
powercfg /hibernate on

# Set sleep timeout (AC power, minutes)
powercfg /change standby-timeout-ac 30
powercfg /change monitor-timeout-ac 15
```

## Windows Update

### Check for Updates
```powershell
# Using Windows Update PowerShell module
Install-Module -Name PSWindowsUpdate -Force
Get-WindowsUpdate
Install-WindowsUpdate -AcceptAll -AutoReboot
```

### Pause Updates
```powershell
# Pause for 35 days (max)
$pause = (Get-Date).AddDays(35)
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name "PauseUpdatesExpiryTime" -Value $pause.ToString("yyyy-MM-ddTHH:mm:ssZ")
```

## Time & Date

### Set Time Zone
```powershell
# List time zones
Get-TimeZone -ListAvailable

# Set time zone
Set-TimeZone -Id "South Africa Standard Time"
```

### Sync Time
```powershell
# Force time sync
w32tm /resync /force
```

## Regional Settings

```powershell
# Set system locale
Set-WinSystemLocale -SystemLocale en-ZA

# Set display language
Set-WinUILanguageOverride -Language en-US

# Set region
Set-WinHomeLocation -GeoId 209  # South Africa = 209
```
