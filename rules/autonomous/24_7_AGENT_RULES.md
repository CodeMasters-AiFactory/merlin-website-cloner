# 24/7 Autonomous Agent Rules

## Based on: Anthropic's "Effective Harnesses for Long-Running Agents" Framework

> **Source:** https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
> 
> "The core challenge of long-running agents is that they must work in discrete sessions, 
> and each new session begins with no memory of what came before."

---

## The Problem This Solves

Agents struggle to maintain progress across multiple context windows because:
1. Each new session starts with **NO MEMORY** of prior work
2. Agents tend to "one-shot" - trying to do everything at once
3. Agents prematurely mark projects as "complete"
4. Without structure, agents lose track of what's been done

---

## The Anthropic Solution: Two-Agent Architecture

### Agent 1: INITIALIZER AGENT
Sets up the environment ONCE at project start:
- Creates git repository
- Creates init scripts
- Creates comprehensive feature_list.json (200+ requirements)
- Creates claude-progress.txt for session handoffs
- Establishes the foundation for all future sessions

### Agent 2: CODING AGENT
Works incrementally, session after session:
- Reads progress from claude-progress.txt
- Picks ONE feature from feature_list.json
- Implements the feature completely
- Tests the feature (end-to-end)
- Commits clean code
- Updates progress file
- Hands off to next session

---

## Key Files (The Agent's External Memory)

```
📁 Merlin Website Clone
├── init.ps1                    ← Environment startup script
├── claude-progress.txt         ← Session handoff log (CRITICAL)
├── feature_list.json           ← All features with pass/fail status
├── .git/                       ← Git history = audit trail
└── rules/
    └── autonomous/
        └── 24_7_AGENT_RULES.md ← This file
```

### 1. claude-progress.txt (MOST IMPORTANT)
```markdown
# Claude Progress Log

## Session #1 - 2024-12-23 08:00
### Completed:
- COD-11-001: Replaced hardcoded JWT secret with environment variable
- COD-11-002: Added bcrypt for password hashing

### Next Priority:
- COD-11-003: Add rate limiting to auth endpoints

### Blockers:
- None

### Notes:
- JWT now reads from process.env.JWT_SECRET
- Password salt rounds set to 12
---

## Session #2 - 2024-12-23 10:00
### Completed:
- COD-11-003: Added rate limiting (100 req/15min)

### Next Priority:
- COD-11-004: Add input validation

### Blockers:
- Need to install express-validator

### Notes:
- Using express-rate-limit package
- Config in src/middleware/rateLimiter.ts
---
```

### 2. feature_list.json (200+ Requirements)
```json
{
  "project": "Merlin Website Cloner",
  "version": "2.0.0",
  "features": [
    {
      "id": "COD-11-001",
      "category": "Security",
      "description": "JWT secret from environment variable",
      "passes": true,
      "testedAt": "2024-12-23T08:30:00Z"
    },
    {
      "id": "COD-11-002", 
      "category": "Security",
      "description": "Password hashing with bcrypt",
      "passes": true,
      "testedAt": "2024-12-23T09:15:00Z"
    },
    {
      "id": "COD-11-003",
      "category": "Security",
      "description": "Rate limiting on auth endpoints",
      "passes": false,
      "testedAt": null
    }
  ]
}
```

---

## Session Protocol (FOLLOW EXACTLY)

### SESSION START (Every Single Time)
```powershell
# 1. Verify correct directory
pwd

# 2. Run initialization script
.\init.ps1

# 3. Read progress file (CRITICAL - understand what came before)
cat claude-progress.txt

# 4. Check feature status
cat feature_list.json | Select-String '"passes": false' | Select-Object -First 5

# 5. Review recent git history
git log --oneline -20

# 6. Check for any uncommitted changes
git status

# 7. Start development servers
npm run dev

# 8. Verify health
curl http://localhost:3000/api/health
```

### DURING SESSION (Incremental Progress)
1. **SELECT** - Pick the FIRST incomplete feature (passes: false)
2. **FOCUS** - Work on ONLY this one feature
3. **IMPLEMENT** - Write the code
4. **TEST** - Verify it works (run tests, manual check, browser test)
5. **COMMIT** - Git commit with descriptive message
6. **UPDATE** - Mark feature as passes: true in feature_list.json
7. **LOG** - Add entry to claude-progress.txt
8. **REPEAT** - Move to next feature

### SESSION END
```powershell
# 1. Ensure all changes committed
git status  # Should show "nothing to commit"

# 2. Update progress file with session summary
# Add: What was completed, what's next, any blockers

# 3. Verify codebase is clean
npm run build  # Should succeed

# 4. Leave helpful notes for next session
```

---

## Testing Protocol (CRITICAL)

**From Anthropic's research:**
> "Initial experiments showed that code-only testing wasn't enough. 
> Agents sometimes declared features complete without verifying them in a real-world environment."

### Before Marking ANYTHING as passes: true:

