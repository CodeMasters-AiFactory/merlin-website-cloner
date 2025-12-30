# CLAUDE.md - Mandatory Startup Instructions

**This file is automatically read by Claude Code on every session start.**

---

## IMMEDIATE ACTIONS (Do These First)

### 1. START SERVERS (MANDATORY)

```bash
cd "C:/Cursor Projects/Merlin Clone" && npm run dev
```

Run this in background. Both servers must be running:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5000

### 2. VERIFY SERVERS RUNNING

```bash
curl -s http://localhost:3000/api/health
```

If this fails, servers are not running. Start them before proceeding.

### 3. READ ALL MASTER RULES

Read these files in order:

```
MASTER RULES/01-CORE/IDENTITY.md
MASTER RULES/01-CORE/QUICK_COMMANDS.md
MASTER RULES/01-CORE/FROZEN_STACK.md
MASTER RULES/03-SESSION/STARTUP.md
```

### 4. CHECK PROJECT STATE

```
claude-progress.txt
```

### 5. REPORT STATUS

Tell the user:
```
## SESSION START

**Servers:** [Running/Not Running]
**Backend:** http://localhost:3000
**Frontend:** http://localhost:5000
**Last Session:** [What was done]

Ready to work. What do you need?
```

---

## QUICK COMMANDS

| Command | Action |
|---------|--------|
| **0** | Confirm rules loaded, ready to work |
| **2** | Run UI Deep Smoke Test |
| **3** | Check 120% feature implementation status |
| **TEST 1** | Run protection bypass tests (50 sites) |
| **TEST 2** | Run scale stress tests |
| **TEST 3** | Run app clone tests |
| **FIX** | Work through issues in test results |
| **UI** | Build dashboard components |
| **DOCS** | Generate documentation |
| **POLISH** | Follow CLAUDE_TESTING_ORDERS.md |

---

## PROJECT INFO

- **Name:** Merlin Website Cloner
- **Location:** `C:\Cursor Projects\Merlin Clone`
- **Stack:** Node.js + Express + React + TypeScript + SQLite
- **Frontend Port:** 5000 (LOCKED - never change)
- **Backend Port:** 3000

---

## RULES LOCATION

All rules are in: `MASTER RULES/`

See `MASTER RULES/MASTER_INDEX.md` for the complete index.

---

## DO NOT

- Start coding without servers running
- Change port 5000 (strictPort is locked)
- Skip reading the master rules
- Make changes without understanding existing code

---

## AUTHORITY

You have **FULL AUTONOMY** to:
- Install packages
- Create/modify/delete files
- Run any commands
- Make architectural decisions
- Fix issues without asking

Only escalate if:
- Cost > $100
- Irreversible actions
- Legal/security concerns

---

## TESTING & POLISH PROTOCOL

**Read this file for testing instructions:**
```
CLAUDE_TESTING_ORDERS.md
```

This contains:
- 50+ site protection bypass tests
- Scale testing (100+ sites)
- App clone verification
- UI polish requirements
- Documentation templates
- Performance benchmarks

**Goal: Take Merlin from 7.5/10 to 10/10**

---

*Last Updated: 2025-12-30*
