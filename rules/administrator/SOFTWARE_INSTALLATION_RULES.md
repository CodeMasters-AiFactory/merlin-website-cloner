# Software Installation Rules

## Package Manager Priority

### For Windows Software
```
1. Winget (preferred - Microsoft official)
2. Chocolatey (comprehensive)
3. Scoop (portable apps)
4. Direct installer (last resort)
```

### For Development
```
1. npm/yarn/pnpm (Node.js)
2. pip/pipx (Python)
3. cargo (Rust)
4. go get (Go)
5. nuget (C#/.NET)
```

## Installation Commands

### Winget
```powershell
# Search
winget search <name>

# Install
winget install <id>
winget install -e --id <exact-id>

# Update
winget upgrade <id>
winget upgrade --all

# Uninstall
winget uninstall <id>

# List installed
winget list
```

### Chocolatey
```powershell
# Install Chocolatey (if not present)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Search
choco search <name>

# Install
choco install <name> -y

# Update
choco upgrade <name> -y
choco upgrade all -y

# Uninstall
choco uninstall <name> -y

# List
choco list --local-only
```

### Scoop
```powershell
# Install Scoop (if not present)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Add buckets
scoop bucket add extras
scoop bucket add versions

# Install
scoop install <name>

# Update
scoop update <name>
scoop update *

# Uninstall
scoop uninstall <name>
```

### npm (Global)
```powershell
# Install globally
npm install -g <package>

# Update global
npm update -g <package>
npm update -g

# List global
npm list -g --depth=0

# Uninstall global
npm uninstall -g <package>
```

### pip
```powershell
# Install
pip install <package>
pip install <package> --break-system-packages

# Update
pip install --upgrade <package>

# List
pip list

# Uninstall
pip uninstall <package> -y
```

## Common Software to Install

### Development Essentials
```powershell
# Runtime environments
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install GoLang.Go
winget install Rustlang.Rust.MSVC

# Version managers
npm install -g nvm-windows
pip install pyenv-win

# Build tools
winget install Microsoft.VisualStudio.2022.BuildTools
winget install Git.Git
winget install GitHub.cli
```

### Databases
```powershell
winget install PostgreSQL.PostgreSQL
winget install Microsoft.SQLServer.2022.Express
winget install MongoDB.Server
winget install Redis.Redis
```

### Containers & Orchestration
```powershell
winget install Docker.DockerDesktop
winget install Kubernetes.kubectl
winget install Helm.Helm
winget install Minikube
```

### IDEs & Editors
```powershell
winget install Microsoft.VisualStudioCode
winget install JetBrains.WebStorm
winget install Cursor.Cursor
```

### Utilities
```powershell
winget install Microsoft.PowerToys
winget install Microsoft.WindowsTerminal
winget install jqlang.jq
winget install stedolan.jq
winget install sharkdp.bat
winget install BurntSushi.ripgrep.MSVC
```

## Pre-Installation Checklist

- [ ] Check if already installed
- [ ] Check system requirements
- [ ] Check disk space
- [ ] Note current version if upgrading
- [ ] Document the installation

## Post-Installation Checklist

- [ ] Verify installation works
- [ ] Add to PATH if needed
- [ ] Configure if needed
- [ ] Document version installed
- [ ] Test basic functionality
