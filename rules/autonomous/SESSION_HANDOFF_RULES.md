# Session Handoff Rules

## Handoff Principles

### Every Session Must End With
1. All work committed to Git
2. Progress file updated
3. Clear state documentation
4. No broken builds
5. Next steps identified

### Every Session Must Start With
1. Read previous session notes
2. Check system state
3. Verify services running
4. Review pending tasks
5. Plan session work

## Progress File Format

### Location
`claude-progress.txt` in project root

### Structure
```
==============================================
SESSION HANDOFF NOTES
Last Updated: YYYY-MM-DD HH:MM
Session #: X
==============================================

## CURRENT STATE
- Branch: feature/COD-XX
- Services: Running/Stopped
- Tests: Passing/Failing
- Build: Clean/Broken

## COMPLETED THIS SESSION
- [x] COD-XX-001: Description
- [x] COD-XX-002: Description

## IN PROGRESS
- [ ] COD-XX-003: Description
  - Status: 50% complete
  - Blocker: None
  - Notes: Working on X component

## BLOCKERS
- None / List blockers

## NEXT SESSION SHOULD
1. Complete COD-XX-003
2. Start COD-YY-001
3. Run full test suite

## IMPORTANT NOTES
- Any warnings or gotchas
- Environment changes made
- Dependencies added

## GIT STATUS
Last commit: abc1234 "COD-XX-002: Feature description"
Uncommitted changes: None / List files
```

## State Documentation

### Document Changes To
- Environment variables (new/changed)
- Dependencies (added/removed/updated)
- Database schema
- API endpoints
- Configuration files
- File structure

### Format
```markdown
## CHANGES THIS SESSION

### Environment Variables
- Added: STRIPE_API_KEY (required for payments)
- Changed: DATABASE_URL format

### Dependencies
- Added: stripe@14.0.0
- Updated: prisma 5.6 -> 5.7

### Database
- New table: Payment
- New column: User.stripeCustomerId

### API
- New endpoint: POST /api/payments/checkout
```

## Quick Status Check

### Commands to Run
```bash
# Git status
git status
git log --oneline -5

# Service status
curl http://localhost:3000/api/health
curl http://localhost:5000

# Test status
npm run test -- --passWithNoTests

# Build status
npm run build
```

### Document Results
```
## SYSTEM CHECK
- Git: Clean, on branch feature/COD-11
- Backend: Running on :3000
- Frontend: Running on :5000
- Tests: 45 passing, 0 failing
- Build: Successful
```

## Handoff Checklist

### Before Ending Session
- [ ] All changes committed
- [ ] Tests passing (or failures documented)
- [ ] Services in clean state
- [ ] Progress file updated
- [ ] Blockers documented
- [ ] Next steps listed
- [ ] No temp files left
- [ ] No debug code left

### When Starting Session
- [ ] Read progress file
- [ ] Check Git status
- [ ] Pull latest changes
- [ ] Run init.ps1
- [ ] Start services
- [ ] Verify health
- [ ] Review pending work
- [ ] Plan session

## Critical Information

### Always Document
- Breaking changes
- Security concerns
- Performance issues
- Failed approaches (don't repeat)
- Workarounds in place
- Technical debt added

### Flag for Human
```markdown
## ⚠️ NEEDS HUMAN ATTENTION

### Issue: [Brief description]
**Priority:** High/Medium/Low
**Reason:** Why human needs to decide

### Context
What happened, what was tried

### Options
1. Option A - pros/cons
2. Option B - pros/cons

### Recommendation
What I suggest and why
```

## Session Continuity

### Maintain Context
- Project goals and priorities
- User preferences
- Previous decisions and rationale
- Known issues and workarounds
- Architecture patterns used

### Update Memory When
- User gives new preference
- Architecture decision made
- New pattern established
- Important context learned

## Emergency Handoff

### If Session Ends Abruptly
Create minimal handoff note:
```
EMERGENCY HANDOFF - [timestamp]
Last action: [what was being done]
State: [working/broken]
Files modified: [list]
MUST DO FIRST: [urgent action]
```
