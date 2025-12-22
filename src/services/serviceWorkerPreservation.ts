/**
 * Service Worker Preservation
 * Detects, captures, and updates service workers for offline use
 * Also handles PWA manifests for complete offline functionality
 */

import type { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import { rewriteUrl, type RewriteOptions } from '../utils/urlRewriter.js';

export interface ServiceWorkerInfo {
  url: string;
  scope: string;
  state: 'activated' | 'installing' | 'installed' | 'redundant';
  script: string;
  localPath?: string;
}

export class ServiceWorkerPreservation {
  /**
   * Detects service workers
   */
  async detectServiceWorkers(page: Page): Promise<ServiceWorkerInfo[]> {
    const workers = await page.evaluate(() => {
      return new Promise<ServiceWorkerInfo[]>((resolve) => {
        if (!('serviceWorker' in navigator)) {
          resolve([]);
          return;
        }

        navigator.serviceWorker.getRegistrations().then((registrations: readonly ServiceWorkerRegistration[]) => {
          const workers: ServiceWorkerInfo[] = [];

          registrations.forEach((registration: ServiceWorkerRegistration) => {
            const worker: ServiceWorkerInfo = {
              url: registration.active?.scriptURL || '',
              scope: registration.scope,
              state: registration.active?.state as any || 'installed',
              script: ''
            };
            workers.push(worker);
          });

          resolve(workers);
        }).catch(() => resolve([]));
      });
    });

    // Also check for service worker registration in HTML
    const htmlWorkers = await this.detectServiceWorkerInHTML(page);
    workers.push(...htmlWorkers);

    return workers;
  }

  /**
   * Detects service worker registration in HTML
   */
  private async detectServiceWorkerInHTML(page: Page): Promise<ServiceWorkerInfo[]> {
    const workers = await page.evaluate(() => {
      const workers: ServiceWorkerInfo[] = [];
      const scripts = Array.from(document.querySelectorAll('script')) as HTMLScriptElement[];

      scripts.forEach((script: HTMLScriptElement) => {
        const content = script.textContent || '';
        if (content.includes('serviceWorker.register') || content.includes('navigator.serviceWorker')) {
          const match = content.match(/serviceWorker\.register\(['"]([^'"]+)['"]/);
          if (match) {
            workers.push({
              url: match[1],
              scope: '/',
              state: 'installed',
              script: content
            });
          }
        }
      });

      return workers;
    });

    return workers;
  }

  /**
   * Captures service worker files
   */
  async captureServiceWorkers(
    page: Page,
    workers: ServiceWorkerInfo[],
    outputDir: string,
    baseUrl: string
  ): Promise<ServiceWorkerInfo[]> {
    const captured: ServiceWorkerInfo[] = [];

    for (const worker of workers) {
      try {
        // Download service worker script
        const response = await fetch(new URL(worker.url, baseUrl).href);
        if (!response.ok) continue;

        const script = await response.text();
        worker.script = script;

        // Save to file
        const filename = path.basename(worker.url) || 'service-worker.js';
        const localPath = path.join(outputDir, 'assets', 'js', filename);
        
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, script, 'utf-8');

        worker.localPath = localPath;
        captured.push(worker);
      } catch (error) {
        console.error(`Error capturing service worker ${worker.url}:`, error);
      }
    }

    return captured;
  }

  /**
   * Updates service worker paths in HTML
   */
  async updateServiceWorkerPaths(
    html: string,
    workers: ServiceWorkerInfo[],
    options: RewriteOptions
  ): Promise<string> {
    let updatedHtml = html;

    for (const worker of workers) {
      if (worker.localPath) {
        const relativePath = rewriteUrl(worker.url, options);
        const oldPath = worker.url;
        const newPath = relativePath.rewritten;

        // Replace in HTML
        updatedHtml = updatedHtml.replace(
          new RegExp(escapeRegex(oldPath), 'g'),
          newPath
        );
      }
    }

    return updatedHtml;
  }

  /**
   * Updates service worker script paths
   */
  async updateServiceWorkerScript(
    script: string,
    baseUrl: string,
    options: RewriteOptions
  ): Promise<string> {
    // Update importScripts
    let updatedScript = script.replace(
      /importScripts\(['"]([^'"]+)['"]\)/g,
      (match, url) => {
        const result = rewriteUrl(url, options);
        return `importScripts('${result.rewritten}')`;
      }
    );

    // Update fetch URLs in service worker
    updatedScript = updatedScript.replace(
      /fetch\(['"]([^'"]+)['"]\)/g,
      (match, url) => {
        const result = rewriteUrl(url, options);
        return `fetch('${result.rewritten}')`;
      }
    );

    return updatedScript;
  }

  /**
   * Captures PWA manifest
   */
  async captureManifest(
    page: Page,
    outputDir: string,
    baseUrl: string
  ): Promise<{ manifestPath?: string; manifest?: any }> {
    try {
      // Find manifest link in HTML
      const manifestUrl = await page.evaluate(() => {
        const link = document.querySelector('link[rel="manifest"]');
        return link?.getAttribute('href') || null;
      });

      if (!manifestUrl) {
        return {};
      }

      // Download manifest
      const fullUrl = new URL(manifestUrl, baseUrl).href;
      const response = await fetch(fullUrl);
      if (!response.ok) {
        return {};
      }

      const manifest = await response.json() as { icons?: Array<{ src?: string }> };

      // Save manifest
      const manifestPath = path.join(outputDir, 'manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      // Download manifest icons if any
      if (manifest.icons && Array.isArray(manifest.icons)) {
        for (const icon of manifest.icons) {
          if (icon.src) {
            try {
              const iconUrl = new URL(icon.src, baseUrl).href;
              const iconResponse = await fetch(iconUrl);
              if (iconResponse.ok) {
                const iconBuffer = Buffer.from(await iconResponse.arrayBuffer());
                const iconFilename = path.basename(icon.src);
                const iconPath = path.join(outputDir, 'assets', 'icons', iconFilename);
                await fs.mkdir(path.dirname(iconPath), { recursive: true });
                await fs.writeFile(iconPath, iconBuffer);
              }
            } catch {
              // Ignore icon download errors
            }
          }
        }
      }

      return { manifestPath, manifest };
    } catch (error) {
      console.error('Error capturing manifest:', error);
      return {};
    }
  }

  /**
   * Generates offline service worker for caching all URLs
   */
  async generateOfflineServiceWorker(
    outputDir: string,
    urlsToCache: string[]
  ): Promise<string> {
    const swPath = path.join(outputDir, 'offline-sw.js');

    const swCode = `// Generated Offline Service Worker
const CACHE_NAME = 'offline-cache-v1';
const urlsToCache = ${JSON.stringify(urlsToCache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Return offline fallback if available
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
`;

    await fs.writeFile(swPath, swCode, 'utf-8');
    return swPath;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

