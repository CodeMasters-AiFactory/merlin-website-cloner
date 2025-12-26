# Chat History Rules

## Purpose

Maintain a persistent record of all conversations to:
1. Preserve context across sessions
2. Reference previous discussions
3. Track decisions and progress
4. Never lose important information

---

## Folder Structure

```
chat-history/
├── JOURNAL.md               <- Master index of ALL chats
├── CURRENT_SESSION.md       <- Active session backup
└── YYYY-MM-DD-description.md <- Individual sessions
```

---

## Backup Triggers

### Automatic Triggers (Claude Should Save):
1. **Major Milestone** - Completing a significant feature
2. **Before Risky Operation** - Before destructive actions
3. **Topic Change** - Conversation shifts to new subject
4. **Every 30 Minutes** - Time-based checkpoint
5. **End of Work Session** - When user says "done", "bye", etc.

### Manual Triggers (Rudolf Says):
- "SAVE IT" / "SAVE CHAT"
- "BACKUP" / "CHECKPOINT"
- "BREAKPOINT"
- "SAVE PROGRESS"
- "LOG THIS"

---

## Session File Format

```markdown
# Chat Session: YYYY-MM-DD

## Metadata
- **Date:** YYYY-MM-DD
- **Time Started:** HH:MM
- **Session Number:** NNN
- **Project:** StargatePortal
- **Topics Covered:** [List]

## Summary
[Brief overview of what was discussed/accomplished]

## Key Decisions Made
- Decision 1
- Decision 2

## Tasks Completed
- [x] Task 1
- [x] Task 2

## Tasks In Progress
- [ ] Task 1

## Important Information Shared
- Info 1
- Info 2

## Files Created/Modified
- path/to/file.ts
- path/to/another.md

## Next Steps
1. Next thing to do
2. Another thing

---
*Saved at: YYYY-MM-DD HH:MM*
```

---

## Checkpoint Message Format

When saving, say:

```
CHECKPOINT SAVED
- Session: #NNN
- Date: YYYY-MM-DD
- Time: HH:MM
- File: chat-history/YYYY-MM-DD-topic.md
- Topics: [list]
- Next: [what's next]
```

---

## Recovery Protocol

When starting a new session, read in order:
1. `chat-history/JOURNAL.md` - Overview of all history
2. `chat-history/CURRENT_SESSION.md` - What was happening
3. `claude-progress.txt` - Technical progress
4. Latest session file - Detailed last conversation

Then acknowledge:
- Summarize what was discussed last
- Confirm understanding of current state
- Ask if anything changed

---

## Important Notes

1. **Privacy:** No sensitive data (passwords, API keys) in logs
2. **Size:** Keep summaries concise
3. **Git:** Chat history IS committed for backup
4. **Location:** Always in `chat-history/` folder
5. **Format:** Always Markdown for readability

---

## Quick Commands

| Command | Action |
|---------|--------|
| `SAVE CHAT` | Save current session to file |
| `CHECKPOINT` | Quick save with timestamp |
| `SHOW HISTORY` | Display recent sessions |
| `LOAD SESSION #N` | Read specific session |
| `WHAT DID WE DISCUSS?` | Summary of recent topics |
