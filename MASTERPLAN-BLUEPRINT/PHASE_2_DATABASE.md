# Phase 2: Database (COD-9)

## Status: ⬚ NOT STARTED (0%)

## Linear Issue: COD-9
## Priority: 🟠 HIGH

---

## Overview
Migrate from in-memory/file storage to PostgreSQL with Prisma ORM for production-ready data persistence.

---

## Prerequisites
- [ ] Phase 1 (Security) complete
- [ ] PostgreSQL installed locally or Azure connection

---

## Steps (30 Total)

### 2.1 Prisma Setup
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-001 | Install Prisma ORM | ⬚ | ⬚ | ⬚ |
| COD-09-002 | Initialize with PostgreSQL | ⬚ | ⬚ | ⬚ |
| COD-09-003 | Add DATABASE_URL to .env | ⬚ | ⬚ | ⬚ |

### 2.2 User Model
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-004 | Create User model | ⬚ | ⬚ | ⬚ |
| COD-09-005 | Add email uniqueness | ⬚ | ⬚ | ⬚ |

### 2.3 CloneJob Model
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-006 | Create CloneJob model | ⬚ | ⬚ | ⬚ |
| COD-09-007 | Add User-CloneJob relation | ⬚ | ⬚ | ⬚ |

### 2.4 Subscription Model
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-008 | Create Subscription model | ⬚ | ⬚ | ⬚ |
| COD-09-009 | Add User-Subscription relation | ⬚ | ⬚ | ⬚ |

### 2.5 Payment Model
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-010 | Create Payment model | ⬚ | ⬚ | ⬚ |

### 2.6 Database Operations
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-011 | Run initial migration | ⬚ | ⬚ | ⬚ |
| COD-09-012 | Generate Prisma client | ⬚ | ⬚ | ⬚ |
| COD-09-013 | Create DB connection singleton | ⬚ | ⬚ | ⬚ |

### 2.7 Service Migration
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-014 | Migrate auth to Prisma | ⬚ | ⬚ | ⬚ |
| COD-09-015 | Migrate clone jobs to Prisma | ⬚ | ⬚ | ⬚ |

### 2.8 Optimization
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-016 | Add database indexes | ⬚ | ⬚ | ⬚ |
| COD-09-017 | Add soft delete support | ⬚ | ⬚ | ⬚ |
| COD-09-018 | Create seed script | ⬚ | ⬚ | ⬚ |
| COD-09-019 | Add connection pooling | ⬚ | ⬚ | ⬚ |

### 2.9 Additional Models
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-020 | Create CloneAsset model | ⬚ | ⬚ | ⬚ |
| COD-09-021 | Add CloneJob-Asset relation | ⬚ | ⬚ | ⬚ |
| COD-09-022 | Create AuditLog model | ⬚ | ⬚ | ⬚ |

### 2.10 Health & Backup
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-023 | Add DB health endpoint | ⬚ | ⬚ | ⬚ |
| COD-09-024 | Create backup script | ⬚ | ⬚ | ⬚ |
| COD-09-025 | Document rollback procedure | ⬚ | ⬚ | ⬚ |

### 2.11 Enums & Constraints
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-026 | Create CloneJob status enum | ⬚ | ⬚ | ⬚ |
| COD-09-027 | Create Subscription plan enum | ⬚ | ⬚ | ⬚ |
| COD-09-028 | Add cascading deletes | ⬚ | ⬚ | ⬚ |

### 2.12 Testing
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-09-029 | Create test DB config | ⬚ | ⬚ | ⬚ |
| COD-09-030 | Document all models | ⬚ | ⬚ | ⬚ |

---

## Progress: 0/30 (0%)

---

*Phase 2 Target: After Phase 1*
