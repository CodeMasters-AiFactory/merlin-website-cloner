# Merlin Initializer Agent

> Based on Anthropic's "Effective Harnesses for Long-Running Agents" Framework
> This agent runs ONCE at project start to set up the environment.

## Your Role

You are the **Initializer Agent** - your job is to prepare the environment so that future **Coding Agents** can work effectively across multiple sessions.

## Core Insight from Anthropic

> "The initializer agent sets up the environment with all the necessary context 
> that future coding agents will need to work effectively."

---

## Your Tasks

### 1. Verify Environment
```powershell
# Check Node.js and npm
node --version
npm --version

# Check project dependencies
npm install

# Verify .env exists
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

### 2. Create/Verify Key Files

#### init.ps1 (Startup Script)
```powershell
# init.ps1 - Run at start of each session
Write-Host "🚀 Initializing Merlin Development Environment" -ForegroundColor Cyan

# Check Node
$nodeVersion = node --version
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

# Check npm
$npmVersion = npm --version
Write-Host "npm: $npmVersion" -ForegroundColor Green

# Check dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check .env
if (!(Test-Path ".env")) {
    Write-Host "Creating .env from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

# Check git
git status | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Git: Ready" -ForegroundColor Green
} else {
    Write-Host "Git: Not initialized" -ForegroundColor Red
    git init
}

Write-Host "`n✅ Environment Ready!" -ForegroundColor Green
Write-Host "Run 'npm run dev' to start servers`n" -ForegroundColor Cyan
```

#### claude-progress.txt (Progress Tracking)
```markdown
# Merlin Website Cloner - Agent Progress Log

## Project Overview
- Repository: merlin-website-cloner
- Owner: CodeMasters-AiFactory
- Goal: World-class website backup & cloning tool

## Current Sprint Focus
COD-11: Security Hardening (URGENT)

---

## Session Log

### Session #0 - Initialization
Date: [CURRENT_DATE]
Agent: Initializer

#### Completed:
- Created init.ps1 startup script
- Created claude-progress.txt (this file)
- Verified feature_list.json exists
- Confirmed environment ready

#### Next Priority:
- COD-11-001: Replace hardcoded JWT secret

#### Blockers:
- None

#### Notes:
- Environment initialized successfully
- Ready for Coding Agent to begin work
---
```

#### feature_list.json (Comprehensive Feature Requirements)
Create 200+ granular features covering:
- All COD-11 security tasks (20+ features)
- All COD-9 database tasks (30+ features)
- All COD-10 payment tasks (25+ features)
- All COD-12 Docker/CI tasks (20+ features)
- All COD-14 legal tasks (15+ features)
- All COD-13 testing tasks (40+ features)
- UI/UX improvements (30+ features)
- Performance optimizations (20+ features)

### 3. Review Current State
```powershell
# Check git history
git log --oneline -20

# Check for uncommitted changes
git status

# List key files
Get-ChildItem -Recurse -Include *.ts,*.tsx -Depth 3 | Measure-Object
```

### 4. Verify Project Runs
```powershell
# Start development servers
npm run dev

# In separate terminal, verify:
# - Backend: http://localhost:3000/api/health
# - Frontend: http://localhost:5173
```

### 5. Create Initial Commit
```powershell
git add init.ps1 claude-progress.txt feature_list.json
git commit -m "chore: initialize autonomous agent framework

- Added init.ps1 startup script
- Added claude-progress.txt for session handoffs  
- Added feature_list.json with 200+ requirements
- Based on Anthropic's long-running agent harness"
```

---

## Success Criteria

Before handing off to Coding Agent:

- [ ] ✅ Environment verified (Node, npm, git working)
- [ ] ✅ All dependencies installed
- [ ] ✅ .env file exists with required variables
- [ ] ✅ init.ps1 script created and tested
- [ ] ✅ claude-progress.txt created with initial entry
- [ ] ✅ feature_list.json created with 200+ features
- [ ] ✅ Development server starts successfully
- [ ] ✅ Initial commit made
- [ ] ✅ Ready for Coding Agent

---

## Hand Off Message

After completing initialization, document:

```markdown
## Initializer Complete

Environment: ✅ Ready
Files Created:
- init.ps1
- claude-progress.txt
- feature_list.json (X features)

First Feature for Coding Agent:
COD-11-001: Replace hardcoded JWT secret with environment variable

Instructions:
1. Read claude-progress.txt
2. Run init.ps1
3. Start with COD-11-001
4. Follow session protocol in 24_7_AGENT_RULES.md
```

---

## DO NOT

- ❌ Start implementing features (that's the Coding Agent's job)
- ❌ Skip creating the progress file
- ❌ Create incomplete feature list
- ❌ Leave environment in broken state
- ❌ Forget to commit initialization files
