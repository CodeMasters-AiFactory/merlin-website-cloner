# 24/7 Autonomous Agent Rules

## Overview
Rules for running Claude as a 24-hour autonomous coding agent on the Merlin Website Cloner project.

## Core Principles

1. **Self-Directed Work** - Pick tasks from feature_list.json automatically
2. **Progress Tracking** - Update claude-progress.txt after EVERY task
3. **Git Discipline** - Commit after EVERY completed feature
4. **Error Recovery** - If stuck, document and move to next task
5. **No Human Intervention** - Work continuously without waiting for approval

## Session Lifecycle

### Session Start
```bash
1. pwd                              # Verify directory
2. .\init.ps1                       # Check environment  
3. cat claude-progress.txt          # See previous work
4. cat feature_list.json            # See feature status
5. git log --oneline -10            # Recent commits
6. npm run dev                      # Start servers
7. Verify both ports (3000, 5000)   # Health check
```

### During Session
1. Find first `"passes": false` feature in priority order
2. Implement the feature completely
3. Test the feature - verify it works
4. Mark `"passes": true` in feature_list.json ONLY if tested
5. Git commit with descriptive message
6. Update claude-progress.txt
7. Move to next feature

### Session End
1. Ensure all changes committed
2. Update claude-progress.txt with summary
3. Leave codebase in clean, working state
4. Document any blockers

## Priority Order
1. **COD-11** (URGENT) - Security features
2. **COD-9** (HIGH) - Database/PostgreSQL
3. **COD-10** (HIGH) - Stripe payments
4. **COD-12** (HIGH) - Docker/CI/CD
5. **COD-14** (HIGH) - Legal compliance
6. **COD-13** (MEDIUM) - Test coverage

## Error Handling
- If feature fails after 3 attempts, document in KNOWN_ISSUES
- Move to next feature, don't get stuck
- Log all errors with timestamps
- Never hide failures - be honest

## Git Commit Format
```
COD-XX-YYY: Brief description

- What was changed
- Why it was changed
- Testing performed
```

## Progress File Format
```
[YYYY-MM-DD HH:MM] Session #N
- Completed: COD-XX-YYY description
- Status: Feature tested and working
- Next: COD-XX-YYY description
- Blockers: None / List any issues
```

## Health Checks
- Backend: `curl http://localhost:3000/api/health`
- Frontend: Check http://localhost:5000 loads
- Database: `npx prisma studio` (if PostgreSQL active)

## DO NOT
- Push to GitHub without explicit approval
- Mark features complete without testing
- Skip the progress file update
- Leave the codebase in broken state
- Work on multiple features simultaneously

## Linear Integration
- Project URL: https://linear.app/code-masters/project/merlin-website-cloner-0102a6dc2777
- Update Linear issues when completing major milestones
- Keep Linear and local feature_list.json in sync
