# Python Management Rules

## Python Installation

### Via Winget
```powershell
# Latest Python 3.12
winget install Python.Python.3.12

# Or specific version
winget install Python.Python.3.11
winget install Python.Python.3.10
```

### Via Chocolatey
```powershell
choco install python -y
```

## pip Management

### Basic Commands
```powershell
# Install package
pip install <package>
pip install <package>==1.2.3        # Specific version
pip install <package>>=1.0,<2.0     # Version range

# Install from requirements
pip install -r requirements.txt

# Upgrade package
pip install --upgrade <package>
pip install -U <package>

# Uninstall
pip uninstall <package> -y

# List installed
pip list
pip list --outdated

# Show package info
pip show <package>
```

### Windows-Specific
```powershell
# If "externally managed environment" error
pip install <package> --break-system-packages

# Or use --user
pip install <package> --user
```

### Requirements File
```powershell
# Create requirements.txt
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt

# Install with hashes (secure)
pip install -r requirements.txt --require-hashes
```

## Virtual Environments

### venv (Built-in)
```powershell
# Create venv
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Activate (PowerShell might need)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Deactivate
deactivate

# Delete venv
Remove-Item -Recurse -Force venv
```

### virtualenv
```powershell
# Install
pip install virtualenv

# Create
virtualenv venv

# Same activation as venv
```

### pipenv
```powershell
# Install
pip install pipenv

# Create environment and install
pipenv install

# Install dev dependencies
pipenv install --dev

# Activate shell
pipenv shell

# Run command
pipenv run python script.py

# Generate requirements.txt
pipenv requirements > requirements.txt
```

### Poetry
```powershell
# Install
pip install poetry

# New project
poetry new myproject

# Init in existing project
poetry init

# Add dependency
poetry add <package>
poetry add --dev <package>

# Install all
poetry install

# Activate shell
poetry shell

# Run command
poetry run python script.py

# Export requirements
poetry export -f requirements.txt > requirements.txt
```

## pyenv (Version Management)

### Install pyenv-win
```powershell
# Via Chocolatey
choco install pyenv-win -y

# Via pip
pip install pyenv-win --target $HOME\.pyenv

# Add to PATH
[System.Environment]::SetEnvironmentVariable("PYENV", "$env:USERPROFILE\.pyenv\pyenv-win", "User")
[System.Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:USERPROFILE\.pyenv\pyenv-win\bin;$env:USERPROFILE\.pyenv\pyenv-win\shims", "User")
```

### Usage
```powershell
# List available versions
pyenv install --list

# Install version
pyenv install 3.12.0

# Set global version
pyenv global 3.12.0

# Set local version (per project)
pyenv local 3.11.0

# List installed
pyenv versions
```

## Common Python Packages

### Data Science
```powershell
pip install numpy pandas matplotlib seaborn scikit-learn jupyter
```

### Web Development
```powershell
pip install fastapi uvicorn flask django
```

### Automation
```powershell
pip install selenium playwright requests beautifulsoup4 scrapy
```

### CLI Tools
```powershell
pip install click typer rich
```

### Development
```powershell
pip install black isort flake8 mypy pytest pytest-cov
```

## Cache Management

```powershell
# View cache
pip cache info

# Clear cache
pip cache purge

# Remove specific package from cache
pip cache remove <package>
```

## Troubleshooting

### SSL Certificate Issues
```powershell
pip install <package> --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
```

### Compilation Issues
```powershell
# Install build tools
winget install Microsoft.VisualStudio.2022.BuildTools

# Install specific wheel
pip install <package> --only-binary :all:
```

### Multiple Python Versions
```powershell
# Use specific Python
py -3.12 -m pip install <package>
py -3.11 -m pip install <package>

# Check which Python
where python
py --list
```

## Best Practices

1. **Always use virtual environments**
2. **Pin versions in requirements.txt**
3. **Use separate dev requirements**
4. **Audit dependencies regularly**
5. **Use pyenv for multiple versions**
6. **Document Python version required**
