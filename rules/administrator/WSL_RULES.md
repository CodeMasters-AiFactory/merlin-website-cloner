# WSL (Windows Subsystem for Linux) Rules

## Installation

### Enable WSL
```powershell
# Enable WSL feature (requires admin)
wsl --install

# Or manually enable features
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Set WSL 2 as default
wsl --set-default-version 2

# Restart required
Restart-Computer
```

### Install Distributions
```powershell
# List available distributions
wsl --list --online

# Install specific distribution
wsl --install -d Ubuntu-22.04
wsl --install -d Debian
wsl --install -d kali-linux

# List installed distributions
wsl --list --verbose
wsl -l -v
```

## WSL Management

### Basic Commands
```powershell
# Start WSL
wsl

# Start specific distro
wsl -d Ubuntu-22.04

# Run command in WSL
wsl ls -la
wsl -d Ubuntu-22.04 -- ls -la

# Shutdown WSL
wsl --shutdown

# Terminate specific distro
wsl --terminate Ubuntu-22.04

# Set default distribution
wsl --set-default Ubuntu-22.04
```

### Distribution Management
```powershell
# Export distribution (backup)
wsl --export Ubuntu-22.04 D:\Backups\ubuntu-backup.tar

# Import distribution (restore)
wsl --import Ubuntu-Restored D:\WSL\Ubuntu D:\Backups\ubuntu-backup.tar

# Unregister (delete) distribution
wsl --unregister Ubuntu-22.04

# Check WSL version
wsl --version
```

### File System Access
```powershell
# Access Windows files from WSL
# /mnt/c/ = C:\
# /mnt/d/ = D:\

# Access WSL files from Windows
# \\wsl$\Ubuntu-22.04\home\user\

# Open WSL folder in Explorer
explorer.exe \\wsl$\Ubuntu-22.04\home\user
```

## WSL Configuration

### .wslconfig (Windows side)
```ini
# %USERPROFILE%\.wslconfig
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true

[experimental]
autoMemoryReclaim=gradual
sparseVhd=true
```

### wsl.conf (Linux side)
```ini
# /etc/wsl.conf
[boot]
systemd=true

[automount]
enabled=true
root=/mnt/
options="metadata,umask=22,fmask=11"

[network]
generateHosts=true
generateResolvConf=true

[interop]
enabled=true
appendWindowsPath=true
```

## Development in WSL

### Install Development Tools
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y build-essential git curl wget

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install Docker (inside WSL)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### VS Code Integration
```powershell
# Install Remote - WSL extension in VS Code
code --install-extension ms-vscode-remote.remote-wsl

# Open folder in WSL from Windows
code --remote wsl+Ubuntu-22.04 /home/user/project

# From WSL terminal
code .
```

### Port Forwarding
```powershell
# WSL 2 ports are automatically forwarded to localhost
# Access WSL service at localhost:port from Windows

# If not working, check Windows firewall
New-NetFirewallRule -DisplayName "WSL" -Direction Inbound -InterfaceAlias "vEthernet (WSL)" -Action Allow
```

## Troubleshooting

### Common Issues
```powershell
# Reset WSL network
wsl --shutdown
netsh winsock reset
netsh int ip reset

# Fix DNS issues in WSL
# In WSL: sudo rm /etc/resolv.conf
# Add to /etc/wsl.conf: [network] generateResolvConf=false
# Create /etc/resolv.conf with: nameserver 8.8.8.8

# Check WSL status
wsl --status

# Update WSL
wsl --update
```

### Performance Tips
1. Store projects in WSL filesystem, not /mnt/c
2. Use WSL 2 for better performance
3. Limit memory in .wslconfig if needed
4. Use Docker Desktop WSL 2 backend
