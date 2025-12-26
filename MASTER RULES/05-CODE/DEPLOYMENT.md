# Deployment Rules

## Docker Requirements

All production deployments MUST use Docker.

### Required Files
- `Dockerfile` - Multi-stage build
- `docker-compose.yml` - Full stack with PostgreSQL + Redis
- `.dockerignore` - Exclude node_modules, .git, etc.

### Container Standards
```yaml
services:
  app:
    - Non-root user (security)
    - Health checks
    - Resource limits
  db:
    - PostgreSQL 16+
    - Health checks
    - Persistent volumes
  redis:
    - Redis 7+
    - Append-only mode
    - Health checks
```

### Environment Variables
- NEVER hardcode secrets in Dockerfile
- Use `.env` files or Docker secrets
- All URLs must be configurable (no hardcoded localhost)

---

## CI/CD Pipeline

### GitHub Actions Workflows

**1. Test Workflow** (`.github/workflows/test.yml`)
- Runs on every push and PR
- Linting (ESLint)
- Type checking (tsc)
- Unit tests
- Integration tests

**2. Build Workflow** (`.github/workflows/build.yml`)
- Builds Docker image
- Pushes to container registry
- Tags with git SHA and version

**3. Deploy Workflow** (`.github/workflows/deploy.yml`)
- Deploys to staging on merge to `develop`
- Deploys to production on merge to `main`
- Requires manual approval for production

### Branch Strategy
```
main        → Production
develop     → Staging
feature/*   → Feature branches
hotfix/*    → Emergency fixes
```

---

## Environment Configuration

### .env Structure
```env
# Server
NODE_ENV=development|staging|production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Cache
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=<random-string>

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional Services
SENTRY_DSN=
FIRECRAWL_API_KEY=
```

### Never Commit
- `.env` (use `.env.example` as template)
- API keys, tokens, passwords
- Production database URLs

---

## Health Checks

### Required Endpoints
```typescript
// GET /health - Basic health
{ status: 'healthy', uptime: 12345 }

// GET /api/health - Detailed health
{
  status: 'healthy',
  version: '1.0.0',
  database: 'connected',
  redis: 'connected',
  uptime: 12345
}
```

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider http://localhost:3000/health || exit 1
```

---

## Scaling Guidelines

### Horizontal Scaling
- Stateless application design
- Session storage in Redis
- Database connection pooling
- Load balancer ready

### Vertical Scaling
- Memory limits per container
- CPU limits per container
- Auto-scaling triggers

---

## Rollback Strategy

1. Keep last 3 Docker image versions
2. Use blue-green or canary deployments
3. Database migrations must be reversible
4. Feature flags for risky changes

---

**Remember: If it doesn't run in Docker, it doesn't ship.**
