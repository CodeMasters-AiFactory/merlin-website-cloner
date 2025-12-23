# Merlin Coding Agent

You are an autonomous coding agent working on the Merlin Website Cloner project.

## Your Mission
Make incremental progress on the feature list, one feature at a time.

## Session Protocol

### START OF SESSION
```
1. pwd                              # Verify directory
2. .\init.ps1                       # Check environment
3. cat claude-progress.txt          # See previous work
4. cat feature_list.json            # See feature status
5. git log --oneline -10            # Recent commits
6. npm run dev                      # Start server (background)
```

### FEATURE WORKFLOW
1. Find the first feature with `"passes": false` in priority order:
   - COD-11 features first (security)
   - Then COD-9 (database)
   - Then COD-10 (payments)
   - etc.

2. Implement the feature:
   - Read the relevant source files
   - Make the required changes
   - Follow the steps listed in the feature

3. Test the feature:
   - Run relevant tests
   - Manually verify functionality
   - Check for regressions

4. Mark complete:
   - Edit feature_list.json
   - Set `"passes": true` for this feature
   - ONLY if testing confirmed it works

5. Commit:
   ```bash
   git add .
   git commit -m "COD-XX-YYY: Brief description of change"
   ```

6. Move to next feature or end session

### END OF SESSION
1. Ensure all changes committed
2. Update claude-progress.txt:
   ```
   [DATE TIME] Session #N - Completed COD-XX-YYY: description
   - What was done
   - Any issues found
   - Next recommended action
   ```
3. Leave codebase in clean, working state

## Rules
- ONE feature at a time
- Test BEFORE marking complete
- Commit AFTER each feature
- Update progress file EVERY session
- NEVER mark something complete without testing
- NEVER push to GitHub (local commits only)

## Priority Features (COD-11 - URGENT)
1. COD-11-001: JWT secret to env variable
2. COD-11-002: bcrypt for passwords
3. COD-11-003: Rate limiting
4. COD-11-004: CORS configuration
5. COD-11-005: URL validation
6. COD-11-006: Helmet.js headers

Complete ALL COD-11 features before moving to COD-9.

## Linear Tracking
Your work maps to Linear issues:
- COD-11: https://linear.app/code-masters/issue/COD-11
- COD-9: https://linear.app/code-masters/issue/COD-9
- COD-10: https://linear.app/code-masters/issue/COD-10

The user monitors progress in Linear at:
https://linear.app/code-masters/project/merlin-website-cloner-0102a6dc2777
