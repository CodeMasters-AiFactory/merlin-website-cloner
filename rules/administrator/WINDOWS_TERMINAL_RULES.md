# Windows Terminal Configuration Rules

## Installation

```powershell
# Via Winget
winget install Microsoft.WindowsTerminal

# Via Microsoft Store
# Search "Windows Terminal"
```

## Configuration

### Settings Location
```
%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json
```

### Open Settings
```powershell
# GUI
Ctrl + ,

# JSON
Ctrl + Shift + ,
```

### Example settings.json
```json
{
    "$schema": "https://aka.ms/terminal-profiles-schema",
    "defaultProfile": "{574e775e-4f2a-5b96-ac1e-a2962a402336}",
    "copyOnSelect": true,
    "copyFormatting": false,
    
    "profiles": {
        "defaults": {
            "font": {
                "face": "CaskaydiaCove Nerd Font",
                "size": 12
            },
            "opacity": 95,
            "useAcrylic": true,
            "padding": "8"
        },
        "list": [
            {
                "guid": "{574e775e-4f2a-5b96-ac1e-a2962a402336}",
                "name": "PowerShell",
                "source": "Windows.Terminal.PowershellCore",
                "colorScheme": "One Half Dark",
                "startingDirectory": "C:\\Cursor Projects"
            },
            {
                "guid": "{2c4de342-38b7-51cf-b940-2309a097f518}",
                "name": "Ubuntu",
                "source": "Windows.Terminal.Wsl",
                "colorScheme": "One Half Dark"
            },
            {
                "guid": "{b453ae62-4e3d-5e58-b989-0a998ec441b8}",
                "name": "Git Bash",
                "commandline": "C:\\Program Files\\Git\\bin\\bash.exe",
                "icon": "C:\\Program Files\\Git\\mingw64\\share\\git\\git-for-windows.ico",
                "startingDirectory": "C:\\Cursor Projects"
            }
        ]
    },
    
    "schemes": [
        {
            "name": "Custom Dark",
            "background": "#1E1E1E",
            "foreground": "#D4D4D4",
            "black": "#000000",
            "red": "#CD3131",
            "green": "#0DBC79",
            "yellow": "#E5E510",
            "blue": "#2472C8",
            "purple": "#BC3FBC",
            "cyan": "#11A8CD",
            "white": "#E5E5E5"
        }
    ],
    
    "actions": [
        { "command": "paste", "keys": "ctrl+v" },
        { "command": "copy", "keys": "ctrl+c" },
        { "command": "find", "keys": "ctrl+shift+f" },
        { "command": { "action": "splitPane", "split": "horizontal" }, "keys": "alt+shift+-" },
        { "command": { "action": "splitPane", "split": "vertical" }, "keys": "alt+shift+=" },
        { "command": { "action": "newTab" }, "keys": "ctrl+shift+t" },
        { "command": { "action": "closeTab" }, "keys": "ctrl+shift+w" }
    ]
}
```

## Keyboard Shortcuts

### Default Shortcuts
| Action | Shortcut |
|--------|----------|
| New Tab | Ctrl+Shift+T |
| Close Tab | Ctrl+Shift+W |
| Next Tab | Ctrl+Tab |
| Previous Tab | Ctrl+Shift+Tab |
| Split Horizontal | Alt+Shift+- |
| Split Vertical | Alt+Shift+= |
| Close Pane | Ctrl+Shift+W |
| Switch Pane | Alt+Arrow |
| Resize Pane | Alt+Shift+Arrow |
| Open Settings | Ctrl+, |
| Find | Ctrl+Shift+F |
| Zoom In | Ctrl+= |
| Zoom Out | Ctrl+- |
| Reset Zoom | Ctrl+0 |

## Fonts

### Install Nerd Fonts
```powershell
# Popular programming fonts with icons
choco install nerd-fonts-cascadiacode -y
choco install nerd-fonts-firacode -y
choco install nerd-fonts-jetbrainsmono -y

# Or via Scoop
scoop bucket add nerd-fonts
scoop install CascadiaCode-NF
```

## Oh My Posh (Prompt Customization)

### Install
```powershell
winget install JanDeDobbeleer.OhMyPosh
```

### Configure PowerShell Profile
```powershell
# Edit profile
notepad $PROFILE

# Add to profile:
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\powerlevel10k_rainbow.omp.json" | Invoke-Expression

# Or custom theme
oh-my-posh init pwsh --config "C:\path\to\theme.omp.json" | Invoke-Expression
```

### List Themes
```powershell
Get-PoshThemes
```

## Profiles for Development

### Add Custom Profile
```json
{
    "guid": "{your-guid-here}",
    "name": "Node Project",
    "commandline": "powershell.exe -NoExit -Command \"cd 'C:\\Cursor Projects\\Merlin website clone'; npm run dev\"",
    "icon": "🚀",
    "startingDirectory": "C:\\Cursor Projects\\Merlin website clone"
}
```

### Admin Profile
```json
{
    "guid": "{admin-guid}",
    "name": "Admin PowerShell",
    "commandline": "powershell.exe",
    "elevate": true,
    "icon": "⚡"
}
```

## Command Line Arguments

```powershell
# Open in specific directory
wt -d C:\Projects

# Open with specific profile
wt -p "Ubuntu"

# Split panes
wt -p "PowerShell" `; split-pane -p "Ubuntu"

# New tab
wt new-tab -p "PowerShell"

# Multiple commands
wt -p "PowerShell" -d C:\Project1 `; new-tab -p "PowerShell" -d C:\Project2
```
