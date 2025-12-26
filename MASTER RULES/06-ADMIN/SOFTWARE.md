# Software Management Rules

## Package Managers

### Winget (Windows Package Manager)
```powershell
winget search <name>              # Search packages
winget install <package>          # Install
winget upgrade --all              # Upgrade all
winget uninstall <package>        # Uninstall
winget list                       # List installed
```

### Chocolatey
```powershell
choco search <name>               # Search
choco install <package> -y        # Install (auto-confirm)
choco upgrade all -y              # Upgrade all
choco uninstall <package> -y      # Uninstall
choco list --local-only           # List installed
```

### npm (Node.js)
```powershell
npm search <name>                 # Search
npm install <package>             # Install local
npm install -g <package>          # Install global
npm update                        # Update all
npm uninstall <package>           # Uninstall
npm list -g --depth=0             # List global
```

### pip (Python)
```powershell
pip search <name>                 # Search (deprecated)
pip install <package>             # Install
pip install --upgrade <package>   # Upgrade
pip uninstall <package>           # Uninstall
pip list                          # List installed
```

---

## Common Software Installations

### Development
```powershell
winget install -e --id Git.Git
winget install -e --id Microsoft.VisualStudioCode
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Python.Python.3.11
```

### Databases
```powershell
winget install -e --id PostgreSQL.PostgreSQL
winget install -e --id MongoDB.Server
winget install -e --id Redis.Redis
```

### Containers
```powershell
winget install -e --id Docker.DockerDesktop
```

### Utilities
```powershell
winget install -e --id 7zip.7zip
winget install -e --id JanDeDobbeleer.OhMyPosh
```

---

## Rules

### ALWAYS DO:
- Use official package managers
- Install from trusted sources
- Keep software updated
- Document installations

### NEVER DO:
- Install cracked software
- Skip security warnings
- Install untrusted packages
- Ignore version conflicts

---

## Environment Variables

```powershell
# View all
Get-ChildItem Env:

# View specific
$env:PATH

# Set for session
$env:MY_VAR = "value"

# Set permanently (user)
[Environment]::SetEnvironmentVariable("MY_VAR", "value", "User")

# Set permanently (system - requires admin)
[Environment]::SetEnvironmentVariable("MY_VAR", "value", "Machine")
```

---

## PATH Management

```powershell
# View PATH
$env:PATH -split ';'

# Add to PATH (session)
$env:PATH += ";C:\new\path"

# Add to PATH (permanent user)
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH", "$userPath;C:\new\path", "User")
```
