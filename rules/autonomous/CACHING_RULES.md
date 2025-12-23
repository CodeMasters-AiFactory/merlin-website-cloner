# Caching Rules

## Cache Strategy

### What to Cache
- API responses (GET only)
- Database query results
- Computed values
- External API responses
- Static assets (CDN)
- User sessions

### What NOT to Cache
- User-specific sensitive data
- Real-time data
- POST/PUT/DELETE responses
- Authentication tokens
- Rapidly changing data

## Cache Layers

### Layer 1: In-Memory (Fastest)
```typescript
const cache = new Map<string, { data: any; expires: number }>();

function setCache(key: string, data: any, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}
```

### Layer 2: File Cache
```typescript
const CACHE_DIR = './cache';

async function setFileCache(key: string, data: any, ttlMs: number): Promise<void> {
  const entry = { data, expires: Date.now() + ttlMs };
  await fs.writeFile(
    path.join(CACHE_DIR, `${key}.json`),
    JSON.stringify(entry)
  );
}
```

### Layer 3: CDN/Browser Cache
```typescript
// Set cache headers
res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
res.set('ETag', contentHash);
```

## TTL Guidelines

| Content Type | TTL | Reason |
|--------------|-----|--------|
| Static assets | 1 year | Rarely change |
| API responses | 5-60 min | Balance freshness/performance |
| User data | 1-5 min | Security/freshness |
| Search results | 5-15 min | Moderate change rate |
| Rate limit data | 15 min | Match rate limit window |
| CDN libraries | 24 hours | Very stable |

## Cache Invalidation

### Strategies
1. **TTL (Time-based)**: Expires automatically
2. **Event-based**: Invalidate on data change
3. **Version-based**: Include version in key
4. **Manual**: Admin triggers clear

### Implementation
```typescript
// Event-based invalidation
async function updateUser(id: string, data: UserData): Promise<void> {
  await db.user.update({ where: { id }, data });
  cache.delete(`user:${id}`);  // Invalidate cache
}

// Version-based keys
const cacheKey = `config:v${configVersion}`;
```

## Cache Patterns

### Cache-Aside (Lazy Loading)
```typescript
async function getUserCached(id: string): Promise<User> {
  // Try cache first
  const cached = getCache<User>(`user:${id}`);
  if (cached) return cached;
  
  // Cache miss - fetch from DB
  const user = await db.user.findUnique({ where: { id } });
  if (user) {
    setCache(`user:${id}`, user, 5 * 60 * 1000); // 5 min
  }
  return user;
}
```

### Write-Through
```typescript
async function updateUserCached(id: string, data: UserData): Promise<User> {
  // Update DB
  const user = await db.user.update({ where: { id }, data });
  // Update cache
  setCache(`user:${id}`, user, 5 * 60 * 1000);
  return user;
}
```

### Cache Stampede Prevention
```typescript
const pending = new Map<string, Promise<any>>();

async function getWithLock<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // Return cached if available
  const cached = getCache<T>(key);
  if (cached) return cached;
  
  // Check if already fetching
  if (pending.has(key)) {
    return pending.get(key) as Promise<T>;
  }
  
  // Fetch with lock
  const promise = fetchFn();
  pending.set(key, promise);
  
  try {
    const result = await promise;
    setCache(key, result, TTL);
    return result;
  } finally {
    pending.delete(key);
  }
}
```

## CDN Caching (Merlin Specific)

### Popular Libraries Cache
```typescript
const CDN_LIBRARIES = [
  { pattern: /jquery/, ttl: '7d' },
  { pattern: /bootstrap/, ttl: '7d' },
  { pattern: /react/, ttl: '7d' },
  { pattern: /vue/, ttl: '7d' },
  { pattern: /font-awesome/, ttl: '30d' },
];
```

### Asset Cache Keys
```typescript
// Include content hash for cache busting
function getCacheKey(url: string, content: Buffer): string {
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  return `${url}:${hash}`;
}
```

## Monitoring

### Cache Metrics
- Hit rate (target: > 80%)
- Miss rate
- Eviction rate
- Memory usage
- Average latency

### Logging
```typescript
logger.debug('Cache hit', { key, ttlRemaining });
logger.debug('Cache miss', { key, reason: 'expired' });
logger.info('Cache cleared', { pattern, count });
```

## Cache Cleanup

### Scheduled Cleanup
```typescript
// Run every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expires < now) {
      cache.delete(key);
    }
  }
}, 60 * 60 * 1000);
```

### Manual Clear
```bash
# Clear all cache
rm -rf cache/* cdn-cache/*

# Clear specific
rm cache/user:*.json
```
