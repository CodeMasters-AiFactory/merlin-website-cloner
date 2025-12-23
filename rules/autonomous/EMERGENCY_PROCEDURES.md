# Emergency Procedures

## Severity Definitions

### SEV-1: Critical (Production Down)
- System completely unavailable
- Data loss occurring
- Security breach active
- Response: Immediate, all hands

### SEV-2: Major (Significant Impact)
- Major feature broken
- Performance severely degraded
- Partial data loss
- Response: Within 1 hour

### SEV-3: Minor (Limited Impact)
- Non-critical feature broken
- Workaround available
- No data loss
- Response: Within 24 hours

### SEV-4: Low (Minimal Impact)
- Cosmetic issues
- Minor bugs
- Documentation errors
- Response: Normal queue

## Emergency Response Procedures

### Production System Down
```
1. VERIFY the outage
   - Check from multiple sources
   - Confirm not a local issue
   
2. ASSESS the scope
   - What's affected?
   - How many users impacted?
   - When did it start?
   
3. COMMUNICATE
   - Alert stakeholders immediately
   - Post status update
   
4. DIAGNOSE
   - Check logs
   - Check recent deployments
   - Check external dependencies
   
5. REMEDIATE
   - If recent deploy: rollback
   - If external: wait/failover
   - If code bug: hotfix
   
6. VERIFY fix
   - Confirm system operational
   - Monitor closely
   
7. POST-MORTEM
   - Document what happened
   - Document resolution
   - Identify prevention measures
```

### Security Breach
```
1. CONTAIN immediately
   - Disable compromised credentials
   - Block suspicious IPs
   - Isolate affected systems
   
2. PRESERVE evidence
   - Screenshot everything
   - Export logs
   - Don't modify/delete evidence
   
3. ASSESS scope
   - What was accessed?
   - What data exposed?
   - How long was exposure?
   
4. NOTIFY
   - Alert human immediately
   - Document for legal/compliance
   
5. REMEDIATE
   - Rotate all credentials
   - Patch vulnerability
   - Review access logs
   
6. DOCUMENT
   - Timeline of events
   - Actions taken
   - Lessons learned
```

### Data Corruption
```
1. STOP writes immediately
   - Prevent further corruption
   - Put system in read-only if possible
   
2. ASSESS scope
   - What data affected?
   - Can we identify good data?
   - Do we have backups?
   
3. BACKUP current state
   - Even if corrupted
   - For forensics
   
4. RESTORE from backup
   - Identify last good backup
   - Test backup integrity
   - Restore to separate environment first
   
5. VERIFY data
   - Check restored data is correct
   - Identify any gaps
   
6. COMMUNICATE
   - Inform affected users
   - Document data loss
```

### Memory/Disk Full
```
1. IDENTIFY the cause
   - What's using resources?
   - Is it a leak or legitimate?
   
2. FREE immediate space
   - Clear caches
   - Delete temp files
   - Kill memory hogs
   
3. PREVENT recurrence
   - Add monitoring
   - Set up alerts
   - Add cleanup cron jobs
   
4. ROOT CAUSE
   - Why did this happen?
   - Fix the underlying issue
```

## Rollback Procedures

### Application Rollback
```bash
# Identify last good version
git log --oneline -10

# Checkout previous version
git checkout <commit-hash>

# Deploy
npm run build && npm start

# Verify
curl http://localhost:3000/api/health
```

### Database Rollback
```bash
# List migrations
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# Or restore from backup
pg_restore -d database_name backup_file.sql
```

### Configuration Rollback
```bash
# Git shows config history
git log --oneline -- .env.example

# Restore previous config
git checkout <commit> -- .env.example
```

## Emergency Contacts

### Escalation Path
1. Automated alerts → Check system status
2. Self-remediation → Try standard fixes
3. Document & wait → If requires human decision
4. Never make production changes without explicit approval

## Post-Incident

### Immediate (Within 1 Hour)
- [ ] Incident documented
- [ ] Timeline created
- [ ] Root cause identified
- [ ] Immediate fix applied
- [ ] System verified working

### Follow-Up (Within 24 Hours)
- [ ] Full post-mortem written
- [ ] Action items identified
- [ ] Prevention measures planned
- [ ] Monitoring updated
- [ ] Team notified

### Post-Mortem Template
```markdown
## Incident Summary
**Date:** YYYY-MM-DD
**Duration:** X hours
**Severity:** SEV-X
**Impact:** Description of impact

## Timeline
- HH:MM - First alert
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Resolved

## Root Cause
What actually caused the incident

## Resolution
What was done to fix it

## Prevention
What will prevent this in future

## Action Items
- [ ] Action 1 - Owner - Due date
- [ ] Action 2 - Owner - Due date
```
