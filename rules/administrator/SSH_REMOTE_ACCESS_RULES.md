# SSH & Remote Access Rules

## OpenSSH Client

### Installation
```powershell
# Check if installed
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'

# Install SSH Client
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Install SSH Server (if needed)
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

### Basic Usage
```powershell
# Connect to server
ssh user@hostname
ssh user@192.168.1.100
ssh -p 2222 user@hostname  # Custom port

# Connect with key
ssh -i ~/.ssh/id_rsa user@hostname

# Run command remotely
ssh user@hostname "ls -la"
```

### SSH Config
```powershell
# Create config file
New-Item -Path "$env:USERPROFILE\.ssh\config" -ItemType File -Force

# Edit config
notepad "$env:USERPROFILE\.ssh\config"
```

### Example SSH Config
```
# ~/.ssh/config

Host dev-server
    HostName 192.168.1.100
    User developer
    Port 22
    IdentityFile ~/.ssh/id_ed25519

Host production
    HostName prod.example.com
    User deploy
    Port 22
    IdentityFile ~/.ssh/id_rsa_prod
    ForwardAgent yes

Host *
    AddKeysToAgent yes
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### SSH Key Management
```powershell
# Generate key (Ed25519 - recommended)
ssh-keygen -t ed25519 -C "your.email@example.com"

# Generate key (RSA)
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"

# Copy public key to server
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh user@hostname "cat >> ~/.ssh/authorized_keys"

# Or manually copy
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | Set-Clipboard
```

### SSH Agent
```powershell
# Start SSH Agent service
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

# Add key to agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"

# List keys in agent
ssh-add -l

# Remove all keys
ssh-add -D
```

## SCP & SFTP

### SCP (Secure Copy)
```powershell
# Copy file to server
scp file.txt user@hostname:/path/to/destination/

# Copy file from server
scp user@hostname:/path/to/file.txt ./local/

# Copy directory
scp -r ./folder user@hostname:/path/to/destination/

# With custom port
scp -P 2222 file.txt user@hostname:/path/
```

### SFTP
```powershell
# Connect
sftp user@hostname

# SFTP commands
# ls, cd, pwd          - remote navigation
# lls, lcd, lpwd       - local navigation
# get file.txt         - download file
# put file.txt         - upload file
# mget *.txt           - download multiple
# mput *.txt           - upload multiple
# mkdir dirname        - create directory
# rm file.txt          - delete file
# bye / exit           - disconnect
```

## OpenSSH Server

### Setup (Windows)
```powershell
# Install
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Start and configure
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# Configure firewall
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

### Configuration
```powershell
# Config location
# C:\ProgramData\ssh\sshd_config

# Edit config
notepad C:\ProgramData\ssh\sshd_config

# Restart after changes
Restart-Service sshd
```

## Remote Desktop (RDP)

### Enable RDP
```powershell
# Enable Remote Desktop
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0

# Enable firewall rule
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

# Require Network Level Authentication
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name "UserAuthentication" -Value 1
```

### Connect via RDP
```powershell
# Open RDP client
mstsc

# Connect to specific computer
mstsc /v:hostname
mstsc /v:192.168.1.100:3389
```

## PuTTY (Alternative SSH Client)

### Installation
```powershell
winget install PuTTY.PuTTY
```

### CLI Tools
```powershell
# plink - command line SSH
plink user@hostname

# pscp - SCP
pscp file.txt user@hostname:/path/

# psftp - SFTP
psftp user@hostname

# pageant - SSH agent for PuTTY
pageant key.ppk
```

### Convert Keys
```powershell
# Convert OpenSSH key to PuTTY format
puttygen ~/.ssh/id_rsa -o key.ppk

# Convert PuTTY key to OpenSSH format
puttygen key.ppk -O private-openssh -o id_rsa
```

## WinRM (Windows Remote Management)

### Enable WinRM
```powershell
# Enable WinRM
Enable-PSRemoting -Force

# Configure TrustedHosts (if needed)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*"
```

### Remote PowerShell
```powershell
# Create session
$session = New-PSSession -ComputerName hostname -Credential (Get-Credential)

# Run command
Invoke-Command -Session $session -ScriptBlock { Get-Process }

# Interactive session
Enter-PSSession -ComputerName hostname -Credential (Get-Credential)

# Exit session
Exit-PSSession
```
