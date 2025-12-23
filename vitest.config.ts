/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * Vitest Configuration
 * COD-13-001: Test framework setup with coverage
 */

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test APIs (describe, it, expect)
    globals: true,
    
    // Test file patterns
    include: [
      'src/tests/**/*.test.ts',
      'src/test/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'frontend',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds - aim for 80%
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
      
      // Include/exclude patterns
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/tests/**',
        'src/test/**',
      ],
    },
    
    // Timeout
    testTimeout: 30000,
    
    // Setup files
    setupFiles: ['./src/tests/setup.ts'],
    
    // Reporter
    reporters: ['verbose'],
  },
  
  // Resolve aliases
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
