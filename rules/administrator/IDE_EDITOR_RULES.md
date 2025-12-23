# IDE & Editor Management Rules

## Visual Studio Code

### Installation
```powershell
winget install Microsoft.VisualStudioCode
```

### CLI Commands
```powershell
# Open folder
code .
code C:\path\to\folder

# Open file
code file.txt

# Open in new window
code -n .

# Diff files
code --diff file1.txt file2.txt

# Install extension
code --install-extension ms-python.python
code --install-extension dbaeumer.vscode-eslint

# List extensions
code --list-extensions

# Uninstall extension
code --uninstall-extension extension-id

# Disable all extensions
code --disable-extensions
```

### Essential Extensions
```powershell
# Install essential extensions
$extensions = @(
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-vscode-remote.remote-wsl",
    "ms-azuretools.vscode-docker",
    "GitHub.copilot",
    "eamodio.gitlens",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-node-azure-pack"
)

foreach ($ext in $extensions) {
    code --install-extension $ext
}
```

### Settings Sync
```powershell
# Settings location
# Windows: %APPDATA%\Code\User\settings.json
# Extensions: %USERPROFILE%\.vscode\extensions

# Backup settings
Copy-Item "$env:APPDATA\Code\User\settings.json" ".\vscode-settings-backup.json"
Copy-Item "$env:APPDATA\Code\User\keybindings.json" ".\vscode-keybindings-backup.json"
```

## Cursor IDE

### Installation
```powershell
winget install Cursor.Cursor
```

### Configuration
```powershell
# Settings location similar to VS Code
# %APPDATA%\Cursor\User\settings.json

# Extensions compatible with VS Code
```

## JetBrains IDEs

### Installation
```powershell
# WebStorm
winget install JetBrains.WebStorm

# PyCharm
winget install JetBrains.PyCharm.Professional

# IntelliJ IDEA
winget install JetBrains.IntelliJIDEA.Ultimate

# DataGrip
winget install JetBrains.DataGrip

# Toolbox (manages all JetBrains IDEs)
winget install JetBrains.Toolbox
```

### CLI Commands
```powershell
# Open project (if shell integration enabled)
webstorm .
pycharm .
idea .
```

## Vim/Neovim

### Installation
```powershell
# Vim
winget install vim.vim

# Neovim
winget install Neovim.Neovim
```

### Configuration
```powershell
# Vim config location
# %USERPROFILE%\_vimrc

# Neovim config location
# %LOCALAPPDATA%\nvim\init.vim
# or %LOCALAPPDATA%\nvim\init.lua
```

## Sublime Text

### Installation
```powershell
winget install SublimeHQ.SublimeText.4
```

### CLI
```powershell
# Add to PATH, then:
subl .
subl file.txt
```

## Notepad++

### Installation
```powershell
winget install Notepad++.Notepad++
```

## Editor Configuration Files

### .editorconfig
```ini
# .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.{js,ts,tsx}]
indent_size = 2

[*.py]
indent_size = 4
```

### VS Code settings.json
```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "typescript.preferences.importModuleSpecifier": "relative",
  "git.autofetch": true,
  "git.confirmSync": false,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```
