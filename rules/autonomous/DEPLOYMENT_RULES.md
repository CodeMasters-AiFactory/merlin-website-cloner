# Deployment Rules

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code reviewed (self-review at minimum)
- [ ] No console.log statements
- [ ] No hardcoded secrets

### Configuration
- [ ] Environment variables documented
- [ ] Production configs correct
- [ ] Database migrations ready
- [ ] Secrets in secure storage

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual smoke test completed

### Documentation
- [ ] README up to date
- [ ] API docs current
- [ ] CHANGELOG updated
- [ ] Migration guide (if breaking changes)

## Environment Separation

### Development
- Local machine
- Local/dev database
- Debug logging enabled
- Hot reloading
- No authentication required (optional)

### Staging
- Mirrors production
- Test database
- Production-like logging
- Full authentication
- Test data only

### Production
- Live environment
- Production database
- Error logging only
- Full security
- Real user data

## Docker Deployment

### Dockerfile Best Practices
```dockerfile
# Use specific version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (cache layer)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build
RUN npm run build

# Non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start command
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - db
    restart: unless-stopped
    
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: unless-stopped

volumes:
  postgres_data:
```

## Azure Deployment

### Azure Container Apps
1. Build Docker image
2. Push to Azure Container Registry
3. Deploy to Container App
4. Configure environment variables
5. Set up custom domain (optional)
6. Enable logging

### Commands
```bash
# Build and push
docker build -t merlin-cloner .
docker tag merlin-cloner <acr>.azurecr.io/merlin-cloner
docker push <acr>.azurecr.io/merlin-cloner

# Deploy
az containerapp update --name merlin-cloner \
  --resource-group merlin-rg \
  --image <acr>.azurecr.io/merlin-cloner:latest
```

## Rollback Procedures

### When to Rollback
- Critical bug in production
- Performance degradation > 50%
- Security vulnerability exposed
- Data corruption detected

### Rollback Steps
1. Identify last good version
2. Deploy previous version
3. Verify rollback successful
4. Investigate root cause
5. Fix and redeploy

### Database Rollback
```bash
# Prisma rollback
npx prisma migrate resolve --rolled-back <migration_name>
```

## Health Checks

### Endpoints
```typescript
// /api/health - Basic health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// /api/health/ready - Full readiness
app.get('/api/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
  };
  const healthy = Object.values(checks).every(c => c);
  res.status(healthy ? 200 : 503).json({ checks });
});
```

## Zero-Downtime Deployment

### Strategy
1. Deploy new version alongside old
2. Route traffic gradually
3. Monitor for errors
4. Complete switchover
5. Remove old version

### Blue-Green Deployment
- Blue: Current production
- Green: New version
- Switch DNS/load balancer when ready
- Keep blue for quick rollback

## Post-Deployment

### Verify
- [ ] Application accessible
- [ ] Health checks passing
- [ ] Logs look normal
- [ ] Key features work
- [ ] Performance acceptable

### Monitor
- Watch error rates
- Watch response times
- Watch resource usage
- Watch user feedback
