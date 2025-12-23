# Backup & Recovery Rules

## What to Backup

### Critical (Daily)
- Database (full dump)
- User uploads
- Configuration files
- Secrets/credentials (encrypted)

### Important (Weekly)
- Application code (Git is backup)
- Docker images
- Documentation
- Logs (archived)

### Nice-to-Have (Monthly)
- Development data
- Test results
- Metrics history

## Backup Strategy

### 3-2-1 Rule
- **3** copies of data
- **2** different storage types
- **1** offsite backup

### Retention Policy
| Type | Retention |
|------|-----------|
| Daily | 7 days |
| Weekly | 4 weeks |
| Monthly | 12 months |
| Yearly | Forever |

## Database Backup

### PostgreSQL
```bash
# Full backup
pg_dump -h localhost -U user -d database > backup_$(date +%Y%m%d).sql

# Compressed
pg_dump -h localhost -U user -d database | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated script
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

### JSON Fallback (Local)
```typescript
async function backupJsonData(): Promise<void> {
  const data = {
    users: await readJsonFile('data/users.json'),
    jobs: await readJsonFile('data/clone-jobs.json'),
    settings: await readJsonFile('data/settings.json'),
  };
  
  const backupPath = `backups/json_${Date.now()}.json`;
  await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
}
```

## File Backup

### Clone Results
```bash
# Backup clones directory
tar -czf clones_backup_$(date +%Y%m%d).tar.gz clones/

# Sync to remote (if configured)
rsync -avz clones/ remote:/backups/clones/
```

### Configuration
```bash
# Backup config files
tar -czf config_backup.tar.gz .env.example prisma/schema.prisma package.json
```

## Recovery Procedures

### Database Recovery
```bash
# Restore from backup
gunzip < backup_20241220.sql.gz | psql -h localhost -U user -d database

# Or
pg_restore -h localhost -U user -d database backup.dump

# Verify restoration
psql -h localhost -U user -d database -c "SELECT COUNT(*) FROM users;"
```

### Application Recovery
```bash
# Clone from Git
git clone <repo-url> merlin-cloner

# Install dependencies
cd merlin-cloner
npm install

# Restore config
cp /backups/config/.env .env

# Run migrations
npx prisma migrate deploy

# Start
npm run build && npm start
```

## Disaster Recovery Plan

### RTO & RPO
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 24 hours (daily backup)

### Recovery Steps
```
1. Assess damage (15 min)
   - What failed?
   - What data affected?
   
2. Provision infrastructure (30 min)
   - New server/container
   - Database instance
   
3. Restore application (30 min)
   - Clone code from Git
   - Deploy application
   
4. Restore database (1 hour)
   - Restore from latest backup
   - Verify data integrity
   
5. Restore configuration (15 min)
   - Environment variables
   - Secrets
   
6. Verify functionality (1 hour)
   - Run health checks
   - Test critical paths
   
7. Switch traffic (30 min)
   - Update DNS/load balancer
   - Monitor for issues
```

## Backup Verification

### Weekly Test
```bash
# Test database restore
pg_restore --dbname=test_restore backup.dump
psql -d test_restore -c "SELECT COUNT(*) FROM users;"
dropdb test_restore
```

### Monthly Drill
- Full disaster recovery test
- Measure actual RTO
- Document issues
- Update procedures

## Automated Backups

### Cron Schedule
```bash
# Daily database backup at 2 AM
0 2 * * * /scripts/backup_db.sh

# Weekly full backup on Sunday
0 3 * * 0 /scripts/backup_full.sh

# Hourly config backup
0 * * * * /scripts/backup_config.sh
```

### Monitoring
- Alert if backup fails
- Alert if backup size unexpected
- Alert if backup not created
- Weekly backup success report

## Never Do

- Skip backup verification
- Keep backups only locally
- Store unencrypted sensitive backups
- Delete old backups without retention policy
- Forget to backup before major changes
- Assume backups work without testing
