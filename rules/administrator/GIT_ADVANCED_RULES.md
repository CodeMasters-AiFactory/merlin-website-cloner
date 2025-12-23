# Git Advanced Operations Rules

## Git Configuration

### Global Config
```powershell
# User info
git config --global user.name "Rudolf"
git config --global user.email "your.email@example.com"

# Default branch
git config --global init.defaultBranch main

# Editor
git config --global core.editor "code --wait"

# Line endings (Windows)
git config --global core.autocrlf true

# Push behavior
git config --global push.default current

# Pull behavior
git config --global pull.rebase true

# Aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.lg "log --oneline --graph --all"
```

### View Config
```powershell
git config --list
git config --global --list
```

## Advanced Operations

### Interactive Rebase
```powershell
# Rebase last N commits
git rebase -i HEAD~5

# Edit, squash, reorder commits
# Commands: pick, reword, edit, squash, fixup, drop
```

### Cherry Pick
```powershell
# Pick specific commit
git cherry-pick <commit-hash>

# Pick multiple commits
git cherry-pick <hash1> <hash2>

# Pick range
git cherry-pick <start>..<end>
```

### Stash Operations
```powershell
# Stash changes
git stash
git stash save "message"

# Stash including untracked
git stash -u

# List stashes
git stash list

# Apply stash
git stash pop          # Apply and delete
git stash apply        # Apply and keep

# Apply specific stash
git stash apply stash@{2}

# Delete stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

### Reset Operations
```powershell
# Soft reset (keep changes staged)
git reset --soft HEAD~1

# Mixed reset (keep changes unstaged)
git reset --mixed HEAD~1
git reset HEAD~1       # Default is mixed

# Hard reset (discard changes)
git reset --hard HEAD~1

# Reset to specific commit
git reset --hard <commit-hash>

# Reset single file
git checkout HEAD -- <file>
```

### Reflog (Recovery)
```powershell
# View reflog
git reflog

# Recover deleted branch
git checkout -b recovered-branch <reflog-hash>

# Undo hard reset
git reset --hard HEAD@{2}
```

## Branch Operations

### Branch Management
```powershell
# Create branch
git branch <n>
git checkout -b <n>    # Create and switch

# Delete branch
git branch -d <n>     # Safe delete
git branch -D <n>     # Force delete

# Delete remote branch
git push origin --delete <n>

# Rename branch
git branch -m <old-name> <new-name>

# List branches
git branch -a          # All branches
git branch -r          # Remote branches
git branch -v          # With last commit
```

### Merge vs Rebase
```powershell
# Merge (preserves history)
git merge feature-branch

# Rebase (linear history)
git checkout feature-branch
git rebase main
git checkout main
git merge feature-branch  # Fast-forward

# Abort merge/rebase
git merge --abort
git rebase --abort
```

## Remote Operations

### Remote Management
```powershell
# List remotes
git remote -v

# Add remote
git remote add origin https://github.com/user/repo.git
git remote add backup https://backup.com/repo.git

# Remove remote
git remote remove backup

# Change remote URL
git remote set-url origin new-url
```

### Fetch vs Pull
```powershell
# Fetch (download without merge)
git fetch origin
git fetch --all

# Pull (fetch + merge)
git pull origin main

# Pull with rebase
git pull --rebase origin main
```

### Push Operations
```powershell
# Push to remote
git push origin main

# Push new branch
git push -u origin feature-branch

# Push all branches
git push --all origin

# Push tags
git push --tags

# Force push (DANGEROUS)
git push --force
git push --force-with-lease  # Safer
```

## Tags

```powershell
# Create tag
git tag v1.0.0
git tag -a v1.0.0 -m "Version 1.0.0"

# List tags
git tag
git tag -l "v1.*"

# Push tags
git push origin v1.0.0
git push origin --tags

# Delete tag
git tag -d v1.0.0
git push origin --delete v1.0.0
```

## Submodules

```powershell
# Add submodule
git submodule add https://github.com/user/repo.git path/to/submodule

# Initialize submodules
git submodule init
git submodule update

# Clone with submodules
git clone --recursive https://github.com/user/repo.git

# Update submodules
git submodule update --remote

# Remove submodule
git submodule deinit path/to/submodule
git rm path/to/submodule
```

## Git Hooks

### Location
```
.git/hooks/
```

### Pre-commit Example
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi

# Run linter
npm run lint
if [ $? -ne 0 ]; then
  echo "Linting failed. Commit aborted."
  exit 1
fi
```

### Husky (JS Hook Manager)
```powershell
# Install
npm install -D husky

# Initialize
npx husky init

# Add hook
echo "npm test" > .husky/pre-commit
```

## Worktrees

```powershell
# Create worktree
git worktree add ../feature-branch feature-branch

# List worktrees
git worktree list

# Remove worktree
git worktree remove ../feature-branch
```
