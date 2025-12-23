# Configuration Management Rules

## Environment Variables

### Naming Convention
```bash
# Format: CATEGORY_SUBCATEGORY_NAME
DATABASE_URL=...
DATABASE_POOL_SIZE=...
JWT_SECRET=...
JWT_EXPIRY=...
STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### Required vs Optional
```typescript
// config.ts
const config = {
  // Required - throw if missing
  databaseUrl: getRequired('DATABASE_URL'),
  jwtSecret: getRequired('JWT_SECRET'),
  
  // Optional - use defaults
  port: getOptional('PORT', 3000),
  logLevel: getOptional('LOG_LEVEL', 'info'),
};

function getRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptional<T>(key: string, defaultValue: T): T {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value as unknown as T;
}
```

### Environment Files
```
.env              # Local development (git ignored)
.env.example      # Template (committed)
.env.test         # Test environment (git ignored)
.env.production   # Production (never commit!)
```

### .env.example Template
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Stripe (optional)
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Settings
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

## Configuration Validation

### At Startup
```typescript
function validateConfig(): void {
  const errors: string[] = [];
  
  // Check required
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  // Check format
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    errors.push('PORT must be a number');
  }
  
  // Check valid values
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
```

## Feature Flags

### Structure
```typescript
const features = {
  // Boolean flags
  enableStripePayments: getFeature('FEATURE_STRIPE', false),
  enableAdvancedCloning: getFeature('FEATURE_ADVANCED_CLONE', false),
  
  // Percentage rollout
  newDashboardPercent: getFeature('FEATURE_NEW_DASHBOARD_PERCENT', 0),
};

function getFeature(key: string, defaultValue: boolean | number): boolean | number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Number(value);
}
```

### Usage
```typescript
if (features.enableStripePayments) {
  // Show payment options
}

// Percentage rollout
if (Math.random() * 100 < features.newDashboardPercent) {
  // Show new dashboard
}
```

## Configuration by Environment

### Pattern
```typescript
const configs = {
  development: {
    apiUrl: 'http://localhost:3000',
    logLevel: 'debug',
    enableMocks: true,
  },
  test: {
    apiUrl: 'http://localhost:3001',
    logLevel: 'error',
    enableMocks: true,
  },
  production: {
    apiUrl: 'https://api.merlin.com',
    logLevel: 'info',
    enableMocks: false,
  },
};

const env = process.env.NODE_ENV || 'development';
export const config = configs[env];
```

## Secrets Management

### Never Do
- Hardcode secrets in code
- Commit secrets to git
- Log secrets
- Pass secrets in URLs
- Store secrets in plain text

### Always Do
- Use environment variables
- Use secret managers (Azure Key Vault, etc.)
- Rotate secrets regularly
- Audit secret access
- Use different secrets per environment

### Secret Detection
```bash
# In git hooks
git diff --cached | grep -E "(password|secret|key|token)" && exit 1
```

## Default Values

### Safe Defaults
```typescript
const config = {
  // Safe defaults for security
  cookieSecure: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  
  // Conservative defaults for resources
  maxConcurrentJobs: Number(process.env.MAX_JOBS) || 5,
  jobTimeout: Number(process.env.JOB_TIMEOUT) || 60000,
  
  // Strict defaults for validation
  maxUrlLength: 2000,
  maxDepth: 10,
};
```

## Configuration Changes

### When Changing Config
1. Update .env.example
2. Update documentation
3. Update validation
4. Test with new config
5. Deploy config before code (if needed)
6. Announce breaking changes
