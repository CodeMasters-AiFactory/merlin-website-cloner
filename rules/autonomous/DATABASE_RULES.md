# Database Rules

## Schema Design

### Naming Conventions
- Tables: PascalCase singular (`User`, `CloneJob`)
- Columns: camelCase (`createdAt`, `userId`)
- Foreign keys: `<relation>Id` (`userId`, `jobId`)
- Indexes: `idx_<table>_<columns>`
- Constraints: `<table>_<column>_<type>`

### Required Fields (Every Table)
```prisma
model Example {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Soft Delete Pattern
```prisma
model User {
  // ...
  deletedAt DateTime?
  isDeleted Boolean   @default(false)
}
```

## Prisma Best Practices

### Always Do
```typescript
// Use transactions for multiple operations
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.profile.create({ data: profileData }),
]);

// Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }
});

// Use pagination
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

### Never Do
```typescript
// Never fetch all without limit
const allUsers = await prisma.user.findMany(); // BAD

// Never use raw queries with user input
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`; // DANGEROUS
```

## Migration Rules

### Before Migration
1. Backup database (if production data)
2. Review migration SQL
3. Test on dev first
4. Check for data loss potential

### Migration Commands
```bash
# Create migration
npx prisma migrate dev --name descriptive_name

# Apply migration
npx prisma migrate deploy

# Reset database (dev only!)
npx prisma migrate reset

# Generate client
npx prisma generate
```

### Migration Naming
```
YYYYMMDD_HHMMSS_descriptive_name
20241220_143000_add_user_email_index
20241220_150000_create_clone_job_table
```

## Query Optimization

### Index Rules
- Index foreign keys
- Index frequently queried columns
- Index columns used in WHERE
- Index columns used in ORDER BY
- Compound indexes for multi-column queries

### Query Patterns
```typescript
// GOOD - Uses index
await prisma.cloneJob.findMany({
  where: { userId: id },
  orderBy: { createdAt: 'desc' },
});

// BAD - Full table scan
await prisma.cloneJob.findMany({
  where: { 
    originalUrl: { contains: 'example' }  // No index on LIKE
  },
});
```

## Data Integrity

### Constraints
- Use `@unique` for unique fields
- Use `@relation` for foreign keys
- Use `onDelete` cascade or restrict
- Use enums for fixed values

### Validation
- Validate at API level before DB
- Use database constraints as backup
- Never trust client data

## Connection Management

### Connection Pool
```typescript
// In production
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Singleton pattern
declare global {
  var prisma: PrismaClient | undefined;
}
export const db = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;
```

### Connection Limits
- Dev: 5 connections
- Prod: 20 connections
- Always close on shutdown

## Fallback Strategy

### When PostgreSQL Unavailable
1. Log the error
2. Switch to JSON file storage
3. Queue operations for later sync
4. Notify user of degraded mode
5. Attempt reconnection periodically

### JSON Fallback Location
```
data/
├── users.json
├── clone-jobs.json
└── settings.json
```
