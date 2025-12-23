# Chat History & Backup Rules

## Purpose
Maintain a persistent record of all conversations between Rudolf and Claude to:
1. Preserve context across sessions
2. Reference previous discussions
3. Track decisions and progress
4. Never lose important information

---

## Folder Structure

```
📁 chat-history/
├── 📄 JOURNAL.md                    ← Master index of ALL chats
├── 📄 CURRENT_SESSION.md            ← Active session backup
├── 📁 2024/
│   ├── 📁 12-December/
│   │   ├── 2024-12-23_session-001.md
│   │   ├── 2024-12-23_session-002.md
│   │   └── ...
│   └── 📁 11-November/
│       └── ...
└── 📁 2025/
    └── ...
```

---

## File Naming Convention

```
YYYY-MM-DD_session-NNN.md

Example: 2024-12-23_session-001.md
```

---

## Backup Triggers (BREAKPOINTS)

Claude should save/update chat history when:

### Automatic Triggers:
1. **Major Milestone** - Completing a significant feature or task
2. **Before Risky Operation** - Before any destructive or irreversible action
3. **Topic Change** - When conversation shifts to a new subject
4. **Every 30 Minutes** - Time-based checkpoint
5. **End of Work Session** - When Rudolf says "save", "done", "bye", etc.

### Manual Triggers (Rudolf says):
- "SAVE IT" / "SAVE CHAT"
- "BACKUP" / "CHECKPOINT"
- "BREAKPOINT"
- "SAVE PROGRESS"
- "LOG THIS"

---

## Session File Format

```markdown
# Chat Session: YYYY-MM-DD Session #NNN

## Metadata
- **Date:** YYYY-MM-DD
- **Time Started:** HH:MM
- **Time Ended:** HH:MM
- **Session Number:** NNN
- **Project:** [Project Name]
- **Topics Covered:** [List of topics]

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
- [ ] Task 2

## Important Information Shared
- Info 1
- Info 2

## Files Created/Modified
- path/to/file.ts
- path/to/another.md

## Code Snippets Discussed
[Any important code]

## Next Steps
1. Next thing to do
2. Another thing

## Full Conversation Log
[Condensed version of the conversation]

---
*Saved at: YYYY-MM-DD HH:MM*
```

---

## JOURNAL.md Format

The master journal tracks ALL sessions:

```markdown
# Chat History Journal

## Overview
- **Total Sessions:** N
- **First Session:** YYYY-MM-DD
- **Last Session:** YYYY-MM-DD
- **Projects Discussed:** [List]

## Session Index

### 2024

#### December 2024
| Session | Date | Topics | Key Outcomes |
|---------|------|--------|--------------|
| #001 | 2024-12-23 | Admin rules, 24/7 agents | Created 66 rule files |
| #002 | 2024-12-23 | Chat backup system | Created chat-history |

#### November 2024
| Session | Date | Topics | Key Outcomes |
|---------|------|--------|--------------|
| ... | ... | ... | ... |
```

---

## CURRENT_SESSION.md

A continuously updated file for the ACTIVE session:

```markdown
# Current Active Session

**Started:** YYYY-MM-DD HH:MM
**Last Updated:** YYYY-MM-DD HH:MM

## What We're Working On
[Current task]

## Recent Activity
- [Timestamp] Did this
- [Timestamp] Did that

## Open Items
- Item 1
- Item 2

## Context for Next Message
[Important context Claude needs]
```

---

## Recovery Protocol

When Claude starts a new session:

1. **READ FIRST:**
   ```
   1. chat-history/JOURNAL.md           ← Overview of all history
   2. chat-history/CURRENT_SESSION.md   ← What was happening
   3. claude-progress.txt               ← Technical progress
   4. Latest session file               ← Detailed last conversation
   ```

2. **ACKNOWLEDGE:**
   - Summarize what was discussed last
   - Confirm understanding of current state
   - Ask if anything changed

---

## Quick Commands

| Command | Action |
|---------|--------|
| `SAVE CHAT` | Save current session to file |
| `CHECKPOINT` | Quick save with timestamp |
| `SHOW HISTORY` | Display recent sessions |
| `LOAD SESSION #N` | Read specific session |
| `WHAT DID WE DISCUSS?` | Summary of recent topics |

---

## Important Notes

1. **Privacy:** No sensitive data (passwords, API keys) in chat logs
2. **Size:** Keep summaries concise, full logs can be verbose
3. **Git:** Chat history IS committed to git for backup
4. **Location:** Always in `chat-history/` folder
5. **Format:** Always Markdown for readability

---

## Example Breakpoint Message

When saving, Claude should say:

```
📸 **CHECKPOINT SAVED**
- Session: #001
- Date: 2024-12-23
- Time: 14:30
- File: chat-history/2024/12-December/2024-12-23_session-001.md
- Topics: [list]
- Next: [what's next]
```

---

*These rules ensure we never lose context and can always pick up where we left off!*
