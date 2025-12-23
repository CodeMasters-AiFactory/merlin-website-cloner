# Git & Version Control Rules

## Branch Strategy

### Branch Types
- `main` - Production-ready code (NEVER commit directly)
- `develop` - Integration branch
- `feature/COD-XX-description` - Feature branches
- `fix/description` - Bug fix branches
- `hotfix/description` - Urgent production fixes

### Naming Convention
```
feature/COD-11-jwt-env-variable
feature/COD-9-prisma-setup
fix/login-redirect-loop
hotfix/security-patch
```

## Commit Rules

### Commit Frequency
- Commit after each completed sub-task
- Commit before switching context
- Commit at end of session
- Never commit broken code

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change, no new feature
- `test` - Adding tests
- `chore` - Maintenance

### Examples
```
feat(COD-11): Add JWT secret environment variable

- Move hardcoded secret to process.env.JWT_SECRET
- Add validation at startup
- Update .env.example

Closes COD-11-001

fix(auth): Prevent login redirect loop

- Add check for existing token before redirect
- Clear invalid tokens on 401

Refs: #123
```

## Pre-Commit Checklist

Before every commit:
- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] No console.log statements
- [ ] No hardcoded secrets
- [ ] Commit message is descriptive

## Commands Reference

```bash
# Stage changes
git add .                    # All changes
git add <file>               # Specific file

# Commit
git commit -m "message"      # Quick commit
git commit                   # Opens editor

# View status
git status                   # Current status
git diff                     # Unstaged changes
git diff --staged            # Staged changes
git log --oneline -10        # Recent commits

# Branches
git branch                   # List branches
git checkout -b <name>       # Create & switch
git checkout <name>          # Switch branch
git merge <branch>           # Merge branch

# Undo
git checkout -- <file>       # Discard changes
git reset HEAD <file>        # Unstage file
git reset --soft HEAD~1      # Undo last commit (keep changes)
git reset --hard HEAD~1      # Undo last commit (discard changes)

# Stash
git stash                    # Stash changes
git stash pop                # Apply stash
git stash list               # List stashes
```

## Never Do

- Force push (`git push -f`)
- Commit to main directly
- Commit secrets or .env files
- Commit node_modules
- Commit with failing tests
- Use vague commit messages
- Squash without permission
- Rebase shared branches

## Conflict Resolution

1. Pull latest changes first
2. Resolve conflicts carefully
3. Test after resolving
4. Commit resolution with message explaining how resolved
5. If complex, document and ask for help

## Gitignore

Always ensure these are ignored:
```
node_modules/
.env
.env.local
dist/
*.log
.DS_Store
coverage/
.cache/
```
