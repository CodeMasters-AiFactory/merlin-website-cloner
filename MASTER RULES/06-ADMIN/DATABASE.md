# Database Administration Rules

## PostgreSQL

### Connection
```powershell
# Connect via psql
psql -U postgres -d stargate

# Connection string
postgresql://username:password@localhost:5432/database
```

### Common Commands
```sql
-- List databases
\l

-- Connect to database
\c stargate

-- List tables
\dt

-- Describe table
\d table_name

-- List users
\du

-- Create database
CREATE DATABASE stargate;

-- Create user
CREATE USER appuser WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE stargate TO appuser;
```

### Backup/Restore
```powershell
# Backup
pg_dump -U postgres stargate > backup.sql

# Restore
psql -U postgres stargate < backup.sql
```

---

## Drizzle ORM

### Commands
```powershell
# Generate migrations
npx drizzle-kit generate:pg

# Push schema (dev)
npx drizzle-kit push:pg

# Run migrations
npx drizzle-kit migrate

# Open studio
npx drizzle-kit studio
```

### Schema Example
```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Redis

### Commands
```powershell
# Connect
redis-cli

# Basic operations
SET key "value"
GET key
DEL key
KEYS *

# List operations
LPUSH list "item"
LRANGE list 0 -1

# Flush
FLUSHDB          # Current database
FLUSHALL         # All databases
```

---

## MongoDB

### Commands
```powershell
# Connect
mongosh

# Basic operations
use database
db.collection.find()
db.collection.insertOne({})
db.collection.updateOne({}, {$set: {}})
db.collection.deleteOne({})
```

---

## Database Rules

### ALWAYS DO:
- Use parameterized queries (prevent SQL injection)
- Back up before migrations
- Use transactions for related operations
- Index frequently queried columns

### NEVER DO:
- Store passwords in plain text
- Drop tables in production without backup
- Run migrations on production without testing
- Give apps direct database access (use API)

### ASK BEFORE:
- Dropping databases
- Dropping tables
- Running destructive migrations
- Deleting data

---

## Connection Strings

### Environment Variables
```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/stargate

# MongoDB
MONGODB_URL=mongodb://localhost:27017/stargate

# Redis
REDIS_URL=redis://localhost:6379
```

---

## Troubleshooting

### Can't connect
```powershell
# Check if service running
Get-Service postgresql*
netstat -ano | findstr :5432

# Check credentials
psql -U postgres
```

### Slow queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';

-- Check slow queries
EXPLAIN ANALYZE SELECT ...;
```

### Out of connections
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle';
```
