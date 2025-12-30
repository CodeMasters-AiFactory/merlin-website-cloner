# Session Startup Rules

## AUTOMATIC STARTUP SYSTEM

**Two automatic mechanisms ensure proper startup:**

1. **CLAUDE.md** - Automatically read by Claude Code on session start
2. **SessionStart Hook** - In `.claude/settings.local.json`, auto-checks/starts servers

---

## MANDATORY STARTUP SEQUENCE

Execute these steps IN ORDER (automatic or manual):

---

## Step 1: START SERVERS IMMEDIATELY

**THIS IS MANDATORY - DO THIS FIRST BEFORE ANYTHING ELSE**

```bash
cd "c:/Cursor Projects/Mirror Site" && npm run dev
```

Run in background. Wait for both servers to be ready:
- **Backend**: http://localhost:3000 (API)
- **Frontend**: http://localhost:5000 (UI)

Verify with:
```bash
curl -s http://localhost:3000/api/health
```

**DO NOT proceed until servers return 200 OK.**

---

## Step 2: Read ALL Master Rules

Read these files every session:
```
MASTER RULES/01-CORE/IDENTITY.md        - Who you are
MASTER RULES/01-CORE/QUICK_COMMANDS.md  - Commands 0, 2, 3
MASTER RULES/01-CORE/FROZEN_STACK.md    - Tech stack (LOCKED)
MASTER RULES/02-AUTONOMOUS/DECISION_MAKING.md - Autonomy rules
MASTER RULES/03-SESSION/STARTUP.md      - This file
MASTER RULES/04-PROJECT/CLONE_ENGINE.md - 120% features
```

## Step 3: Check Progress
```
claude-progress.txt
```

## Step 4: Report Status to User

Tell the user:
- Server status (MUST be running)
- What was the last thing worked on
- Current project status
- Any pending tasks
- Recommended next action

---

## Status Report Format

```
## SESSION START

**Server Status:** ✅ Running (Backend: 3000, Frontend: 5000)
**Last Session:** [Date/Topic]
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

## Server Configuration (LOCKED)

| Service | Port | URL | Config File |
|---------|------|-----|-------------|
| Backend API | 3000 | http://localhost:3000 | src/server/index.ts |
| Frontend UI | 5000 | http://localhost:5000 | frontend/vite.config.ts |

**Vite Config (LOCKED):**
```typescript
server: {
  port: 5000,
  strictPort: true,  // NEVER change port
  host: '0.0.0.0',   // Bind to all interfaces
}
```

---

## Critical Reminders

1. **Project Location**: `c:\Cursor Projects\Mirror Site`
2. **Frontend URL**: http://localhost:5000
3. **Backend API**: http://localhost:3000/api
4. **Start Command**: `npm run dev` (starts both servers)
5. **NEVER change port 5000** - strictPort is locked

---

## DO NOT

- Start coding without starting servers FIRST
- Change the frontend port from 5000
- Assume servers are running - ALWAYS verify
- Make changes without checking what exists
- Skip the status check

---

## Quick Start (If Pressed for Time)

Minimum required:
1. `npm run dev` (start servers)
2. Verify: `curl http://localhost:3000/api/health`
3. Confirm rules: "0"

---

## Project Structure

```
c:\Cursor Projects\Mirror Site\
├── frontend/               # React frontend (Vite + TypeScript)
│   └── vite.config.ts      # Port 5000, strictPort: true
├── src/
│   ├── server/             # Express backend (port 3000)
│   └── services/           # Clone engine services
├── MASTER RULES/           # All rules (this folder)
├── chat-history/           # Session transcripts
├── data/                   # SQLite database, learning data
└── start-dev.js            # Combined dev server starter
```

---

## API Endpoints

- `GET /api/health` - Server health check
- `POST /api/clone` - Start a clone job
- `GET /api/clone/:id` - Get clone status
- `GET /api/jobs` - List all clone jobs
- `POST /api/auth/login` - User login

---

## Troubleshooting

### Frontend not responding on localhost:5000
1. Check if bound to IPv6 only: `netstat -ano | findstr :5000`
2. If `[::1]:5000` - need `host: '0.0.0.0'` in vite.config.ts
3. Restart with `npm run dev`

### Port already in use
1. Kill the process: `taskkill /F /PID <pid>`
2. Or: `npx kill-port 5000 3000`
3. Restart: `npm run dev`
