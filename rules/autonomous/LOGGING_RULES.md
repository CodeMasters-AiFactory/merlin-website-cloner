# Logging Rules

## Log Levels

| Level | When to Use | Production |
|-------|-------------|------------|
| ERROR | Failures requiring attention | Yes |
| WARN | Potential issues | Yes |
| INFO | Normal operations | Yes |
| DEBUG | Detailed debugging | No |
| TRACE | Very detailed | No |

## Log Structure

### Standard Format
```
[TIMESTAMP] [LEVEL] [COMPONENT] Message { context }
```

### Example
```
[2024-12-20T14:30:00.123Z] [INFO] [CloneService] Clone started { jobId: "abc123", url: "https://example.com" }
[2024-12-20T14:30:05.456Z] [ERROR] [Database] Connection failed { error: "ECONNREFUSED", host: "localhost" }
```

### JSON Format (For Production)
```json
{
  "timestamp": "2024-12-20T14:30:00.123Z",
  "level": "INFO",
  "component": "CloneService",
  "message": "Clone started",
  "context": {
    "jobId": "abc123",
    "url": "https://example.com"
  }
}
```

## What to Log

### Always Log
- Application startup/shutdown
- Request received (path, method)
- Request completed (status, duration)
- Authentication attempts
- Authorization failures
- Database operations (query type, duration)
- External API calls
- Errors and exceptions
- Business events (user signup, clone started)

### Never Log
- Passwords (even hashed)
- Full credit card numbers
- API keys or tokens
- Personal data (unless necessary)
- Session tokens
- Internal IP addresses (in public logs)

## Logger Implementation

### Setup
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export { logger };
```

### Usage
```typescript
// Info - normal operations
logger.info('User logged in', { userId, ip: req.ip });

// Error - with stack trace
logger.error('Database query failed', { 
  error: error.message, 
  stack: error.stack,
  query: 'findUser'
});

// Warn - potential issue
logger.warn('Rate limit approaching', { 
  userId, 
  current: 90, 
  limit: 100 
});

// Debug - detailed info
logger.debug('Processing item', { 
  itemId, 
  step: 3, 
  data: sanitizedData 
});
```

## Request Logging

### Middleware
```typescript
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
}
```

## Error Logging

### Best Practices
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: {
      operation: 'riskyOperation',
      input: sanitizeInput(input),
    },
  });
  throw error; // Re-throw or handle
}
```

## Log Rotation

### Configuration
```typescript
const transport = new winston.transports.File({
  filename: 'logs/app.log',
  maxsize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  tailable: true,
});
```

### Cleanup
```bash
# Delete logs older than 7 days
find logs -name "*.log" -mtime +7 -delete
```

## Performance Logging

### Operation Timing
```typescript
function logTiming(operation: string) {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      logger.info(`${operation} completed`, { duration: `${duration.toFixed(2)}ms` });
    },
  };
}

// Usage
const timer = logTiming('Database query');
await db.query(...);
timer.end();
```

## Log Aggregation

### Search Patterns
```bash
# Find errors
grep "ERROR" logs/combined.log

# Find by component
grep "CloneService" logs/combined.log

# Find by time range
grep "2024-12-20T14:3" logs/combined.log

# Find slow requests
grep "duration.*[0-9]{4,}" logs/combined.log
```

## Never Do

- Use console.log in production (use logger)
- Log sensitive data
- Log without context
- Log too verbosely in production
- Ignore error logs
- Skip logging important events
