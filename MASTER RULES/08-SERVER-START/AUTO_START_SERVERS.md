# ═══════════════════════════════════════════════════════════════════
# 08-SERVER-START: AUTOMATIC SERVER STARTUP RULES
# ═══════════════════════════════════════════════════════════════════

## MANDATORY: Auto-Start on Session Begin

When a new session starts, the agent MUST automatically:

1. **Check if servers are running**
2. **Start servers if not running**
3. **Verify all services are healthy**
4. **Report status to user**

---

## Step 1: Check Current Server Status

```powershell
# Check if port 5000 (Express) is in use
netstat -ano | findstr :5000

# Check if port 5173 (Vite HMR) is in use
netstat -ano | findstr :5173

# Quick health check
curl -s http://localhost:5000/api/health
```

---

## Step 2: Start Servers (If Not Running)

### Option A: Using npm (Recommended)
```powershell
cd "C:\CURSOR PROJECTS\Merlin Website Wizard"
npm run dev
```

### Option B: Using PowerShell Script
```powershell
.\scripts\startup.ps1
```

### Option C: Manual Start (Separate Terminals)
```powershell
# Terminal 1 - Express Backend
cd "C:\CURSOR PROJECTS\Merlin Website Wizard"
npm run server

# Terminal 2 - Vite Frontend
cd "C:\CURSOR PROJECTS\Merlin Website Wizard"
npm run client
```

---

## Step 3: Verify All Services Running

### 3.1 Health Check Endpoint
```powershell
# Must return 200 OK with JSON response
curl -s http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "express": "running",
    "database": "connected"
  }
}
```

### 3.2 Port Verification
```powershell
# Verify Express is listening on 5000
Test-NetConnection localhost -Port 5000

# Verify Vite HMR is listening on 5173
Test-NetConnection localhost -Port 5173
```

### 3.3 Frontend Accessibility
```powershell
# Check frontend loads
curl -s -o NUL -w "%{http_code}" http://localhost:5000
```
**Expected:** `200`

---

## Step 4: Handle Startup Failures

### If Port Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr :5000
# Kill the process (replace PID)
taskkill /F /PID <PID>

# Or kill all Node processes
taskkill /F /IM node.exe
```

### If npm run dev Fails
```powershell
# Check for missing dependencies
npm install

# Clear npm cache if needed
npm cache clean --force

# Try again
npm run dev
```

### If Database Connection Fails
```powershell
# Check PostgreSQL service
Get-Service -Name "postgresql*"

# Start if stopped
Start-Service -Name "postgresql-x64-14"
```

---

## Step 5: Status Report Format

After startup verification, display this status:

```
╔══════════════════════════════════════════════════════════════╗
║           MERLIN WEBSITE WIZARD - SERVER STATUS              ║
╠══════════════════════════════════════════════════════════════╣
║ Service         │ Port  │ Status                             ║
╠═════════════════╪═══════╪════════════════════════════════════╣
║ Express Server  │ 5000  │ ✅ Running                         ║
║ Vite HMR        │ 5173  │ ✅ Running                         ║
║ Health Check    │  -    │ ✅ Passed                          ║
╠══════════════════════════════════════════════════════════════╣
║ Frontend URL: http://localhost:5000                          ║
║ API Base:     http://localhost:5000/api                      ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Timeout Settings

| Operation | Timeout | Retries |
|-----------|---------|---------|
| Server startup | 30s | 3 |
| Health check | 5s | 3 |
| Port check | 2s | 1 |
| Process kill | 5s | 1 |

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Start all servers | `npm run dev` |
| Check health | `curl http://localhost:5000/api/health` |
| Check port 5000 | `netstat -ano \| findstr :5000` |
| Kill Node | `taskkill /F /IM node.exe` |
| Check services | `Get-Service -Name "postgresql*"` |

---

## AGENT BEHAVIOR RULES

### ALWAYS DO:
- Start servers automatically at session begin
- Verify servers are healthy before any work
- Report status to user
- Fix startup issues immediately

### NEVER DO:
- Ask permission to start dev servers
- Leave servers in unknown state
- Skip verification steps
- Assume servers are running without checking

---

**Version:** 1.0
**Created:** 2024-12-30
**Purpose:** Ensure development servers are always running and verified