1. **Unit Test** - Run relevant test suite
   ```powershell
   npm run test -- --grep "feature-name"
   ```

2. **Integration Test** - Test with real data
   ```powershell
   npm run test:integration
   ```

3. **End-to-End Test** - Use Playwright/browser automation
   ```powershell
   npx playwright test tests/e2e/feature.spec.ts
   ```

4. **Manual Verification** - Check it actually works
   - Open browser to localhost
   - Perform the action as a user would
   - Verify expected outcome

5. **Regression Check** - Ensure nothing broke
   ```powershell
   npm run test
   ```

---

## Error Handling & Recovery

### If Something Breaks:
1. **DON'T PANIC** - Document the issue
2. **Git Stash** - Save work in progress
   ```powershell
   git stash save "WIP: feature-name"
   ```
3. **Document** - Add to KNOWN_ISSUES section in progress file
4. **Move On** - Skip to next feature if stuck after 3 attempts
5. **Flag** - Mark feature with "blocked": true in feature_list.json

### If You Get Stuck:
```markdown
## BLOCKED ITEM
Feature: COD-11-003
Reason: express-validator not installing correctly
Attempted: npm install, npm cache clean, remove node_modules
Next: Requires human intervention to debug npm
```

---

## Git Commit Standards

### Format:
```
COD-XX-YYY: Brief description (max 50 chars)

- What was changed
- Why it was changed  
- How it was tested

Tested: [unit/integration/e2e/manual]
```

### Examples:
```
COD-11-001: Replace hardcoded JWT secret

- Moved JWT_SECRET to .env file
- Updated auth.ts to read from process.env
- Added .env.example with placeholder

Tested: unit, manual (login flow works)
```

```
COD-09-005: Add user model with Prisma

- Created User schema in prisma/schema.prisma
- Added email uniqueness constraint
- Added password field (hashed)
- Created migration

Tested: integration, prisma studio
```

---

## Progress File Rules

### ALWAYS Include:
1. **Timestamp** - When session started/ended
2. **Session Number** - Sequential count
3. **Completed** - List of features finished
4. **Next Priority** - What should be worked on next
5. **Blockers** - Anything preventing progress
6. **Notes** - Context for future sessions

### Update Frequency:
- After EVERY completed feature
- When encountering blockers
- At session end (summary)

---

## Priority Order for Merlin

Based on Linear issues:

| Priority | Issue | Description | Status |
|----------|-------|-------------|--------|
| 🔴 1 | COD-11 | Security hardening | In Progress |
| 🟠 2 | COD-9 | PostgreSQL + Prisma | Backlog |
| 🟠 3 | COD-10 | Stripe payments | Backlog |
| 🟠 4 | COD-12 | Docker + CI/CD | Backlog |
| 🟠 5 | COD-14 | Legal compliance | Backlog |
| 🟡 6 | COD-13 | Test coverage 80%+ | Backlog |

---

## What Success Looks Like

After a successful 24-hour agent run:
- ✅ 20-50 features completed
- ✅ All features tested and verified
- ✅ Clean git history with atomic commits
- ✅ claude-progress.txt fully updated
- ✅ feature_list.json shows progress
- ✅ Codebase compiles and runs
- ✅ All tests pass
- ✅ Ready for human review

---

## Anti-Patterns to AVOID

### ❌ One-Shotting
Don't try to implement everything at once. Work incrementally.

### ❌ Premature Completion
Don't mark passes: true without actually testing.

### ❌ Skipping Progress Updates
Every action should be logged for the next session.

### ❌ Messy Commits
Atomic commits. One feature = one commit.

### ❌ Ignoring Failures
Document failures. Don't hide them.

### ❌ Working on Multiple Features
Focus on ONE feature at a time until complete.

---

## Integration with Linear

- Project: https://linear.app/code-masters/project/merlin-website-cloner-0102a6dc2777
- Update Linear status when completing major milestones
- Use Linear issue IDs in commit messages (COD-XX)
- Keep feature_list.json and Linear in sync

---

## Quick Reference

```
START SESSION:
  pwd → .\init.ps1 → cat claude-progress.txt → git log -10 → npm run dev

DO WORK:
  Pick feature → Implement → Test → Commit → Update progress → Repeat

END SESSION:
  git status (clean) → Update progress → npm run build (verify)
```

---

## Health Checks

```powershell
# Backend
curl http://localhost:3000/api/health

# Frontend
Start-Process "http://localhost:5173"

# Database (if PostgreSQL active)
npx prisma studio

# Tests
npm run test

# Build
npm run build
```

---

## DO NOT

- ❌ Push to GitHub without explicit human approval
- ❌ Mark features complete without testing
- ❌ Skip the progress file update
- ❌ Leave the codebase in broken state
- ❌ Work on multiple features simultaneously
- ❌ Ignore failing tests
- ❌ Delete or overwrite progress history

---

*Based on Anthropic's "Effective Harnesses for Long-Running Agents" research, 2025*
