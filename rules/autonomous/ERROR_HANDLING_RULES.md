# Error Handling & Recovery Rules

## Error Classification

### Level 1: Self-Recoverable
**Action: Fix automatically, log, continue**
- Syntax errors in code you wrote
- Missing imports
- Type errors
- Failed tests for code you changed
- Port already in use
- Missing dependencies
- Cache corruption

### Level 2: Requires Investigation
**Action: 3 attempts, then document and move on**
- External API failures
- Database connection issues
- Authentication failures
- Timeout errors
- Memory issues
- Unexpected responses

### Level 3: Blocking
**Action: Document, alert, stop that task**
- Cannot start required services
- Database corruption
- Security breach detected
- Core functionality broken
- Cannot access required files

### Level 4: Critical
**Action: Stop all work, document, wait for human**
- Data loss detected
- Security credentials exposed
- Production system affected
- Multiple critical failures
- Unknown catastrophic error

## Recovery Procedures

### Service Won't Start
```
1. Check if port is in use: netstat -ano | findstr :PORT
2. Kill process using port: taskkill /F /PID <pid>
3. Check for syntax errors in code
4. Verify .env file exists and is correct
5. Try npm install
6. If still fails, document and escalate
```

### Database Connection Failed
```
1. Verify DATABASE_URL in .env
2. Check if PostgreSQL service is running
3. Test connection with: npx prisma db pull
4. Check for migration issues
5. If using fallback JSON, switch to that
6. Document the issue
```

### Git Conflict
```
1. Never force push
2. Stash your changes: git stash
3. Pull latest: git pull
4. Apply stash: git stash pop
5. Resolve conflicts manually
6. If complex, document and wait for human
```

### Test Failures
```
1. Read the error message carefully
2. Check if you changed related code
3. Run single test to isolate
4. Fix the root cause, not the symptom
5. If test is flaky, mark and document
6. Never delete tests to make them pass
```

### Memory/Performance Issues
```
1. Identify the memory hog
2. Clear caches: rm -rf cache/* cdn-cache/*
3. Restart services
4. Close unused browser instances
5. If persists, reduce parallelism
6. Document for optimization later
```

## Retry Strategy

| Error Type | Max Retries | Wait Between | Action After |
|------------|-------------|--------------|--------------|
| Network | 3 | 5 seconds | Document, skip |
| Database | 3 | 10 seconds | Use fallback |
| API | 3 | Exponential | Document, skip |
| File I/O | 2 | 1 second | Escalate |
| Auth | 1 | - | Escalate |

## Logging Errors

Always log:
```
[TIMESTAMP] ERROR Level X: <category>
- What happened: <description>
- What was attempted: <action>
- Stack trace: <if available>
- Recovery action: <what you did>
- Result: <success/failure>
```

## Never Do

- Ignore errors silently
- Delete error logs
- Retry infinitely
- Change code to hide errors
- Skip tests that fail
- Assume errors will fix themselves
- Blame external factors without evidence
