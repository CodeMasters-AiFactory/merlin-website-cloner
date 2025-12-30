/**
 * Security Middleware Configuration
 * COD-11: Rate limiting, CORS, Helmet security headers
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

/**
 * Permissive Mode - Disables ALL security restrictions
 * Set PERMISSIVE_MODE=true in .env to enable
 * WARNING: Never use in production!
 */
const PERMISSIVE_MODE = process.env.PERMISSIVE_MODE === 'true';

if (PERMISSIVE_MODE) {
  console.warn('\n⚠️  ================================================');
  console.warn('⚠️  PERMISSIVE MODE ENABLED - ALL SECURITY DISABLED');
  console.warn('⚠️  DO NOT USE IN PRODUCTION!');
  console.warn('⚠️  ================================================\n');
}

/**
 * CORS Configuration
 * Restrict to allowed origins in production
 */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS === '*'
  ? ['*']
  : process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

// Development-safe localhost origins (exact match, not substring)
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080',
];

export const corsMiddleware = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permissive mode: allow everything
    if (PERMISSIVE_MODE || ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }

    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check against configured allowed origins (works in both dev and prod)
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow known dev origins (EXACT match, not substring)
    // This prevents "localhost.evil.com" from being allowed
    if (process.env.NODE_ENV !== 'production') {
      if (DEV_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Also allow any port on exact localhost/127.0.0.1
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return callback(null, true);
        }
      } catch {
        // Invalid URL, reject
      }
    }

    // In production, reject unknown origins
    if (process.env.NODE_ENV === 'production') {
      console.warn(`CORS: Blocked origin: ${origin}`);
      return callback(new Error('CORS not allowed'), false);
    }

    // Development fallback for other origins - allow but warn
    console.warn(`⚠️  CORS: Allowing unknown origin in dev: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
});

/**
 * Helmet Security Headers
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: PERMISSIVE_MODE ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for React dev
      connectSrc: ["'self'", 'https://api.stripe.com', 'wss:', 'ws:'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for preview
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow assets
});

/**
 * Rate Limiters
 */

// Check if development mode or permissive mode
const isDev = process.env.NODE_ENV !== 'production';
const skipRateLimiting = PERMISSIVE_MODE || isDev;

// General API rate limit
// In development or permissive mode, skip all rate limiting
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: PERMISSIVE_MODE ? 0 : (isDev ? 100000 : 1000), // 0 = unlimited in permissive
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting, // Skip all rate limiting in permissive/dev mode
});

// Strict rate limit for auth endpoints (prevent brute force)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: PERMISSIVE_MODE ? 0 : (isDev ? 1000 : 10),
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting,
});

// Clone endpoint rate limit (expensive operation)
export const cloneRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: PERMISSIVE_MODE ? 0 : 200,
  message: { error: 'Clone limit reached, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => PERMISSIVE_MODE,
});

// Very strict rate limit for signup (prevent spam accounts)
export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: PERMISSIVE_MODE ? 0 : 5,
  message: { error: 'Too many accounts created, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => PERMISSIVE_MODE,
});

/**
 * URL Validation for clone requests
 */
export function validateCloneUrl(url: string): { valid: boolean; error?: string } {
  // In permissive mode, allow everything
  if (PERMISSIVE_MODE) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Must start with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  try {
    const parsed = new URL(url);

    // Block localhost and private IPs (SSRF prevention)
    const hostname = parsed.hostname.toLowerCase();

    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '10.',
      '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.',
      '172.24.', '172.25.', '172.26.', '172.27.',
      '172.28.', '172.29.', '172.30.', '172.31.',
      '192.168.',
      '169.254.',
      'metadata.google',
      '169.254.169.254', // AWS metadata
    ];

    for (const pattern of blockedPatterns) {
      if (hostname.includes(pattern) || hostname.startsWith(pattern)) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }
    }

    // Block file:// and other dangerous protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Max URL length
    if (url.length > 2048) {
      return { valid: false, error: 'URL is too long (max 2048 characters)' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // In permissive mode, skip sanitization
  if (PERMISSIVE_MODE) {
    return next();
  }

  // Remove null bytes from all string inputs
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
}

/**
 * Security headers for API responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // In permissive mode, skip security headers
  if (PERMISSIVE_MODE) {
    return next();
  }

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection - modern browsers should use CSP instead
  // Setting to '0' is the modern recommendation as '1; mode=block' can introduce vulnerabilities
  res.setHeader('X-XSS-Protection', '0');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

/**
 * Export permissive mode status for other modules
 */
export const isPermissiveMode = PERMISSIVE_MODE;
