# Session Handoff Rules

## End of Session Protocol

Before ending ANY session, complete these steps:

---

## Step 1: Commit All Changes

```powershell
git status
git add -A
git commit -m "type(scope): description"
```

Commit message format:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructure
- `docs` - Documentation
- `chore` - Maintenance

---

## Step 2: Update Progress Files

### claude-progress.txt
```
=== SESSION LOG ===
Date: YYYY-MM-DD HH:MM
Task: [task name]
Status: COMPLETED / FAILED / IN_PROGRESS
Notes: [what was done]
Next: [what to do next]
==================
```

### feature_list.json
- Set `"passes": true` for completed features
- Update notes field with results

---

## Step 3: Save Chat History

Create file: `chat-history/YYYY-MM-DD-description.md`

```markdown
# Chat Session: YYYY-MM-DD

## Summary
[Brief overview]

## Key Decisions
- Decision 1
- Decision 2

## Completed
- [x] Task 1
- [x] Task 2

## In Progress
- [ ] Task 1

## Files Modified
- path/to/file.ts
- path/to/another.md

## Next Steps
1. Next thing
2. Another thing
```

---

## Step 4: Verify Clean State

Check these before ending:
- [ ] All changes committed
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] Server can restart cleanly
- [ ] Progress files updated
- [ ] Chat history saved

---

## Step 5: Report Handoff

```
## SESSION END

**Duration:** X hours
**Commits:** N commits
**Status:** Clean / Issues

### Completed This Session:
- [List]

### Left In Progress:
- [List]

### For Next Session:
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

### Known Issues:
- [Any blockers]

---
*Session ended: YYYY-MM-DD HH:MM*
```

---

## Context Preservation

Ensure next session has context by updating:

1. **claude-progress.txt** - Technical state
2. **feature_list.json** - Task status
3. **chat-history/** - Conversation context

---

## Emergency Handoff

If session ends unexpectedly:

1. Commit whatever is possible
2. Note "INCOMPLETE" in progress file
3. List what was being worked on
4. Save partial chat history

---

## DO NOT

- Leave uncommitted changes
- Leave broken build
- Skip progress update
- Forget chat history
- Leave server in bad state

---

**Clean handoffs = Smooth next sessions**
