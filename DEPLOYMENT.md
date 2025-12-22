# Deployment Guide - Merlin Website Clone

Complete guide for deploying the full-stack application to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database set up (PostgreSQL recommended)
- [ ] Frontend built (`cd frontend && npm run build`)
- [ ] Backend built (`npm run build`)
- [ ] Security measures implemented
- [ ] SSL certificate configured
- [ ] Domain name configured

## Deployment Options

### Option 1: Single Server (Recommended for Start)

1. **Server Requirements:**
   - Node.js 18+
   - 2GB+ RAM
   - 10GB+ storage

2. **Steps:**
   ```bash
   # Clone repository
   git clone <repo-url>
   cd merlin-website-clone
   
   # Install dependencies
   npm install
   cd frontend && npm install && cd ..
   
   # Build
   npm run build
   cd frontend && npm run build && cd ..
   
   # Set environment variables
   cp .env.example .env
   # Edit .env with production values
   
   # Start with PM2
   npm install -g pm2
   pm2 start dist/server/index.js --name merlin-clone
   pm2 save
   pm2 startup
   ```

3. **Nginx Reverse Proxy:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS builder
   
   # Build frontend
   WORKDIR /app/frontend
   COPY frontend/package*.json ./
   RUN npm ci
   COPY frontend/ .
   RUN npm run build
   
   # Build backend
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   # Production image
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/frontend/dist ./frontend/dist
   
   EXPOSE 3000
   CMD ["node", "dist/server/index.js"]
   ```

2. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - PORT=3000
         - NODE_ENV=production
         - DATABASE_URL=postgresql://user:pass@db:5432/merlin
       volumes:
         - ./clones:/app/clones
       depends_on:
         - db
     
     db:
       image: postgres:15
       environment:
         - POSTGRES_DB=merlin
         - POSTGRES_USER=user
         - POSTGRES_PASSWORD=pass
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

3. **Deploy:**
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Platforms

#### Vercel (Frontend) + Railway/Render (Backend)

**Frontend (Vercel):**
1. Connect GitHub repo
2. Set build command: `cd frontend && npm install && npm run build`
3. Set output directory: `frontend/dist`

**Backend (Railway/Render):**
1. Connect GitHub repo
2. Set build command: `npm install && npm run build`
3. Set start command: `npm start`
4. Add environment variables

#### AWS/GCP/Azure

Use container services (ECS, Cloud Run, Container Instances) with Docker image.

## Environment Variables

Production `.env`:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

## Database Migration

If using PostgreSQL:

1. **Create tables:**
   ```sql
   CREATE TABLE users (
     id VARCHAR PRIMARY KEY,
     email VARCHAR UNIQUE NOT NULL,
     name VARCHAR NOT NULL,
     password_hash VARCHAR NOT NULL,
     plan VARCHAR NOT NULL,
     pages_used INTEGER DEFAULT 0,
     pages_limit INTEGER NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE jobs (
     id VARCHAR PRIMARY KEY,
     user_id VARCHAR REFERENCES users(id),
     url VARCHAR NOT NULL,
     status VARCHAR NOT NULL,
     progress INTEGER DEFAULT 0,
     pages_cloned INTEGER DEFAULT 0,
     assets_captured INTEGER DEFAULT 0,
     output_dir VARCHAR NOT NULL,
     export_path VARCHAR,
     created_at TIMESTAMP DEFAULT NOW(),
     completed_at TIMESTAMP
   );
   ```

2. **Update `src/server/database.ts`** to use PostgreSQL client

## Security Hardening

1. **Use proper JWT:**
   ```bash
   npm install jsonwebtoken
   ```

2. **Use bcrypt for passwords:**
   ```bash
   npm install bcrypt
   ```

3. **Add rate limiting:**
   ```bash
   npm install express-rate-limit
   ```

4. **Enable HTTPS:**
   - Use Let's Encrypt for free SSL
   - Configure Nginx/Apache for SSL termination

5. **Input validation:**
   ```bash
   npm install express-validator
   ```

## Monitoring

1. **Health Checks:**
   - Endpoint: `GET /api/health`
   - Monitor every 60 seconds

2. **Logging:**
   - Use Winston or Pino
   - Log to files and/or cloud service

3. **Error Tracking:**
   - Integrate Sentry or similar
   - Track job failures

## Scaling

### Horizontal Scaling

1. Use load balancer (Nginx, AWS ALB)
2. Multiple backend instances
3. Shared database (PostgreSQL)
4. Shared storage for clones (S3, NFS)

### Vertical Scaling

1. Increase server resources
2. Optimize Puppeteer memory usage
3. Use connection pooling for database

## Backup Strategy

1. **Database:**
   - Daily PostgreSQL dumps
   - Store in S3/cloud storage

2. **Clones:**
   - Archive old clones
   - Move to cold storage after 30 days

3. **Configuration:**
   - Version control all configs
   - Document all changes

## Maintenance

### Regular Tasks

- [ ] Monitor disk space (clones directory)
- [ ] Review failed jobs
- [ ] Update dependencies monthly
- [ ] Review security patches
- [ ] Backup database weekly
- [ ] Monitor performance metrics

### Updates

```bash
# Pull latest code
git pull

# Update dependencies
npm install
cd frontend && npm install && cd ..

# Rebuild
npm run build
cd frontend && npm run build && cd ..

# Restart
pm2 restart merlin-clone
# or
docker-compose restart
```

## Support & Troubleshooting

### Common Issues

1. **Out of Memory:**
   - Increase server RAM
   - Limit concurrent clones
   - Optimize Puppeteer

2. **Disk Space:**
   - Clean old clones
   - Implement retention policy
   - Use external storage

3. **Slow Performance:**
   - Check database indexes
   - Optimize queries
   - Add caching layer

### Logs

```bash
# PM2 logs
pm2 logs merlin-clone

# Docker logs
docker-compose logs -f

# Application logs
tail -f logs/app.log
```

## Success Metrics

Track:
- Clone success rate
- Average clone time
- User signups
- API usage
- Error rates
- Server resources

---

**Ready to deploy!** 🚀

