# Testing Requirements

## Coverage Targets

| Type | Target | Current |
|------|--------|---------|
| Unit Tests | 80%+ | ~0% |
| Integration Tests | 70%+ | Partial |
| E2E Tests | Critical paths | Partial |
| Frontend Tests | 60%+ | 0% |

---

## Test Categories

### 1. Unit Tests
**Location:** `src/**/*.test.ts`
**Framework:** Vitest

```typescript
// Example: src/services/resumeManager.test.ts
import { describe, it, expect } from 'vitest';
import { createResumeManager } from './resumeManager';

describe('ResumeManager', () => {
  it('should create checkpoint', async () => {
    const manager = createResumeManager('./test-output');
    await manager.initializeCheckpoint('https://example.com', {});
    expect(manager.getPendingUrls()).toContain('https://example.com');
  });
});
```

### 2. Integration Tests
**Location:** `src/test/*.test.ts`
**Framework:** Vitest + Supertest

```typescript
// Example: src/test/api.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server';

describe('Clone API', () => {
  it('POST /api/clone should accept URL', async () => {
    const res = await request(app)
      .post('/api/clone')
      .send({ url: 'https://example.com' });
    expect(res.status).toBe(200);
  });
});
```

### 3. E2E Tests
**Location:** `e2e/*.spec.ts`
**Framework:** Playwright

```typescript
// Example: e2e/clone-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can start a clone', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="url"]', 'https://example.com');
  await page.click('button[type="submit"]');
  await expect(page.locator('.progress')).toBeVisible();
});
```

### 4. Frontend Component Tests
**Location:** `frontend/src/**/*.test.tsx`
**Framework:** Vitest + Testing Library

```typescript
// Example: frontend/src/components/CloneButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CloneButton } from './CloneButton';

test('shows loading state when clicked', () => {
  render(<CloneButton url="https://example.com" />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText(/cloning/i)).toBeInTheDocument();
});
```

---

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- resumeManager

# Run E2E tests
npm run test:e2e

# Run frontend tests
cd frontend && npm test
```

---

## What MUST Be Tested

### Critical Paths (E2E Required)
- [ ] User can login
- [ ] User can start a clone
- [ ] Clone progress updates
- [ ] Clone completes successfully
- [ ] User can download clone
- [ ] Payment flow works

### Core Services (Unit Tests Required)
- [ ] `resumeManager.ts` - Checkpoint save/restore
- [ ] `websiteCloner.ts` - Clone orchestration
- [ ] `authCloner.ts` - Cookie/session handling
- [ ] `fingerprintGenerator.ts` - Fingerprint generation
- [ ] `waczExporter.ts` - Archive creation

### API Endpoints (Integration Tests Required)
- [ ] `POST /api/clone` - Start clone
- [ ] `GET /api/clone/:id` - Get status
- [ ] `GET /api/clone/:id/download` - Download
- [ ] `POST /api/auth/login` - Authentication
- [ ] `POST /api/webhooks/stripe` - Payment callbacks

---

## Test Data Management

### Do NOT
- Use real websites for automated tests
- Hardcode credentials
- Leave test data in production DB
- Skip cleanup in afterEach

### DO
- Use mock servers (MSW)
- Use fixtures for test data
- Clean up after each test
- Use test-specific database

---

## CI Integration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
```

---

## Before Merging PRs

1. All tests pass
2. No linting errors
3. Coverage doesn't decrease
4. E2E tests pass for affected features
5. Manual testing of UI changes

---

**Remember: Code without tests is legacy code the moment it's written.**
