# Performance Rules

## Performance Targets

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| API response | < 200ms | < 500ms | > 1s |
| Page load | < 2s | < 4s | > 6s |
| Clone job start | < 1s | < 3s | > 5s |
| Database query | < 50ms | < 200ms | > 500ms |
| Memory (idle) | < 500MB | < 1GB | > 2GB |
| CPU (idle) | < 5% | < 20% | > 50% |

## Optimization Priorities

### Order of Optimization
1. Correctness first (make it work)
2. Clarity second (make it readable)
3. Performance third (make it fast)

### When to Optimize
- When measurably slow (not "feels slow")
- When blocking user experience
- When hitting resource limits
- After feature is complete and tested

### When NOT to Optimize
- Prematurely (before measuring)
- At expense of readability
- For theoretical gains
- When already fast enough

## Backend Optimization

### Database
```typescript
// USE: Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true }
});

// USE: Pagination
const items = await prisma.item.findMany({
  take: 20,
  skip: offset
});

// USE: Indexes for frequent queries
// In schema.prisma:
// @@index([userId, createdAt])

// AVOID: N+1 queries
// BAD:
const users = await prisma.user.findMany();
for (const user of users) {
  const jobs = await prisma.job.findMany({ where: { userId: user.id } });
}

// GOOD:
const users = await prisma.user.findMany({
  include: { jobs: true }
});
```

### Caching
```typescript
// Cache expensive operations
const cache = new Map<string, { data: any; expires: number }>();

async function getCached<T>(key: string, fn: () => Promise<T>, ttl = 60000): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  const data = await fn();
  cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}
```

### Async Operations
```typescript
// USE: Parallel when independent
const [users, jobs, stats] = await Promise.all([
  getUsers(),
  getJobs(),
  getStats()
]);

// USE: Streaming for large data
const stream = fs.createReadStream(file);
stream.pipe(response);
```

## Frontend Optimization

### React
```typescript
// USE: Memoization
const MemoizedComponent = React.memo(ExpensiveComponent);

// USE: useMemo for expensive calculations
const computed = useMemo(() => expensiveCalc(data), [data]);

// USE: useCallback for callbacks
const handleClick = useCallback(() => onClick(id), [id, onClick]);

// AVOID: Inline objects in JSX
// BAD:
<Component style={{ color: 'red' }} />
// GOOD:
const style = { color: 'red' };
<Component style={style} />
```

### Assets
- Compress images (WebP preferred)
- Lazy load images below fold
- Minify CSS and JS
- Use CDN for static assets
- Enable gzip/brotli compression

## Clone Performance

### Puppeteer Optimization
```typescript
// Reuse browser instance
const browser = await puppeteer.launch();
// ... use for multiple pages
await browser.close();

// Disable unnecessary features
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (['image', 'font', 'media'].includes(req.resourceType())) {
    req.abort();
  } else {
    req.continue();
  }
});

// Limit concurrent pages
const MAX_CONCURRENT = 5;
```

### Resource Limits
```typescript
// Timeout for operations
const result = await Promise.race([
  clonePage(url),
  timeout(30000, 'Clone timeout')
]);

// Memory limit per clone
// Monitor and abort if exceeds 500MB
```

## Monitoring

### Track Metrics
```typescript
const start = performance.now();
// ... operation
const duration = performance.now() - start;
logger.info('Operation completed', { duration, operation: 'clone' });
```

### Performance Logging
```
[PERF] Clone job: 25.3s (pages: 15, assets: 234)
[PERF] API /clone: 156ms
[PERF] DB query users: 23ms
```

## Performance Checklist

Before marking complete:
- [ ] API responses < 500ms
- [ ] No memory leaks (check over time)
- [ ] No N+1 database queries
- [ ] Large lists are paginated
- [ ] Expensive operations are cached
- [ ] No blocking operations in request path
