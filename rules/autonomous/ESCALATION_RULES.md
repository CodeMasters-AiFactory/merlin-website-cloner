# Escalation Rules

## Escalation Levels

### Level 1: Self-Handle (No Escalation)
- Syntax errors
- Missing imports
- Failed tests for your code
- Minor bugs you introduced
- Missing dependencies
- Configuration issues

### Level 2: Document & Continue
- External API issues
- Flaky tests
- Performance concerns
- Minor design questions
- Non-blocking issues

### Level 3: Document & Alert (End of Session)
- Repeated failures (3+ attempts)
- Blocking issues
- Security concerns (non-critical)
- Architecture questions
- Resource limitations

### Level 4: Immediate Alert (Stop Work)
- Security breach detected
- Data loss or corruption
- Production impact
- Credentials exposed
- Critical system failure
- Legal/compliance violation

## When to Escalate

### Escalate IMMEDIATELY If:
- Security vulnerability found
- User data at risk
- System is down
- Credentials in logs/code
- Unusual system behavior
- Suspected breach

### Escalate at Session End If:
- Feature blocked > 1 hour
- Test consistently failing
- Need architecture decision
- Resource constraints hit
- External dependency issues

### Don't Escalate If:
- You can fix it yourself
- It's documented already
- It's a known issue
- It's not blocking work
- It's a preference/opinion

## Escalation Format

### For Immediate Issues
```
🚨 IMMEDIATE ESCALATION

**Severity:** CRITICAL
**Time:** [timestamp]
**Issue:** [one-line summary]

**What Happened:**
[Brief description]

**Impact:**
[What's affected]

**Evidence:**
[Logs, screenshots, etc.]

**Action Taken:**
[What you did immediately]

**Needs:**
[What human needs to do]
```

### For Session-End Issues
```
⚠️ ESCALATION NEEDED

**Severity:** High / Medium
**Feature:** COD-XX-YYY
**Blocked Since:** [timestamp]

**Issue:**
[Description]

**Attempted Solutions:**
1. [What you tried]
2. [What you tried]

**Recommendation:**
[Your suggestion]

**Can Wait Until:** [date/time]
```

## Response Expectations

| Severity | Expected Response |
|----------|-------------------|
| Critical | Within 15 minutes |
| High | Within 2 hours |
| Medium | Within 24 hours |
| Low | Within 1 week |

## Escalation Paths

### Technical Issues
1. Document in claude-progress.txt
2. Create BLOCKER note in project
3. Tag in Linear if applicable
4. Wait for human response

### Security Issues
1. Stop affected operations
2. Document immediately
3. Alert human directly
4. Preserve all evidence
5. Don't attempt to fix without approval

### Resource Issues
1. Document current usage
2. Identify what's consuming resources
3. Propose solutions
4. Wait for approval if destructive

## After Escalation

- Continue with non-blocked work
- Check periodically for response
- Update status when resolved
- Document resolution for future
