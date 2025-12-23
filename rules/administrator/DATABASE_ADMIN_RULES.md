# Database Administration Rules

## PostgreSQL

### Installation
```powershell
# Via Winget
winget install PostgreSQL.PostgreSQL

# Via Chocolatey
choco install postgresql -y
```

### Service Management
```powershell
# Check status
Get-Service -Name "postgresql*"

# Start/Stop
Start-Service -Name "postgresql-x64-16"
Stop-Service -Name "postgresql-x64-16"
Restart-Service -Name "postgresql-x64-16"
```

### Connection
```powershell
# Connect via psql
psql -U postgres -d merlin

# With host and port
psql -h localhost -p 5432 -U postgres -d merlin
```

### Common Commands (psql)
```sql
-- List databases
\l

-- Connect to database
\c database_name

-- List tables
\dt

-- Describe table
\d table_name

-- List users
\du

-- Execute SQL file
\i /path/to/file.sql

-- Exit
\q
```

### Database Management
```sql
-- Create database
CREATE DATABASE merlin;

-- Create user
CREATE USER merlin_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE merlin TO merlin_user;

-- Drop database (CAREFUL!)
DROP DATABASE IF EXISTS merlin;
```

### Backup & Restore
```powershell
# Backup single database
pg_dump -U postgres -d merlin -F c -f backup.dump

# Backup all databases
pg_dumpall -U postgres -f all_databases.sql

# Restore
pg_restore -U postgres -d merlin -F c backup.dump

# Restore from SQL
psql -U postgres -d merlin -f backup.sql
```

## MongoDB

### Installation
```powershell
winget install MongoDB.Server
```

### Service Management
```powershell
Get-Service -Name "MongoDB"
Start-Service -Name "MongoDB"
Stop-Service -Name "MongoDB"
```

### Connection
```powershell
# MongoDB shell
mongosh

# With URI
mongosh "mongodb://localhost:27017/merlin"
```

### Common Commands
```javascript
// Show databases
show dbs

// Use database
use merlin

// Show collections
show collections

// Find documents
db.users.find()

// Insert document
db.users.insertOne({ name: "test" })
```

## Redis

### Installation
```powershell
# Windows (Memurai - Redis compatible)
winget install Memurai.MemuraiDeveloper

# Or via Docker
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Connection
```powershell
# Redis CLI
redis-cli

# With host
redis-cli -h localhost -p 6379
```

### Common Commands
```bash
# Test connection
PING

# Set key
SET mykey "myvalue"

# Get key
GET mykey

# Delete key
DEL mykey

# List all keys
KEYS *

# Flush database (CAREFUL!)
FLUSHDB
```

## SQLite

### Usage with Node.js
```powershell
# Install better-sqlite3
npm install better-sqlite3

# Or sql.js for pure JS
npm install sql.js
```

### CLI Tools
```powershell
# Install SQLite CLI
winget install SQLite.SQLite
```

## Prisma ORM

### Commands
```powershell
# Initialize Prisma
npx prisma init

# Generate client
npx prisma generate

# Push schema to DB (development)
npx prisma db push

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (CAREFUL!)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Pull schema from existing DB
npx prisma db pull

# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

### Database URL Formats
```
# PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# MySQL
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"

# SQLite
DATABASE_URL="file:./dev.db"

# MongoDB
DATABASE_URL="mongodb://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Database Health Checks

### PostgreSQL
```powershell
# Check connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('merlin'));"

# Check table sizes
psql -U postgres -d merlin -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"
```

### Automated Backup Script
```powershell
# Daily backup script
$date = Get-Date -Format "yyyyMMdd"
$backupPath = "D:\Backups\PostgreSQL"
$database = "merlin"

# Create backup directory
New-Item -ItemType Directory -Path $backupPath -Force

# Run backup
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d $database -F c -f "$backupPath\${database}_${date}.dump"

# Remove backups older than 30 days
Get-ChildItem $backupPath -Filter "*.dump" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force

Write-Host "Backup completed: ${database}_${date}.dump"
```
