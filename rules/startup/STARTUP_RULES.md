# Startup Rules for Cursor AI

## 🚨 CLAUDE: READ THIS FIRST

**BEFORE doing ANYTHING else, read these files in order:**

1. `MERLIN-WISHES/CLAUDE-MERLIN-STARTUP.md` - Your personal startup notes
2. `MERLIN-WISHES/COLLABORATION_LOG.md` - Recent session context
3. `MERLIN-WISHES/MY_BLUEPRINT.md` - Your goals and tasks

The MERLIN-WISHES folder is YOUR space. It contains context that persists across sessions.

---

These rules are adapted from the StargatePortal project but modified for this standalone website cloner project.

## Core Principles

1. **Maximum Autonomy** - Execute without asking permission
2. **Strict Honesty** - Never lie, never deceive, always tell the truth
3. **Zero Fluff** - Get to the point, no unnecessary explanations
4. **Senior Engineer Precision** - Build production-grade code

## Workflow

**Core Workflow:** Interpret → Plan → Execute → Verify → Report

- Never give fake progress
- Never hide uncertainty
- If you break something, you fix it
- Test everything before claiming it works

## Phased Work (MANDATORY)

All work MUST be organized into PHASES and STEPS:

```
PHASE 1: [Name]
  Step 1.1: [Description]
  Step 1.2: [Description]
  ...

PHASE 2: [Name]
  Step 2.1: [Description]
  ...
```

**Rules:**
- Complete Phase 1 before starting Phase 2
- Verify each phase before moving to next
- Report progress by phase and step
- Use TODO lists for complex tasks

## Verification (MANDATORY)

**NEVER claim something works without verifying:**

1. Test in actual browser/scraper
2. Check for errors
3. Verify functionality works
4. Report what you actually saw

**NEVER assume** - Always verify execution paths, API calls, etc.

## Autonomy Rules

**Execute without asking:**
- Code edits
- Running commands
- Installing dependencies
- Fixing bugs you introduced
- Restarting services

**Ask confirmation for:**
- Destructive actions (deleting data)
- Changing core architecture

## Automatic Startup (MANDATORY)

**CRITICAL RULE: When starting the project, ALL services MUST start automatically**

1. **Backend server** (port 3000) - Express API
2. **Frontend dev server** (port 5173) - Vite React app

**Implementation:**
- `npm run dev` starts BOTH services simultaneously using concurrently
- Backend runs on port 3000
- Frontend runs on port 5173
- Both services must start in parallel
- Never start only one service - always start both
- If a service fails, automatically attempt restart
- Verify both services are running before reporting success

**Commands:**
- `npm run dev` - Starts both backend and frontend (USE THIS)
- `npm run dev:backend` - Backend only (for debugging)
- `npm run dev:frontend` - Frontend only (for debugging)

**Rule:** When user runs `npm run dev` or starts the project, both backend AND frontend must start automatically without any manual steps.

## Technical Stack

- **Backend:** Node.js + Express + TypeScript
- **Scraping:** Puppeteer (or Nodriver/Camoufox)
- **Database:** PostgreSQL (optional, can use file storage)
- **Frontend:** React + Vite + TailwindCSS (for admin UI)

## Code Quality

- Production-grade code only
- Comprehensive error handling
- Proper logging
- TypeScript strict mode
- No shortcuts, no hacks

## Documentation

- Document all major decisions
- Explain why, not just what
- Keep README updated
- Comment complex logic

---

**Remember: We're building a commercial product. Quality matters. No compromises.**

