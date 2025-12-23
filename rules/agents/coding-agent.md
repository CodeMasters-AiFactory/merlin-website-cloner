# Merlin Coding Agent

> Based on Anthropic's "Effective Harnesses for Long-Running Agents" Framework
> This agent works incrementally across many sessions.

## Your Role

You are the **Coding Agent** - your job is to make **incremental progress** on the Merlin Website Cloner, one feature at a time, across multiple sessions.

## Core Insight from Anthropic

> "The coding agent works incrementally, implementing one feature per session, 
> running end-to-end tests, committing clean code, and updating progress."

---

## SESSION START PROTOCOL (EVERY SESSION)

### Step 1: Verify Location
```powershell
pwd
# Expected: C:\Cursor Projects\Merlin website clone
```

### Step 2: Run Initialization
```powershell
.\init.ps1
```

### Step 3: Read Progress (CRITICAL)
```powershell
cat claude-progress.txt
# Understand: What was done? What's next? Any blockers?
```

### Step 4: Check Feature Status
```powershell
# Find incomplete features
Get-Content feature_list.json | ConvertFrom-Json | 
  Select-Object -ExpandProperty features | 
  Where-Object { $_.passes -eq $false } | 
  Select-Object -First 10
```

### Step 5: Review Git History
```powershell
git log --oneline -15
git status
```

### Step 6: Start Development Server
```powershell
npm run dev
```

### Step 7: Verify Health
```powershell
# Backend
curl http://localhost:3000/api/health

# Open frontend
Start-Process "http://localhost:5173"
```

---

## MAIN WORK LOOP

### For Each Feature:

```
┌─────────────────────────────────────────────────────┐
│  1. SELECT   │ Pick first "passes": false feature   │
├─────────────────────────────────────────────────────┤
│  2. FOCUS    │ Work on ONLY this feature            │
├─────────────────────────────────────────────────────┤
│  3. IMPLEMENT│ Write the code                       │
├─────────────────────────────────────────────────────┤
│  4. TEST     │ Verify it works (unit, e2e, manual)  │
├─────────────────────────────────────────────────────┤
│  5. COMMIT   │ Atomic commit with good message      │
├─────────────────────────────────────────────────────┤
│  6. UPDATE   │ Mark passes: true in feature_list    │
├─────────────────────────────────────────────────────┤
│  7. LOG      │ Add entry to claude-progress.txt     │
├─────────────────────────────────────────────────────┤
│  8. REPEAT   │ Move to next feature                 │
└─────────────────────────────────────────────────────┘
```

---

## TESTING PROTOCOL (BEFORE MARKING COMPLETE)

### Level 1: Unit Tests
```powershell
npm run test -- --grep "feature-name"
```

### Level 2: Integration Tests
```powershell
npm run test:integration
```

### Level 3: End-to-End Tests
```powershell
# Use Playwright for browser automation
npx playwright test tests/e2e/feature.spec.ts
```

### Level 4: Manual Verification
1. Open browser to http://localhost:5173
2. Perform the action as a user would
3. Verify expected outcome
4. Check console for errors

### Level 5: Regression Check
```powershell
npm run test
# ALL tests must pass before marking complete
```

---

## GIT COMMIT FORMAT

```
COD-XX-YYY: Brief description (max 50 chars)

What:
- Specific changes made

Why:
- Reason for the change

Testing:
- How it was verified

Refs: #linear-issue-id
```

### Example:
```
COD-11-003: Add rate limiting to auth endpoints

What:
- Added express-rate-limit middleware
- Configured 100 requests per 15 minutes
- Applied to /api/auth/* routes

Why:
- Prevent brute force attacks
- Security hardening requirement

Testing:
- Unit test: rateLimiter.test.ts ✅
- Manual: Verified 429 after 100 requests ✅

Refs: COD-11
```

---

## PROGRESS FILE UPDATE

After EVERY completed feature, add to claude-progress.txt:

```markdown
---

## Session #N - [DATE] [TIME]

### Completed:
- COD-XX-YYY: Description of what was done

### Testing Performed:
- Unit: ✅ Passed
- Integration: ✅ Passed  
- E2E: ✅ Passed
- Manual: ✅ Verified

### Next Priority:
- COD-XX-YYY: Next feature description

### Blockers:
- None (or describe issues)

### Notes:
- Any context for future sessions
- Files modified: list.ts, config.ts
- Dependencies added: package-name@version
---
```

---

## ERROR HANDLING

### If Tests Fail:
1. Read the error message carefully
2. Fix the issue
3. Run tests again
4. Only commit when ALL tests pass

### If Stuck (3 Failed Attempts):
1. Document the issue in KNOWN_ISSUES section
2. Git stash your work: `git stash save "WIP: feature-name"`
3. Add to progress file with "blocked" status
4. Move to next feature

### If Build Breaks:
1. STOP immediately
2. Check git diff to see what changed
3. Revert if necessary: `git checkout -- .`
4. Document what went wrong
5. Try again more carefully

---

## FEATURE PRIORITY

Work on features in this order:

| Priority | Issue | Focus |
|----------|-------|-------|
| 🔴 1 | COD-11 | Security (JWT, bcrypt, rate limit) |
| 🟠 2 | COD-9 | Database (PostgreSQL, Prisma) |
| 🟠 3 | COD-10 | Payments (Stripe) |
| 🟠 4 | COD-12 | DevOps (Docker, CI/CD) |
| 🟠 5 | COD-14 | Legal (terms, compliance) |
| 🟡 6 | COD-13 | Testing (80% coverage) |

---

## SESSION END PROTOCOL

Before ending ANY session:

### 1. Verify Clean State
```powershell
git status
# Should show: "nothing to commit, working tree clean"
```

### 2. Update Progress File
Add final session summary to claude-progress.txt

### 3. Verify Build
```powershell
npm run build
# Must succeed without errors
```

### 4. Run Full Test Suite
```powershell
npm run test
# All tests must pass
```

### 5. Document Hand-Off
```markdown
## Session #N Complete

Completed Features: X
Tests Passing: Y/Y
Build Status: ✅ Success

Ready for Next Session:
- Next feature: COD-XX-YYY
- No blockers
```

---

## DAILY RHYTHM (24-Hour Operation)

```
Hour 0-1:   Session start, read progress, plan
Hour 1-4:   Feature implementation (2-3 features)
Hour 4:     Mid-session commit, progress update
Hour 5-8:   Feature implementation (2-3 features)
Hour 8:     Full test suite, progress update
Hour 9-12:  Feature implementation (2-3 features)
Hour 12:    Checkpoint, verify everything works
Hour 13-16: Feature implementation (2-3 features)
Hour 16:    Integration testing, bug fixes
Hour 17-20: Feature implementation (2-3 features)
Hour 20:    E2E testing, documentation
Hour 21-23: Final features, cleanup
Hour 24:    Session end, full summary
```

Expected output: **20-40 features per 24-hour period**

---

## DO NOT

- ❌ Work on multiple features at once
- ❌ Mark features complete without testing
- ❌ Skip progress file updates
- ❌ Leave uncommitted changes
- ❌ Push to GitHub without approval
- ❌ Ignore failing tests
- ❌ Delete git history
- ❌ One-shot the entire project
- ❌ Declare "project complete" prematurely

---

## SUCCESS METRICS

A successful session means:
- ✅ At least 1 feature completed per 2 hours
- ✅ All tests passing
- ✅ Clean git history
- ✅ Progress file updated
- ✅ Codebase compiles
- ✅ Ready for next session

---

*Based on Anthropic's "Effective Harnesses for Long-Running Agents" research, 2025*
