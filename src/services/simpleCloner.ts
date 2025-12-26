/**
 * SimpleCloner - A stripped-down, reliable website cloner
 * Goal: Clone one page at a time, properly, with 95%+ visual accuracy
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface SimpleCloneOptions {
  url: string;
  outputDir: string;
  maxPages?: number;
  maxDepth?: number;
  onProgress?: (msg: string) => void;
}

export interface SimpleCloneResult {
  success: boolean;
  pagesCloned: number;
  assetsDownloaded: number;
  errors: string[];
}

export class SimpleCloner {
  private browser: Browser | null = null;
  private visitedUrls: Set<string> = new Set();
  private assetMap: Map<string, string> = new Map(); // original URL -> local path
  private errors: string[] = [];
  private assetsDownloaded: number = 0;
  private baseUrl: string = '';
  private baseDomain: string = '';

  async clone(options: SimpleCloneOptions): Promise<SimpleCloneResult> {
    const { url, outputDir, maxPages = 50, maxDepth = 2, onProgress } = options;

    this.visitedUrls.clear();
    this.assetMap.clear();
    this.errors = [];
    this.assetsDownloaded = 0;

    try {
      // Parse base URL
      const urlObj = new URL(url);
      this.baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      this.baseDomain = urlObj.host;

      onProgress?.(`Starting clone of ${url}`);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });
      await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });
      await fs.mkdir(path.join(outputDir, 'assets', 'css'), { recursive: true });
      await fs.mkdir(path.join(outputDir, 'assets', 'js'), { recursive: true });
      await fs.mkdir(path.join(outputDir, 'assets', 'images'), { recursive: true });
      await fs.mkdir(path.join(outputDir, 'assets', 'fonts'), { recursive: true });

      // Launch browser - SINGLE browser, we control it
      onProgress?.('Launching browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      // Queue for BFS crawling
      const queue: Array<{ url: string; depth: number }> = [{ url, depth: 0 }];
      let pagesCloned = 0;

      while (queue.length > 0 && pagesCloned < maxPages) {
        const item = queue.shift()!;

        if (this.visitedUrls.has(item.url)) continue;
        if (item.depth > maxDepth) continue;

        this.visitedUrls.add(item.url);

        onProgress?.(`[${pagesCloned + 1}/${maxPages}] Cloning: ${item.url}`);

        try {
          const links = await this.clonePage(item.url, outputDir, onProgress);
          pagesCloned++;

          // Add discovered links to queue
          if (item.depth < maxDepth) {
            for (const link of links) {
              if (!this.visitedUrls.has(link)) {
                queue.push({ url: link, depth: item.depth + 1 });
              }
            }
          }
        } catch (error: any) {
          this.errors.push(`Failed to clone ${item.url}: ${error.message}`);
          onProgress?.(`ERROR: ${item.url} - ${error.message}`);
        }
      }

      onProgress?.(`Clone complete: ${pagesCloned} pages, ${this.assetsDownloaded} assets`);

      return {
        success: this.errors.length === 0,
        pagesCloned,
        assetsDownloaded: this.assetsDownloaded,
        errors: this.errors,
      };

    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  private async clonePage(url: string, outputDir: string, onProgress?: (msg: string) => void): Promise<string[]> {
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    const discoveredLinks: string[] = [];

    try {
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate and WAIT PROPERLY
      onProgress?.(`  Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: 'networkidle0',  // Wait until no network activity for 500ms
        timeout: 60000
      });

      // Additional wait for JS rendering
      await page.waitForTimeout(2000);

      // Scroll to trigger lazy loading
      await this.scrollPage(page);

      // Wait again after scrolling
      await page.waitForTimeout(1000);

      // Get the full rendered HTML
      const html = await page.content();

      // Parse with cheerio for modification
      const $ = cheerio.load(html);

      // Extract and download all assets
      onProgress?.(`  Downloading assets...`);

      // CSS files
      const cssPromises: Promise<void>[] = [];
      $('link[rel="stylesheet"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const absoluteUrl = this.resolveUrl(href, url);
          cssPromises.push(this.downloadAsset(absoluteUrl, outputDir, 'css', onProgress).then(localPath => {
            if (localPath) $(el).attr('href', localPath);
          }));
        }
      });
      await Promise.all(cssPromises);

      // Inline styles with url()
      $('style').each((_, el) => {
        let styleContent = $(el).html() || '';
        // We'll handle inline CSS URLs after download
      });

      // JavaScript files
      const jsPromises: Promise<void>[] = [];
      $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          const absoluteUrl = this.resolveUrl(src, url);
          jsPromises.push(this.downloadAsset(absoluteUrl, outputDir, 'js', onProgress).then(localPath => {
            if (localPath) $(el).attr('src', localPath);
          }));
        }
      });
      await Promise.all(jsPromises);

      // Images
      const imgPromises: Promise<void>[] = [];
      $('img').each((_, el) => {
        const src = $(el).attr('src');
        const srcset = $(el).attr('srcset');

        if (src && !src.startsWith('data:')) {
          const absoluteUrl = this.resolveUrl(src, url);
          imgPromises.push(this.downloadAsset(absoluteUrl, outputDir, 'images', onProgress).then(localPath => {
            if (localPath) $(el).attr('src', localPath);
          }));
        }

        // Handle srcset
        if (srcset) {
          const srcsetParts = srcset.split(',').map(s => s.trim());
          const newSrcsetParts: string[] = [];
          for (const part of srcsetParts) {
            const [srcUrl, descriptor] = part.split(/\s+/);
            if (srcUrl && !srcUrl.startsWith('data:')) {
              const absoluteUrl = this.resolveUrl(srcUrl, url);
              imgPromises.push(this.downloadAsset(absoluteUrl, outputDir, 'images', onProgress).then(localPath => {
                if (localPath) {
                  newSrcsetParts.push(descriptor ? `${localPath} ${descriptor}` : localPath);
                }
              }));
            }
          }
          // Note: srcset update happens async, may not work perfectly
        }
      });
      await Promise.all(imgPromises);

      // Background images in style attributes
      $('[style]').each((_, el) => {
        const style = $(el).attr('style') || '';
        // Simple regex for url() - could be improved
        const urlMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
          const absoluteUrl = this.resolveUrl(urlMatch[1], url);
          // Download async - won't update style attribute in this simple version
          this.downloadAsset(absoluteUrl, outputDir, 'images', onProgress);
        }
      });

      // Favicon
      $('link[rel*="icon"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const absoluteUrl = this.resolveUrl(href, url);
          this.downloadAsset(absoluteUrl, outputDir, 'images', onProgress).then(localPath => {
            if (localPath) $(el).attr('href', localPath);
          });
        }
      });

      // Extract links for crawling
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const absoluteUrl = this.resolveUrl(href, url);
          if (this.isSameDomain(absoluteUrl) && !absoluteUrl.includes('#')) {
            discoveredLinks.push(absoluteUrl);
          }
          // Convert links to relative
          const relativePath = this.getRelativePath(absoluteUrl, url, outputDir);
          $(el).attr('href', relativePath);
        }
      });

      // Save the HTML
      const pagePath = this.getPagePath(url, outputDir);
      await fs.mkdir(path.dirname(pagePath), { recursive: true });
      await fs.writeFile(pagePath, $.html(), 'utf-8');

      onProgress?.(`  Saved: ${pagePath}`);

      return discoveredLinks;

    } finally {
      await page.close();
    }
  }

  private async scrollPage(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0); // Scroll back to top
            resolve();
          }
        }, 100);

        // Safety timeout
        setTimeout(() => {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }, 10000);
      });
    });
  }

  private async downloadAsset(
    url: string,
    outputDir: string,
    type: 'css' | 'js' | 'images' | 'fonts',
    onProgress?: (msg: string) => void
  ): Promise<string | null> {
    // Check if already downloaded
    if (this.assetMap.has(url)) {
      return this.assetMap.get(url)!;
    }

    try {
      // Skip data URLs
      if (url.startsWith('data:')) return null;

      // Fetch the asset with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const buffer = await response.buffer();

      // Generate filename
      const urlObj = new URL(url);
      let filename = path.basename(urlObj.pathname) || 'file';

      // Clean up filename
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!filename.includes('.')) {
        // Add extension based on content type
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('css')) filename += '.css';
        else if (contentType.includes('javascript')) filename += '.js';
        else if (contentType.includes('png')) filename += '.png';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) filename += '.jpg';
        else if (contentType.includes('gif')) filename += '.gif';
        else if (contentType.includes('svg')) filename += '.svg';
        else if (contentType.includes('webp')) filename += '.webp';
        else if (contentType.includes('woff2')) filename += '.woff2';
        else if (contentType.includes('woff')) filename += '.woff';
        else if (contentType.includes('ttf')) filename += '.ttf';
      }

      // Make filename unique
      const hash = url.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0).toString(16).slice(-6);
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      filename = `${base}_${hash}${ext}`;

      // Save file
      const localPath = `assets/${type}/${filename}`;
      const fullPath = path.join(outputDir, localPath);
      await fs.writeFile(fullPath, buffer);

      this.assetMap.set(url, localPath);
      this.assetsDownloaded++;

      return localPath;

    } catch (error: any) {
      // Silent fail for assets - don't spam errors
      return null;
    }
  }

  private resolveUrl(href: string, baseUrl: string): string {
    try {
      if (href.startsWith('//')) {
        return 'https:' + href;
      }
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  private isSameDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.host === this.baseDomain;
    } catch {
      return false;
    }
  }

  private getPagePath(url: string, outputDir: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      if (pathname === '/' || pathname === '') {
        return path.join(outputDir, 'index.html');
      }

      // Remove trailing slash
      pathname = pathname.replace(/\/$/, '');

      // If no extension, add index.html
      if (!path.extname(pathname)) {
        pathname = pathname + '/index.html';
      }

      // Remove leading slash
      pathname = pathname.replace(/^\//, '');

      return path.join(outputDir, pathname);
    } catch {
      return path.join(outputDir, 'index.html');
    }
  }

  private getRelativePath(targetUrl: string, currentUrl: string, outputDir: string): string {
    try {
      if (!this.isSameDomain(targetUrl)) {
        return targetUrl; // External link, keep as-is
      }

      const targetPath = this.getPagePath(targetUrl, '');
      const currentPath = this.getPagePath(currentUrl, '');

      // Simple relative path calculation
      const currentDir = path.dirname(currentPath);
      const relativePath = path.relative(currentDir, targetPath);

      return relativePath || './';
    } catch {
      return targetUrl;
    }
  }
}

// Test function
export async function testSimpleCloner() {
  const cloner = new SimpleCloner();
  const result = await cloner.clone({
    url: 'https://www.jeton.com',
    outputDir: './test-simple-clone',
    maxPages: 5,
    maxDepth: 1,
    onProgress: console.log,
  });
  console.log('Result:', result);
}
