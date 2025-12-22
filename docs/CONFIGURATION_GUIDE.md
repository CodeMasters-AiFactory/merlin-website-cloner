# Configuration Guide

Complete guide to configuring Merlin Website Cloner.

## Configuration File Format

Configurations can be saved as YAML (`.yaml` or `.yml`) or JSON (`.json`) files.

### YAML Format (Recommended)

```yaml
url: https://example.com
maxPages: 100
```

### JSON Format

```json
{
  "url": "https://example.com",
  "maxPages": 100
}
```

## Configuration Schema

### Required Fields

- **url** (string): The website URL to clone

### Optional Fields

#### Basic Settings

```yaml
outputDir: ./output              # Output directory
maxPages: 100                    # Maximum pages to clone
maxDepth: 5                      # Maximum link depth
concurrency: 5                   # Parallel requests
unlimited: false                  # Ignore maxPages limit
```

#### Proxy Configuration

```yaml
proxy:
  enabled: false                  # Enable proxy rotation
  rotationStrategy: round-robin   # Strategy: round-robin, per-request, per-domain, sticky, speed-based, success-based
  providers:                      # Proxy provider configurations
    - name: provider1
      apiKey: your-api-key
      config:
        country: US
```

#### User Agent

```yaml
userAgent:
  rotation: true                  # Rotate user agents
  customAgents:                   # Custom user agent list
    - "Mozilla/5.0..."
```

#### Cloudflare Bypass

```yaml
cloudflare:
  enabled: true                   # Enable Cloudflare bypass
  captchaApiKey: optional         # 2Captcha API key
  capsolverApiKey: optional       # CapSolver API key
```

#### Verification

```yaml
verifyAfterClone: true            # Verify clone after completion
```

#### Export Format

```yaml
exportFormat: static              # Options: static, zip, tar, mhtml, warc
```

#### Caching

```yaml
cache:
  enabled: true                   # Enable caching
  ttl: 3600000                    # Time-to-live in milliseconds (1 hour)
  type: file                       # Options: file, redis, memory
  filePath: ./cache               # Cache directory (for file type)
  redisUrl: redis://localhost:6379 # Redis URL (for redis type)
```

#### Incremental Updates

```yaml
incremental: false                 # Only download changed content
```

#### Screenshots & PDFs

```yaml
captureScreenshots: false         # Capture full-page screenshots
generatePdfs: false               # Generate PDFs of pages
```

#### Distributed Scraping

```yaml
distributed: false                # Enable distributed scraping
redis:                            # Redis configuration
  host: localhost
  port: 6379
  password: optional
```

#### Mobile Emulation

```yaml
mobileEmulation:
  enabled: false                  # Enable mobile emulation
  deviceName: iPhone 12 Pro        # Device name (optional)
  viewport:                       # Custom viewport (optional)
    width: 390
    height: 844
    deviceScaleFactor: 3
    isMobile: true
    hasTouch: true
    isLandscape: false
```

#### Geolocation

```yaml
geolocation:                      # Set geolocation
  latitude: 40.7128              # -90 to 90
  longitude: -74.0060             # -180 to 180
  accuracy: 10                    # Optional accuracy in meters
```

#### Resource Blocking

```yaml
resourceBlocking:
  blockAds: true                  # Block advertisements
  blockTrackers: true             # Block tracking scripts
  blockAnalytics: true            # Block analytics
  blockFonts: false               # Block fonts (not recommended)
  blockImages: false              # Block images (not recommended)
  blockStylesheets: false         # Block CSS (not recommended)
  blockScripts: false             # Block JavaScript (not recommended)
  blockMedia: false               # Block media files (not recommended)
```

#### Retry Settings

```yaml
retry:
  maxRetries: 3                   # Maximum retry attempts
  initialDelay: 1000              # Initial delay in milliseconds
  maxDelay: 30000                 # Maximum delay in milliseconds
  multiplier: 2                   # Exponential backoff multiplier
  jitter: true                    # Add random jitter to delays
```

#### Advanced Features

```yaml
advanced:
  tlsImpersonation: true         # Perfect TLS fingerprint matching
  webSocketCapture: true          # Capture WebSocket messages
  apiScraping: true               # Direct API endpoint scraping
  smartCrawling: true             # Intelligent link prioritization
  cdnOptimization: true           # Global CDN asset caching
  assetDeduplication: true        # Share storage for identical assets
  linkRewriting: true             # Fix all links for offline use
  pwaSupport: true                # Complete PWA support
```

