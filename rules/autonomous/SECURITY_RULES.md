# Security Rules

## Secrets Management

### NEVER Do
- Hardcode passwords, API keys, or secrets in code
- Commit .env files to git
- Log sensitive data
- Expose secrets in error messages
- Store secrets in plain text files
- Share secrets in chat or comments

### ALWAYS Do
- Use environment variables for secrets
- Add secrets to .env.example as placeholders
- Use secret managers in production
- Rotate secrets regularly
- Validate secrets exist at startup

## Authentication

### Password Rules
- Use bcrypt with salt rounds >= 12
- Never store plaintext passwords
- Never log passwords (even hashed)
- Implement rate limiting on auth endpoints
- Lock accounts after X failed attempts

### JWT Rules
- Use strong secret (min 256 bits)
- Set appropriate expiration (1-24 hours)
- Include minimal claims (no sensitive data)
- Validate on every request
- Implement refresh token rotation

### Session Rules
- Use HTTP-only cookies
- Set Secure flag in production
- Implement CSRF protection
- Set appropriate SameSite attribute

## Input Validation

### ALWAYS Validate
- User input from forms
- URL parameters
- Request body
- File uploads
- Query strings
- Headers (where used)

### Validation Rules
```typescript
// URL validation
import { isURL } from 'validator';
if (!isURL(input, { protocols: ['http', 'https'] })) {
  throw new Error('Invalid URL');
}

// Block dangerous inputs
const blocklist = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
if (blocklist.some(blocked => input.includes(blocked))) {
  throw new Error('Private addresses not allowed');
}
```

## API Security

### Headers (via Helmet.js)
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

### CORS
- Whitelist specific origins
- Don't use `*` in production
- Validate Origin header

### Rate Limiting
```
General API: 100 requests / 15 minutes
Auth endpoints: 10 requests / 15 minutes
Clone endpoints: 20 requests / hour
Admin endpoints: 50 requests / 15 minutes
```

## Database Security

- Use parameterized queries (Prisma handles this)
- Never interpolate user input into queries
- Limit query results
- Implement row-level security where needed
- Regular backups

## File System Security

- Validate file paths
- Prevent path traversal (../)
- Restrict file types for uploads
- Scan uploads for malware
- Use random filenames for uploads

## Dependency Security

- Run `npm audit` regularly
- Update dependencies with known vulnerabilities
- Use lockfiles
- Review new dependencies before adding

## Logging Security

### Log
- Authentication attempts (success/fail)
- Authorization failures
- Input validation failures
- System errors

### Never Log
- Passwords (even hashed)
- Full credit card numbers
- API keys or tokens
- Personal identifying information
- Session tokens

## Incident Response

If security issue detected:
1. Document immediately
2. Stop affected service if needed
3. Preserve logs
4. Don't modify evidence
5. Alert human immediately
6. Don't attempt to cover up
