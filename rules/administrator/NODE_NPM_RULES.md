# Node.js & npm Management Rules

## Node.js Installation

### Via Winget (Recommended)
```powershell
# LTS version
winget install OpenJS.NodeJS.LTS

# Current version
winget install OpenJS.NodeJS
```

### Via NVM-Windows (Version Management)
```powershell
# Install NVM-Windows
winget install CoreyButler.NVMforWindows

# After restart
nvm install 20.10.0   # Install specific version
nvm install lts       # Install latest LTS
nvm use 20.10.0       # Use specific version
nvm list              # List installed versions
nvm current           # Show current version
```

## npm Configuration

### View Config
```powershell
npm config list
npm config list -l   # All settings
```

### Set Config
```powershell
# Set registry
npm config set registry https://registry.npmjs.org/

# Set default init values
npm config set init-author-name "Rudolf"
npm config set init-license "MIT"

# Set global install location
npm config set prefix "C:\Users\$env:USERNAME\.npm-global"
```

### .npmrc File
```ini
# ~/.npmrc
registry=https://registry.npmjs.org/
save-exact=true
engine-strict=true
@myorg:registry=https://npm.myorg.com/
```

## Global Packages

### View Global Packages
```powershell
npm list -g --depth=0
```

### Essential Global Packages
```powershell
# Development tools
npm install -g typescript
npm install -g ts-node
npm install -g nodemon
npm install -g concurrently
npm install -g cross-env

# Package management
npm install -g npm-check-updates
npm install -g depcheck
npm install -g npkill

# CLI tools
npm install -g vercel
npm install -g netlify-cli
npm install -g railway

# Code quality
npm install -g eslint
npm install -g prettier

# Database tools
npm install -g prisma

# Testing
npm install -g jest
npm install -g playwright
```

### Update Global Packages
```powershell
# Update all
npm update -g

# Update specific
npm update -g typescript

# Check outdated
npm outdated -g
```

## Project Dependencies

### Install
```powershell
npm install                    # Install all from package.json
npm install <package>          # Add dependency
npm install -D <package>       # Add dev dependency
npm install -g <package>       # Global install
npm install <package>@version  # Specific version
npm install <package>@latest   # Latest version
```

### Remove
```powershell
npm uninstall <package>
npm uninstall -g <package>     # Global
```

### Update
```powershell
# Check outdated
npm outdated

# Update to latest minor/patch
npm update

# Update to latest major (using ncu)
npx npm-check-updates -u
npm install
```

### Audit
```powershell
# Check vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (CAREFUL - breaking changes)
npm audit fix --force
```

## Package-lock & Caching

### Lock File
```powershell
# Regenerate lock file
rm package-lock.json
npm install

# Install exactly from lock file
npm ci
```

### Cache
```powershell
# View cache
npm cache ls

# Clean cache
npm cache clean --force

# Verify cache
npm cache verify
```

## npm Scripts

### Common Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "nodemon --exec ts-node src/server.ts",
    "dev:frontend": "vite",
    "build": "tsc && vite build",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "typecheck": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "clean": "rimraf dist coverage node_modules/.cache"
  }
}
```

### Run Scripts
```powershell
npm run dev
npm run build
npm test
npm start
```

## Alternative Package Managers

### pnpm
```powershell
# Install
npm install -g pnpm

# Use
pnpm install
pnpm add <package>
pnpm remove <package>
pnpm run <script>
```

### Yarn
```powershell
# Install
npm install -g yarn

# Use
yarn
yarn add <package>
yarn remove <package>
yarn <script>
```

### Bun
```powershell
# Install (via npm as fallback)
npm install -g bun

# Or via PowerShell
irm bun.sh/install.ps1 | iex

# Use
bun install
bun add <package>
bun remove <package>
bun run <script>
```

## Troubleshooting

### Clear Everything
```powershell
# Nuclear option
rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install
```

### Permission Issues
```powershell
# Fix npm permissions (Windows)
npm config set prefix "C:\Users\$env:USERNAME\.npm-global"

# Add to PATH
[System.Environment]::SetEnvironmentVariable("PATH", "$env:PATH;C:\Users\$env:USERNAME\.npm-global", "User")
```

### Node-gyp Issues
```powershell
# Install build tools
npm install -g windows-build-tools

# Or manually install Visual Studio Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
```
