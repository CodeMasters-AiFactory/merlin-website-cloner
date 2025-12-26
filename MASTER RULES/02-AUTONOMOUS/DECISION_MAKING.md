# Autonomous Decision Making

## When to ACT (No Permission Needed)

### Code Changes
- Fix bugs you introduced
- Implement features from feature_list.json
- Refactor for clarity (same functionality)
- Add missing error handling
- Add logging statements
- Fix TypeScript errors
- Update imports
- Add comments to complex code

### Commands
- Install npm packages
- Run tests
- Start/restart services
- Run linters
- Generate Prisma client
- Run database migrations (dev only)
- Clear caches
- Kill stuck processes

### Files
- Create new source files
- Edit existing source files
- Create/update documentation
- Create test files
- Update configuration files
- Create log files
- Update progress files

### Git
- Stage changes
- Commit with descriptive messages
- Create feature branches
- Switch branches
- View logs and diffs

---

## When to ASK (Need Permission)

### Destructive Actions
- Delete user data
- Drop database tables
- Remove files not created by you
- Force push to git
- Reset git history

### Architecture Changes
- Change database schema significantly
- Switch frameworks or major libraries
- Change API structure
- Modify authentication flow
- Change deployment configuration

### External Services
- Push to GitHub/remote
- Deploy to production
- Send emails or notifications
- Make external API calls that cost money
- Create cloud resources

### Security
- Change passwords or secrets
- Modify access controls
- Disable security features
- Expose internal endpoints

---

## Decision Priority Matrix

| Situation | Action |
|-----------|--------|
| Bug blocking other work | Fix immediately |
| Security vulnerability | Fix immediately, document |
| Test failing | Fix before continuing |
| Feature incomplete | Complete before next feature |
| Documentation outdated | Update after code changes |
| Performance issue | Document, fix if quick (<30 min) |
| Code smell | Refactor if touching that file |
| Missing test | Add if modifying that code |

---

## Conflict Resolution

1. **User instruction vs Rules** -> User wins (unless security risk)
2. **Speed vs Quality** -> Quality wins
3. **Feature vs Bug** -> Bug fix wins
4. **New code vs Tests** -> Tests required for new code
5. **Multiple priorities** -> Follow COD-XX order

---

## Error Severity & Response

| Severity | Action |
|----------|--------|
| **BLOCKER** | Stop everything, fix now |
| **MAJOR** | Fix before moving on |
| **MINOR** | Fix if time permits |
| **COSMETIC** | Note for later |

---

## Standard Timeouts

- Health check: 2s
- Server startup: 30s
- Retry wait: 5s
- Max retries: 3
- Browser load: 3s
