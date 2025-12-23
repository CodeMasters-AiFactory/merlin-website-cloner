# Input Validation Rules

## Validation Principles

### Always Validate
- All user input
- All API request bodies
- All URL parameters
- All query strings
- All file uploads
- All headers (when used)

### Never Trust
- Client-side validation alone
- User-provided data
- External API responses
- File names/paths from users
- Environment variables (validate at startup)

## Validation Types

### String Validation
```typescript
import { z } from 'zod';

const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(255, 'Email too long');

const urlSchema = z.string()
  .url('Invalid URL format')
  .refine(url => url.startsWith('http'), 'Must be HTTP(S)');

const usernameSchema = z.string()
  .min(3, 'Username too short')
  .max(30, 'Username too long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscore');
```

### Number Validation
```typescript
const portSchema = z.number()
  .int('Must be integer')
  .min(1, 'Port too low')
  .max(65535, 'Port too high');

const depthSchema = z.number()
  .int()
  .min(1, 'Minimum depth is 1')
  .max(10, 'Maximum depth is 10')
  .default(3);
```

### Object Validation
```typescript
const cloneRequestSchema = z.object({
  url: z.string().url(),
  depth: z.number().int().min(1).max(10).default(3),
  includeAssets: z.boolean().default(true),
  options: z.object({
    timeout: z.number().optional(),
    headers: z.record(z.string()).optional(),
  }).optional(),
});

type CloneRequest = z.infer<typeof cloneRequestSchema>;
```

## URL Validation

### Security Checks
```typescript
function validateUrl(input: string): string {
  // Parse URL
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ValidationError('Invalid URL format');
  }
  
  // Protocol check
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ValidationError('Only HTTP(S) allowed');
  }
  
  // Block private networks
  const blocklist = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '10.',
    '172.16.',
    '192.168.',
  ];
  
  if (blocklist.some(blocked => url.hostname.includes(blocked))) {
    throw new ValidationError('Private addresses not allowed');
  }
  
  // Block file URLs
  if (url.pathname.includes('..')) {
    throw new ValidationError('Path traversal not allowed');
  }
  
  return url.toString();
}
```

## File Upload Validation

### Checks
```typescript
interface FileValidation {
  maxSize: number;       // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

function validateFile(file: File, rules: FileValidation): void {
  // Size check
  if (file.size > rules.maxSize) {
    throw new ValidationError(`File too large (max ${rules.maxSize} bytes)`);
  }
  
  // MIME type check
  if (!rules.allowedTypes.includes(file.type)) {
    throw new ValidationError(`File type ${file.type} not allowed`);
  }
  
  // Extension check
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !rules.allowedExtensions.includes(ext)) {
    throw new ValidationError(`Extension .${ext} not allowed`);
  }
  
  // Filename sanitization
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    throw new ValidationError('Invalid filename characters');
  }
}
```

## API Request Validation

### Express Middleware
```typescript
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      } else {
        next(error);
      }
    }
  };
}

// Usage
app.post('/api/clone', validateBody(cloneRequestSchema), cloneHandler);
```

## Sanitization

### String Sanitization
```typescript
function sanitizeString(input: string): string {
  return input
    .trim()                              // Remove whitespace
    .replace(/[<>]/g, '')                // Remove HTML brackets
    .replace(/[\x00-\x1F\x7F]/g, '')     // Remove control chars
    .slice(0, 10000);                    // Limit length
}

function sanitizeForHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### Path Sanitization
```typescript
function sanitizePath(input: string): string {
  return path.normalize(input)
    .replace(/\.\./g, '')       // Remove parent traversal
    .replace(/^\/+/, '')        // Remove leading slashes
    .replace(/[<>:"|?*]/g, ''); // Remove invalid chars
}
```

## Error Messages

### User-Facing
```typescript
// GOOD - Clear, actionable
"Email must be a valid email address"
"Password must be at least 8 characters"
"URL must start with http:// or https://"

// BAD - Technical, confusing
"Failed regex validation on field email"
"String length assertion failed"
```

### Never Reveal
- Internal structure
- Database details
- File paths
- Stack traces (to users)
- Version numbers

## Validation Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters"
      }
    ]
  }
}
```
