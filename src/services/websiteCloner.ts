/**
 * Main Website Cloner Service
 * Orchestrates all components for complete website backup
 */

import { type Browser, type Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createStealthBrowser, applyStealthMeasures } from './stealthMode.js';
import { TLSFingerprintMatcher } from './tlsFingerprinting.js';
import { applyFingerprintEvasion, getFingerprintConfigForUserAgent } from './fingerprintEvasion.js';
import { applyBehavioralPatterns } from './behavioralSimulation.js';
import { ProxyManager, IPRoyalProvider } from './proxyManager.js';
import { UserAgentManager } from './userAgentManager.js';
import { CloudflareBypass } from './cloudflareBypass.js';
import { ParallelProcessor } from './parallelProcessor.js';
import { AssetCapture } from './assetCapture.js';
import { SPADetector } from './spaDetector.js';
import { JSVerification } from './jsVerification.js';
import { ServiceWorkerPreservation } from './serviceWorkerPreservation.js';
import { VerificationSystem } from './verificationSystem.js';
import { ExportFormats } from './exportFormats.js';
import { CacheManager } from './cacheManager.js';
import { IncrementalUpdater } from './incrementalUpdater.js';
import { CookieManager } from './cookieManager.js';
import { LoggingService } from './logging.js';
import { StructuredDataExtractor } from './structuredDataExtractor.js';
import { ContentExtractor } from './contentExtractor.js';
import { BrowserPool, getBrowserPool } from './browserPool.js';
import { ResourceBlocker } from './resourceBlocker.js';
import { DistributedScraper } from './distributedScraper.js';
import { WorkerPool } from './workerPool.js';
import { ErrorFormatter } from '../utils/errorFormatter.js';
import pLimit from 'p-limit';
import { fixAllLinks, type LinkFixOptions } from '../utils/linkFixer.js';
import { createCompleteStructure } from '../utils/directoryStructure.js';
import { generateAllServerFiles } from '../utils/localServerGenerator.js';
import { rewriteUrl, type RewriteOptions } from '../utils/urlRewriter.js';
import { TLSImpersonate } from './tlsImpersonate.js';
import { WebSocketCapture } from './webSocketCapture.js';
import { MobileEmulation } from './mobileEmulation.js';
import { ApiMocker } from './apiMocker.js';
import { SmartCrawler } from './smartCrawler.js';
import { CDNOptimizer } from './cdnOptimizer.js';
import { AssetDeduplicator } from './assetDeduplicator.js';
import { AssetOptimizer } from './assetOptimizer.js';
import { WARCGenerator } from './warcGenerator.js';
import { RetryManager } from './retryManager.js';
import { ErrorHandler } from './errorHandler.js';
import { verifyClone, type VerificationResult } from './cloneVerifier.js';

export interface CloneOptions {
  url: string;
  outputDir: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  unlimited?: boolean;
  proxyConfig?: {
    providers?: any[];
    enabled?: boolean;
  };
  userAgentRotation?: boolean;
  cloudflareBypass?: {
    enabled?: boolean;
    captchaApiKey?: string;
    capsolverApiKey?: string;
  };
  verifyAfterClone?: boolean;
  exportFormat?: 'zip' | 'tar' | 'mhtml' | 'static' | 'warc';
  useCache?: boolean;
  cacheTTL?: number;
  incremental?: boolean;
  captureScreenshots?: boolean;
  generatePdfs?: boolean;
  distributed?: boolean;
  mobileDevice?: string; // Device name from MobileEmulation profiles
  geolocation?: { latitude: number; longitude: number; accuracy?: number };
  optimizeImages?: boolean;
  imageQuality?: number; // 1-100, default 80
  maxImageWidth?: number; // Max width in pixels, default 2560
  imageFormat?: 'webp' | 'avif' | 'original'; // Convert to format, default webp
  onProgress?: (progress: CloneProgress) => void;
  onFileDownloaded?: (file: { path: string; size: number; type: string }) => void;
}

export interface CloneProgress {
  currentPage: number;
  totalPages: number;
  currentUrl: string;
  status: 'crawling' | 'processing' | 'fixing' | 'optimizing' | 'verifying' | 'exporting' | 'complete';
  message: string;
  assetsCaptured?: number;
  recentFiles?: Array<{ path: string; size: number; timestamp: string; type: string }>;
  estimatedTimeRemaining?: number;
}

export interface CloneResult {
  success: boolean;
  outputDir: string;
  pagesCloned: number;
  assetsCaptured: number;
  verificationResult?: any;
  exportPath?: string;
  errors: string[];
}

export class WebsiteCloner {
  private proxyManager: ProxyManager;
  private userAgentManager: UserAgentManager;
  private cloudflareBypass: CloudflareBypass;
  private parallelProcessor: ParallelProcessor<any>;
  private assetCapture: AssetCapture;
  private spaDetector: SPADetector;
  private jsVerification: JSVerification;
  private serviceWorkerPreservation: ServiceWorkerPreservation;
  private verificationSystem: VerificationSystem;
  private exportFormats: ExportFormats;
  private cacheManager: CacheManager;
  private incrementalUpdater: IncrementalUpdater;
  private cookieManager: CookieManager;
  private structuredDataExtractor: StructuredDataExtractor;
  private contentExtractor: ContentExtractor;
  private browserPool: BrowserPool;
  private resourceBlocker: ResourceBlocker;
  private distributedScraper: DistributedScraper | null = null;
  private tlsImpersonate: TLSImpersonate;
  private webSocketCapture: WebSocketCapture;
  private mobileEmulation: MobileEmulation;
  private apiMocker: ApiMocker;
  private smartCrawler: SmartCrawler;
  private cdnOptimizer: CDNOptimizer;
  private assetDeduplicator: AssetDeduplicator;
  private assetOptimizer: AssetOptimizer;
  private warcGenerator: WARCGenerator;
  private logger: LoggingService;
  private retryManager: RetryManager;
  private errorHandler: ErrorHandler;

