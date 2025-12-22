/**
 * Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Simple JWT-like token validation
 * In production, use proper JWT library
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

  // Simple token validation (replace with proper JWT in production)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const user = JSON.parse(decoded);
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Optional authentication
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const user = JSON.parse(decoded);
      req.user = user;
      req.userId = user.id;
    } catch (error) {
      // Ignore invalid tokens in optional auth
    }
  }

  next();
}

