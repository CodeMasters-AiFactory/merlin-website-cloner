/**
 * Authentication Middleware - SECURED
 * Proper JWT implementation with bcrypt password hashing
 * COD-11: Security hardening
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT Configuration - MUST be set in environment
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('⚠️  WARNING: JWT_SECRET not set! Using fallback (NOT SAFE FOR PRODUCTION)');
  return 'CHANGE_THIS_IN_PRODUCTION_' + Math.random().toString(36);
})();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12; // Industry standard, good balance of security/speed

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: { id: string; email: string; name: string }): string {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
  };
  
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as string,
    algorithm: 'HS256'
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Handle legacy SHA256 hashes (for migration)
  if (hash.length === 64 && !hash.startsWith('$2')) {
    const crypto = await import('crypto');
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    return legacyHash === hash;
  }
  return bcrypt.compare(password, hash);
}

/**
 * Check if hash is legacy format (needs migration)
 */
export function isLegacyHash(hash: string): boolean {
  return hash.length === 64 && !hash.startsWith('$2');
}

/**
 * JWT Token Authentication Middleware
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
  };
  req.userId = decoded.id;
  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };
      req.userId = decoded.id;
    }
  }

  next();
}

/**
 * Password validation rules
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
