# Dependency Management Rules

## Adding Dependencies

### Before Adding
1. Is it necessary? Can I write it myself in < 100 lines?
2. Is it actively maintained?
3. How many dependencies does it bring?
4. What's the bundle size impact?
5. Are there security vulnerabilities?
6. Is the license compatible?

### Evaluation Checklist
- [ ] Last commit < 6 months ago
- [ ] > 1000 weekly downloads
- [ ] No critical vulnerabilities
- [ ] MIT/Apache/BSD license
- [ ] Good documentation
- [ ] TypeScript support (or @types)

### Commands
```bash
# Add production dependency
npm install <package>

# Add dev dependency
npm install -D <package>

# Check vulnerabilities
npm audit

# Check outdated
npm outdated
```

## Updating Dependencies

### Regular Schedule
- Weekly: Check for security updates
- Monthly: Update minor versions
- Quarterly: Evaluate major updates

### Update Process
1. Check what's outdated: `npm outdated`
2. Read changelogs for breaking changes
3. Update one at a time (for major)
4. Run tests after each update
5. Commit each significant update separately

### Commands
```bash
# Update all minor/patch
npm update

# Update specific package
npm install <package>@latest

# Interactive update (with npm-check-updates)
npx ncu -i
```

## Version Pinning

### package.json
```json
{
  "dependencies": {
    "express": "^4.18.0",    // Minor updates OK
    "prisma": "5.7.0",       // Exact version (breaking changes common)
    "lodash": "~4.17.21"     // Patch updates only
  }
}
```

### When to Pin Exact
- Database tools (Prisma, TypeORM)
- Major frameworks
- Tools with frequent breaking changes
- Security-critical packages

### When to Allow Updates
- Utility libraries
- Well-maintained packages
- Test dependencies

## Security

### Vulnerability Response

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | Immediate | Update or remove |
| High | 24 hours | Update or patch |
| Medium | 1 week | Schedule update |
| Low | 1 month | Include in regular update |

### Audit Commands
```bash
# Check vulnerabilities
npm audit

# Fix automatically (when safe)
npm audit fix

# Fix with breaking changes (careful!)
npm audit fix --force

# See detailed report
npm audit --json
```

## Cleanup

### Remove Unused
```bash
# Find unused dependencies
npx depcheck

# Remove package
npm uninstall <package>
```

### Check Bundle Size
```bash
# Analyze bundle
npx webpack-bundle-analyzer

# Check package size before adding
npx bundlephobia <package>
```

## Lock Files

### package-lock.json
- ALWAYS commit to git
- Don't edit manually
- Regenerate if corrupted: delete and `npm install`
- Use `npm ci` in CI/CD (faster, exact)

### When Lock Conflicts
```bash
# Accept incoming changes
git checkout --theirs package-lock.json
npm install

# Or regenerate
rm package-lock.json
npm install
```

## Dependency Categories

### Production Dependencies
- Required at runtime
- Minimal footprint
- Well-audited

### Dev Dependencies
- Build tools
- Test frameworks
- Linters
- Type definitions

### Peer Dependencies
- Framework plugins
- Express middleware
- Don't install automatically

## Never Do

- Install packages without checking
- Ignore security warnings
- Use deprecated packages
- Add unnecessary dependencies
- Skip reading changelogs for major updates
- Force update in production
- Commit node_modules
