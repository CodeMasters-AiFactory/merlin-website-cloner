# 📋 BLUEPRINT UPDATE RULES

## Purpose
Ensure the Master Blueprint stays LIVE and ACCURATE as the project evolves.

---

## MANDATORY Updates

Claude MUST update the blueprint in these situations:

### 1. After Completing Any Feature
```
Files to update:
- PROGRESS_TRACKER.md (progress %, today's activity)
- VERIFICATION_LOG.md (mark as executed)
- Relevant PHASE_X_*.md (mark step complete)
- MASTER_INDEX.md (update dashboard if milestone)
```

### 2. After Testing Any Feature
```
Files to update:
- VERIFICATION_LOG.md (mark as tested)
- TEST_RESULTS.md (add test result)
- Relevant PHASE_X_*.md (mark tested column)
```

### 3. At Start of Each Session
```
Files to read:
- MASTER_INDEX.md
- PROGRESS_TRACKER.md
- CURRENT_SESSION.md (from chat-history)
- GAPS_AND_RISKS.md

Files to update:
- PROGRESS_TRACKER.md (new day entry if needed)
```

### 4. At End of Each Session
```
Files to update:
- PROGRESS_TRACKER.md (final status)
- VERIFICATION_LOG.md (any new completions)
- chat-history/CURRENT_SESSION.md
- chat-history/session file (if checkpointing)
```

### 5. When Discovering New Gap/Risk
```
Files to update:
- GAPS_AND_RISKS.md (add new item)
- MASTER_INDEX.md (if critical)
```

### 6. When Making Architecture Decision
```
Files to update:
- HISTORY.md (add decision)
- Relevant PHASE file (if affects steps)
```

---

## Update Frequency

| Event | Update Immediately | Update End of Session |
|-------|-------------------|----------------------|
| Feature complete | ✅ | - |
| Test pass/fail | ✅ | - |
| New gap identified | ✅ | - |
| Session start | ✅ | - |
| Session end | - | ✅ |
| Checkpoint/breakpoint | ✅ | - |

---

## How to Update Each File

### MASTER_INDEX.md
```markdown
Update the dashboard:
- Overall Progress percentage
- Current Phase indicator
- Features Complete count
- Quick start section
```

### PROGRESS_TRACKER.md
```markdown
Update:
- Phase progress bars
- Feature statistics
- Today's Progress table
- Next 5 Tasks list
- Weekly progress chart
```

### VERIFICATION_LOG.md
```markdown
For each completed feature, update:
- Executed column: ✅ MM/DD
- Verified column: ✅ MM/DD (after code review)
- Tested column: ✅ MM/DD (after tests pass)
- Production column: 🚀 (when deployed)
```

### TEST_RESULTS.md
```markdown
After running tests:
- Update summary dashboard counts
- Add to "Latest Test Run" section
- Add entry in Test History
- Update individual test status
```

### HISTORY.md
```markdown
After significant events:
- Add to Timeline (with date and time)
- Add key decisions to table
- Update milestones status
- Add lessons learned
```

### GAPS_AND_RISKS.md
```markdown
When identifying issues:
- Add to appropriate section
- Assign priority (🔴/🟠/🟡)
- Define mitigation strategy
- Update closure tracking table
```

### PHASE_X_*.md files
```markdown
After completing a step:
- Mark Executed column: ✅ YYYY-MM-DD
- Mark Verified column: ✅ YYYY-MM-DD
- Mark Tested column: ✅ YYYY-MM-DD
- Add notes if relevant
- Update Progress summary at bottom
```

---

## Status Symbols

| Symbol | Meaning |
|--------|---------|
| ⬚ | Not started |
| ⏳ | In progress |
| ✅ | Complete |
| 🔨 | Executed (code written) |
| 👁️ | Verified (reviewed) |
| 🧪 | Tested |
| 🚀 | Production ready |
| 🔴 | Critical/Urgent |
| 🟠 | High priority |
| 🟡 | Medium priority |
| 🟢 | Low priority |

---

## Automation Triggers

Claude should automatically update when saying:
- "I've completed..."
- "Feature X is done..."
- "Tests are passing..."
- "I found an issue..."
- "Let me checkpoint..."
- "Session ending..."

---

## Example Update Workflow

### After completing COD-11-001:

1. **PHASE_1_SECURITY.md**
```markdown
| COD-11-001 | Move JWT_SECRET to .env | ✅ 12/24 | ✅ 12/24 | ✅ 12/24 | Done |
```

2. **VERIFICATION_LOG.md**
```markdown
| COD-11-001 | JWT_SECRET to .env | ✅ 12/24 | ✅ 12/24 | ✅ 12/24 | ⬚ |
```

3. **PROGRESS_TRACKER.md**
```markdown
| 1 | Security | 25 | 1 | 4% | ⏳ IN PROGRESS |
```

4. **feature_list.json**
```json
{
  "id": "COD-11-001",
  "passes": true
}
```

5. **claude-progress.txt**
```
## Session #1 - 2024-12-24
- Completed: COD-11-001
- Next: COD-11-002
```

---

## Quality Checks

Before marking complete, verify:
- [ ] Code compiles without errors
- [ ] Feature works as described
- [ ] Tests written and passing
- [ ] Git commit made
- [ ] All blueprint files updated

---

## Reminder

**The blueprint is only valuable if it's accurate!**

Always update:
- When you DO something → Update immediately
- When you DISCOVER something → Log it
- When you FINISH something → Verify all files updated

---

*These rules ensure the Master Blueprint remains a live, accurate source of truth.*
