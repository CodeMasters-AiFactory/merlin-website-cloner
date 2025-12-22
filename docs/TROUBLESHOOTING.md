# Troubleshooting Guide

Common issues and solutions for Merlin Website Cloner.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Runtime Errors](#runtime-errors)
3. [Cloning Problems](#cloning-problems)
4. [Performance Issues](#performance-issues)
5. [Configuration Errors](#configuration-errors)

## Installation Issues

### Node Version Mismatch

**Problem**: Errors about Node.js version

**Solution**:
```bash
# Check Node version
node --version  # Should be 18+

# Update Node.js
# Using nvm
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Dependency Installation Fails

**Problem**: `npm install` fails

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with different registry
npm install --registry https://registry.npmjs.org/
```

### Build Errors

**Problem**: `npm run build` fails

**Solutions**:
```bash
# Check TypeScript version
npm list typescript

# Update dependencies
npm update

# Clean build
rm -rf dist
npm run build
```

## Runtime Errors

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
PORT=3001 npm run dev
```

### Permission Denied

**Problem**: `EACCES: permission denied`

**Solution**:
```bash
# Fix directory permissions
chmod -R 755 .

# Or run with sudo (not recommended)
sudo npm run dev
```

### Module Not Found

**Problem**: `Cannot find module 'xxx'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Check if module is in package.json
npm list xxx
```

## Cloning Problems

### Clone Fails Immediately

**Symptoms**: Job status changes to "failed" right after starting

**Diagnosis**:
1. Check job errors in dashboard
2. Review logs in `./logs`
3. Check if URL is accessible

**Solutions**:
```yaml
# Enable Cloudflare bypass
cloudflare:
  enabled: true

# Use proxy
proxy:
  enabled: true

# Increase timeout
retry:
  maxRetries: 5
  initialDelay: 2000
  maxDelay: 60000
```

### Navigation Timeout

**Problem**: `Navigation timeout of 60000 ms exceeded`

**Solutions**:
1. Increase timeout in config
2. Use different wait strategy
3. Check website speed
4. Enable resource blocking

```yaml
# In code, wait strategies are:
# - networkidle2 (default)
# - domcontentloaded (faster)
# - load (slower but more complete)
```

### Missing Assets

**Problem**: Images, CSS, or JS files are missing

**Diagnosis**:
1. Check verification report
2. Review asset capture logs
3. Check if assets require authentication

**Solutions**:
```yaml
# Increase max depth
maxDepth: 10

# Enable API scraping
advanced:
  apiScraping: true

# Enable JavaScript execution
# (JavaScript is enabled by default)
```

### Cloudflare Blocking

**Problem**: Cloudflare challenge page appears

**Solutions**:
```yaml
# Enable Cloudflare bypass
cloudflare:
  enabled: true
  captchaApiKey: your-2captcha-key
  capsolverApiKey: your-capsolver-key

# Use TLS impersonation
advanced:
  tlsImpersonation: true

# Use proxy
proxy:
  enabled: true
  rotationStrategy: per-request
```

### Rate Limiting

**Problem**: `429 Too Many Requests`

**Solutions**:
```yaml
# Reduce concurrency
concurrency: 3

# Use proxies
proxy:
  enabled: true

# Add delays
retry:
  initialDelay: 5000
  maxDelay: 30000
```

## Performance Issues

### Slow Cloning

**Problem**: Cloning takes too long

**Solutions**:
```yaml
# Increase concurrency (but not too high)
concurrency: 20

# Enable resource blocking
resourceBlocking:
  blockAds: true
  blockTrackers: true
  blockAnalytics: true

# Use distributed scraping
distributed: true

# Enable optimizations
advanced:
  cdnOptimization: true
  assetDeduplication: true
  smartCrawling: true
```

### High Memory Usage

**Problem**: Out of memory errors

**Solutions**:
```yaml
# Reduce concurrency
concurrency: 5

# Use distributed scraping
distributed: true

# Enable asset deduplication
advanced:
  assetDeduplication: true

# Clear cache regularly
```

### High CPU Usage

**Problem**: CPU usage is very high

**Solutions**:
```yaml
# Reduce concurrency
concurrency: 5

# Disable unnecessary features
captureScreenshots: false
generatePdfs: false

# Use distributed scraping
distributed: true
```

## Configuration Errors

### Invalid Config Format

**Problem**: Config file won't load

**Solutions**:
1. Validate YAML/JSON syntax
2. Check indentation (YAML is sensitive)
3. Verify all required fields
4. Use config validator

```bash
# Validate config via API
curl -X POST http://localhost:3000/api/configs/validate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d @config.json
```

### Config Validation Errors

**Problem**: Config validation fails

**Common Errors**:
- Invalid URL format
- Negative numbers where positive required
- Out of range values
- Missing required fields

**Solution**: Review validation errors and fix accordingly

### Config Not Applied

**Problem**: Settings in config not being used

**Solutions**:
1. Verify config is loaded correctly
2. Check config name matches
3. Review logs for errors
4. Test with minimal config first

## Network Issues

### Connection Refused

**Problem**: `ERR_CONNECTION_REFUSED`

**Solutions**:
1. Check internet connection
2. Verify URL is correct
3. Check firewall settings
4. Try with proxy

### DNS Resolution Failed

**Problem**: `ERR_NAME_NOT_RESOLVED`

**Solutions**:
1. Check DNS settings
2. Try different DNS server
3. Verify domain exists
4. Check for typos in URL

### SSL Certificate Errors

**Problem**: SSL/TLS errors

**Solutions**:
```yaml
# Enable TLS impersonation
advanced:
  tlsImpersonation: true

# Use proxy with SSL
proxy:
  enabled: true
```

## Browser/Puppeteer Issues

### Browser Launch Fails

**Problem**: Puppeteer can't launch browser

**Solutions**:
```bash
# Install dependencies (Linux)
sudo apt-get install -y \
  chromium-browser \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

### Browser Crashes

**Problem**: Browser crashes during cloning

**Solutions**:
1. Reduce concurrency
2. Increase system memory
3. Use browser pooling (enabled by default)
4. Check for memory leaks

## Database Issues

### Database Connection Failed

**Problem**: Can't connect to database

**Solutions**:
1. Verify database is running
2. Check connection string
3. Verify credentials
4. Check firewall rules

### Database Locked

**Problem**: Database is locked

**Solutions**:
1. Close other connections
2. Restart database
3. Check for long-running queries
4. Use connection pooling

## Redis Issues

### Redis Connection Failed

**Problem**: Can't connect to Redis

**Solutions**:
```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Check connection settings
redis-cli -h localhost -p 6379

# Restart Redis
redis-cli shutdown
redis-server
```

### Redis Memory Full

**Problem**: Redis out of memory

**Solutions**:
```bash
# Check memory usage
redis-cli info memory

# Clear cache
redis-cli FLUSHDB

# Increase memory limit in redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Getting Help

### Check Logs

Logs are in `./logs` directory:
```bash
# View latest logs
tail -f logs/app.log

# Search for errors
grep -i error logs/app.log
```

### Enable Debug Mode

```bash
# Set debug environment variable
DEBUG=* npm run dev

# Or in code
process.env.DEBUG = 'true'
```

### Collect Information

When reporting issues, include:
1. Error messages
2. Log files
3. Configuration used
4. System information
5. Steps to reproduce

### Contact Support

1. Check GitHub issues
2. Review documentation
3. Search existing issues
4. Create new issue with details

