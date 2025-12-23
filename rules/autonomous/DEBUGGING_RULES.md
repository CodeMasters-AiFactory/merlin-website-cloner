# Debugging Rules

## Debugging Hierarchy

### Level 1: Read the Error
1. Read ENTIRE error message
2. Note file and line number
3. Check stack trace
4. Identify error type

### Level 2: Reproduce
1. Identify exact steps to reproduce
2. Simplify to minimal case
3. Confirm it's consistent
4. Document reproduction steps

### Level 3: Isolate
1. Binary search to find cause
2. Comment out code sections
3. Add logging statements
4. Check recent changes

### Level 4: Fix
1. Understand root cause
2. Fix the cause, not symptom
3. Add test to prevent regression
4. Verify fix works

## Debugging Tools

### Console/Logging
```typescript
// Strategic logging
console.log('[DEBUG] Function entry:', { params });
console.log('[DEBUG] State before:', state);
// ... operation
console.log('[DEBUG] State after:', state);
console.log('[DEBUG] Function exit:', { result });
```

### Node.js Debugging
```bash
# Inspect mode
node --inspect src/index.ts

# Break on first line
node --inspect-brk src/index.ts

# Debug specific file
DEBUG=* node src/index.ts
```

### Prisma Debugging
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Network Debugging
```bash
# Check if service is up
curl -v http://localhost:3000/api/health

# Check headers
curl -I http://localhost:3000/api/health

# Test with data
curl -X POST http://localhost:3000/api/clone \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Common Issues & Solutions

### "Cannot find module"
```bash
1. Check import path is correct
2. Check file exists
3. Run: npm install
4. Check tsconfig.json paths
5. Delete node_modules, reinstall
```

### "Port already in use"
```bash
1. Find process: netstat -ano | findstr :PORT
2. Kill process: taskkill /F /PID <pid>
3. Or use different port
```

### "Database connection failed"
```bash
1. Check DATABASE_URL in .env
2. Check PostgreSQL is running
3. Test: npx prisma db pull
4. Check firewall/network
5. Verify credentials
```

### "CORS error"
```bash
1. Check CORS middleware is configured
2. Verify origin is whitelisted
3. Check request headers
4. Check preflight (OPTIONS) handling
```

### "JWT/Auth error"
```bash
1. Check token is being sent
2. Verify token format (Bearer)
3. Check token expiration
4. Verify secret matches
5. Check middleware order
```

## Debugging Checklist

### Before Asking for Help
- [ ] Read full error message
- [ ] Searched error online
- [ ] Checked recent code changes
- [ ] Tried basic fixes (restart, reinstall)
- [ ] Reproduced consistently
- [ ] Isolated to specific code
- [ ] Added logging to understand flow
- [ ] Checked environment variables
- [ ] Verified dependencies installed

## Logging for Debugging

### Add Logs At
- Function entry/exit
- Before/after async operations
- Decision points (if/else)
- Loop iterations (sparingly)
- Error catch blocks
- State changes

### Log Format
```
[TIMESTAMP] [LEVEL] [COMPONENT] Message { context }
[2024-12-20 14:30:00] [DEBUG] [CloneService] Starting clone { url: "..." }
```

### Remove Debug Logs
- Before committing (use logger instead of console.log)
- Or use debug flag:
```typescript
if (process.env.DEBUG) {
  console.log('[DEBUG]', ...);
}
```

## When Stuck

### 30-Minute Rule
If stuck for 30 minutes:
1. Take a break (2 minutes)
2. Explain problem out loud (rubber duck)
3. Try completely different approach
4. Search online with exact error
5. Check if problem is elsewhere
6. Document and move on if still stuck

### Escalation
After 3 failed attempts:
1. Document everything tried
2. Note exact error
3. Provide reproduction steps
4. Move to next task
5. Flag for human review
