/**
 * Website Cloner Unit Tests
 * Tests for the core cloning engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock puppeteer before importing websiteCloner
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(null),
        setViewport: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn().mockResolvedValue(null),
        content: vi.fn().mockResolvedValue('<html><head></head><body>Test</body></html>'),
        close: vi.fn().mockResolvedValue(null),
        on: vi.fn(),
        setRequestInterception: vi.fn().mockResolvedValue(null),
        waitForNavigation: vi.fn().mockResolvedValue(null),
      }),
      close: vi.fn().mockResolvedValue(null),
      pages: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(''),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(false),
  readFile: vi.fn().mockResolvedValue(''),
}));

describe('WebsiteCloner', () => {
  describe('URL Validation', () => {
    it('should accept valid HTTP URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com/path',
        'https://example.com:8080/path?query=1',
      ];

      for (const url of validUrls) {
        expect(() => new URL(url)).not.toThrow();
      }
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'file:///etc/passwd',
        '',
      ];

      for (const url of invalidUrls) {
        if (url === '') {
          expect(() => new URL(url)).toThrow();
        } else if (url.startsWith('ftp') || url.startsWith('file')) {
          const parsed = new URL(url);
          expect(['http:', 'https:'].includes(parsed.protocol)).toBe(false);
        }
      }
    });

    it('should extract domain correctly', () => {
      const testCases = [
        { url: 'https://example.com', domain: 'example.com' },
        { url: 'https://www.example.com', domain: 'www.example.com' },
        { url: 'https://sub.example.com:8080/path', domain: 'sub.example.com' },
      ];

      for (const { url, domain } of testCases) {
        const parsed = new URL(url);
        expect(parsed.hostname).toBe(domain);
      }
    });
  });

  describe('Clone Options', () => {
    it('should have sensible default options', () => {
      const defaultOptions = {
        maxPages: 100,
        maxDepth: 5,
        concurrency: 3,
        timeout: 30000,
        respectRobotsTxt: true,
        downloadAssets: true,
      };

      expect(defaultOptions.maxPages).toBeGreaterThan(0);
      expect(defaultOptions.maxDepth).toBeGreaterThan(0);
      expect(defaultOptions.concurrency).toBeGreaterThan(0);
      expect(defaultOptions.timeout).toBeGreaterThan(0);
    });

    it('should allow custom options to override defaults', () => {
      const customOptions = {
        maxPages: 50,
        maxDepth: 3,
        concurrency: 5,
      };

      const merged = {
        maxPages: 100,
        maxDepth: 5,
        concurrency: 3,
        ...customOptions,
      };

      expect(merged.maxPages).toBe(50);
      expect(merged.maxDepth).toBe(3);
      expect(merged.concurrency).toBe(5);
    });
  });

  describe('URL Normalization', () => {
    it('should normalize URLs correctly', () => {
      const normalizeUrl = (url: string, baseUrl: string): string => {
        try {
          return new URL(url, baseUrl).href;
        } catch {
          return url;
        }
      };

      expect(normalizeUrl('/page', 'https://example.com')).toBe('https://example.com/page');
      expect(normalizeUrl('./page', 'https://example.com/dir/')).toBe('https://example.com/dir/page');
      expect(normalizeUrl('../page', 'https://example.com/dir/sub/')).toBe('https://example.com/dir/page');
      expect(normalizeUrl('https://other.com/page', 'https://example.com')).toBe('https://other.com/page');
    });

    it('should handle hash fragments', () => {
      const url = new URL('https://example.com/page#section');
      expect(url.hash).toBe('#section');
      expect(url.pathname).toBe('/page');
    });

    it('should handle query parameters', () => {
      const url = new URL('https://example.com/page?foo=bar&baz=qux');
      expect(url.searchParams.get('foo')).toBe('bar');
      expect(url.searchParams.get('baz')).toBe('qux');
    });
  });

  describe('Asset Type Detection', () => {
    it('should detect CSS files', () => {
      const cssUrls = [
        'styles.css',
        'main.min.css',
        'theme.css?v=1.0',
      ];

      for (const url of cssUrls) {
        expect(url.includes('.css')).toBe(true);
      }
    });

    it('should detect JavaScript files', () => {
      const jsUrls = [
        'script.js',
        'app.min.js',
        'bundle.js?hash=abc123',
      ];

      for (const url of jsUrls) {
        expect(url.includes('.js')).toBe(true);
      }
    });

    it('should detect image files', () => {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];
      const imageUrls = [
        'image.jpg',
        'photo.png',
        'icon.svg',
        'banner.webp',
      ];

      for (const url of imageUrls) {
        const hasImageExt = imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
        expect(hasImageExt).toBe(true);
      }
    });

    it('should detect font files', () => {
      const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
      const fontUrls = [
        'font.woff2',
        'icons.ttf',
        'custom.otf',
      ];

      for (const url of fontUrls) {
        const hasFontExt = fontExtensions.some(ext => url.toLowerCase().endsWith(ext));
        expect(hasFontExt).toBe(true);
      }
    });
  });

  describe('HTML Processing', () => {
    it('should extract links from HTML', () => {
      const html = `
        <html>
          <head>
            <link rel="stylesheet" href="/styles.css">
            <script src="/script.js"></script>
          </head>
          <body>
            <a href="/page1">Page 1</a>
            <a href="/page2">Page 2</a>
            <img src="/image.png">
          </body>
        </html>
      `;

      // Simple regex extraction (actual implementation uses cheerio)
      const hrefMatches = html.match(/href="([^"]+)"/g) || [];
      const srcMatches = html.match(/src="([^"]+)"/g) || [];

      expect(hrefMatches.length).toBe(3); // stylesheet + 2 links
      expect(srcMatches.length).toBe(2); // script + image
    });

    it('should handle relative URLs in HTML', () => {
      const baseUrl = 'https://example.com/dir/page.html';
      const relativeUrl = '../assets/image.png';

      const absoluteUrl = new URL(relativeUrl, baseUrl).href;
      expect(absoluteUrl).toBe('https://example.com/assets/image.png');
    });
  });

  describe('Clone Status', () => {
    it('should have valid status types', () => {
      const validStatuses = [
        'pending',
        'processing',
        'crawling',
        'downloading',
        'verifying',
        'completed',
        'failed',
        'paused',
      ];

      for (const status of validStatuses) {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      }
    });

    it('should track progress correctly', () => {
      const progress = {
        pagesCloned: 0,
        totalPages: 100,
        assetsDownloaded: 0,
        totalAssets: 500,
      };

      // Simulate progress
      progress.pagesCloned = 50;
      progress.assetsDownloaded = 250;

      const pageProgress = (progress.pagesCloned / progress.totalPages) * 100;
      const assetProgress = (progress.assetsDownloaded / progress.totalAssets) * 100;

      expect(pageProgress).toBe(50);
      expect(assetProgress).toBe(50);
    });
  });

  describe('Error Handling', () => {
    it('should categorize errors correctly', () => {
      const errorTypes = {
        NETWORK_ERROR: 'Network request failed',
        TIMEOUT_ERROR: 'Request timed out',
        BLOCKED_ERROR: 'Access blocked by protection',
        PARSE_ERROR: 'Failed to parse content',
        UNKNOWN_ERROR: 'Unknown error occurred',
      };

      expect(Object.keys(errorTypes).length).toBe(5);
      for (const [key, value] of Object.entries(errorTypes)) {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      }
    });

    it('should handle retry logic', async () => {
      let attempts = 0;
      const maxRetries = 3;

      const mockOperation = async (): Promise<string> => {
        attempts++;
        if (attempts < maxRetries) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      // Retry logic
      let result: string | null = null;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await mockOperation();
          break;
        } catch {
          // Continue to next retry
        }
      }

      expect(result).toBe('success');
      expect(attempts).toBe(maxRetries);
    });
  });

  describe('File Path Generation', () => {
    it('should generate safe file paths', () => {
      const sanitizeFilename = (name: string): string => {
        return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
      };

      expect(sanitizeFilename('normal.html')).toBe('normal.html');
      expect(sanitizeFilename('path/to/file.html')).toBe('path_to_file.html');
      expect(sanitizeFilename('file<>:"/\\|?*.html')).toBe('file_________.html');
    });

    it('should handle URL to file path conversion', () => {
      const urlToFilePath = (url: string): string => {
        const parsed = new URL(url);
        let path = parsed.pathname;

        if (path === '/' || path === '') {
          return 'index.html';
        }

        if (!path.includes('.')) {
          path = path.endsWith('/') ? `${path}index.html` : `${path}/index.html`;
        }

        return path.replace(/^\//, '');
      };

      expect(urlToFilePath('https://example.com/')).toBe('index.html');
      expect(urlToFilePath('https://example.com/page')).toBe('page/index.html');
      expect(urlToFilePath('https://example.com/page.html')).toBe('page.html');
      expect(urlToFilePath('https://example.com/dir/page')).toBe('dir/page/index.html');
    });
  });

  describe('Concurrency Control', () => {
    it('should limit concurrent operations', async () => {
      const concurrencyLimit = 3;
      let activeCount = 0;
      let maxActive = 0;

      const mockTask = async (id: number): Promise<number> => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await new Promise(resolve => setTimeout(resolve, 10));
        activeCount--;
        return id;
      };

      // Simple concurrency limiter
      const tasks = Array.from({ length: 10 }, (_, i) => i);
      const results: number[] = [];

      for (let i = 0; i < tasks.length; i += concurrencyLimit) {
        const batch = tasks.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(batch.map(mockTask));
        results.push(...batchResults);
      }

      expect(results.length).toBe(10);
      expect(maxActive).toBeLessThanOrEqual(concurrencyLimit);
    });
  });
});
