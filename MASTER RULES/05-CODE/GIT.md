# Git Workflow Rules

## Commit Message Format

```
type(scope): description

- detail 1
- detail 2
```

### Types
| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructure (no behavior change) |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `test` | Adding/updating tests |
| `chore` | Maintenance, dependencies |

### Examples
```
feat(merlin8): add accounting industry DNA

- Complete color scheme and fonts
- Leonardo AI image prompts
- Professional copy tone

fix(ui): correct text overlay contrast on hero images

refactor(generator): optimize image generation pipeline
```

---

## Workflow

### Daily Work
```bash
git status                    # Check state
git add -A                    # Stage all
git commit -m "type: msg"     # Commit
```

### Feature Branch (When Required)
```bash
git checkout -b feature/name  # Create branch
# ... do work ...
git add -A && git commit -m "feat: ..."
git checkout main
git merge feature/name
```

---

## Git Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `git status` | Check current state |
| `git add -A` | Stage all changes |
| `git commit -m "msg"` | Commit with message |
| `git log --oneline -10` | View recent commits |
| `git diff` | View unstaged changes |
| `git diff --staged` | View staged changes |
| `git checkout -b name` | Create and switch branch |
| `git merge branch` | Merge branch into current |

---

## Rules

### ALWAYS DO
- Commit frequently (small commits)
- Write descriptive messages
- Stage and commit before major changes
- Keep commits atomic (one change per commit)

### NEVER DO (Without Permission)
- Force push (`git push --force`)
- Reset history (`git reset --hard`)
- Rebase shared branches
- Delete branches without asking
- Push to remote without explicit approval

---

## Before Committing Checklist

- [ ] Code builds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Tests pass (if applicable)
- [ ] Related files grouped
- [ ] Message describes the change

---

## Commit Frequency

- After completing a feature
- After fixing a bug
- Before trying something risky
- At end of session
- Every 30 minutes during active work

---

## Branch Naming

```
feature/short-description
fix/issue-description
refactor/what-refactored
docs/what-documented
```

Examples:
- `feature/add-accounting-industry`
- `fix/hero-image-contrast`
- `refactor/generation-pipeline`
