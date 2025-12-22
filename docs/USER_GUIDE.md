# User Guide

Complete guide to using Merlin Website Cloner.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Configuration](#configuration)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd merlin-website-clone
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install && cd ..
```

3. Start the server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### First Clone

1. **Sign Up**: Create an account at the signup page
2. **Login**: Login with your credentials
3. **Start Cloning**: 
   - Enter a website URL
   - Configure options (or use defaults)
   - Click "Clone Website"
4. **Monitor Progress**: Watch real-time progress updates
5. **Download**: Download the cloned website when complete

## Basic Usage

### Web Interface

#### Dashboard
- View all your clone jobs
- See status, progress, and statistics
- Download completed clones
- Manage configurations

#### Clone Form
1. Enter the website URL
2. Configure options:
   - **Max Pages**: Maximum number of pages to clone (default: 100)
   - **Max Depth**: Maximum link depth to follow (default: 5)
   - **Concurrency**: Number of parallel requests (default: 5)
   - **Export Format**: ZIP, TAR, MHTML, Static, or WARC
   - **Verify After Clone**: Automatically verify the clone
3. Click "Start Clone"

#### Configuration Editor
- Create reusable configuration presets
- Save settings for different types of websites
- Edit configurations visually
- Validate before saving

### Command Line Interface

```bash
# Basic clone
npm run cli -- clone https://example.com

# With options
npm run cli -- clone https://example.com \
  --max-pages 200 \
  --max-depth 10 \
  --output ./my-clone \
  --format zip

# Using a config file
npm run cli -- clone --config my-config.yaml
```

## Configuration

### Configuration Files

Configurations can be saved as YAML or JSON files in the `./configs` directory.

#### Example YAML Config

```yaml
url: https://example.com
outputDir: ./output
maxPages: 100
maxDepth: 5
concurrency: 5
unlimited: false

proxy:
  enabled: false
  rotationStrategy: round-robin

userAgent:
  rotation: true

cloudflare:
  enabled: true
  captchaApiKey: optional

verifyAfterClone: true
exportFormat: zip

cache:
  enabled: true
  ttl: 3600000
  type: file
  filePath: ./cache

incremental: false
captureScreenshots: false
generatePdfs: false
distributed: false

resourceBlocking:
  blockAds: true
  blockTrackers: true
  blockAnalytics: true
  blockFonts: false
  blockImages: false
  blockStylesheets: false
  blockScripts: false
  blockMedia: false

retry:
  maxRetries: 3
  initialDelay: 1000
  maxDelay: 30000
  multiplier: 2
  jitter: true

advanced:
  tlsImpersonation: true
  webSocketCapture: true
  apiScraping: true
  smartCrawling: true
  cdnOptimization: true
  assetDeduplication: true
  linkRewriting: true
  pwaSupport: true
```

### Configuration Options

#### Basic Options
- **url** (required): Website URL to clone
- **outputDir**: Output directory (default: `./output`)
- **maxPages**: Maximum pages to clone
- **maxDepth**: Maximum link depth
- **concurrency**: Parallel requests
- **unlimited**: Clone all pages (ignores maxPages)

#### Proxy Settings
- **enabled**: Enable proxy rotation
- **rotationStrategy**: `round-robin`, `per-request`, `per-domain`, `sticky`, `speed-based`, `success-based`
- **providers**: Array of proxy provider configurations

#### Cloudflare Bypass
- **enabled**: Enable Cloudflare bypass
- **captchaApiKey**: 2Captcha API key
- **capsolverApiKey**: CapSolver API key

#### Caching
- **enabled**: Enable caching
- **ttl**: Cache time-to-live in milliseconds
- **type**: `file`, `redis`, or `memory`
- **filePath**: Cache directory (for file type)
- **redisUrl**: Redis connection URL (for redis type)

#### Advanced Features
- **tlsImpersonation**: Perfect TLS fingerprint matching
- **webSocketCapture**: Capture WebSocket messages
- **apiScraping**: Direct API endpoint scraping
- **smartCrawling**: Intelligent link prioritization
- **cdnOptimization**: Global CDN asset caching
- **assetDeduplication**: Share storage for identical assets
- **linkRewriting**: Fix all links for offline use
- **pwaSupport**: Complete PWA support

## Advanced Features

### Mobile Emulation

Clone websites as they appear on mobile devices:

```yaml
mobileEmulation:
  enabled: true
  deviceName: iPhone 12 Pro
  viewport:
    width: 390
    height: 844
    deviceScaleFactor: 3
    isMobile: true
    hasTouch: true
    isLandscape: false
```

### Geolocation

Set geolocation for location-based content:

```yaml
geolocation:
  latitude: 40.7128
  longitude: -74.0060
  accuracy: 10
```

### Distributed Scraping

Scale horizontally with Redis:

```yaml
distributed: true
redis:
  host: localhost
  port: 6379
  password: optional
```

### Incremental Updates

Only download changed content:

```yaml
incremental: true
cache:
  enabled: true
  ttl: 86400000  # 24 hours
```

### Export Formats

- **static**: Static HTML files (default)
- **zip**: ZIP archive
- **tar**: TAR archive
- **mhtml**: MHTML single file
- **warc**: Web ARChive format (industry standard)

### Verification

Automatically verify cloned websites:

```yaml
verifyAfterClone: true
```

Verification checks:
- All links are valid
- All assets are present
- JavaScript executes correctly
- File integrity (SHA256 hashes)

## Troubleshooting

### Common Issues

#### Clone Fails Immediately

**Problem**: Clone job fails right after starting

**Solutions**:
1. Check if the URL is accessible in a browser
2. Verify your internet connection
3. Check if the website blocks automated access
4. Enable Cloudflare bypass if the site uses Cloudflare
5. Try with a proxy

#### Slow Cloning

**Problem**: Cloning is very slow

**Solutions**:
1. Increase `concurrency` (but not too high)
2. Enable resource blocking for ads/trackers
3. Use distributed scraping for large sites
4. Enable CDN optimization
5. Check your network connection

#### Missing Assets

**Problem**: Some images or files are missing

**Solutions**:
1. Increase `maxDepth` to follow deeper links
2. Check if assets are behind authentication
3. Verify JavaScript execution (some assets load via JS)
4. Enable `apiScraping` to capture API-loaded content
5. Check the verification report

#### Cloudflare Blocking

**Problem**: Cloudflare challenge blocking access

**Solutions**:
1. Enable Cloudflare bypass
2. Add CAPTCHA API keys (2Captcha or CapSolver)
3. Use residential proxies
4. Enable TLS impersonation
5. Reduce request rate

#### Memory Issues

**Problem**: Out of memory errors

**Solutions**:
1. Reduce `concurrency`
2. Use distributed scraping
3. Enable asset deduplication
4. Clear cache regularly
5. Increase system memory

### Error Messages

#### Network Errors
- **ERR_CONNECTION_REFUSED**: Server refused connection
- **ERR_NAME_NOT_RESOLVED**: DNS resolution failed
- **ERR_CONNECTION_TIMED_OUT**: Connection timeout

**Solutions**: Check network, try proxy, increase timeout

#### Timeout Errors
- **Navigation timeout**: Page took too long to load

**Solutions**: Increase timeout, use different wait strategy, check site speed

#### Rate Limit Errors
- **429 Too Many Requests**: Rate limited

**Solutions**: Wait before retrying, reduce concurrency, use proxies

### Getting Help

1. Check the logs in `./logs` directory
2. Review error messages in the job details
3. Check the verification report
4. Review API documentation
5. Check GitHub issues

## Best Practices

### For Small Websites (< 100 pages)
- Use default settings
- Enable caching
- Use static export format
- Enable verification

### For Medium Websites (100-1000 pages)
- Increase concurrency to 10-20
- Enable incremental updates
- Use distributed scraping if available
- Enable CDN optimization
- Use ZIP export format

### For Large Websites (> 1000 pages)
- Use distributed scraping
- Enable all optimizations
- Use WARC format for archival
- Set up Redis cache
- Monitor resource usage

### For Protected Websites
- Enable Cloudflare bypass
- Use proxies
- Enable TLS impersonation
- Use mobile emulation
- Set appropriate geolocation

### Performance Tips
1. **Use caching**: Reduces redundant downloads
2. **Enable resource blocking**: Faster page loads
3. **Use distributed scraping**: Scale horizontally
4. **Enable asset deduplication**: Save storage
5. **Use CDN optimization**: Cache common assets globally

### Security Tips
1. **Validate URLs**: Only clone trusted websites
2. **Review configs**: Check configurations before saving
3. **Use authentication**: Protect your API access
4. **Monitor jobs**: Review completed clones
5. **Keep updated**: Update dependencies regularly

## Examples

### Clone a Blog
```yaml
url: https://blog.example.com
maxPages: 500
maxDepth: 3
concurrency: 10
verifyAfterClone: true
exportFormat: zip
```

### Clone an E-commerce Site
```yaml
url: https://shop.example.com
maxPages: 1000
maxDepth: 5
concurrency: 20
distributed: true
incremental: true
cache:
  enabled: true
  type: redis
```

### Clone a Documentation Site
```yaml
url: https://docs.example.com
maxPages: 2000
maxDepth: 10
concurrency: 15
smartCrawling: true
exportFormat: warc
```

