/**
 * SPA & Framework Support
 * Detects React, Vue, Angular and handles framework-specific features
 */

import type { Page } from 'puppeteer';

export interface FrameworkDetection {
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'nextjs' | 'nuxt' | 'gatsby' | 'remix' | 'astro' | 'solidjs' | 'preact' | 'unknown';
  confidence: number;
  version?: string;
  routes: string[];
  apiEndpoints: string[];
  stateData?: any;
}

export class SPADetector {
  /**
   * Detects the framework used by the website
   */
  async detectFramework(page: Page): Promise<FrameworkDetection> {
    const detection = await page.evaluate(() => {
      const result: FrameworkDetection = {
        framework: 'unknown',
        confidence: 0,
        routes: [],
        apiEndpoints: []
      };

      // Check for React
      if ((window as any).React || (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        result.framework = 'react';
        result.confidence = 0.9;
      }

      // Check for Next.js
      if ((window as any).__NEXT_DATA__ || document.querySelector('#__next')) {
        result.framework = 'nextjs';
        result.confidence = 0.95;
      }

      // Check for Vue
      if ((window as any).Vue || (window as any).__VUE__) {
        result.framework = 'vue';
        result.confidence = 0.9;
      }

      // Check for Nuxt
      if ((window as any).__NUXT__ || document.querySelector('#__nuxt')) {
        result.framework = 'nuxt';
        result.confidence = 0.95;
      }

      // Check for Angular
      if ((window as any).ng || (window as any).getAllAngularRootElements) {
        result.framework = 'angular';
        result.confidence = 0.9;
      }

      // Check for Svelte
      if ((window as any).__SVELTE__) {
        result.framework = 'svelte';
        result.confidence = 0.9;
      }

      // Check for Gatsby
      if ((window as any).___gatsby || (window as any).__GATSBY) {
        result.framework = 'gatsby';
        result.confidence = 0.95;
      }

      // Check for Remix
      if ((window as any).__remixContext || document.querySelector('[data-remix]')) {
        result.framework = 'remix';
        result.confidence = 0.95;
      }

      // Check for Astro
      if ((window as any).Astro || document.querySelector('[data-astro]')) {
        result.framework = 'astro';
        result.confidence = 0.95;
      }

      // Check for SolidJS
      if ((window as any).Solid || document.querySelector('[data-solid]')) {
        result.framework = 'solidjs';
        result.confidence = 0.9;
      }

      // Check for Preact
      if ((window as any).preact || (window as any).h) {
        result.framework = 'preact';
        result.confidence = 0.8;
      }

      // Extract routes
      const links = Array.from(document.querySelectorAll('a[href]'));
      result.routes = links
        .map(link => link.getAttribute('href'))
        .filter((href): href is string => !!href && href.startsWith('/'))
        .filter((href, index, self) => self.indexOf(href) === index);

      // Extract API endpoints from fetch/XHR calls
      // This would need to be done via network interception
      result.apiEndpoints = [];

      return result;
    });

    // Additional detection via script analysis
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]'))
        .map(script => script.getAttribute('src'))
        .filter((src): src is string => !!src);
    });

    // Check script sources for framework indicators
    for (const script of scripts) {
      if (script.includes('react') || script.includes('React')) {
        if (detection.framework === 'unknown') {
          detection.framework = 'react';
          detection.confidence = 0.7;
        }
      }
      if (script.includes('vue')) {
        if (detection.framework === 'unknown') {
          detection.framework = 'vue';
          detection.confidence = 0.7;
        }
      }
      if (script.includes('angular')) {
        if (detection.framework === 'unknown') {
          detection.framework = 'angular';
          detection.confidence = 0.7;
        }
      }
    }

    return detection;
  }

  /**
   * Discovers routes in SPA
   */
  async discoverRoutes(page: Page, baseUrl: string): Promise<string[]> {
    const routes = await page.evaluate((url) => {
      const discovered: string[] = [];
      const base = new URL(url);

      // Extract from links
      const links = Array.from(document.querySelectorAll('a[href]'));
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/')) {
          discovered.push(href);
        }
      });

      // Extract from router configuration (if accessible)
      if ((window as any).__NEXT_DATA__) {
        const nextData = (window as any).__NEXT_DATA__;
        if (nextData.page) {
          discovered.push(`/${nextData.page}`);
        }
      }

      // Extract from Vue Router
      if ((window as any).$nuxt) {
        const router = (window as any).$nuxt.$router;
        if (router && router.options && router.options.routes) {
          router.options.routes.forEach((route: any) => {
            if (route.path) {
              discovered.push(route.path);
            }
          });
        }
      }

      return [...new Set(discovered)];
    }, baseUrl);

    return routes;
  }

  /**
   * Discovers API endpoints
   */
  async discoverApiEndpoints(page: Page): Promise<string[]> {
    // Set up network interception
    const endpoints: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('/graphql') || url.includes('/rest/')) {
        endpoints.push(url);
      }
    });

    // Wait for page to load and make requests
    await page.waitForTimeout(3000);

    return [...new Set(endpoints)];
  }

  /**
   * Extracts state data (enhanced with localStorage, IndexedDB, Context API)
   */
  async extractStateData(page: Page): Promise<any> {
    const state = await page.evaluate(() => {
      const state: any = {};

      // Next.js
      if ((window as any).__NEXT_DATA__) {
        state.nextjs = (window as any).__NEXT_DATA__;
      }

      // Vue/Nuxt
      if ((window as any).$nuxt) {
        state.vue = {
          store: (window as any).$nuxt.$store?.state,
          route: (window as any).$nuxt.$route
        };
      }

      // React (Redux, MobX, etc.)
      if ((window as any).__REDUX_STORE__) {
        state.redux = (window as any).__REDUX_STORE__.getState();
      }

      // React Context API (if accessible)
      if ((window as any).React) {
        try {
          // Try to access React context providers
          const rootElement = document.querySelector('#root, [data-reactroot]');
          if (rootElement && (rootElement as any)._reactInternalFiber) {
            // React internals - would need more sophisticated extraction
          }
        } catch (e) {
          // Ignore
        }
      }

      // LocalStorage
      try {
        const localStorageData: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            localStorageData[key] = localStorage.getItem(key) || '';
          }
        }
        state.localStorage = localStorageData;
      } catch (e) {
        // Ignore
      }

      // SessionStorage
      try {
        const sessionStorageData: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            sessionStorageData[key] = sessionStorage.getItem(key) || '';
          }
        }
        state.sessionStorage = sessionStorageData;
      } catch (e) {
        // Ignore
      }

      // IndexedDB (async, would need callback)
      // For now, we'll extract what we can synchronously

      return state;
    });

    // Extract IndexedDB data (async)
    try {
      const indexedDBData = await page.evaluate(async () => {
        const dbData: Record<string, any> = {};
        
        // List all databases (if possible)
        if ('databases' in indexedDB) {
          try {
            const databases = await (indexedDB as any).databases();
            for (const db of databases) {
              // Would need to open each DB and extract data
              // This is complex and would require more implementation
            }
          } catch (e) {
            // Ignore
          }
        }

        return dbData;
      });

      state.indexedDB = indexedDBData;
    } catch (e) {
      // Ignore IndexedDB extraction errors
    }

    return state;
  }

  /**
   * Waits for SPA to fully load
   */
  async waitForSPALoad(page: Page, framework: string): Promise<void> {
    switch (framework) {
      case 'react':
      case 'nextjs':
        await page.waitForSelector('#__next, #root, [data-reactroot]', { timeout: 10000 }).catch(() => {});
        break;
      case 'vue':
      case 'nuxt':
        await page.waitForSelector('#__nuxt, #app, [data-v-app]', { timeout: 10000 }).catch(() => {});
        break;
      case 'angular':
        await page.waitForSelector('[ng-app], app-root', { timeout: 10000 }).catch(() => {});
        break;
      case 'svelte':
        await page.waitForSelector('body > *', { timeout: 10000 }).catch(() => {});
        break;
      case 'remix':
        await page.waitForSelector('[data-remix]', { timeout: 10000 }).catch(() => {});
        break;
      case 'astro':
        await page.waitForSelector('[data-astro]', { timeout: 10000 }).catch(() => {});
        break;
      case 'solidjs':
        await page.waitForSelector('[data-solid]', { timeout: 10000 }).catch(() => {});
        break;
      case 'preact':
        await page.waitForSelector('#root, #app', { timeout: 10000 }).catch(() => {});
        break;
    }

    // Wait for network to be idle
    try {
      await page.waitForFunction(
        () => (window as any).performance?.timing?.loadEventEnd > 0,
        { timeout: 10000 }
      );
    } catch (e) {
      // Fallback to timeout
      await page.waitForTimeout(2000);
    }
    
    // Additional wait for dynamic content
    await page.waitForTimeout(2000);
  }
}

