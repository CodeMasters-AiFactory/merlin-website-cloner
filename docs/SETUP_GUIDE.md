# Setup Guide

Complete setup instructions for Merlin Website Cloner.

## Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) Redis for distributed scraping
- (Optional) PostgreSQL for production database

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd merlin-website-clone
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# JWT Secret (generate a random string)
JWT_SECRET=your-secret-key-here

# Redis (optional, for distributed scraping)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database (optional, for production)
DATABASE_URL=postgresql://user:password@localhost:5432/merlin

# CAPTCHA Services (optional)
CAPTCHA_API_KEY=
CAPSOLVER_API_KEY=
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start Services

#### Development Mode

```bash
# Start both backend and frontend
npm run dev
```

This starts:
- Backend server on http://localhost:3000
- Frontend dev server on http://localhost:5173

#### Production Mode

```bash
# Build everything
npm run build:all

# Start production server
npm start
```

### 5. Verify Installation

1. Open http://localhost:5173 (or http://localhost:3000 in production)
2. Create an account
3. Try cloning a simple website (e.g., https://example.com)

## Optional Setup

### Redis Setup (for Distributed Scraping)

1. Install Redis:
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Windows
# Download from https://redis.io/download
```

2. Start Redis:
```bash
redis-server
```

3. Update `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### PostgreSQL Setup (for Production)

1. Install PostgreSQL
2. Create database:
```sql
CREATE DATABASE merlin;
```

3. Update `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/merlin
```

### Proxy Setup

If using proxies, configure in your config file:

```yaml
proxy:
  enabled: true
  providers:
    - name: provider1
      apiKey: your-api-key
```

### CAPTCHA Service Setup

1. Sign up for 2Captcha or CapSolver
2. Get API key
3. Update `.env`:
```env
CAPTCHA_API_KEY=your-2captcha-key
CAPSOLVER_API_KEY=your-capsolver-key
```

## Directory Structure

```
merlin-website-clone/
├── src/                    # Backend source code
│   ├── server/            # Express server
│   ├── services/          # Core services
│   └── utils/             # Utilities
├── frontend/              # React frontend
│   ├── src/
│   └── dist/              # Built frontend
├── configs/               # Configuration files
├── output/                # Cloned websites
├── cache/                 # Cache storage
├── cookies/               # Cookie storage
├── logs/                  # Application logs
└── package.json
```

## Configuration

### Default Directories

- **Configs**: `./configs`
- **Output**: `./output`
- **Cache**: `./cache`
- **Cookies**: `./cookies`
- **Logs**: `./logs`

### Custom Directories

Set in environment variables or config files.

## Docker Setup (Optional)

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build:all

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Run with Docker

```bash
docker-compose up -d
```

## Production Deployment

### 1. Build Application

```bash
npm run build:all
```

### 2. Set Environment Variables

```bash
export NODE_ENV=production
export JWT_SECRET=your-secret-key
export PORT=3000
```

### 3. Start Server

```bash
npm start
```

### 4. Use Process Manager (PM2)

```bash
npm install -g pm2
pm2 start dist/server/index.js --name merlin-clone
pm2 save
pm2 startup
```

### 5. Use Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Permission Errors

```bash
# Fix permissions
chmod -R 755 .
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Clean build
rm -rf dist frontend/dist
npm run build:all
```

## Performance Tuning

### Increase Node Memory

```bash
node --max-old-space-size=4096 dist/server/index.js
```

### Optimize Concurrency

Adjust in config:
```yaml
concurrency: 10  # Adjust based on system resources
```

### Enable Caching

```yaml
cache:
  enabled: true
  type: redis  # Use Redis for better performance
```

## Security

### 1. Change JWT Secret

Use a strong, random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Enable HTTPS

Use a reverse proxy (Nginx) with SSL certificates.

### 3. Rate Limiting

Configure rate limits in the server.

### 4. Authentication

Always use authentication in production.

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Metrics

```bash
curl http://localhost:3000/metrics
```

### Logs

Check logs in `./logs` directory.

## Support

For issues or questions:
1. Check documentation
2. Review logs
3. Check GitHub issues
4. Contact support

