# Resource Management Rules

## Process Management

### Running Processes
- Track all processes you start
- Kill processes when done
- Don't leave zombie processes
- Check for existing processes before starting new

### Commands
```bash
# Check what's running
tasklist | findstr node
netstat -ano | findstr :3000

# Kill by PID
taskkill /F /PID <pid>

# Kill all node
taskkill /F /IM node.exe
```

### Port Management
| Service | Port | Check Command |
|---------|------|---------------|
| Backend | 3000 | `curl localhost:3000/api/health` |
| Frontend | 5000 | `curl localhost:5000` |
| Prisma Studio | 5555 | Browser |
| Database | 5432 | `pg_isready` |

## Memory Management

### Browser Instances (Puppeteer)
- Close pages when done
- Close browsers when done
- Limit concurrent pages (max 5)
- Use incognito for isolation
- Clear cache periodically

```typescript
// GOOD
const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  // ... work
  await page.close();
} finally {
  await browser.close();
}

// BAD
const browser = await puppeteer.launch();
const page = await browser.newPage();
// ... work
// Browser left open!
```

### File Handles
- Close file streams after use
- Use `using` or try/finally
- Don't keep files locked

### Database Connections
- Use connection pooling
- Don't create new connections per request
- Close connections in cleanup

## Disk Space

### Monitor
- Check available space before large operations
- Warn if < 1GB free
- Stop if < 500MB free

### Clean Up
```bash
# Remove old clones (keep last 10)
cd clones && ls -t | tail -n +11 | xargs rm -rf

# Clear caches
rm -rf cache/* cdn-cache/* benchmark-temp/*

# Clear logs older than 7 days
find logs -mtime +7 -delete
```

### Limits
| Directory | Max Size | Action When Full |
|-----------|----------|------------------|
| clones/ | 10GB | Delete oldest |
| cache/ | 2GB | Clear all |
| logs/ | 1GB | Rotate |
| benchmark-temp/ | 5GB | Clear all |

## Network Resources

### Connections
- Use connection pooling for HTTP
- Respect rate limits
- Implement exponential backoff
- Close connections properly

### Bandwidth
- Don't download unnecessarily
- Cache when possible
- Compress when possible
- Respect robots.txt

## Concurrent Operations

### Limits
| Operation | Max Concurrent |
|-----------|----------------|
| Page clones | 5 |
| API requests | 10 |
| Database queries | 20 |
| File operations | 10 |

### Implementation
```typescript
// Use a semaphore or queue
import PQueue from 'p-queue';
const queue = new PQueue({ concurrency: 5 });

await queue.add(() => clonePage(url));
```

## Cleanup Procedures

### After Each Clone
- Close all browser pages
- Release proxy connections
- Clear temporary files
- Update statistics

### After Each Session
- Kill orphan processes
- Clear temporary directories
- Release database connections
- Save state files

### Daily Maintenance
- Rotate logs
- Clear old caches
- Remove old clones
- Check disk space
- Verify service health
