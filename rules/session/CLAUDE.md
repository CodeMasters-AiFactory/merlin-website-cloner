# CLAUDE.md - Merlin Website Cloner Agent Instructions

## Project Overview
Merlin Website Cloner is a SaaS tool for legally backing up websites. You are working on making it production-ready.

## Linear Integration
- **Project URL**: https://linear.app/code-masters/project/merlin-website-cloner-0102a6dc2777
- **Team**: Code-Masters
- Issues: COD-9, COD-10, COD-11, COD-12, COD-13, COD-14

## IMPORTANT: Session Protocol

### At the START of every session:
1. Run `pwd` to verify you're in the correct directory
2. Run `.\init.ps1` to check environment status
3. Read `claude-progress.txt` to see what was done previously
4. Read `feature_list.json` to see remaining work
5. Run `git log --oneline -10` to see recent commits
6. Start dev server with `npm run dev` and verify it works

### During your session:
1. Work on ONE feature at a time from `feature_list.json`
2. Follow the priority order (COD-11 first, then COD-9, etc.)
3. Test each change before marking complete
4. Commit after each completed feature with descriptive message
5. Update `feature_list.json` - set `"passes": true` only after testing

### At the END of every session:
1. Ensure all changes are committed to git
2. Update `claude-progress.txt` with session summary
3. Leave the codebase in a clean, working state
4. Document any blockers or issues found

## File Locations
```
C:\Cursor Projects\Merlin website clone\
├── feature_list.json      # Feature checklist (edit "passes" field)
├── claude-progress.txt    # Session log (update after each session)
├── init.ps1               # Run at session start
├── CLAUDE.md              # This file - your instructions
├── src/
│   └── server/            # Backend code
│       ├── auth.ts        # Authentication (COD-11)
│       ├── index.ts       # Express server (COD-11)
│       ├── database.ts    # Database (COD-9)
│       └── services/      # Business logic
├── frontend/              # React frontend
├── prisma/                # Database schema (COD-9)
└── tests/                 # Test files (COD-13)
```

## Priority Order
1. **COD-11 (URGENT)**: Security - JWT, bcrypt, rate limiting, CORS
2. **COD-9 (HIGH)**: PostgreSQL + Prisma ORM
3. **COD-10 (HIGH)**: Stripe payment integration
4. **COD-12 (HIGH)**: Docker + CI/CD pipeline
5. **COD-14 (HIGH)**: Legal compliance
6. **COD-13 (MEDIUM)**: Test coverage

## Commands Reference
```bash
# Development
npm run dev          # Start both frontend and backend
npm run server       # Start backend only
npm run client       # Start frontend only

# Testing
npm run test         # Run tests
npm run lint         # Run linting

# Database (after COD-9)
npx prisma generate  # Generate Prisma client
npx prisma migrate dev  # Run migrations
npx prisma studio    # Open database GUI

# Git
git add .
git commit -m "COD-XX: Description"
git log --oneline -10
```

## Rules
1. **Never push to GitHub** without explicit user approval
2. **Always test** before marking a feature complete
3. **One feature at a time** - don't try to do everything at once
4. **Commit frequently** - small, focused commits
5. **Update progress files** - keep claude-progress.txt current
6. **Clean state** - leave code working after each session

## Testing Protocol
Before marking any feature as `"passes": true`:
1. Run the relevant test command
2. Manually verify the feature works
3. Check for console errors
4. Verify existing features still work

## Error Handling
If you encounter errors:
1. Document in claude-progress.txt under "KNOWN ISSUES"
2. Try to fix if within scope of current feature
3. If blocking, note in "BLOCKED ITEMS" section
4. Continue with next feature if current is blocked
