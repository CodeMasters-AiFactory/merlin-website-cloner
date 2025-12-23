# Browser Automation Rules (Puppeteer/Playwright)

## Browser Lifecycle

### Launch Configuration
```typescript
const browser = await puppeteer.launch({
  headless: true,  // false for debugging
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
  ],
  timeout: 30000,
});
```

### Always Close
```typescript
// Pattern: try/finally
const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  // ... work
  await page.close();
} finally {
  await browser.close();  // ALWAYS close
}
```

## Page Management

### Resource Limits
| Resource | Limit |
|----------|-------|
| Concurrent pages | 5 max |
| Page timeout | 30 seconds |
| Navigation timeout | 60 seconds |
| Memory per page | 500MB |

### Request Interception
```typescript
await page.setRequestInterception(true);
page.on('request', (request) => {
  const resourceType = request.resourceType();
  
  // Block unnecessary resources
  if (['image', 'font', 'media'].includes(resourceType)) {
    request.abort();
    return;
  }
  
  // Block analytics/tracking
  const url = request.url();
  if (url.includes('google-analytics') || url.includes('facebook')) {
    request.abort();
    return;
  }
  
  request.continue();
});
```

## Navigation

### Wait Strategies
```typescript
// Wait for network idle (best for SPAs)
await page.goto(url, { waitUntil: 'networkidle2' });

// Wait for DOM ready (faster)
await page.goto(url, { waitUntil: 'domcontentloaded' });

// Wait for specific element
await page.waitForSelector('.content-loaded');

// Wait with timeout
await page.waitForSelector('.element', { timeout: 5000 });
```

### Handle Errors
```typescript
try {
  await page.goto(url, { timeout: 30000 });
} catch (error) {
  if (error.message.includes('timeout')) {
    logger.warn('Page load timeout', { url });
    // Try with longer timeout or abort
  } else if (error.message.includes('net::ERR')) {
    logger.error('Network error', { url, error: error.message });
    throw new Error(`Cannot load page: ${url}`);
  }
  throw error;
}
```

## Content Extraction

### Get HTML
```typescript
const html = await page.content();
const bodyHtml = await page.$eval('body', el => el.innerHTML);
```

### Get Links
```typescript
const links = await page.$$eval('a[href]', anchors => 
  anchors
    .map(a => a.href)
    .filter(href => href.startsWith('http'))
);
```

### Get Assets
```typescript
const assets = await page.evaluate(() => {
  const images = Array.from(document.images).map(img => img.src);
  const scripts = Array.from(document.scripts).map(s => s.src).filter(Boolean);
  const styles = Array.from(document.styleSheets)
    .map(s => s.href)
    .filter(Boolean);
  return { images, scripts, styles };
});
```

## Screenshots

### Full Page
```typescript
await page.screenshot({
  path: 'screenshot.png',
  fullPage: true,
});
```

### Element Only
```typescript
const element = await page.$('.target-element');
await element.screenshot({ path: 'element.png' });
```

### With Options
```typescript
await page.screenshot({
  path: 'screenshot.jpg',
  type: 'jpeg',
  quality: 80,
  clip: { x: 0, y: 0, width: 1920, height: 1080 },
});
```

## Error Handling

### Page Crash
```typescript
page.on('error', error => {
  logger.error('Page crashed', { error: error.message });
});

page.on('pageerror', error => {
  logger.warn('Page JavaScript error', { error: error.message });
});
```

### Dialog Handling
```typescript
page.on('dialog', async dialog => {
  logger.info('Dialog appeared', { message: dialog.message() });
  await dialog.dismiss();  // or dialog.accept()
});
```

## Performance

### Reuse Browser
```typescript
// GOOD: Reuse browser instance
class BrowserPool {
  private browser: Browser | null = null;
  
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch(config);
    }
    return this.browser;
  }
  
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

### Memory Management
```typescript
// Clear cache between pages
await page.evaluate(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// Force garbage collection (when available)
if (global.gc) {
  global.gc();
}
```

## Security

### Never Do
- Visit user-supplied URLs without validation
- Execute user-supplied JavaScript
- Expose browser to network without isolation
- Run as root user
- Trust page content

### Always Do
- Validate URLs before visiting
- Set timeouts on all operations
- Sandbox browser (--no-sandbox is for containers only)
- Block suspicious domains
- Limit resource downloads
