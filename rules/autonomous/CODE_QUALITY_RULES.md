# Code Quality Rules

## Code Standards

### TypeScript
- Use strict mode
- No `any` type (use `unknown` if needed)
- Proper type definitions for all functions
- Use interfaces for object shapes
- Use enums for fixed values
- No type assertions without validation

### Naming Conventions
```typescript
// Variables & functions: camelCase
const userName = 'John';
function getUserData() {}

// Classes & interfaces: PascalCase
class UserService {}
interface UserProfile {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'http://...';

// Files: kebab-case or camelCase
user-service.ts
userService.ts

// Boolean variables: is/has/can prefix
const isActive = true;
const hasPermission = false;
const canEdit = true;
```

### Functions
- Single responsibility
- Max 50 lines (prefer < 20)
- Max 4 parameters (use object if more)
- Always return explicit types
- Handle errors, don't ignore

### Files
- One class/major function per file
- Max 300 lines (prefer < 200)
- Group related files in folders
- Index files for exports

## Error Handling

```typescript
// GOOD
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new CustomError('Operation failed', error);
}

// BAD
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.log(error); // No proper logging
  return null; // Swallowing error
}
```

## Logging

```typescript
// Use structured logging
logger.info('User logged in', { userId, timestamp });
logger.error('Database query failed', { query, error });
logger.warn('Rate limit approaching', { current, limit });
logger.debug('Processing item', { itemId, step });
```

## Comments

```typescript
// GOOD - explains WHY
// Using setTimeout to avoid race condition with WebSocket connection
setTimeout(() => initWebSocket(), 100);

// BAD - explains WHAT (obvious from code)
// Set timeout to 100ms
setTimeout(() => initWebSocket(), 100);
```

## Async/Await

```typescript
// GOOD - proper async handling
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

// BAD - mixing promises and callbacks
function fetchData() {
  return fetch(url).then(r => r.json()).catch(console.log);
}
```

## Import Order

```typescript
// 1. Node built-ins
import fs from 'fs';
import path from 'path';

// 2. External packages
import express from 'express';
import { PrismaClient } from '@prisma/client';

// 3. Internal modules
import { UserService } from './services/userService';
import { logger } from './utils/logger';

// 4. Types
import type { User, CloneJob } from './types';
```

## Quality Checklist

Before committing:
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console.log (use logger)
- [ ] All functions have return types
- [ ] Error handling in place
- [ ] No hardcoded secrets
- [ ] No TODO without issue reference
- [ ] Tests pass
