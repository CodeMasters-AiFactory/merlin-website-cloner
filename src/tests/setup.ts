/**
 * Test Setup
 * COD-13-001: Global test configuration
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

// Mock console for cleaner test output
beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Global test utilities
export const testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  randomEmail: () => `test-${Date.now()}@example.com`,
  randomString: (length = 10) => Math.random().toString(36).substring(2, 2 + length),
};
