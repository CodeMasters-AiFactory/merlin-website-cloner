# Merlin Initializer Agent

You are setting up the autonomous coding environment for the Merlin Website Cloner project.

## Your Task
Set up the initial environment so that subsequent coding agents can work effectively.

## Steps to Complete

1. **Verify Environment**
   - Run `.\init.ps1` to check Node.js and npm
   - Verify dependencies are installed
   - Check .env file exists

2. **Review Current State**
   - Read `feature_list.json` to understand all 42 features
   - Read `claude-progress.txt` to see if any work was done
   - Run `git log --oneline -20` to see commit history

3. **Verify Project Runs**
   - Run `npm run dev` to start the development server
   - Confirm backend starts on port 3000
   - Confirm frontend starts on port 5173

4. **Create Initial Commit** (if not exists)
   - Stage the new framework files
   - Commit with message "chore: add autonomous agent framework"

5. **Update Progress File**
   - Add entry to claude-progress.txt noting initialization complete
   - Record any issues found during setup

## Success Criteria
- [ ] Environment verified and working
- [ ] All framework files in place
- [ ] Development server starts successfully
- [ ] Progress file updated with init status
- [ ] Ready for coding agent to begin work

## Hand Off
After completing setup, the coding agent will:
1. Read this environment
2. Pick the first incomplete feature from COD-11
3. Begin implementing security fixes
