/**
 * Security Middleware Tests
 * COD-13-003: Unit tests for security.ts
 */

import { describe, it, expect } from 'vitest';
import { validateCloneUrl } from '../../server/security.js';

describe('Security Middleware', () => {
  describe('URL Validation', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validateCloneUrl('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept valid HTTP URL', () => {
      const result = validateCloneUrl('http://example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject empty URL', () => {
      const result = validateCloneUrl('');
      expect(result.valid).toBe(false);
    });

    it('should reject URL without protocol', () => {
      const result = validateCloneUrl('example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('http');
    });

    it('should block localhost', () => {
      const result = validateCloneUrl('http://localhost:3000');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Internal');
    });

    it('should block 127.0.0.1', () => {
      const result = validateCloneUrl('http://127.0.0.1/admin');
      expect(result.valid).toBe(false);
    });

    it('should block private IP 10.x.x.x', () => {
      const result = validateCloneUrl('http://10.0.0.1/secret');
      expect(result.valid).toBe(false);
    });

    it('should block private IP 192.168.x.x', () => {
      const result = validateCloneUrl('http://192.168.1.1');
      expect(result.valid).toBe(false);
    });

    it('should block private IP 172.16-31.x.x', () => {
      const result = validateCloneUrl('http://172.16.0.1');
      expect(result.valid).toBe(false);
    });

    it('should block AWS metadata endpoint', () => {
      const result = validateCloneUrl('http://169.254.169.254/latest/meta-data');
      expect(result.valid).toBe(false);
    });

    it('should block file:// protocol', () => {
      const result = validateCloneUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    it('should reject very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = validateCloneUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should accept URL with path', () => {
      const result = validateCloneUrl('https://example.com/page/subpage');
      expect(result.valid).toBe(true);
    });

    it('should accept URL with query params', () => {
      const result = validateCloneUrl('https://example.com?foo=bar&baz=qux');
      expect(result.valid).toBe(true);
    });

    it('should accept URL with port', () => {
      const result = validateCloneUrl('https://example.com:8080');
      expect(result.valid).toBe(true);
    });
  });
});
