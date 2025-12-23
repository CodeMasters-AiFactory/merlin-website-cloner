# Browser Automation Admin Rules

## Playwright

### Installation
```powershell
# Install Playwright
npm install -D playwright

# Install browsers
npx playwright install

# Install specific browser
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# Install with dependencies (system packages)
npx playwright install --with-deps
```

### Global Installation
```powershell
npm install -g playwright
```

### Browser Paths
```powershell
# Default browser locations
# %LOCALAPPDATA%\ms-playwright\

# List installed browsers
npx playwright install --dry-run
```

### CLI Commands
```powershell
# Open browser with inspector
npx playwright open https://example.com

# Record test
npx playwright codegen https://example.com

# Run tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run headed
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

### Configuration (playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  workers: 4,
  reporter: 'html',
  
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

## Puppeteer

### Installation
```powershell
# Install Puppeteer (includes Chromium)
npm install puppeteer

# Install without bundled browser
npm install puppeteer-core
```

### Browser Management
```powershell
# Set custom Chrome path
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Skip Chromium download
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
```

### Basic Usage
```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});

const page = await browser.newPage();
await page.goto('https://example.com');
await page.screenshot({ path: 'screenshot.png' });
await browser.close();
```

## Selenium

### Installation
```powershell
# Install WebDriver for Node.js
npm install selenium-webdriver

# Install ChromeDriver
npm install chromedriver

# Or via Chocolatey
choco install chromedriver -y
```

### WebDriver Management
```powershell
# ChromeDriver location after npm install
# node_modules\chromedriver\lib\chromedriver\chromedriver.exe

# Add to PATH
$env:PATH += ";$PWD\node_modules\chromedriver\lib\chromedriver"
```

## Browser Installation

### Chrome
```powershell
winget install Google.Chrome
```

### Firefox
```powershell
winget install Mozilla.Firefox
```

### Edge (usually pre-installed)
```powershell
winget install Microsoft.Edge
```

### Chromium
```powershell
choco install chromium -y
```

## Headless Browser Tips

### Memory Management
```typescript
// Limit pages open at once
const MAX_PAGES = 5;
let openPages = 0;

async function getPage(browser) {
  while (openPages >= MAX_PAGES) {
    await new Promise(r => setTimeout(r, 100));
  }
  openPages++;
  return browser.newPage();
}

async function closePage(page) {
  await page.close();
  openPages--;
}
```

### Screenshot Optimization
```typescript
await page.screenshot({
  path: 'screenshot.png',
  type: 'png',           // or 'jpeg'
  quality: 80,           // jpeg only
  fullPage: true,        // full page scroll
  omitBackground: true   // transparent bg
});
```

### Performance Flags
```typescript
const browser = await puppeteer.launch({
  args: [
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-first-run',
    '--safebrowsing-disable-auto-update'
  ]
});
```

## Cleanup

```powershell
# Kill all Chrome processes
taskkill /F /IM chrome.exe

# Kill all ChromeDriver
taskkill /F /IM chromedriver.exe

# Clear Puppeteer cache
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\puppeteer"

# Clear Playwright browsers
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\ms-playwright"
```
