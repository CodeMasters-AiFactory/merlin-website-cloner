# Session Startup Rules

## MANDATORY STARTUP SEQUENCE

Every time you start a new session, execute these steps IN ORDER:

---

## Step 1: Read Core Rules
```
Read MASTER RULES/01-CORE/IDENTITY.md
Read MASTER RULES/01-CORE/QUICK_COMMANDS.md
Read MASTER RULES/01-CORE/FROZEN_STACK.md
```

## Step 2: Check Progress Files
```
Read claude-progress.txt
Read feature_list.json
```

## Step 3: Check Chat History
```
Read the latest file in chat-history/
```

## Step 4: Verify Server Status
```powershell
cd "C:\CURSOR PROJECTS\StargatePortal"
curl http://localhost:5000/api/health
```

If not running:
```powershell
npm run dev
```
Wait up to 15s for 200 OK.

## Step 5: Report Status to User

Tell the user:
- What was the last thing worked on
- Current project status
- Any pending tasks
- Recommended next action

---

## Status Report Format

```
## SESSION START

**Last Session:** [Date/Topic]
**Server Status:** Running / Not Running
**Current Task:** [From feature_list.json]

### Recent Activity:
- [Last 3 things done]

### Pending:
- [Next 3 things to do]

### Recommended Action:
[What I suggest we do first]

Ready to work. What do you need?
```

---

## Critical Reminders

1. **Project Location**: `C:\CURSOR PROJECTS\StargatePortal` (NOT C:\StargatePortal)
2. **Azure URL**: https://stargate-linux.azurewebsites.net/
3. **Local URL**: http://localhost:5000
4. **Use PowerShell syntax**: semicolons (;) not && for command chaining
5. **Save chat history** at end of each session

---

## DO NOT

- Start coding without reading rules
- Assume you know the current state
- Make changes without checking what exists
- Forget to save chat history
- Skip the status check

---

## Quick Start (If Pressed for Time)

Minimum required:
1. `curl http://localhost:5000/api/health`
2. Read `claude-progress.txt`
3. Confirm rules: "0"

---

## Project Structure Reminder

```
C:\CURSOR PROJECTS\StargatePortal\
├── client/                 # React frontend (Vite + TypeScript)
├── server/                 # Express backend
│   └── engines/
│       └── merlin8/        # Merlin 8.0 AI Engine
├── public/
│   └── generated/          # Generated websites stored here
├── MASTER RULES/           # All rules (this folder)
├── chat-history/           # Session transcripts
└── claude-progress.txt     # Progress tracker
```

---

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/merlin8/industries` - List all industries
- `GET /api/merlin8/industry/:id` - Get industry DNA
- `POST /api/merlin8/generate` - Generate website (SSE)
- `POST /api/merlin8/generate-sync` - Generate website (JSON)
