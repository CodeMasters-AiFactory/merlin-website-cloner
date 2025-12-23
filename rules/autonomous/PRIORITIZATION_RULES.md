# Prioritization Rules

## Priority Framework

### Priority Levels

| Level | Name | Description | Response Time |
|-------|------|-------------|---------------|
| P0 | Critical | System down, security breach | Immediate |
| P1 | Urgent | Major feature broken | Within 1 hour |
| P2 | High | Important feature needed | Within 4 hours |
| P3 | Medium | Normal feature work | Within 1 day |
| P4 | Low | Nice to have | When time permits |

## Project Priority Order

### By Linear Issue (Follow This Order)
1. **COD-11** - Security (URGENT) - P1
2. **COD-9** - Database/PostgreSQL - P2
3. **COD-10** - Stripe Payments - P2
4. **COD-12** - Docker/CI/CD - P2
5. **COD-14** - Legal Compliance - P2
6. **COD-13** - Test Coverage - P3
7. **COD-28** - World Domination Features - P3
8. **COD-33** - Integration Testing - P3

### Within Each Issue
- Follow `feature_list.json` order
- Complete sub-features sequentially
- Don't skip ahead

## Decision Matrix

### What to Work On Next

```
1. Is there a P0/P1 issue?
   YES → Work on that immediately
   NO  → Continue

2. Is current feature incomplete?
   YES → Finish it first
   NO  → Continue

3. Are there failing tests?
   YES → Fix them first
   NO  → Continue

4. Pick next item from feature_list.json with passes: false
   - Follow COD-XX priority order
   - Start with first incomplete item
```

## Interruption Handling

### When to Stop Current Work
- Security vulnerability discovered
- Production system down
- User explicitly requests
- Blocker found that prevents progress

### When NOT to Stop
- New feature request (add to backlog)
- Minor bug unrelated to current work
- Nice-to-have improvements
- Refactoring ideas

## Time Boxing

| Task Type | Max Time | Action if Exceeded |
|-----------|----------|-------------------|
| Bug fix | 2 hours | Escalate |
| Feature | 4 hours | Break into smaller tasks |
| Investigation | 1 hour | Document findings, decide |
| Testing | 30 min per feature | Note flaky tests |

## Stuck Protocol

If stuck on a task for > 30 minutes:

```
1. Document what you've tried
2. Note the specific blocker
3. Check if you can work around it
4. If yes → implement workaround, document
5. If no → mark as BLOCKED, move to next task
6. Review blocked items at session end
```

## Daily Prioritization

At session start:
1. Check for P0/P1 issues
2. Review blocked items
3. Check test status
4. Review progress against goals
5. Plan session work (max 3-5 items)
6. Start with highest priority incomplete item

## Trade-off Decisions

| Scenario | Decision |
|----------|----------|
| Speed vs Quality | Quality |
| Feature vs Bug | Bug fix |
| New vs Test | Add test |
| Code vs Docs | Code (unless blocking others) |
| Perfect vs Done | Done (if meets requirements) |
