/**
 * Stealth Mode Service
 * Enhanced browser stealth configuration using puppeteer-extra
 * Removes automation detection, implements fingerprinting evasion
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { type Browser, type PuppeteerLaunchOptions } from 'puppeteer';
import vanillaPuppeteer from 'puppeteer';
import { UserAgentManager } from './userAgentManager.js';

// Add stealth plugin
puppeteer.use(StealthPlugin());

// Get Chrome executable path from vanilla puppeteer
const executablePath = vanillaPuppeteer.executablePath();

export interface StealthBrowserOptions extends PuppeteerLaunchOptions {
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
  locale?: string;
  timezoneId?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  };
}

/**
 * Creates a stealth browser instance with enhanced anti-detection
 */
export async function createStealthBrowser(
  options: StealthBrowserOptions = {}
): Promise<Browser> {
  const userAgentManager = new UserAgentManager();
  const userAgentConfig = userAgentManager.getNextUserAgent();

  // Build Chrome args array - OPTIMIZED for low CPU/RAM usage
  // Target: max 50% CPU, max 8GB RAM (user has 16GB, needs to run other apps)
  const chromeArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    // Remove automation indicators
    '--disable-blink-features=AutomationControlled',
    '--exclude-switches=enable-automation',
    '--disable-infobars',
    // === MEMORY OPTIMIZATION FLAGS ===
    '--js-flags=--max-old-space-size=512',        // Limit JS heap to 512MB
    '--memory-pressure-off',                       // Disable memory pressure warnings
    '--single-process',                            // Run in single process mode (less RAM)
    '--disable-extensions',                        // No extensions
    '--disable-plugins',                           // No plugins
    '--disable-images',                            // Don't load images in browser (we download separately)
    '--blink-settings=imagesEnabled=false',        // Disable image rendering
    '--disable-software-rasterizer',
    '--disable-canvas-aa',
    '--disable-2d-canvas-clip-aa',
    '--disable-gl-drawing-for-tests',
    '--renderer-process-limit=1',                  // Only 1 renderer process
    '--disable-site-isolation-trials',
    '--disable-features=LazyFrameLoading',
    '--aggressive-cache-discard',                  // Discard cached data aggressively
    '--disable-offline-auto-reload',
    '--disable-popup-blocking',
  ];

  // Store proxy credentials for later if provided
  let proxyCredentials: { username: string; password: string } | undefined;

  // Add proxy configuration if provided
  if (options.proxy) {
    const { host, port, username, password, protocol = 'http' } = options.proxy;
    const proxyUrl = `${protocol}://${host}:${port}`;
    chromeArgs.push(`--proxy-server=${proxyUrl}`);

    // Store credentials for later authentication if needed
    if (username && password) {
      proxyCredentials = { username, password };
    }
  }

  // Default stealth options
  const stealthOptions: PuppeteerLaunchOptions = {
    args: chromeArgs,
    ignoreHTTPSErrors: true,
    // Explicitly set executable path for pupeteer-extra compatibility
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath,
    ...options,
  };

  // Launch browser with stealth configuration
  const browser = await puppeteer.launch(stealthOptions);

  // Create a new page to apply additional stealth measures
  const page = await browser.newPage();

  // Override navigator.webdriver
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Override Chrome runtime
    (window as any).chrome = {
      runtime: {},
    };

    // Override permissions API
    const originalQuery = (window.navigator as any).permissions.query;
    (window.navigator as any).permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages (randomize based on common language sets)
    const languageSets = [
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['en-US', 'en', 'es'],
      ['fr-FR', 'fr', 'en'],
      ['de-DE', 'de', 'en'],
      ['ja-JP', 'ja'],
      ['zh-CN', 'zh'],
    ];
    const randomLanguages = languageSets[Math.floor(Math.random() * languageSets.length)];
    Object.defineProperty(navigator, 'languages', {
      get: () => randomLanguages,
    });

    // Override platform (match user agent OS)
    const userAgent = navigator.userAgent.toLowerCase();
    let platform = 'Win32';
    if (userAgent.includes('mac')) {
      platform = 'MacIntel';
    } else if (userAgent.includes('linux')) {
      platform = 'Linux x86_64';
    } else if (userAgent.includes('android')) {
      platform = 'Linux armv8l';
    }
    Object.defineProperty(navigator, 'platform', {
      get: () => platform,
    });

    // Override vendor (match browser)
    let vendor = 'Google Inc.';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      vendor = 'Apple Computer, Inc.';
    } else if (userAgent.includes('firefox')) {
      vendor = '';
    }
    Object.defineProperty(navigator, 'vendor', {
      get: () => vendor,
    });

    // Override hardware concurrency (randomize CPU cores - common values: 2, 4, 8, 12, 16)
    const commonCores = [2, 4, 8, 12, 16];
    const randomCores = commonCores[Math.floor(Math.random() * commonCores.length)];
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => randomCores,
    });

    // Override device memory (randomize - common values: 2, 4, 8, 16, 32 GB)
    const commonMemory = [2, 4, 8, 16, 32];
    const randomMemory = commonMemory[Math.floor(Math.random() * commonMemory.length)];
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => randomMemory,
    });

    // Override screen properties (randomize common resolutions)
    const commonScreens = [
      { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 },
      { width: 2560, height: 1440, colorDepth: 24, pixelDepth: 24 },
      { width: 1366, height: 768, colorDepth: 24, pixelDepth: 24 },
      { width: 1536, height: 864, colorDepth: 24, pixelDepth: 24 },
      { width: 3840, height: 2160, colorDepth: 30, pixelDepth: 30 },
    ];
    const randomScreen = commonScreens[Math.floor(Math.random() * commonScreens.length)];

    Object.defineProperty(screen, 'width', {
      get: () => randomScreen.width,
    });
    Object.defineProperty(screen, 'height', {
      get: () => randomScreen.height,
    });
    Object.defineProperty(screen, 'availWidth', {
      get: () => randomScreen.width,
    });
    Object.defineProperty(screen, 'availHeight', {
      get: () => randomScreen.height - 40, // Account for taskbar
    });
    Object.defineProperty(screen, 'colorDepth', {
      get: () => randomScreen.colorDepth,
    });
    Object.defineProperty(screen, 'pixelDepth', {
      get: () => randomScreen.pixelDepth,
    });

    // Canvas fingerprinting evasion
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: any) {
      const context = this.getContext('2d');
      if (context) {
        // Add minimal noise to canvas
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() < 0.01) {
            imageData.data[i] += Math.random() < 0.5 ? -1 : 1;
          }
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, [type, quality]);
    };

    // WebGL fingerprinting evasion (randomize GPU vendor/renderer)
    const webglVendors = [
      { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
      { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1060' },
      { vendor: 'AMD', renderer: 'AMD Radeon RX 580' },
      { vendor: 'Intel Inc.', renderer: 'Intel UHD Graphics 630' },
      { vendor: 'Apple Inc.', renderer: 'Apple M1' },
      { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3060' },
    ];
    const randomGPU = webglVendors[Math.floor(Math.random() * webglVendors.length)];

    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === 37445) {
        return randomGPU.vendor;
      }
      if (parameter === 37446) {
        return randomGPU.renderer;
      }
      return getParameter.apply(this, [parameter]);
    };

    // Audio fingerprinting evasion
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
      AudioContext.prototype.createAnalyser = function () {
        const analyser = originalCreateAnalyser.apply(this);
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
        analyser.getFloatFrequencyData = function (array: Float32Array) {
          originalGetFloatFrequencyData.apply(this, [array]);
          // Add minimal noise
          for (let i = 0; i < array.length; i++) {
            if (Math.random() < 0.01) {
              array[i] += (Math.random() - 0.5) * 0.1;
            }
          }
        };
        return analyser;
      };
    }
  });

  // Set user agent and viewport
  const userAgent = options.userAgent || userAgentConfig.userAgent;
  await page.setUserAgent(userAgent);

  if (options.viewport) {
    await page.setViewport({
      width: options.viewport.width,
      height: options.viewport.height,
      deviceScaleFactor: options.viewport.deviceScaleFactor || 1,
    });
  } else {
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
  }

  // Set locale and timezone
  if (options.locale) {
    await page.setExtraHTTPHeaders({
      'Accept-Language': options.locale,
    });
  }

  if (options.timezoneId) {
    await page.emulateTimezone(options.timezoneId);
  }

  // Set geolocation if provided
  if (options.geolocation) {
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://example.com', ['geolocation']);
    await page.setGeolocation({
      latitude: options.geolocation.latitude,
      longitude: options.geolocation.longitude,
    });
  }

  // Set proxy authentication if provided
  if (proxyCredentials) {
    await page.authenticate({
      username: proxyCredentials.username,
      password: proxyCredentials.password,
    });
  }

  // Close the test page
  await page.close();

  return browser;
}

/**
 * Applies additional stealth measures to an existing page
 */
export async function applyStealthMeasures(page: any): Promise<void> {
  await page.evaluateOnNewDocument(() => {
    // Remove automation indicators
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Override Chrome runtime
    (window as any).chrome = {
      runtime: {},
    };
  });
}

