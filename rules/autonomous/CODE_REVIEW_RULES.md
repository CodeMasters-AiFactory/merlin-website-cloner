# Code Review Rules (Self-Review)

## Before Every Commit

### Quick Scan (2 minutes)
- [ ] Code compiles
- [ ] No obvious errors
- [ ] No debug code (console.log)
- [ ] No commented-out code
- [ ] No hardcoded values
- [ ] Tests pass

### Detailed Review (5-10 minutes)
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Error handling present
- [ ] Types are correct
- [ ] Naming is clear
- [ ] Code is DRY
- [ ] Security considered

## Review Checklist

### Functionality
- [ ] Does it do what it's supposed to?
- [ ] Are edge cases handled?
- [ ] Are errors handled gracefully?
- [ ] Does it work with existing code?

### Code Quality
- [ ] Is the code readable?
- [ ] Is there duplication?
- [ ] Are functions small and focused?
- [ ] Are names descriptive?
- [ ] Is complexity minimized?

### Security
- [ ] No hardcoded secrets
- [ ] Input is validated
- [ ] Output is sanitized
- [ ] Auth/authz checked
- [ ] No SQL injection possible
- [ ] No XSS possible

### Performance
- [ ] No N+1 queries
- [ ] No unnecessary loops
- [ ] No blocking operations
- [ ] Resources cleaned up
- [ ] Caching where appropriate

### Testing
- [ ] Tests added for new code
- [ ] Tests cover edge cases
- [ ] Tests are readable
- [ ] All tests pass

### Documentation
- [ ] Complex code commented
- [ ] Public APIs documented
- [ ] README updated if needed
- [ ] Changelog updated if needed

## Common Issues to Catch

### Logic Errors
```typescript
// Wrong comparison
if (items.length = 0)  // Assignment, not comparison!

// Off-by-one
for (let i = 0; i <= items.length; i++)  // Should be <

// Async issues
const data = fetchData();  // Missing await
```

### Security Issues
```typescript
// SQL injection
query(`SELECT * FROM users WHERE id = ${userId}`)

// XSS
innerHTML = userInput

// Hardcoded secrets
const apiKey = 'sk_live_abc123'
```

### Performance Issues
```typescript
// N+1 query
for (const user of users) {
  const posts = await getPosts(user.id);  // Query per user!
}

// Unnecessary work
items.filter(x => x.active).map(x => x.id).filter(x => x)
```

### Resource Leaks
```typescript
// File handle leak
const stream = fs.createReadStream(file);
// Never closed!

// Database connection leak
const conn = await pool.getConnection();
// Never released!
```

## Review Techniques

### Read Through
1. Read code top to bottom
2. Understand the flow
3. Check each function purpose
4. Verify logic correctness

### Trace Execution
1. Pick a scenario
2. Trace through code path
3. Verify correct behavior
4. Check error paths

### Boundary Check
1. What if input is null?
2. What if array is empty?
3. What if number is 0 or negative?
4. What if string is empty?

### Security Mindset
1. Can user input affect this?
2. Is this properly authenticated?
3. Can this leak information?
4. Can this be abused?

## Review Comments Format

### When Documenting Issues
```
[SEVERITY] File:Line - Issue description

[CRITICAL] auth.ts:45 - Password stored in plain text
[HIGH] api.ts:23 - Missing input validation
[MEDIUM] utils.ts:67 - Consider caching this result
[LOW] styles.css:12 - Inconsistent spacing
```

## Post-Review Actions

### If Issues Found
1. Fix critical/high immediately
2. Log medium for later
3. Track low in backlog
4. Re-review after fixes

### If Clean
1. Commit with confidence
2. Update progress
3. Move to next task

## Never Skip

- Self-review before commit
- Security check for auth code
- Test verification
- Error handling check
