# Documentation Rules

## What to Document

### Always Document
- API endpoints (request/response)
- Environment variables
- Setup instructions
- Architecture decisions
- Complex algorithms
- Known limitations
- Breaking changes

### Code Comments
```typescript
// GOOD - Explains WHY
// Using retry because S3 occasionally returns 503 during high load
const result = await retryWithBackoff(uploadToS3, 3);

// BAD - Explains WHAT (obvious)
// Increment counter by 1
counter++;

// GOOD - Documents edge case
// Empty array returns null to match legacy API behavior
if (items.length === 0) return null;

// GOOD - Warns about gotcha
// WARNING: This modifies the original array
items.sort((a, b) => a - b);
```

## README Structure

```markdown
# Project Name

Brief description (1-2 sentences)

## Features
- Feature 1
- Feature 2

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection |
| JWT_SECRET | Yes | Auth secret |

## API Documentation
Link to API docs or inline documentation

## Development
How to set up development environment

## Testing
How to run tests

## Deployment
Deployment instructions

## License
License information
```

## API Documentation

### Endpoint Documentation Format
```markdown
## POST /api/clone

Start a new clone job.

### Request
\`\`\`json
{
  "url": "https://example.com",
  "depth": 3,
  "includeAssets": true
}
\`\`\`

### Response (201)
\`\`\`json
{
  "success": true,
  "data": {
    "jobId": "abc123",
    "status": "pending"
  }
}
\`\`\`

### Errors
- 400: Invalid URL format
- 401: Not authenticated
- 429: Rate limit exceeded
```

## Inline Documentation

### Function Documentation
```typescript
/**
 * Clones a website starting from the given URL.
 * 
 * @param url - The starting URL to clone
 * @param options - Clone configuration options
 * @param options.depth - How many levels deep to clone (default: 3)
 * @param options.includeAssets - Whether to download assets (default: true)
 * @returns Promise resolving to the clone result
 * @throws {ValidationError} If URL is invalid
 * @throws {TimeoutError} If clone exceeds timeout
 * 
 * @example
 * const result = await cloneWebsite('https://example.com', { depth: 2 });
 */
async function cloneWebsite(url: string, options?: CloneOptions): Promise<CloneResult>
```

### Type Documentation
```typescript
/**
 * Configuration options for a clone job.
 */
interface CloneOptions {
  /** Maximum depth of pages to follow (1-10) */
  depth?: number;
  /** Whether to download images, CSS, JS */
  includeAssets?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers to send with requests */
  headers?: Record<string, string>;
}
```

## Change Documentation

### CHANGELOG Format
```markdown
# Changelog

## [1.2.0] - 2024-12-20

### Added
- PostgreSQL database support
- User authentication with JWT

### Changed
- Improved clone performance by 40%

### Fixed
- Memory leak in Puppeteer instances

### Security
- Updated dependencies with vulnerabilities
```

## Architecture Documentation

### Decision Records (ADR)
```markdown
# ADR-001: Use PostgreSQL for Production

## Status
Accepted

## Context
Need persistent storage for users and clone jobs.

## Decision
Use PostgreSQL with Prisma ORM.

## Consequences
- Pro: Reliable, scalable, well-supported
- Pro: Prisma provides type safety
- Con: Requires separate database server
- Con: More complex setup than SQLite
```

## Documentation Checklist

### Before Feature Complete
- [ ] Function has JSDoc comment
- [ ] Complex logic has inline comments
- [ ] README updated if needed
- [ ] API docs updated for new endpoints
- [ ] Environment variables documented
- [ ] Error cases documented
