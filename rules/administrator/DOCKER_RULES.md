# Docker Management Rules

## Docker Installation

### Install Docker Desktop
```powershell
# Via Winget
winget install Docker.DockerDesktop

# Via Chocolatey
choco install docker-desktop -y
```

### Post-Installation
```powershell
# Add user to docker-users group
Add-LocalGroupMember -Group "docker-users" -Member $env:USERNAME

# Restart required
Restart-Computer
```

## Docker Commands

### Container Management
```powershell
# List containers
docker ps          # Running only
docker ps -a       # All containers

# Start/Stop/Restart
docker start <container>
docker stop <container>
docker restart <container>

# Remove container
docker rm <container>
docker rm -f <container>  # Force

# Remove all stopped
docker container prune
```

### Image Management
```powershell
# List images
docker images

# Pull image
docker pull node:20-alpine
docker pull postgres:16

# Remove image
docker rmi <image>

# Remove unused images
docker image prune -a
```

### Run Containers
```powershell
# Basic run
docker run -d --name my-app -p 3000:3000 my-image

# With environment variables
docker run -d --name my-app -e NODE_ENV=production -p 3000:3000 my-image

# With volume mount
docker run -d --name my-app -v ${PWD}:/app -p 3000:3000 my-image

# With restart policy
docker run -d --name my-app --restart unless-stopped -p 3000:3000 my-image
```

### Container Logs
```powershell
# View logs
docker logs <container>

# Follow logs
docker logs -f <container>

# Tail logs
docker logs --tail 100 <container>
```

### Execute in Container
```powershell
# Run command
docker exec <container> ls -la

# Interactive shell
docker exec -it <container> /bin/bash
docker exec -it <container> /bin/sh
```

## Docker Compose

### Basic Commands
```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Scale service
docker-compose up -d --scale web=3
```

### Example docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/merlin
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=merlin
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Docker Cleanup

### Full Cleanup
```powershell
# Remove all stopped containers
docker container prune -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Remove all unused networks
docker network prune -f

# Nuclear option - remove everything
docker system prune -a --volumes -f
```

### Check Disk Usage
```powershell
docker system df
docker system df -v
```

## Building Images

### Dockerfile Best Practices
```dockerfile
# Use specific version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build if needed
RUN npm run build

# Expose port
EXPOSE 3000

# Run as non-root
USER node

# Start
CMD ["node", "dist/server.js"]
```

### Build Commands
```powershell
# Build image
docker build -t my-app:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t my-app:prod .

# Build with build args
docker build --build-arg NODE_ENV=production -t my-app .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t my-app .
```

## Docker Networks

```powershell
# List networks
docker network ls

# Create network
docker network create my-network

# Connect container to network
docker network connect my-network my-container

# Inspect network
docker network inspect my-network
```

## Docker Volumes

```powershell
# List volumes
docker volume ls

# Create volume
docker volume create my-volume

# Inspect volume
docker volume inspect my-volume

# Backup volume
docker run --rm -v my-volume:/data -v ${PWD}:/backup alpine tar cvf /backup/backup.tar /data
```

## Development Workflow

```powershell
# Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose logs -f backend

# Rebuild single service
docker-compose up -d --build backend

# Stop and remove
docker-compose down -v  # -v removes volumes
```
