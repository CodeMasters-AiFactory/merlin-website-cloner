# Error Handling Rules

## Core Principle

**FIX ERRORS IMMEDIATELY - Don't just report them**

---

## Error Response Protocol

### TypeScript Error
1. Read the error message
2. Find the source file
3. Fix the type issue
4. Run build to verify
5. Proceed only if clean

### Console Error
1. Check browser console
2. Identify the error source
3. Debug and fix
4. Verify console is clean
5. Continue work

### Visual Bug
1. Take screenshot
2. Identify the CSS/layout issue
3. Fix immediately
4. Verify with new screenshot
5. Continue work

### API Error
1. Check server logs
2. Verify endpoint
3. Fix the route/controller
4. Test the endpoint
5. Continue work

---

## Escalation Mode

After **3 failed attempts** at fixing an issue:

1. **STOP** trying the same approach
2. **DOCUMENT** what you tried
3. **EXPLAIN** the problem clearly
4. **PROPOSE** alternative approaches
5. **ASK** user for guidance

### Escalation Report Format:
```
## ESCALATION: [Issue Name]

**Attempts Made:** 3
**Time Spent:** X minutes

### What I Tried:
1. [Approach 1] - Result: [Failure reason]
2. [Approach 2] - Result: [Failure reason]
3. [Approach 3] - Result: [Failure reason]

### Root Cause Analysis:
[What I believe is causing this]

### Proposed Alternatives:
1. [Alternative 1] - Pros/Cons
2. [Alternative 2] - Pros/Cons
3. [Alternative 3] - Pros/Cons

### Recommendation:
[What I recommend doing]

### Need From You:
[What decision/input I need]
```

---

## Error Categories

### Critical (Fix Immediately)
- Application won't start
- Data corruption possible
- Security vulnerability
- User-facing errors

### Major (Fix Before Continuing)
- Feature doesn't work
- Tests failing
- Build errors
- API returning wrong data

### Minor (Fix When Convenient)
- Console warnings
- Slow performance
- Code style issues
- Minor UI glitches

### Cosmetic (Note for Later)
- Typos in comments
- Spacing inconsistencies
- Non-user-facing issues

---

## Recovery Protocol

If you break something:

1. **ADMIT IT** - "I broke X"
2. **EXPLAIN IT** - "By doing Y"
3. **FIX IT** - Do the fix
4. **VERIFY IT** - Prove it works
5. **LEARN IT** - Note how to avoid

---

## Logging Standards

```typescript
// Error format
console.error('[Module Name] Error:', error);

// Warning format
console.warn('[Module Name] Warning:', message);

// Info format
console.log('[Module Name] Info:', message);
```

---

**Remember: You fix problems. You don't just report them.**
