/**
 * Multi-Browser Engine Service
 *
 * Provides unified interface for multiple browser engines:
 * - Puppeteer (Chromium) - default
 * - Playwright (Chrome, Firefox, Safari/WebKit, Edge)
 *
 * Features:
 * - Automatic fallback on detection
 * - Browser rotation per session
 * - Engine-specific optimizations
 */

import * as puppeteer from 'puppeteer';
import * as playwright from 'playwright';
import type { Browser as PuppeteerBrowser, Page as PuppeteerPage } from 'puppeteer';
import type { Browser as PlaywrightBrowser, Page as PlaywrightPage, BrowserContext } from 'playwright';

export type BrowserEngine = 'puppeteer' | 'playwright-chromium' | 'playwright-firefox' | 'playwright-webkit';
export type UnifiedPage = PuppeteerPage | PlaywrightPage;
export type UnifiedBrowser = PuppeteerBrowser | PlaywrightBrowser;

export interface BrowserOptions {
  engine: BrowserEngine;
  headless: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  userAgent?: string;
  viewport?: { width: number; height: number };
  timeout?: number;
  args?: string[];
}

export interface MultiBrowserConfig {
  preferredEngine: BrowserEngine;
  fallbackEngines: BrowserEngine[];
  rotateEngines: boolean; // Rotate between engines for each session
  autoFallback: boolean; // Auto-switch on detection
}

const DEFAULT_CONFIG: MultiBrowserConfig = {
  preferredEngine: 'puppeteer',
  fallbackEngines: ['playwright-chromium', 'playwright-firefox', 'playwright-webkit'],
  rotateEngines: false,
  autoFallback: true,
};

export class MultiBrowserEngine {
  private config: MultiBrowserConfig;
  private activeBrowsers: Map<string, { browser: UnifiedBrowser; engine: BrowserEngine }> = new Map();
  private engineRotationIndex: number = 0;
  private detectionFailures: Map<BrowserEngine, number> = new Map();

