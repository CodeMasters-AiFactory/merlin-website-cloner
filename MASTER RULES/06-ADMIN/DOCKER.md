# Docker Management Rules

## Basic Commands

```powershell
# Containers
docker ps                         # List running
docker ps -a                      # List all
docker start <container>          # Start
docker stop <container>           # Stop
docker restart <container>        # Restart
docker rm <container>             # Remove
docker logs <container>           # View logs
docker logs -f <container>        # Follow logs

# Images
docker images                     # List images
docker pull <image>               # Pull image
docker rmi <image>                # Remove image
docker build -t <name> .          # Build from Dockerfile

# Execute
docker exec -it <container> bash  # Shell into container
docker exec <container> <cmd>     # Run command
```

---

## Docker Compose

```powershell
# Start
docker-compose up                 # Foreground
docker-compose up -d              # Background (detached)

# Stop
docker-compose down               # Stop and remove
docker-compose stop               # Stop only

# Rebuild
docker-compose build              # Build images
docker-compose up --build         # Build and start

# Logs
docker-compose logs               # All services
docker-compose logs -f <service>  # Follow specific

# Status
docker-compose ps                 # List services
```

---

## Common Docker Compose Files

### PostgreSQL
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: stargate
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Redis
```yaml
version: '3.8'
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

### Full Stack
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/stargate
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: stargate
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Cleanup

```powershell
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove all unused
docker system prune

# Nuclear option (removes everything)
docker system prune -a --volumes
```

---

## Troubleshooting

### Container won't start
```powershell
docker logs <container>           # Check logs
docker inspect <container>        # Check config
```

### Port already in use
```powershell
netstat -ano | findstr :5432      # Find what's using it
docker-compose down               # Stop containers
```

### Out of disk space
```powershell
docker system df                  # Check usage
docker system prune -a            # Clean up
```

---

## Rules

### ALWAYS DO:
- Use docker-compose for multi-container apps
- Use volumes for persistent data
- Use environment variables for config
- Clean up unused resources

### NEVER DO:
- Run as root in production
- Store secrets in images
- Use `latest` tag in production
- Ignore container logs
