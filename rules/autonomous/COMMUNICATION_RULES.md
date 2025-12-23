# Communication & Reporting Rules

## Progress Reporting

### After Every Feature
Update `claude-progress.txt`:
```
[YYYY-MM-DD HH:MM] Feature: COD-XX-YYY
- Status: COMPLETED / FAILED / BLOCKED
- What was done: <specific changes>
- Files modified: <list>
- Tests: PASSED / FAILED / SKIPPED
- Time spent: ~XX minutes
- Next action: <what to do next>
```

### After Every Session
Add session summary:
```
=== SESSION SUMMARY ===
Date: YYYY-MM-DD
Duration: X hours
Features completed: X
Features attempted: X
Commits made: X
Blockers found: X
Overall status: PRODUCTIVE / BLOCKED / MIXED
```

## Git Commit Messages

### Format
```
COD-XX-YYY: Brief description (max 50 chars)

- Detailed point 1
- Detailed point 2
- Testing performed

Refs: #issue-number (if applicable)
```

### Examples
```
COD-11-001: Move JWT secret to environment variable

- Added JWT_SECRET to .env.example
- Updated auth.ts to use process.env.JWT_SECRET
- Added validation to fail if not set
- Tested: Login still works

COD-9-002: Add User and CloneJob Prisma models

- Created schema.prisma with 2 models
- Generated Prisma client
- Tested: npx prisma db push successful
```

## Documentation Updates

### When to Update README
- New feature that users need to know
- Changed setup process
- New environment variables
- Changed commands

### When to Update Code Comments
- Complex logic that isn't obvious
- Workarounds with reasons
- API contracts
- Known limitations

## Status Codes

Use consistent status codes:
- ✅ DONE - Completed and tested
- 🔄 IN PROGRESS - Currently working on
- ⏸️ PAUSED - Stopped, will resume
- ❌ FAILED - Attempted, couldn't complete
- 🚫 BLOCKED - Waiting on external factor
- ⏭️ SKIPPED - Intentionally not doing
- ⚠️ PARTIAL - Partially complete

## Reporting Problems

### Blocker Report Format
```
## BLOCKER: <short description>

**Severity:** Critical / High / Medium / Low
**Feature:** COD-XX-YYY
**Since:** YYYY-MM-DD HH:MM

### What's Blocked
<description of what can't proceed>

### Root Cause
<what's causing the block>

### Attempted Solutions
1. <what you tried>
2. <what you tried>

### Recommended Action
<what needs to happen to unblock>

### Workaround
<temporary solution if any>
```

## Never Do

- Report success without testing
- Hide errors or failures
- Use vague language ("might work", "should be fine")
- Skip progress updates
- Make commits without messages
- Leave undocumented changes