  // Asset URL mapping: maps original URL -> relative local path
  private assetUrlMap: Map<string, string> = new Map();

  constructor() {
    // Initialize proxy providers from environment variables
    const proxyProviders = [];
    if (process.env.IPROYAL_API_KEY) {
      proxyProviders.push(new IPRoyalProvider(process.env.IPROYAL_API_KEY));
    }

    this.proxyManager = new ProxyManager(proxyProviders, 'success-based');
    this.userAgentManager = new UserAgentManager();
    this.cloudflareBypass = new CloudflareBypass();
    this.parallelProcessor = new ParallelProcessor(10);
    this.assetCapture = new AssetCapture();
    this.spaDetector = new SPADetector();
    this.jsVerification = new JSVerification();
    this.serviceWorkerPreservation = new ServiceWorkerPreservation();
    this.verificationSystem = new VerificationSystem();
    this.exportFormats = new ExportFormats();
    this.cacheManager = new CacheManager({ type: 'file', filePath: './cache' });
    this.incrementalUpdater = new IncrementalUpdater(this.cacheManager);
    this.cookieManager = new CookieManager({ persistCookies: true, cookieDir: './cookies' });
    this.cookieManager.initialize().catch(() => {}); // Initialize async
    this.structuredDataExtractor = new StructuredDataExtractor();
    this.contentExtractor = new ContentExtractor();
    this.browserPool = getBrowserPool({ maxSize: 20, minSize: 5, idleTimeout: 300000 });
    this.resourceBlocker = new ResourceBlocker();
    this.tlsImpersonate = new TLSImpersonate();
    this.webSocketCapture = new WebSocketCapture();
    this.mobileEmulation = new MobileEmulation();
    this.apiMocker = new ApiMocker();
    this.smartCrawler = new SmartCrawler();
    this.cdnOptimizer = new CDNOptimizer('./cdn-cache');
    this.assetDeduplicator = new AssetDeduplicator(path.join(process.cwd(), 'shared-assets'));
    this.assetOptimizer = new AssetOptimizer();
    this.warcGenerator = new WARCGenerator();
    this.logger = new LoggingService('./logs');
    this.logger.initialize().catch(() => {}); // Initialize async, don't block
    this.errorHandler = new ErrorHandler();
    this.retryManager = new RetryManager(this.errorHandler, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
    });
  }

  /**
   * Main clone method
   */
  async clone(options: CloneOptions): Promise<CloneResult> {
    // Clear asset URL mapping from previous clone jobs
    this.assetUrlMap.clear();

    const result: CloneResult = {
      success: false,
      outputDir: options.outputDir,
      pagesCloned: 0,
      assetsCaptured: 0,
      errors: []
    };

    const startTime = Date.now();
    const recentFiles: Array<{ path: string; size: number; timestamp: string; type: string }> = [];

    // Define trackFile function to add files to recentFiles array
    const trackFile = (file: { path: string; size: number; type: string }) => {
      recentFiles.push({ ...file, timestamp: new Date().toISOString() });
      // Keep only the last 20 files
      if (recentFiles.length > 20) {
        recentFiles.shift();
      }
    };

    // Variables for proxy tracking (defined outside try-catch)
    let proxyConfig = null;
    const cloneStartTime = Date.now();

    try {
      // Create directory structure
      await this.reportProgress(options, {
        currentPage: 0,
        totalPages: 0,
        currentUrl: options.url,
        status: 'processing',
        message: 'Creating directory structure...'
      });

      const { baseDir } = await createCompleteStructure(
        options.outputDir,
        'cloned-site',
        { organizeByType: true }
      );

      // Load proxies from providers if proxy is enabled
      if (options.proxyConfig?.enabled) {
        await this.logger.info('Loading proxies from providers...', { url: options.url });
        await this.proxyManager.loadProxiesFromProviders();
        const stats = this.proxyManager.getStats();
        await this.logger.info(`Loaded ${stats.total} proxies (${stats.available} available)`, { url: options.url });
      }

      // Acquire browser from pool
      const userAgent = this.userAgentManager.getNextUserAgent();
      const tlsConfig = TLSFingerprintMatcher.getTLSConfig(userAgent.userAgent);

      // Get proxy if available (for Cloudflare bypass and anti-bot)
      proxyConfig = this.proxyManager.getNextProxy(options.url);
      if (proxyConfig) {
        await this.logger.info('Using proxy for this request', {
          url: options.url,
          proxy: `${proxyConfig.host}:${proxyConfig.port}`,
          type: proxyConfig.type,
          country: proxyConfig.country
        });
      }

      await this.logger.info('Acquiring browser from pool...', { url: options.url });
      const browser = await this.browserPool.acquire({
        userAgent: userAgent.userAgent,
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        },
        locale: userAgent.language,
        proxy: proxyConfig ? {
          host: proxyConfig.host,
          port: proxyConfig.port,
          username: proxyConfig.username,
          password: proxyConfig.password,
          protocol: proxyConfig.protocol || 'http',
        } : undefined,
      });
      await this.logger.info('Browser acquired from pool', { url: options.url });

      try {
        // Test browser with a simple page first
        await this.logger.info('Testing browser with example.com...');
        const testPage = await browser.newPage();
        try {
          await testPage.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
          await this.logger.info('Browser test successful - example.com loaded');
        } catch (testError) {
          const error = testError instanceof Error ? testError : new Error(String(testError));
          await this.logger.error('Browser test failed', error, { url: options.url });
          throw new Error(`Browser is not working: ${error.message}`);
        } finally {
          await testPage.close();
        }
        
        // Clone pages with file tracking
        await this.logger.info('Starting to clone pages...', { url: options.url });
        let currentPagesCloned = 0; // Track pages as they're cloned
        
        // Use distributed scraping if enabled
        let cloneResult;
        if (options.distributed) {
          await this.logger.info('Using distributed scraping mode', { url: options.url });
          // Initialize distributed scraper if not already initialized
          if (!this.distributedScraper) {
            try {
              const workerPool = new WorkerPool({
                redisConnection: {
                  host: process.env.REDIS_HOST || 'localhost',
                  port: parseInt(process.env.REDIS_PORT || '6379'),
                  password: process.env.REDIS_PASSWORD,
                },
                maxWorkers: 10,
                workerCapacity: 10,
              });
              this.distributedScraper = new DistributedScraper(workerPool, this.cacheManager);
              await this.logger.info('Distributed scraper initialized', { url: options.url });
            } catch (error) {
              await this.logger.warn('Failed to initialize distributed scraper, falling back to regular mode', { 
                url: options.url, 
                error: String(error) 
              });
              // Fall through to regular cloning
            }
          }
        }
        
        // Use distributed scraping if successfully initialized, otherwise fall back to regular
        if (options.distributed && this.distributedScraper) {
          await this.logger.info('Executing distributed scraping...', { url: options.url });

          // Discover all URLs to scrape using smart crawler
          const urlsToScrape = await this.smartCrawler.discoverUrls(options.url, {
            maxPages: options.maxPages || 100,
            maxDepth: options.maxDepth || 3,
            respectRobotsTxt: true,
          });

          await this.logger.info(`Discovered ${urlsToScrape.length} URLs for distributed scraping`, { url: options.url });

          // Execute distributed scraping
          const distributedResult = await this.distributedScraper.scrapeDistributed({
            urls: urlsToScrape,
            maxConcurrency: options.concurrency || 50,
            useCache: options.useCache,
            incremental: options.incremental,
          });

          await this.logger.info('Distributed scraping completed', {
            url: options.url,
            pagesScraped: distributedResult.pagesScraped,
            pagesCached: distributedResult.pagesCached,
            workerStats: distributedResult.workerStats,
          });

          // Convert distributed result to clone result format
          cloneResult = {
            pagesCloned: distributedResult.pagesScraped + distributedResult.pagesCached,
            assetsCaptured: distributedResult.assetsDownloaded + distributedResult.assetsCached,
            errors: distributedResult.errors,
          };

          // Update progress
          if (options.onProgress) {
            options.onProgress({
              currentPage: cloneResult.pagesCloned,
              totalPages: cloneResult.pagesCloned,
              currentUrl: options.url,
              status: 'crawling',
              message: `Distributed scraping complete: ${cloneResult.pagesCloned} pages`,
              assetsCaptured: cloneResult.assetsCaptured,
              recentFiles: recentFiles.slice(-10)
            });
          }
        } else {
          // Use regular cloning (fallback when distributed mode not available)
          cloneResult = await this.clonePages(browser, {
            ...options,
            outputDir: baseDir,
            onFileDownloaded: (file: { path: string; size: number; type: string }) => {
              trackFile(file);
              // Update currentPagesCloned if this is an HTML file
              if (file.type === 'html') {
                currentPagesCloned++;
              }
              // Also update progress immediately
              if (options.onProgress) {
                options.onProgress({
                  currentPage: currentPagesCloned,
                  totalPages: options.maxPages || 100,
                  currentUrl: options.url,
                  status: 'crawling',
                  message: `Downloaded: ${path.basename(file.path)}`,
                  assetsCaptured: recentFiles.filter(f => f.type !== 'html').length,
                  recentFiles: recentFiles.slice(-10)
                });
              }
            }
          });
        }
        await this.logger.info('Clone result', {
          pagesCloned: cloneResult.pagesCloned,
          assetsCaptured: cloneResult.assetsCaptured,
          errors: cloneResult.errors.length
        });
        result.pagesCloned = cloneResult.pagesCloned;
        result.assetsCaptured = cloneResult.assetsCaptured;
        result.errors.push(...cloneResult.errors);
        
        if (cloneResult.pagesCloned === 0 && cloneResult.errors.length === 0) {
          const errorMsg = 'No pages were cloned and no errors reported. Navigation may have failed silently.';
          await this.logger.warn(errorMsg, { url: options.url });
          result.errors.push(errorMsg);
        }

        // Fix links
        await this.reportProgress(options, {
          currentPage: result.pagesCloned,
          totalPages: result.pagesCloned,
          currentUrl: '',
          status: 'fixing',
          message: 'Fixing links for offline use...'
        });

        await this.fixAllLinksInOutput(baseDir, options.url);

        // Optimize images (if enabled)
        if (options.optimizeImages !== false) {
          await this.reportProgress(options, {
            currentPage: result.pagesCloned,
            totalPages: result.pagesCloned,
            currentUrl: '',
            status: 'optimizing',
            message: 'Optimizing images for smaller file sizes...'
          });

          try {
            const imagesDir = path.join(baseDir, 'assets', 'images');
            const optimizationResults = await this.assetOptimizer.optimizeAllImages(imagesDir, {
              compress: true,
              quality: options.imageQuality || 80,
              maxWidth: options.maxImageWidth || 2560,
              format: options.imageFormat || 'webp'
            });

            await this.logger.info('Image optimization completed', {
              url: options.url,
              filesProcessed: optimizationResults.filesProcessed,
              totalSavings: `${optimizationResults.totalSavings.toFixed(1)}%`,
              originalSize: `${(optimizationResults.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
              optimizedSize: `${(optimizationResults.totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`
            });
          } catch (optimizationError) {
            await this.logger.warn('Image optimization failed', {
              url: options.url,
              error: String(optimizationError)
            });
          }
        }

        // Verify
        if (options.verifyAfterClone !== false) {
          await this.reportProgress(options, {
            currentPage: result.pagesCloned,
            totalPages: result.pagesCloned,
            currentUrl: '',
            status: 'verifying',
            message: 'Verifying cloned website...'
          });

          result.verificationResult = await this.verificationSystem.verify(
            baseDir,
            options.url,
            browser // Pass browser for JavaScript testing
          );
        }

        // Export
        if (options.exportFormat) {
          await this.reportProgress(options, {
            currentPage: result.pagesCloned,
            totalPages: result.pagesCloned,
            currentUrl: '',
            status: 'exporting',
            message: `Exporting to ${options.exportFormat}...`
          });

          result.exportPath = await this.exportFormats.export(baseDir, {
            format: options.exportFormat,
            outputPath: path.join(path.dirname(baseDir), `clone-export.${options.exportFormat}`),
            includeServerFiles: true
          });
        }

        // Generate server files
        await generateAllServerFiles(baseDir, 'cloned-site', {
          port: 3000,
          enableCors: true
        });

        result.success = cloneResult.pagesCloned > 0;
        result.outputDir = baseDir; // Update to use the actual baseDir

        // Run verification on completed clone
        if (result.success) {
          await this.reportProgress(options, {
            currentPage: cloneResult.pagesCloned,
            totalPages: cloneResult.pagesCloned,
            currentUrl: '',
            status: 'verifying',
            message: 'Verifying clone integrity...'
          });

          try {
            const verificationResult = await verifyClone(baseDir, options.url);
            result.verificationResult = verificationResult;
            await this.logger.info('Clone verification completed', {
              url: options.url,
              passed: verificationResult.passed,
              score: verificationResult.score,
              summary: verificationResult.summary
            });
          } catch (verifyError) {
            await this.logger.warn('Clone verification failed', {
              url: options.url,
              error: verifyError instanceof Error ? verifyError.message : String(verifyError)
            });
          }
        }

        // Track proxy success if used
        if (proxyConfig && result.success) {
          const cloneEndTime = Date.now();
          this.proxyManager.recordProxySuccess(proxyConfig, cloneEndTime - cloneStartTime);
          await this.logger.info('Proxy successful for clone operation', {
            url: options.url,
            proxy: `${proxyConfig.host}:${proxyConfig.port}`,
            pagesCloned: cloneResult.pagesCloned
          });
        }
      } finally {
        // Release browser back to pool instead of closing
        this.browserPool.release(browser);
      }
    } catch (error) {
      // Track proxy failure if used
      if (proxyConfig) {
        this.proxyManager.recordProxyFailure(proxyConfig);
        await this.logger.warn('Proxy failed for clone operation', {
          url: options.url,
          proxy: `${proxyConfig.host}:${proxyConfig.port}`,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const formatted = ErrorFormatter.formatCloneError(errorObj, options.url);
      
      await this.logger.error('Critical error during clone', errorObj, { 
        url: options.url,
        code: formatted.code,
        severity: formatted.severity
      });
      
      result.errors.push(formatted.userMessage);
    }

    await this.reportProgress(options, {
      currentPage: result.pagesCloned,
      totalPages: result.pagesCloned,
      currentUrl: '',
      status: 'complete',
      message: result.success ? 'Clone completed successfully!' : 'Clone completed with errors'
    });

    return result;
  }

  /**
   * Clones a single page (extracted for parallel processing)
   */
  private async cloneSinglePage(
    browser: Browser,
    url: string,
    depth: number,
    options: CloneOptions,
    visited: Set<string>,
    toVisit: Array<{ url: string; depth: number }>,
    results: { pagesCloned: number; assetsCaptured: number; errors: string[] }
  ): Promise<{ success: boolean; assets: number; discoveredLinks: string[] }> {
    const maxDepth = options.unlimited ? Infinity : (options.maxDepth || 5);
    
    if (visited.has(url)) {
      return { success: false, assets: 0, discoveredLinks: [] };
    }
    
    if (depth > maxDepth) {
      return { success: false, assets: 0, discoveredLinks: [] };
    }
    
    visited.add(url);

    // Track clone start time for proxy performance measurement
    const cloneStartTime = Date.now();

    try {
      await this.logger.info(`Cloning page`, { url, depth });
      
      // Check cache first if enabled
      let cachedPage = null;
      let html = '';
      let assets: string[] = [];
      let useCache = options.useCache !== false;
      let useIncremental = options.incremental === true && useCache;
      
      if (useCache) {
        if (useIncremental) {
          const changes = await this.incrementalUpdater.detectPageChanges([url]);
          const change = changes[0];
          if (change && !change.hasChanged) {
            cachedPage = await this.cacheManager.getPage(url);
            await this.logger.info(`Incremental: Page unchanged, using cache`, { url, reason: change.reason });
          }
        } else {
          cachedPage = await this.cacheManager.getPage(url);
        }
        
        if (cachedPage) {
          await this.logger.info(`Cache HIT for ${url}`, { url });
          html = cachedPage.html;
          assets = cachedPage.assets || [];
          
          const pagePath = this.getPagePath(url, options.outputDir);
          await fs.mkdir(path.dirname(pagePath), { recursive: true });
          await fs.writeFile(pagePath, html, 'utf-8');
          
          const stats = await fs.stat(pagePath);
          if (options.onFileDownloaded) {
            options.onFileDownloaded({ path: pagePath, size: stats.size, type: 'html' });
          }
          
          // Discover links from cached HTML
          const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
          const matches = html.matchAll(linkRegex);
          const discoveredLinks: string[] = [];
          for (const match of matches) {
            const link = match[1];
            try {
              const absoluteUrl = new URL(link, url).href;
              if (!visited.has(absoluteUrl) && this.isSameDomain(absoluteUrl, url)) {
                discoveredLinks.push(absoluteUrl);
              }
            } catch {
              // Invalid URL, skip
            }
          }
          
          results.pagesCloned++;
          results.assetsCaptured += assets.length;
          
          return { success: true, assets: assets.length, discoveredLinks };
        }
      }
      
      // Not cached, proceed with scraping
      const page = await browser.newPage();

      // Give page a moment to fully initialize to avoid "Requesting main frame too early"
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load cookies
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const cookies = await this.cookieManager.getCookiesForPuppeteer(domain);
        if (cookies.length > 0) {
          await page.setCookie(...cookies);
        }
      } catch (cookieError) {
        await this.logger.warn('Failed to load cookies', { url, error: String(cookieError) });
      }
      
      // Start WebSocket capture
      await this.webSocketCapture.startCapture(page, {
        outputDir: options.outputDir,
        pageUrl: url,
        saveToFile: true,
      });
      
      // Enable resource blocking (ads, trackers, analytics)
      await this.resourceBlocker.enableBlocking(page, {
        blockAds: true,
        blockTrackers: true,
        blockAnalytics: true,
        blockFonts: false, // Keep fonts for proper rendering
        blockImages: false, // Keep images for complete backup
        blockStylesheets: false, // Keep stylesheets for proper rendering
        blockScripts: false, // Keep scripts for functionality
        blockMedia: false, // Keep media for complete backup
      });

        // Apply stealth measures
        await applyStealthMeasures(page);

        // Apply user agent
        if (options.userAgentRotation !== false) {
          const ua = this.userAgentManager.getNextUserAgent();
          await this.userAgentManager.applyToPage(page, ua);
          const fingerprintConfig = getFingerprintConfigForUserAgent(ua.userAgent);
          await applyFingerprintEvasion(page, fingerprintConfig);
        }

        // Apply behavioral patterns
        await applyBehavioralPatterns(page);

      // Navigate with fallback strategies
          // Retry navigation with exponential backoff
          const navigationResult = await this.retryManager.retry(
            async () => {
              // Try networkidle2 first (best for SPAs)
              const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
              if (response && response.status() >= 400) {
                throw new Error(`HTTP ${response.status()} error for ${url}`);
              }
              return response;
            },
            {
              maxRetries: 2, // Will try domcontentloaded and load as fallbacks
              initialDelay: 2000,
              maxDelay: 10000,
            }
          );

          if (!navigationResult.success) {
            // Fallback to domcontentloaded
            const domResult = await this.retryManager.retry(
              async () => {
                const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                if (response && response.status() >= 400) {
                  throw new Error(`HTTP ${response.status()} error for ${url}`);
                }
                return response;
              },
              {
                maxRetries: 1,
                initialDelay: 2000,
              }
            );

            if (!domResult.success) {
              // Final fallback to load
              const loadResult = await this.retryManager.retry(
                async () => {
                  const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
                  if (response && response.status() >= 400) {
                    throw new Error(`HTTP ${response.status()} error for ${url}`);
                  }
                  return response;
                },
                {
                  maxRetries: 1,
                  initialDelay: 2000,
                }
              );

              if (!loadResult.success) {
                const error = loadResult.error || new Error('Navigation failed after all retries');
                throw new Error(`Failed to navigate to ${url}: ${error.message}`);
              }
            }
          }

      // Bypass Cloudflare
        if (options.cloudflareBypass?.enabled !== false) {
          await this.cloudflareBypass.bypass(page, {
            captchaApiKey: options.cloudflareBypass?.captchaApiKey,
            capsolverApiKey: options.cloudflareBypass?.capsolverApiKey
          });
        }

        // Detect SPA
        const framework = await this.spaDetector.detectFramework(page);
        if (framework.framework !== 'unknown') {
          await this.spaDetector.waitForSPALoad(page, framework.framework);
        }

        // Verify JavaScript
        await this.jsVerification.verifyExecution(page);

      // Extract structured data
      const structuredData = await this.structuredDataExtractor.extractStructuredData(page);
      const forms = await this.structuredDataExtractor.extractForms(page);
      const apiEndpoints = await this.structuredDataExtractor.discoverAPIEndpoints(page);
      const spaState = await this.structuredDataExtractor.extractSPAState(page);
      
      // Test discovered API endpoints (API scraping mode)
      const apiResults: Array<{ endpoint: string; success: boolean; response?: any }> = [];
      for (const endpoint of apiEndpoints) {
        try {
          const result = await this.apiMocker.testEndpoint(endpoint.url, {
            method: endpoint.method,
            headers: endpoint.requestHeaders,
            body: endpoint.requestBody,
          });
          apiResults.push({ endpoint: endpoint.url, success: result.success, response: result.response });
        } catch (error) {
          apiResults.push({ endpoint: endpoint.url, success: false });
        }
      }
      
      // Extract content (articles, comments, user-generated)
      const content = await this.contentExtractor.extractAllContent(page);
      
      // Extract video metadata
      const videoMetadata = await this.assetCapture.extractVideoMetadata(page);
      
      // Save structured data and content
      if (structuredData.jsonLd.length > 0 || structuredData.schemaOrg.length > 0 || Object.keys(spaState).length > 0 || content.article || content.comments || content.userGenerated || videoMetadata.length > 0) {
        const dataPath = this.getPagePath(url, options.outputDir).replace('.html', '.data.json');
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        await fs.writeFile(dataPath, JSON.stringify({
          jsonLd: structuredData.jsonLd,
          schemaOrg: structuredData.schemaOrg,
          openGraph: structuredData.openGraph,
          twitterCard: structuredData.twitterCard,
          metaTags: structuredData.metaTags,
          forms,
          apiEndpoints,
          spaState,
          content,
          videoMetadata: videoMetadata.length > 0 ? videoMetadata : undefined
        }, null, 2), 'utf-8');
      }
      
      // Capture assets with retry logic
      const assetCaptureResult = await this.retryManager.retry(
        async () => {
          return await this.assetCapture.captureAllAssets(page, {
            outputDir: options.outputDir,
            baseUrl: url,
            captureFonts: true,
            captureVideos: true,
            captureAudio: true,
            captureIcons: true,
            captureSvg: true,
            capturePdfs: true,
            captureStylesheets: true,  // CRITICAL: Capture CSS files
            captureScripts: true,      // CRITICAL: Capture JS files
            convertDataUris: true,
            onFileDownloaded: options.onFileDownloaded
          });
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 5000,
        }
      );

      const capturedAssets = assetCaptureResult.success && assetCaptureResult.result ? assetCaptureResult.result : [];
      if (!assetCaptureResult.success && assetCaptureResult.error) {
        await this.logger.warn('Asset capture failed after retries', {
          url,
          error: assetCaptureResult.error.message,
        });
      }

      assets = (capturedAssets || []).map(a => {
        if (typeof a === 'string') return a;
        return (a as any).url || (a as any).path || String(a);
      });
      
      // Deduplicate assets (after all assets are captured)
      try {
        const assetPaths = (capturedAssets || [])
          .filter(a => a && typeof a !== 'string' && (a as any).localPath)
          .map(a => (a as any).localPath);
        
        if (assetPaths.length > 0) {
          await this.assetDeduplicator.deduplicateAssets(assetPaths);
          const stats = this.assetDeduplicator.getStats();
          await this.logger.info('Asset deduplication completed', {
            url,
            totalAssets: stats.totalAssets,
            uniqueAssets: stats.uniqueAssets,
            savedSpace: stats.savedSpace,
            deduplicationRatio: stats.deduplicationRatio
          });
        }
      } catch (dedupError) {
        await this.logger.warn('Asset deduplication failed', { url, error: String(dedupError) });
      }

      // Build asset URL mapping for link fixing
      // Maps external URLs to local relative paths
      for (const asset of capturedAssets || []) {
        if (asset && typeof asset !== 'string' && asset.url && asset.localPath) {
          // Convert absolute localPath to relative path from outputDir
          const relativePath = path.relative(options.outputDir, asset.localPath).replace(/\\/g, '/');
          this.assetUrlMap.set(asset.url, relativePath);
          // Also add normalized URL (without trailing slashes, etc.)
          try {
            const normalized = new URL(asset.url).href;
            if (normalized !== asset.url) {
              this.assetUrlMap.set(normalized, relativePath);
            }
          } catch {
            // Ignore URL parsing errors
          }
        }
      }

      // Log asset mapping for debugging
      if (this.assetUrlMap.size > 0) {
        await this.logger.info('Asset URL mapping built', {
          url,
          mappingCount: this.assetUrlMap.size,
          sampleMappings: Array.from(this.assetUrlMap.entries()).slice(0, 5).map(([k, v]) => `${k} -> ${v}`)
        });
      }

      // Capture service workers
        const workers = await this.serviceWorkerPreservation.detectServiceWorkers(page);
        if (workers.length > 0) {
        await this.serviceWorkerPreservation.captureServiceWorkers(page, workers, options.outputDir, url);
      }
      
      // Capture PWA manifest
      const manifest = await this.serviceWorkerPreservation.captureManifest(page, options.outputDir, url);
      if (manifest.manifestPath) {
        await this.logger.info('PWA manifest captured', { url, manifestPath: manifest.manifestPath });
      }
      
      // Generate offline service worker with all cached URLs
      const allUrls = [url, ...assets.map(a => {
        try {
          return new URL(a, url).href;
        } catch {
          return a;
        }
      })];
      await this.serviceWorkerPreservation.generateOfflineServiceWorker(options.outputDir, allUrls);
      
      // Save cookies
      try {
        const pageCookies = await page.cookies();
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        await this.cookieManager.mergeCookiesFromPage(domain, pageCookies);
      } catch (cookieError) {
        await this.logger.warn('Failed to save cookies', { url, error: String(cookieError) });
        }

        // Get HTML content
      html = await this.jsVerification.capturePostRenderState(page);

      // Get page path
        const pagePath = this.getPagePath(url, options.outputDir);
        await fs.mkdir(path.dirname(pagePath), { recursive: true });
      
      // Capture screenshot
      if (options.captureScreenshots) {
        try {
          const screenshotPath = pagePath.replace('.html', '.png');
          await page.screenshot({ path: screenshotPath, fullPage: true, type: 'png' });
          if (options.onFileDownloaded) {
            const stats = await fs.stat(screenshotPath).catch(() => null);
            if (stats) {
              options.onFileDownloaded({ path: screenshotPath, size: stats.size, type: 'screenshot' });
            }
          }
        } catch (screenshotError) {
          await this.logger.warn('Failed to capture screenshot', { url, error: String(screenshotError) });
        }
      }
      
      // Generate PDF
      if (options.generatePdfs) {
        try {
          const pdfPath = pagePath.replace('.html', '.pdf');
          await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' } });
          if (options.onFileDownloaded) {
            const stats = await fs.stat(pdfPath).catch(() => null);
            if (stats) {
              options.onFileDownloaded({ path: pdfPath, size: stats.size, type: 'pdf' });
            }
          }
        } catch (pdfError) {
          await this.logger.warn('Failed to generate PDF', { url, error: String(pdfError) });
        }
      }
      
      // Save page
        await fs.writeFile(pagePath, html, 'utf-8');
      
      // Cache the page
      if (useCache) {
        const cacheTTL = options.cacheTTL || 3600000;
        const assetUrls = assets.map(a => {
          try {
            return new URL(a, url).href;
          } catch {
            return a;
          }
        });
        await this.cacheManager.cachePage(url, html, assetUrls, undefined, undefined, cacheTTL);
      }
        
        // Track file download
        const stats = await fs.stat(pagePath);
        if (options.onFileDownloaded) {
        options.onFileDownloaded({ path: pagePath, size: stats.size, type: 'html' });
      }
      
      // Discover links
        const links = await this.spaDetector.discoverRoutes(page, url);
      const discoveredLinks: string[] = [];
        for (const link of links) {
          const absoluteUrl = new URL(link, url).href;
          if (!visited.has(absoluteUrl) && this.isSameDomain(absoluteUrl, url)) {
          discoveredLinks.push(absoluteUrl);
        }
      }
      
      // Stop WebSocket capture and save data
      try {
        await this.webSocketCapture.stopCapture(page, {
          outputDir: options.outputDir,
          pageUrl: url,
          saveToFile: true,
        });
      } catch (wsError) {
        await this.logger.warn('Failed to stop WebSocket capture', { url, error: String(wsError) });
      }
      
      results.pagesCloned++;
      results.assetsCaptured += (capturedAssets || []).length;

      await page.close();
      return { success: true, assets: (capturedAssets || []).length, discoveredLinks };
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const formatted = ErrorFormatter.formatCloneError(errorObj, url, { depth });

      // Classify error for recovery suggestions
      const classified = this.errorHandler.classifyError(errorObj, {
        timestamp: new Date(),
        url,
        depth,
      });
      
      // Add recovery suggestions to formatted error
      if (formatted.recovery && formatted.recovery.suggestions) {
        await this.logger.error(`Error cloning ${url}`, errorObj, {
          url,
          depth,
          code: formatted.code,
          severity: formatted.severity,
          category: classified.category,
          retryable: classified.retryable,
          recovery: formatted.recovery.suggestions,
        });
      } else {
        await this.logger.error(`Error cloning ${url}`, errorObj, {
          url,
          depth,
          code: formatted.code,
          severity: formatted.severity,
          category: classified.category,
          retryable: classified.retryable,
        });
      }
      
      // Build error message with recovery info
      let errorMessage = `Failed to clone ${url}: ${formatted.userMessage} (${formatted.code})`;
      if (formatted.recovery && formatted.recovery.suggestions.length > 0) {
        errorMessage += `\nRecovery suggestions: ${formatted.recovery.suggestions.slice(0, 2).join(', ')}`;
      }
      results.errors.push(errorMessage);
      
      // Close page if exists
      try {
        const pages = await browser.pages();
        for (const p of pages) {
          if (p.url() === url || p.url().includes(new URL(url).hostname)) {
            await p.close();
          }
        }
      } catch {
        // Ignore
      }
      
      return { success: false, assets: 0, discoveredLinks: [] };
    }
  }

  /**
   * Clones all pages - PARALLEL VERSION
   */
  private async clonePages(
    browser: Browser,
    options: CloneOptions
  ): Promise<{ pagesCloned: number; assetsCaptured: number; errors: string[] }> {
    const visited = new Set<string>();
    const toVisit: Array<{ url: string; depth: number; priority?: number }> = [
      { url: options.url, depth: 0, priority: 1.0 }
    ];
    
    // Discover sitemap and add URLs from sitemap
    try {
      await this.logger.info('Discovering sitemap...', { url: options.url });
      const sitemaps = await this.smartCrawler.discoverSitemap(options.url);
      
      if (sitemaps.length > 0) {
        await this.logger.info(`Found ${sitemaps.length} sitemap(s)`, { url: options.url, sitemaps });
        
        for (const sitemapUrl of sitemaps) {
          try {
            const sitemapUrls = await this.smartCrawler.parseSitemap(sitemapUrl);
            await this.logger.info(`Parsed ${sitemapUrls.length} URLs from sitemap`, { sitemapUrl, count: sitemapUrls.length });
            
            // Add sitemap URLs to queue with priority
            for (const sitemapUrlData of sitemapUrls) {
              if (!visited.has(sitemapUrlData.loc) && this.isSameDomain(sitemapUrlData.loc, options.url)) {
                const priority = sitemapUrlData.priority || 0.8;
                toVisit.push({ url: sitemapUrlData.loc, depth: 1, priority });
              }
            }
          } catch (sitemapError) {
            await this.logger.warn('Failed to parse sitemap', { sitemapUrl, error: String(sitemapError) });
          }
        }
      }
    } catch (error) {
      await this.logger.warn('Failed to discover sitemap', { url: options.url, error: String(error) });
    }
    
    // Prioritize URLs
    const prioritized = this.smartCrawler.prioritizeUrls(
      toVisit.map(item => item.url),
      undefined, // Sitemap URLs already added
      { preferSitemap: true, preferRecent: true, preferHighPriority: true }
    );
    
    // Rebuild toVisit with priorities
    const toVisitMap = new Map(toVisit.map(item => [item.url, item]));
    toVisit.length = 0;
    for (const priority of prioritized) {
      const existing = toVisitMap.get(priority.url);
      if (existing) {
        toVisit.push({ ...existing, priority: priority.priority });
      } else {
        toVisit.push({ url: priority.url, depth: 0, priority: priority.priority });
      }
    }
    
    // Sort by priority (highest first)
    toVisit.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const results = { pagesCloned: 0, assetsCaptured: 0, errors: [] as string[] };
    const maxPages = options.unlimited ? Infinity : (options.maxPages || 100);
    const maxDepth = options.unlimited ? Infinity : (options.maxDepth || 5);
    const concurrency = options.concurrency || 50; // Process 50 pages in parallel
    
    const limit = pLimit(concurrency);
    
    await this.logger.info('Starting parallel clone pages', {
      maxPages: maxPages === Infinity ? 'unlimited' : maxPages,
      maxDepth: maxDepth === Infinity ? 'unlimited' : maxDepth,
      concurrency,
      url: options.url,
      queueSize: toVisit.length,
      outputDir: options.outputDir
    });

    if (toVisit.length === 0) {
      await this.logger.error('Queue is empty! No URLs to clone.', undefined, { url: options.url });
      results.errors.push('No URLs in queue to clone. Initial URL may be invalid.');
      return results;
    }

    // Process pages in parallel until queue is empty or limit reached
    while (toVisit.length > 0 && results.pagesCloned < maxPages) {
      // Get batch of URLs to process (up to concurrency limit)
      const batch: Array<{ url: string; depth: number }> = [];
      while (batch.length < concurrency && toVisit.length > 0 && results.pagesCloned < maxPages) {
        const item = toVisit.shift()!;
        if (!visited.has(item.url) && item.depth <= maxDepth) {
          batch.push(item);
        }
      }
      
      if (batch.length === 0) {
        break; // No more valid URLs to process
      }
      
      // Process batch in parallel
      const promises = batch.map(({ url, depth }) =>
        limit(() => this.cloneSinglePage(browser, url, depth, options, visited, toVisit, results))
      );
      
      const batchResults = await Promise.all(promises);
      
      // Add discovered links to queue
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const batchItem = batch[i];
        if (!batchItem) continue;
        
        for (const link of result.discoveredLinks) {
          const linkDepth = batchItem.depth + 1;
          if (!visited.has(link) && linkDepth <= maxDepth) {
            toVisit.push({ url: link, depth: linkDepth });
          }
        }
      }
      
      // Report progress
      await this.reportProgress(options, {
        currentPage: results.pagesCloned,
        totalPages: Math.min(maxPages, toVisit.length + results.pagesCloned),
        currentUrl: batch[batch.length - 1]?.url || '',
        status: 'crawling',
        message: `Processed ${batch.length} pages in parallel. Total: ${results.pagesCloned}`,
        assetsCaptured: results.assetsCaptured
      });
    }
    
    await this.logger.info('Parallel clone pages completed', {
      pagesCloned: results.pagesCloned,
      assetsCaptured: results.assetsCaptured,
      errors: results.errors.length
    });
    
    return results;
  }


  /**
   * Fixes all links in output directory
   */
  private async fixAllLinksInOutput(
    outputDir: string,
    baseUrl: string
  ): Promise<void> {
    const htmlFiles = await this.findHtmlFiles(outputDir);

    for (const htmlFile of htmlFiles) {
      let html = await fs.readFile(htmlFile, 'utf-8');
      const basePath = path.dirname(htmlFile);

      // First: Replace external URLs with local asset paths
      // This handles CDN CSS/JS files that were downloaded
      for (const [originalUrl, relativePath] of this.assetUrlMap.entries()) {
        // Calculate relative path from this HTML file to the asset
        const htmlRelativePath = path.relative(basePath, path.join(outputDir, relativePath)).replace(/\\/g, '/');

        // Build list of URL variations to match
        // (absolute URL, relative path from root, etc.)
        const urlsToMatch: string[] = [originalUrl];

        try {
          const urlObj = new URL(originalUrl);
          // Add the pathname (e.g., /docs/5.3/dist/css/bootstrap.min.css)
          urlsToMatch.push(urlObj.pathname);

          // Also add relative versions that might appear in HTML
          // Calculate relative from HTML file to the original resource location
          const htmlDir = path.relative(outputDir, basePath).replace(/\\/g, '/');
          const assetPath = urlObj.pathname;

          // If HTML is in a subdirectory, calculate the relative path
          if (htmlDir) {
            const htmlDepth = htmlDir.split('/').filter(p => p).length;
            const relativeFromHtml = '../'.repeat(htmlDepth) + assetPath.replace(/^\//, '');
            urlsToMatch.push(relativeFromHtml);
          }
        } catch {
          // Not a valid URL, just use original
        }

        // Replace all occurrences of any URL variation with the local path
        for (const urlToMatch of urlsToMatch) {
          const escapedUrl = urlToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const urlPatterns = [
            new RegExp(`(href|src|data-src)\\s*=\\s*["']${escapedUrl}["']`, 'gi'),
            new RegExp(`url\\(["']?${escapedUrl}["']?\\)`, 'gi'),
            new RegExp(`(href|src)\\s*=\\s*${escapedUrl}(?=[\\s>])`, 'gi'),
          ];

          for (const pattern of urlPatterns) {
            html = html.replace(pattern, (match) => {
              // Preserve the attribute name and quotes
              if (match.includes('url(')) {
                return `url('${htmlRelativePath}')`;
              }
              const attrMatch = match.match(/^(href|src|data-src)\s*=\s*/i);
              if (attrMatch) {
                return `${attrMatch[1]}="${htmlRelativePath}"`;
              }
              return match;
            });
          }
        }
      }

      const rewriteOptions: RewriteOptions = {
        baseUrl,
        targetPath: basePath
      };

      const fixOptions: LinkFixOptions = {
        ...rewriteOptions,
        fixForms: true,
        fixIframes: true,
        fixMetaTags: true,
        fixInlineStyles: true,
        fixCssUrls: true
      };

      // Then: Fix same-domain relative URLs
      const result = fixAllLinks(html, '', '', fixOptions);

      await fs.writeFile(htmlFile, result.fixedHtml, 'utf-8');
    }

    // Also fix URLs in downloaded CSS files
    await this.fixUrlsInCssFiles(outputDir);
  }

  /**
   * Fixes URLs inside downloaded CSS files
   */
  private async fixUrlsInCssFiles(outputDir: string): Promise<void> {
    const cssDir = path.join(outputDir, 'assets', 'css');
    try {
      const cssFiles = await fs.readdir(cssDir);
      for (const file of cssFiles) {
        if (file.endsWith('.css')) {
          const cssPath = path.join(cssDir, file);
          let css = await fs.readFile(cssPath, 'utf-8');

          // Replace external URLs with local paths
          for (const [originalUrl, relativePath] of this.assetUrlMap.entries()) {
            // Calculate relative path from CSS file to the asset
            const cssRelativePath = path.relative(cssDir, path.join(outputDir, relativePath)).replace(/\\/g, '/');

            const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            css = css.replace(new RegExp(`url\\(["']?${escapedUrl}["']?\\)`, 'gi'), `url('${cssRelativePath}')`);
          }

          await fs.writeFile(cssPath, css, 'utf-8');
        }
      }
    } catch {
      // CSS directory doesn't exist or other error - ignore
    }
  }

  /**
   * Gets page path from URL
   */
  private getPagePath(url: string, outputDir: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      if (pathname === '/' || pathname === '') {
        return path.join(outputDir, 'index.html');
      }

      if (!pathname.endsWith('.html') && !pathname.endsWith('.htm')) {
        pathname += '/index.html';
      }

      return path.join(outputDir, pathname);
    } catch {
      return path.join(outputDir, 'index.html');
    }
  }

  /**
   * Checks if URL is same domain
   */
  private isSameDomain(url1: string, url2: string): boolean {
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      return u1.origin === u2.origin;
    } catch {
      return false;
    }
  }

  /**
   * Finds HTML files
   */
  private async findHtmlFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.findHtmlFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
          files.push(fullPath);
        }
      }
    } catch {}
    return files;
  }

  /**
   * Reports progress
   */
  private async reportProgress(
    options: CloneOptions,
    progress: CloneProgress
  ): Promise<void> {
    if (options.onProgress) {
      options.onProgress(progress);
    }
  }
}