## Configuration Examples

### Minimal Configuration

```yaml
url: https://example.com
```

### Standard Configuration

```yaml
url: https://example.com
maxPages: 100
maxDepth: 5
concurrency: 5
verifyAfterClone: true
exportFormat: zip
cache:
  enabled: true
```

### High-Performance Configuration

```yaml
url: https://example.com
maxPages: 1000
maxDepth: 10
concurrency: 20
distributed: true
redis:
  host: localhost
  port: 6379
cache:
  enabled: true
  type: redis
  redisUrl: redis://localhost:6379
incremental: true
advanced:
  cdnOptimization: true
  assetDeduplication: true
  smartCrawling: true
```

### Protected Site Configuration

```yaml
url: https://protected-site.com
proxy:
  enabled: true
  rotationStrategy: per-request
cloudflare:
  enabled: true
  captchaApiKey: your-2captcha-key
userAgent:
  rotation: true
advanced:
  tlsImpersonation: true
mobileEmulation:
  enabled: true
  deviceName: iPhone 12 Pro
```

### Mobile-First Configuration

```yaml
url: https://mobile-site.com
mobileEmulation:
  enabled: true
  viewport:
    width: 390
    height: 844
    deviceScaleFactor: 3
    isMobile: true
    hasTouch: true
    isLandscape: false
geolocation:
  latitude: 40.7128
  longitude: -74.0060
```

### Archival Configuration

```yaml
url: https://archive-this.com
unlimited: true
maxDepth: 20
exportFormat: warc
verifyAfterClone: true
captureScreenshots: true
generatePdfs: true
cache:
  enabled: true
  ttl: 86400000  # 24 hours
incremental: true
advanced:
  webSocketCapture: true
  apiScraping: true
  pwaSupport: true
```

## Validation

Configurations are automatically validated when:
- Saving via API
- Loading via API
- Using in CLI

### Validation Rules

1. **URL**: Must be a valid URL
2. **maxPages**: Must be >= 1
3. **maxDepth**: Must be >= 0
4. **concurrency**: Must be >= 1
5. **cache.ttl**: Must be >= 0
6. **geolocation.latitude**: Must be between -90 and 90
7. **geolocation.longitude**: Must be between -180 and 180
8. **retry.maxRetries**: Must be >= 0
9. **retry.initialDelay**: Must be >= 0
10. **retry.maxDelay**: Must be >= retry.initialDelay

### Validation Warnings

- `unlimited` is true but `maxPages` is set
- `distributed` is enabled but `redis` config is missing
- `cloudflare.enabled` is true but no CAPTCHA API key is configured

## Using Configurations

### Via Web Interface

1. Go to Dashboard
2. Click "Configuration Editor"
3. Create or edit a configuration
4. Save with a name
5. Use "Clone with Config" to start a job

### Via API

```bash
# Create config
curl -X POST http://localhost:3000/api/configs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-config",
    "config": {
      "url": "https://example.com",
      "maxPages": 100
    },
    "format": "yaml"
  }'

# Use config for cloning
curl -X POST http://localhost:3000/api/configs/my-config/clone \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via CLI

```bash
# Use config file
npm run cli -- clone --config my-config.yaml

# Or specify config inline
npm run cli -- clone https://example.com --max-pages 100
```

## Best Practices

1. **Name Configs Clearly**: Use descriptive names like `blog-config`, `shop-config`
2. **Validate Before Saving**: Always validate configurations
3. **Use Templates**: Start with default config and modify
4. **Version Control**: Keep configs in version control
5. **Document Custom Configs**: Add comments explaining custom settings
6. **Test Configs**: Test configs on small sites first
7. **Reuse Configs**: Save common configurations for reuse
8. **Environment Variables**: Use env vars for sensitive data (API keys)

## Troubleshooting

### Config Not Loading

- Check file format (YAML or JSON)
- Validate syntax
- Check file permissions
- Verify file path

### Validation Errors

- Review error messages
- Check field types (numbers vs strings)
- Verify required fields
- Check value ranges

### Config Not Working

- Verify all settings are correct
- Check logs for errors
- Test with minimal config first
- Review API documentation

