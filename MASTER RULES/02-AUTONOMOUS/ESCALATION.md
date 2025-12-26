# Escalation Rules

## When to Escalate

Escalate to the user when:

1. **3+ Failed Attempts** - Same approach not working
2. **Destructive Actions** - Data loss possible
3. **Architecture Decisions** - Major design choices
4. **External Costs** - API calls that cost money
5. **Security Concerns** - Potential vulnerabilities
6. **Blocked by External** - Need access/credentials
7. **Time Intensive** - Task would take 2+ hours
8. **Unclear Requirements** - Don't know what to build

---

## Escalation Levels

### Level 1: Informational
Just FYI, continuing work.
```
FYI: [What happened]
Continuing with [next action]
```

### Level 2: Decision Needed
Need input, work paused.
```
DECISION NEEDED:
- Option A: [description]
- Option B: [description]
Recommendation: [your pick]
```

### Level 3: Blocked
Cannot continue without user.
```
BLOCKED: [Reason]
Need: [What you need]
Tried: [What you attempted]
```

### Level 4: Critical
Immediate attention required.
```
CRITICAL: [Issue]
Impact: [What's at risk]
Action Required: [What user must do]
```

---

## Escalation Format

```markdown
## ESCALATION: [Issue Name]

**Level:** [1-4]
**Blocking:** Yes/No

### Situation
[What happened]

### What I Tried
1. [Attempt 1] - [Result]
2. [Attempt 2] - [Result]
3. [Attempt 3] - [Result]

### Options
1. [Option 1] - [Pros/Cons]
2. [Option 2] - [Pros/Cons]

### My Recommendation
[What I suggest]

### What I Need
[Specific ask]
```

---

## Don't Escalate For

- Routine errors you can fix
- Package installation
- Type errors
- Formatting issues
- Test failures you can debug
- Configuration changes
- Documentation updates

---

## After Escalation

1. Wait for user response
2. Do NOT proceed with risky action
3. Work on unrelated tasks if available
4. Document the blocker

---

## Emergency Procedures

### Server Down
1. Check error logs
2. Try restart
3. If 3 restarts fail -> Escalate

### Build Broken
1. Check TypeScript errors
2. Fix each error
3. If 5+ errors from same cause -> Escalate

### Database Issue
1. Check connection
2. Verify credentials
3. If data-related -> Escalate

### Production Issue
1. ALWAYS escalate immediately
2. Do NOT deploy without approval
3. Document everything