  constructor(config: Partial<MultiBrowserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Launch a browser instance
   */
  async launch(options: Partial<BrowserOptions> = {}): Promise<{ browser: UnifiedBrowser; engine: BrowserEngine; id: string }> {
    const engine = this.selectEngine(options.engine);
    const id = `browser-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const launchOptions = this.buildLaunchOptions(engine, options);

    try {
      let browser: UnifiedBrowser;

      switch (engine) {
        case 'puppeteer':
          browser = await puppeteer.launch(launchOptions as puppeteer.LaunchOptions);
          break;

        case 'playwright-chromium':
          browser = await playwright.chromium.launch(launchOptions as playwright.LaunchOptions);
          break;

        case 'playwright-firefox':
          browser = await playwright.firefox.launch(launchOptions as playwright.LaunchOptions);
          break;

        case 'playwright-webkit':
          browser = await playwright.webkit.launch(launchOptions as playwright.LaunchOptions);
          break;

        default:
          throw new Error(`Unknown engine: ${engine}`);
      }

      this.activeBrowsers.set(id, { browser, engine });
      return { browser, engine, id };

    } catch (error: any) {
      console.error(`Failed to launch ${engine}:`, error.message);

      // Try fallback
      if (this.config.autoFallback) {
        const fallbackEngine = this.getNextFallback(engine);
        if (fallbackEngine) {
          console.log(`Falling back to ${fallbackEngine}...`);
          return this.launch({ ...options, engine: fallbackEngine });
        }
      }

      throw error;
    }
  }

  /**
   * Create a new page in a browser
   */
  async newPage(browserId: string, options: Partial<BrowserOptions> = {}): Promise<UnifiedPage> {
    const browserInfo = this.activeBrowsers.get(browserId);
    if (!browserInfo) {
      throw new Error(`Browser ${browserId} not found`);
    }

    const { browser, engine } = browserInfo;

    if (engine === 'puppeteer') {
      const page = await (browser as PuppeteerBrowser).newPage();

      if (options.viewport) {
        await page.setViewport(options.viewport);
      }

      if (options.userAgent) {
        await page.setUserAgent(options.userAgent);
      }

      return page;

    } else {
      // Playwright
      const context = await (browser as PlaywrightBrowser).newContext({
        viewport: options.viewport,
        userAgent: options.userAgent,
        proxy: options.proxy ? {
          server: options.proxy.server,
          username: options.proxy.username,
          password: options.proxy.password,
        } : undefined,
      });

      return context.newPage();
    }
  }

  /**
   * Navigate to URL with engine-specific handling
   */
  async navigate(
    page: UnifiedPage,
    url: string,
    options: { waitUntil?: 'load' | 'networkidle' | 'domcontentloaded'; timeout?: number } = {}
  ): Promise<void> {
    const waitUntil = options.waitUntil || 'networkidle';
    const timeout = options.timeout || 30000;

    if (this.isPuppeteerPage(page)) {
      await page.goto(url, {
        waitUntil: waitUntil === 'networkidle' ? 'networkidle2' : waitUntil,
        timeout,
      });
    } else {
      await page.goto(url, {
        waitUntil: waitUntil === 'networkidle' ? 'networkidle' : waitUntil,
        timeout,
      });
    }
  }

  /**
   * Get page content
   */
  async getContent(page: UnifiedPage): Promise<string> {
    return page.content();
  }

  /**
   * Take screenshot
   */
  async screenshot(page: UnifiedPage, path: string): Promise<void> {
    if (this.isPuppeteerPage(page)) {
      await page.screenshot({ path, fullPage: true });
    } else {
      await page.screenshot({ path, fullPage: true });
    }
  }

  /**
   * Evaluate JavaScript in page
   */
  async evaluate<T>(page: UnifiedPage, fn: () => T): Promise<T> {
    return page.evaluate(fn);
  }

  /**
   * Close browser
   */
  async close(browserId: string): Promise<void> {
    const browserInfo = this.activeBrowsers.get(browserId);
    if (browserInfo) {
      await browserInfo.browser.close();
      this.activeBrowsers.delete(browserId);
    }
  }

  /**
   * Close all browsers
   */
  async closeAll(): Promise<void> {
    for (const [id] of this.activeBrowsers) {
      await this.close(id);
    }
  }

  /**
   * Report detection failure for an engine
   */
  reportDetectionFailure(engine: BrowserEngine): void {
    const current = this.detectionFailures.get(engine) || 0;
    this.detectionFailures.set(engine, current + 1);
  }

  /**
   * Get engine with lowest detection failures
   */
  getBestEngine(): BrowserEngine {
    let bestEngine = this.config.preferredEngine;
    let lowestFailures = this.detectionFailures.get(bestEngine) || 0;

    for (const engine of [this.config.preferredEngine, ...this.config.fallbackEngines]) {
      const failures = this.detectionFailures.get(engine) || 0;
      if (failures < lowestFailures) {
        lowestFailures = failures;
        bestEngine = engine;
      }
    }

    return bestEngine;
  }

  /**
   * Get browser capabilities
   */
  getCapabilities(engine: BrowserEngine): {
    supportsWebP: boolean;
    supportsAVIF: boolean;
    supportsWebGL: boolean;
    supportsServiceWorker: boolean;
  } {
    switch (engine) {
      case 'puppeteer':
      case 'playwright-chromium':
        return {
          supportsWebP: true,
          supportsAVIF: true,
          supportsWebGL: true,
          supportsServiceWorker: true,
        };

      case 'playwright-firefox':
        return {
          supportsWebP: true,
          supportsAVIF: true,
          supportsWebGL: true,
          supportsServiceWorker: true,
        };

      case 'playwright-webkit':
        return {
          supportsWebP: true,
          supportsAVIF: false, // Safari has limited AVIF support
          supportsWebGL: true,
          supportsServiceWorker: true,
        };

      default:
        return {
          supportsWebP: true,
          supportsAVIF: false,
          supportsWebGL: true,
          supportsServiceWorker: true,
        };
    }
  }

  // Private helpers

  private selectEngine(preferred?: BrowserEngine): BrowserEngine {
    if (preferred) return preferred;

    if (this.config.rotateEngines) {
      const engines = [this.config.preferredEngine, ...this.config.fallbackEngines];
      const engine = engines[this.engineRotationIndex % engines.length];
      this.engineRotationIndex++;
      return engine;
    }

    return this.config.preferredEngine;
  }

  private getNextFallback(failed: BrowserEngine): BrowserEngine | null {
    const fallbacks = this.config.fallbackEngines.filter(e => e !== failed);
    return fallbacks[0] || null;
  }

  private buildLaunchOptions(engine: BrowserEngine, options: Partial<BrowserOptions>): any {
    const headless = options.headless ?? true;
    const args = options.args || [];

    // Common stealth args
    const stealthArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ];

    if (engine === 'puppeteer') {
      return {
        headless: headless ? 'new' : false,
        args: [...stealthArgs, ...args],
        defaultViewport: options.viewport || { width: 1920, height: 1080 },
      };
    }

    // Playwright options
    return {
      headless,
      args: [...stealthArgs, ...args],
      proxy: options.proxy ? {
        server: options.proxy.server,
        username: options.proxy.username,
        password: options.proxy.password,
      } : undefined,
    };
  }

  private isPuppeteerPage(page: UnifiedPage): page is PuppeteerPage {
    // Puppeteer pages have 'browser' method, Playwright pages have 'context'
    return typeof (page as any).browser === 'function';
  }
}

/**
 * Factory function
 */
export function createMultiBrowserEngine(config?: Partial<MultiBrowserConfig>): MultiBrowserEngine {
  return new MultiBrowserEngine(config);
}

/**
 * Quick browser launch helper
 */
export async function quickLaunch(
  engine: BrowserEngine = 'puppeteer',
  headless: boolean = true
): Promise<{ browser: UnifiedBrowser; page: UnifiedPage; close: () => Promise<void> }> {
  const multiEngine = new MultiBrowserEngine();
  const { browser, id } = await multiEngine.launch({ engine, headless });
  const page = await multiEngine.newPage(id);

  return {
    browser,
    page,
    close: async () => {
      await multiEngine.close(id);
    },
  };
}
