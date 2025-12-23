/**
 * Authentication Service Tests
 * COD-13-002: Unit tests for auth.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateToken, 
  verifyToken, 
  hashPassword, 
  verifyPassword,
  validatePassword,
  isLegacyHash,
} from '../../server/auth.js';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'SecurePassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword456!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('WrongPassword123', hash);
      expect(isValid).toBe(false);
    });

    it('should handle legacy SHA256 hashes', async () => {
      const crypto = await import('crypto');
      const password = 'legacyPassword';
      const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
      
      expect(isLegacyHash(legacyHash)).toBe(true);
      const isValid = await verifyPassword(password, legacyHash);
      expect(isValid).toBe(true);
    });
  });

  describe('Password Validation', () => {
    it('should accept valid password', () => {
      const result = validatePassword('SecurePass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.valid).toBe(false);
    });
  });

  describe('JWT Token', () => {
    const testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should generate valid JWT token', () => {
      const token = generateToken(testUser);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify valid token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(testUser.id);
      expect(decoded?.email).toBe(testUser.email);
    });

    it('should reject invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should reject tampered token', () => {
      const token = generateToken(testUser);
      const tampered = token.slice(0, -5) + 'XXXXX';
      const decoded = verifyToken(tampered);
      expect(decoded).toBeNull();
    });
  });
});
