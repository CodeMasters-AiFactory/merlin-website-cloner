/**
 * Browser Connection Pool
 * Reuses browser instances to reduce overhead and improve performance
 */

import { type Browser } from 'puppeteer';
import { createStealthBrowser, type StealthBrowserOptions } from './stealthMode.js';
import { UserAgentManager } from './userAgentManager.js';
import { TLSFingerprintMatcher } from './tlsFingerprinting.js';

export interface BrowserPoolOptions {
  maxSize?: number;
  minSize?: number;
  idleTimeout?: number; // Time in ms before closing idle browsers
}

export class BrowserPool {
  private pool: Browser[] = [];
  private inUse: Set<Browser> = new Set();
  private maxSize: number;
  private minSize: number;
  private idleTimeout: number;
  private userAgentManager: UserAgentManager;
  private idleTimers: Map<Browser, NodeJS.Timeout> = new Map();

  constructor(options: BrowserPoolOptions = {}) {
    this.maxSize = options.maxSize || 20;
    this.minSize = options.minSize || 5;
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes default
    this.userAgentManager = new UserAgentManager();
  }

  /**
   * Acquire a browser from the pool
   */
  async acquire(options?: StealthBrowserOptions): Promise<Browser> {
    // Try to get an available browser from pool
    if (this.pool.length > 0) {
      const browser = this.pool.pop()!;
      this.inUse.add(browser);
      
      // Clear idle timer if exists
      const timer = this.idleTimers.get(browser);
      if (timer) {
        clearTimeout(timer);
        this.idleTimers.delete(browser);
      }
      
      return browser;
    }

    // If pool is empty and we haven't reached max size, create new browser
    if (this.pool.length + this.inUse.size < this.maxSize) {
      const userAgent = this.userAgentManager.getNextUserAgent();
      const tlsConfig = TLSFingerprintMatcher.getTLSConfig(userAgent.userAgent);
      
      const browser = await createStealthBrowser({
        userAgent: userAgent.userAgent,
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        },
        locale: userAgent.language,
        ...options,
      });
      
      this.inUse.add(browser);
      return browser;
    }

    // Pool is full, wait for a browser to become available
    // In a real implementation, we'd use a queue here
    // For now, create a new one anyway (will be cleaned up later)
    const userAgent = this.userAgentManager.getNextUserAgent();
    const browser = await createStealthBrowser({
      userAgent: userAgent.userAgent,
      viewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      },
      locale: userAgent.language,
      ...options,
    });
    
    this.inUse.add(browser);
    return browser;
  }

  /**
   * Release a browser back to the pool
   */
  release(browser: Browser): void {
    if (!this.inUse.has(browser)) {
      return; // Browser not in use
    }

    this.inUse.delete(browser);

    // Check if browser is still connected
    if (!browser.isConnected()) {
      return; // Browser is closed, don't add to pool
    }

    // If pool has space, add browser back
    if (this.pool.length < this.maxSize) {
      this.pool.push(browser);
      
      // Set idle timer to close browser if unused
      const timer = setTimeout(() => {
        this.closeBrowser(browser);
      }, this.idleTimeout);
      
      this.idleTimers.set(browser, timer);
    } else {
      // Pool is full, close the browser
      this.closeBrowser(browser);
    }
  }

  /**
   * Close a browser and remove it from tracking
   */
  private async closeBrowser(browser: Browser): Promise<void> {
    try {
      // Clear timer if exists
      const timer = this.idleTimers.get(browser);
      if (timer) {
        clearTimeout(timer);
        this.idleTimers.delete(browser);
      }

      // Remove from pool if present
      const poolIndex = this.pool.indexOf(browser);
      if (poolIndex !== -1) {
        this.pool.splice(poolIndex, 1);
      }

      // Remove from in-use if present
      this.inUse.delete(browser);

      // Close browser
      if (browser.isConnected()) {
        await browser.close();
      }
    } catch (error) {
      // Ignore errors when closing
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number;
    inUse: number;
    total: number;
  } {
    return {
      poolSize: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size,
    };
  }

  /**
   * Close all browsers in the pool
   */
  async closeAll(): Promise<void> {
    // Close all timers
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();

    // Close all browsers in pool
    const poolBrowsers = [...this.pool];
    this.pool = [];
    
    for (const browser of poolBrowsers) {
      try {
        if (browser.isConnected()) {
          await browser.close();
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Close all browsers in use (they should be released first, but just in case)
    const inUseBrowsers = [...this.inUse];
    this.inUse.clear();
    
    for (const browser of inUseBrowsers) {
      try {
        if (browser.isConnected()) {
          await browser.close();
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Ensure minimum pool size
   */
  async ensureMinSize(): Promise<void> {
    while (this.pool.length < this.minSize && this.pool.length + this.inUse.size < this.maxSize) {
      const userAgent = this.userAgentManager.getNextUserAgent();
      const browser = await createStealthBrowser({
        userAgent: userAgent.userAgent,
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        },
        locale: userAgent.language,
      });
      
      this.pool.push(browser);
      
      // Set idle timer
      const timer = setTimeout(() => {
        this.closeBrowser(browser);
      }, this.idleTimeout);
      
      this.idleTimers.set(browser, timer);
    }
  }
}

// Global browser pool instance
let globalBrowserPool: BrowserPool | null = null;

/**
 * Get or create the global browser pool
 */
export function getBrowserPool(options?: BrowserPoolOptions): BrowserPool {
  if (!globalBrowserPool) {
    globalBrowserPool = new BrowserPool(options);
  }
  return globalBrowserPool;
}

/**
 * Close the global browser pool
 */
export async function closeBrowserPool(): Promise<void> {
  if (globalBrowserPool) {
    await globalBrowserPool.closeAll();
    globalBrowserPool = null;
  }
}

