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
import { ProxyManager, IPRoyalProvider, type ProxyConfig } from './proxyManager.js';
import { enhancedProxyNetwork } from './proxyNetworkEnhanced.js';
import { getRandomFingerprint, getFingerprintForSite, getRequestHeaders, type TLSFingerprint } from './tlsFingerprints.js';
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
import { CSSAnimationExtractor } from './cssAnimationExtractor.js';
import { ComputedStyleCapture } from './computedStyleCapture.js';
import { LearningAgent, getLearningAgent, type CloneIssue } from './learningSystem.js';
import { WebsitePreScanner, type PreScanResult } from './websitePreScanner.js';

export interface CloneOptions {
  url: string;
  outputDir: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  unlimited?: boolean;
  timeout?: number;
  timeLimitMinutes?: number; // Max total clone time in minutes (0 = unlimited)
  waitForDynamic?: boolean;
  javascript?: boolean;
  respectRobots?: boolean;
  maxConcurrency?: number;
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
  status: 'crawling' | 'processing' | 'fixing' | 'optimizing' | 'verifying' | 'exporting' | 'complete' | 'time_limit_reached';
  message: string;
  assetsCaptured?: number;
  recentFiles?: Array<{ path: string; size: number; timestamp: string; type: string }>;
  estimatedTimeRemaining?: number;
  elapsedMinutes?: number;
  timeLimitMinutes?: number;
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
  private cssAnimationExtractor: CSSAnimationExtractor;
  private computedStyleCapture: ComputedStyleCapture;
  private learningAgent: LearningAgent | null = null;

  // Track active browsers for cleanup on exit
  private activeBrowsers: Set<Browser> = new Set();
  private cleanupRegistered = false;

  // Asset URL mapping: maps original URL -> relative local path
  // NOTE: This is recreated fresh for each clone job to prevent cross-contamination
  // when multiple clones run concurrently
  private assetUrlMap: Map<string, string> = new Map();

  // Enhanced stealth: Current TLS fingerprint for consistent browser identity
  private currentFingerprint: TLSFingerprint | null = null;
  private useEnhancedProxy: boolean = true; // Use our P2P network by default

  // Documentation site patterns - these sites need longer timeouts (10 minutes)
  private readonly DOCUMENTATION_SITE_PATTERNS = [
    /docs\./i,
    /documentation\./i,
    /\.readthedocs\./i,
    /developer\./i,
    /devdocs\./i,
    /api\./i,
    /reference\./i,
    /wiki\./i,
    /\/docs\//i,
    /\/documentation\//i,
    /\/api\//i,
    /\/reference\//i,
    /\/manual\//i,
    /\/guide\//i,
    /\/tutorial\//i,
  ];

  // Known documentation site domains
  private readonly DOCUMENTATION_DOMAINS = [
    'docs.python.org',
    'developer.mozilla.org',
    'reactjs.org',
    'vuejs.org',
    'angular.io',
    'nodejs.org',
    'expressjs.com',
    'tailwindcss.com',
    'getbootstrap.com',
    'webpack.js.org',
    'nextjs.org',
    'typescriptlang.org',
    'docs.github.com',
    'docs.microsoft.com',
    'learn.microsoft.com',
    'cloud.google.com',
    'docs.aws.amazon.com',
    'kubernetes.io',
    'docker.com/docs',
    'lit.dev',
  ];

  /**
   * Checks if a URL is a documentation site that needs longer timeouts
   */
  private isDocumentationSite(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const fullUrl = urlObj.href.toLowerCase();
      const hostname = urlObj.hostname.toLowerCase();

      // Check against known documentation domains
      for (const domain of this.DOCUMENTATION_DOMAINS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return true;
        }
      }

      // Check against URL patterns
      for (const pattern of this.DOCUMENTATION_SITE_PATTERNS) {
        if (pattern.test(fullUrl)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  constructor() {
    // Initialize proxy providers from environment variables
    const proxyProviders = [];
    if (process.env.IPROYAL_API_KEY) {
      proxyProviders.push(new IPRoyalProvider(process.env.IPROYAL_API_KEY));
    }

    this.proxyManager = new ProxyManager(proxyProviders, 'success-based');
    this.userAgentManager = new UserAgentManager();
    // Auto-load CAPTCHA solver API keys from environment
    this.cloudflareBypass = new CloudflareBypass({
      capsolverApiKey: process.env.CAPSOLVER_API_KEY,
      captchaApiKey: process.env.TWOCAPTCHA_API_KEY,
      anticaptchaApiKey: process.env.ANTICAPTCHA_API_KEY,
    });
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
    this.cssAnimationExtractor = new CSSAnimationExtractor();
    this.computedStyleCapture = new ComputedStyleCapture();

    // Register cleanup handlers to close browsers on process exit
    this.registerCleanupHandlers();
  }

  /**
   * Register process exit handlers to ensure browsers are closed
   * This prevents zombie Chrome processes when the task is killed
   */
  private registerCleanupHandlers(): void {
    if (this.cleanupRegistered) return;
    this.cleanupRegistered = true;

    const cleanup = async () => {
      console.log('[Cleanup] Closing all browsers...');
      const closePromises: Promise<void>[] = [];

      for (const browser of this.activeBrowsers) {
        if (browser.isConnected()) {
          closePromises.push(
            browser.close().catch((e) => {
              console.error('[Cleanup] Error closing browser:', e.message);
            })
          );
        }
      }

      // Also close the browser pool
      closePromises.push(
        this.browserPool.closeAll().catch((e) => {
          console.error('[Cleanup] Error closing browser pool:', e.message);
        })
      );

      await Promise.all(closePromises);
      this.activeBrowsers.clear();
      console.log('[Cleanup] All browsers closed.');
    };

    // Handle various termination signals
    process.on('exit', () => {
      // Synchronous cleanup - limited, but catches normal exits
      for (const browser of this.activeBrowsers) {
        try {
          if (browser.isConnected()) {
            browser.close().catch(() => {});
          }
        } catch {}
      }
    });

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', async (err) => {
      console.error('[Cleanup] Uncaught exception:', err);
      await cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('[Cleanup] Unhandled rejection:', reason);
      await cleanup();
      process.exit(1);
    });
  }

  /**
   * Main clone method
   */
  async clone(options: CloneOptions): Promise<CloneResult> {
    // Create a fresh Map for this clone job to prevent cross-contamination
    // when multiple clones run concurrently (critical fix for parallel clones)
    this.assetUrlMap = new Map();

    const result: CloneResult = {
      success: false,
      outputDir: options.outputDir,
      pagesCloned: 0,
      assetsCaptured: 0,
      errors: []
    };

    const startTime = Date.now();
    const recentFiles: Array<{ path: string; size: number; timestamp: string; type: string }> = [];

    // Initialize learning agent for this clone session
    try {
      this.learningAgent = await getLearningAgent('./merlin-learning.json');

      // Pre-clone analysis - get predictions and recommended settings
      const analysis = await this.learningAgent.preCloneAnalysis(options.url);

      if (analysis.predictedIssues.length > 0) {
        await this.logger.info('[Learning] Pre-clone predictions:', {
          url: options.url,
          predictions: analysis.predictedIssues,
          confidence: analysis.confidence
        });
      }

      // Apply recommended settings (merge with user settings)
      // LEARNING SYSTEM: These settings come from past clone experiences
      if (analysis.recommendedSettings.timeout && !options.timeout) {
        (options as any).timeout = analysis.recommendedSettings.timeout;
      }
      if (analysis.recommendedSettings.waitForDynamic) {
        (options as any).waitForDynamic = true;
      }

      // Apply learned maxPages - but ONLY if user didn't explicitly set a limit
      // User-specified limits should be respected (they may want a quick 5-page clone)
      if (analysis.recommendedSettings.maxPages) {
        const learnedMaxPages = analysis.recommendedSettings.maxPages as number;
        const userExplicitlySetMaxPages = options.maxPages !== undefined && options.maxPages > 0;

        if (!userExplicitlySetMaxPages) {
          // User didn't specify, apply learned settings
          options.maxPages = learnedMaxPages;
          await this.logger.info(`[Learning] Setting maxPages to ${learnedMaxPages} based on past experience`);
        } else {
          // User explicitly set a limit - respect it, just log that we're not overriding
          await this.logger.info(`[Learning] User set maxPages=${options.maxPages}, not overriding with learned value ${learnedMaxPages}`);
        }
      }

      // Apply font capture settings
      if (analysis.recommendedSettings.captureFonts) {
        (options as any).captureFonts = true;
        (options as any).fontExtensions = analysis.recommendedSettings.fontExtensions;
        await this.logger.info('[Learning] Enabling font capture based on past experience');
      }

      // Apply CDN timeout settings
      if (analysis.recommendedSettings.cdnTimeout) {
        (options as any).cdnTimeout = analysis.recommendedSettings.cdnTimeout;
        (options as any).cdnRetries = analysis.recommendedSettings.cdnRetries;
        await this.logger.info('[Learning] Applying CDN timeout settings based on past experience');
      }

      // Apply protocol timeout settings (for heavy JS sites)
      if (analysis.recommendedSettings.protocolTimeout) {
        (options as any).protocolTimeout = analysis.recommendedSettings.protocolTimeout;
        await this.logger.info(`[Learning] Setting protocolTimeout to ${analysis.recommendedSettings.protocolTimeout}ms based on past experience`);
      }

      // Apply concurrency settings (reduce for heavy/unstable sites)
      if (analysis.recommendedSettings.concurrency) {
        const learnedConcurrency = analysis.recommendedSettings.concurrency as number;
        const currentConcurrency = options.concurrency || 5;
        if (learnedConcurrency < currentConcurrency) {
          options.concurrency = learnedConcurrency;
          await this.logger.info(`[Learning] Reducing concurrency from ${currentConcurrency} to ${learnedConcurrency} based on past experience`);
        }
      }

      // Apply delay between pages (for unstable sites)
      if (analysis.recommendedSettings.delayBetweenPages) {
        (options as any).delayBetweenPages = analysis.recommendedSettings.delayBetweenPages;
        await this.logger.info(`[Learning] Adding ${analysis.recommendedSettings.delayBetweenPages}ms delay between pages based on past experience`);
      }

      // Start learning session
      this.learningAgent.startSession(options.url);
    } catch (err) {
      // Learning system is optional, continue without it
      await this.logger.warn('[Learning] Failed to initialize learning agent', {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    // Define trackFile function to add files to recentFiles array
    const trackFile = (file: { path: string; size: number; type: string }) => {
      recentFiles.push({ ...file, timestamp: new Date().toISOString() });
      // Keep only the last 20 files
      if (recentFiles.length > 20) {
        recentFiles.shift();
      }
    };

    // Variables for proxy tracking (defined outside try-catch)
    let proxyConfig: ProxyConfig | null = null;
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

      // Load proxies - prefer our P2P network, fall back to third-party providers
      if (options.proxyConfig?.enabled) {
        // Try enhanced P2P network first
        if (this.useEnhancedProxy) {
          const networkStats = enhancedProxyNetwork.getNetworkStats();
          if (networkStats.onlineNodes > 0) {
            await this.logger.info(`Using Merlin P2P network: ${networkStats.onlineNodes} proxies online`, { url: options.url });
          } else {
            // Fall back to third-party providers if P2P network is empty
            await this.logger.info('P2P network empty, loading from providers...', { url: options.url });
            await this.proxyManager.loadProxiesFromProviders();
            const stats = this.proxyManager.getStats();
            await this.logger.info(`Loaded ${stats.total} proxies (${stats.available} available)`, { url: options.url });
          }
        } else {
          await this.proxyManager.loadProxiesFromProviders();
          const stats = this.proxyManager.getStats();
          await this.logger.info(`Loaded ${stats.total} proxies (${stats.available} available)`, { url: options.url });
        }
      }

      // Get TLS fingerprint for consistent browser identity
      const domain = new URL(options.url).hostname;
      this.currentFingerprint = getFingerprintForSite(domain);
      await this.logger.info(`Using TLS fingerprint: ${this.currentFingerprint.id} (${this.currentFingerprint.browser} ${this.currentFingerprint.version})`, { url: options.url });

      // Acquire browser from pool - use fingerprint's user agent for consistency
      const userAgent = this.currentFingerprint
        ? { userAgent: this.currentFingerprint.userAgent, language: this.currentFingerprint.acceptLanguage.split(',')[0] }
        : this.userAgentManager.getNextUserAgent();
      const tlsConfig = TLSFingerprintMatcher.getTLSConfig(userAgent.userAgent);

      // Get proxy - prefer enhanced P2P network
      if (this.useEnhancedProxy && options.proxyConfig?.enabled) {
        const enhancedProxy = await enhancedProxyNetwork.getProxy({
          targetUrl: options.url,
          preferResidential: true,
          minSuccessRate: 0.8,
        });
        if (enhancedProxy) {
          proxyConfig = {
            host: enhancedProxy.host,
            port: enhancedProxy.port,
            type: enhancedProxy.type,
            country: enhancedProxy.countryCode,
            provider: 'Merlin P2P',
            isHealthy: enhancedProxy.isOnline,
          };
          await this.logger.info('Using Merlin P2P proxy', {
            url: options.url,
            proxy: `${proxyConfig.host}:${proxyConfig.port}`,
            type: proxyConfig.type,
            country: proxyConfig.country,
            asn: enhancedProxy.asn,
          });
        }
      }

      // Fall back to third-party proxy if P2P not available
      if (!proxyConfig && options.proxyConfig?.enabled) {
        proxyConfig = this.proxyManager.getNextProxy(options.url);
        if (proxyConfig) {
          await this.logger.info('Using third-party proxy', {
            url: options.url,
            proxy: `${proxyConfig.host}:${proxyConfig.port}`,
            type: proxyConfig.type,
            country: proxyConfig.country
          });
        }
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

      // Track browser for cleanup on exit
      this.activeBrowsers.add(browser);

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

        // =====================================================================
        // PRE-SCAN: Analyze website before cloning to detect complexity
        // This prevents failures by auto-adjusting concurrency, timeouts, etc.
        // =====================================================================
        let preScanResult: PreScanResult | null = null;
        try {
          await this.reportProgress(options, {
            currentPage: 0,
            totalPages: 0,
            currentUrl: options.url,
            status: 'processing',
            message: 'Pre-scanning website to detect complexity...'
          });

          const preScanner = new WebsitePreScanner();
          preScanResult = await preScanner.scan(browser, options.url);

          // Log the summary
          await this.logger.info('[PreScan] Website analysis complete', {
            url: options.url,
            complexity: preScanResult.complexity,
            complexityScore: preScanResult.complexityScore,
            framework: preScanResult.framework || 'none',
            pageLoadTime: preScanResult.pageLoadTime,
            jsExecutionTime: preScanResult.jsExecutionTime
          });

          // Apply pre-scan recommended settings (only if user didn't override)
          // Priority: User settings > Learning system > Pre-scan
          const rec = preScanResult.recommendedSettings;

          // Concurrency - take the lower of pre-scan vs current (may have been set by learning)
          const currentConcurrency = options.concurrency || 5;
          if (rec.concurrency < currentConcurrency) {
            await this.logger.info(`[PreScan] Reducing concurrency from ${currentConcurrency} to ${rec.concurrency} (complexity: ${preScanResult.complexity})`, { url: options.url });
            options.concurrency = rec.concurrency;
          }

          // Timeout - only if not already set
          if (!options.timeout) {
            options.timeout = rec.timeout;
            await this.logger.info(`[PreScan] Setting timeout to ${rec.timeout / 1000}s`, { url: options.url });
          }

          // Protocol timeout - only if not already set by learning
          if (!(options as any).protocolTimeout) {
            (options as any).protocolTimeout = rec.protocolTimeout;
          }

          // Delay between pages - take the higher of pre-scan vs learning
          const currentDelay = (options as any).delayBetweenPages || 0;
          if (rec.delayBetweenPages > currentDelay) {
            (options as any).delayBetweenPages = rec.delayBetweenPages;
            await this.logger.info(`[PreScan] Setting delay between pages to ${rec.delayBetweenPages}ms`, { url: options.url });
          }

          // Wait for dynamic content
          if (rec.waitForDynamic && !(options as any).waitForDynamic) {
            (options as any).waitForDynamic = true;
          }

          // Store tech stack in learning session metadata
          if (this.learningAgent && preScanResult.techStack.length > 0) {
            // This will be used by the learning system for future predictions
            (this.learningAgent as any).currentSession = (this.learningAgent as any).currentSession || {};
            if ((this.learningAgent as any).currentSession?.metadata) {
              (this.learningAgent as any).currentSession.metadata.techStack = preScanResult.techStack;
              (this.learningAgent as any).currentSession.metadata.hasJavaScript = preScanResult.isSPA;
              (this.learningAgent as any).currentSession.metadata.hasDynamicContent = preScanResult.isSPA;
            }
          }

          // Log final settings
          await this.logger.info('[PreScan] Final clone settings after analysis', {
            url: options.url,
            concurrency: options.concurrency,
            timeout: options.timeout,
            protocolTimeout: (options as any).protocolTimeout,
            delayBetweenPages: (options as any).delayBetweenPages,
            complexity: preScanResult.complexity
          });

        } catch (preScanError) {
          // Pre-scan is optional - log and continue with defaults
          await this.logger.warn('[PreScan] Website analysis failed, using default settings', {
            url: options.url,
            error: preScanError instanceof Error ? preScanError.message : String(preScanError)
          });
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
                const elapsedMinutes = (Date.now() - startTime) / 60000;
                options.onProgress({
                  currentPage: currentPagesCloned,
                  totalPages: options.maxPages || 100,
                  currentUrl: options.url,
                  status: 'crawling',
                  message: `Downloaded: ${path.basename(file.path)}`,
                  assetsCaptured: recentFiles.filter(f => f.type !== 'html').length,
                  recentFiles: recentFiles.slice(-10),
                  elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
                  timeLimitMinutes: options.timeLimitMinutes
                });
              }
            }
          }, startTime); // Pass startTime for time limit checking
        }

        // Check if time limit was reached
        if (cloneResult.timeLimitReached) {
          await this.reportProgress(options, {
            currentPage: cloneResult.pagesCloned,
            totalPages: cloneResult.pagesCloned,
            currentUrl: '',
            status: 'time_limit_reached',
            message: `Time limit reached (${options.timeLimitMinutes} minutes). Clone stopped with ${cloneResult.pagesCloned} pages.`,
            elapsedMinutes: options.timeLimitMinutes,
            timeLimitMinutes: options.timeLimitMinutes
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

            // Update HTML references if images were converted to different formats
            if (optimizationResults.pathChanges.size > 0) {
              await this.updateHtmlForOptimizedImages(baseDir, optimizationResults.pathChanges);
              await this.logger.info('Updated HTML references for optimized images', {
                url: options.url,
                imagesConverted: optimizationResults.pathChanges.size
              });
            }
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
            // Pass scope options so limited clones aren't penalized for out-of-scope links
            const verificationResult = await verifyClone(baseDir, options.url, {
              maxPages: options.maxPages,
              maxDepth: options.maxDepth
            });
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
        // Remove from active tracking and release browser back to pool
        this.activeBrowsers.delete(browser);
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

    // End learning session and extract lessons
    if (this.learningAgent) {
      try {
        // Update progress info
        this.learningAgent.updateProgress(result.pagesCloned, result.assetsCaptured);

        // Log issues from verification results
        if (result.verificationResult?.checks) {
          for (const check of result.verificationResult.checks) {
            if (!check.passed) {
              // Map verification check to learning issue type
              let issueType: CloneIssue['type'] = 'other';
              if (check.category === 'links') issueType = 'broken_link';
              else if (check.category === 'images' || check.category === 'assets') issueType = 'missing_asset';
              else if (check.category === 'dynamic') issueType = 'dynamic_content';

              this.learningAgent.logIssue({
                type: issueType,
                description: check.message,
                url: options.url,
                context: {
                  category: check.category,
                  details: check.details
                }
              });
            }
          }
        }

        // Log general errors as issues
        for (const error of result.errors) {
          this.learningAgent.logIssue({
            type: this.categorizeError(error),
            description: error,
            url: options.url
          });
        }

        // End session with final score - triggers learning and rule generation
        const finalScore = result.verificationResult?.score ?? (result.success ? 70 : 0);
        const learningResult = await this.learningAgent.endSession(finalScore);

        if (learningResult.newRules.length > 0) {
          await this.logger.info('[Learning] Generated new rules:', {
            url: options.url,
            rulesCount: learningResult.newRules.length,
            rules: learningResult.newRules.map(r => r.name)
          });
        }

        if (learningResult.improvement !== 0) {
          await this.logger.info('[Learning] Score improvement:', {
            url: options.url,
            improvement: `${learningResult.improvement > 0 ? '+' : ''}${learningResult.improvement.toFixed(1)}%`
          });
        }
      } catch (err) {
        await this.logger.warn('[Learning] Failed to end learning session', {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return result;
  }

  /**
   * Categorizes an error message into a learning issue type
   * Looks for [RAW: ...] section which contains the original error message
   */
  private categorizeError(error: string): CloneIssue['type'] {
    // Extract raw error if present (format: [RAW: actual error message])
    const rawMatch = error.match(/\[RAW:\s*(.+?)\]$/s);
    const rawError = rawMatch ? rawMatch[1] : '';

    // Check both the formatted message and raw error
    const lowerError = error.toLowerCase();
    const lowerRaw = rawError.toLowerCase();

    // Protocol timeout - specific browser/Puppeteer protocol errors
    // Check raw error first (more reliable)
    if (lowerRaw.includes('runtime.callfunctionon') ||
        lowerRaw.includes('protocolerror') ||
        lowerRaw.includes('protocol error') ||
        lowerRaw.includes('cdpsession') ||
        lowerError.includes('protocol') ||
        lowerError.includes('runtime.callfunctionon')) {
      return 'protocol_timeout';
    }

    // Target closed - browser session terminated
    if (lowerRaw.includes('target closed') ||
        lowerRaw.includes('session closed') ||
        lowerRaw.includes('page has been closed') ||
        lowerRaw.includes('connection closed') ||
        lowerError.includes('target closed') ||
        lowerError.includes('session closed') ||
        lowerError.includes('page has been closed') ||
        lowerError.includes('browser has disconnected') ||
        lowerError.includes('detached from target')) {
      return 'target_closed';
    }

    // Main frame too early - race condition, treat as target_closed
    if (lowerRaw.includes('main frame too early') ||
        lowerError.includes('main frame too early')) {
      return 'target_closed';
    }

    // General timeout (network/navigation)
    if (lowerError.includes('timeout') || lowerRaw.includes('timeout')) return 'timeout';
    if (lowerError.includes('cloudflare') || lowerError.includes('captcha') || lowerError.includes('blocked')) return 'anti_bot';
    if (lowerError.includes('link') || lowerError.includes('href') || lowerError.includes('404')) return 'broken_link';
    if (lowerError.includes('asset') || lowerError.includes('image') || lowerError.includes('css') || lowerError.includes('js')) return 'missing_asset';
    if (lowerError.includes('dynamic') || lowerError.includes('javascript') || lowerError.includes('spa')) return 'dynamic_content';
    if (lowerError.includes('path') || lowerError.includes('directory')) return 'path_mismatch';
    return 'other';
  }

  /**
   * Gets learning system statistics and report
   */
  async getLearningReport(): Promise<{
    stats: { totalClones: number; successfulClones: number; averageScore: number; issuesFixed: number; patternsLearned: number; rulesGenerated: number };
    rules: Array<{ name: string; confidence: number; timesApplied: number }>;
    report: string;
  }> {
    try {
      const agent = await getLearningAgent('./merlin-learning.json');
      return {
        stats: agent.getStats(),
        rules: agent.getRules().map(r => ({
          name: r.name,
          confidence: r.confidence,
          timesApplied: r.timesApplied
        })),
        report: agent.getSummaryReport()
      };
    } catch (error) {
      return {
        stats: { totalClones: 0, successfulClones: 0, averageScore: 0, issuesFixed: 0, patternsLearned: 0, rulesGenerated: 0 },
        rules: [],
        report: 'Learning system not initialized'
      };
    }
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
              const urlObj = new URL(link, url);
              // CRITICAL FIX: Strip anchor fragments to prevent duplicate page crawling
              urlObj.hash = '';
              const absoluteUrl = urlObj.href;
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

      // Apply delay between pages if learned (helps with heavy/unstable sites)
      const delayBetweenPages = (options as any).delayBetweenPages || 0;
      if (delayBetweenPages > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenPages));
      }

      // Give page a moment to fully initialize to avoid "Requesting main frame too early"
      // This is critical - the page must be fully ready before navigation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wait for the page target to be ready
      try {
        await page.waitForFunction(() => true, { timeout: 5000 });
      } catch {
        // If waitForFunction fails, continue anyway after extra delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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
          // Use learned timeout or default
          // Documentation sites need longer timeouts (10 minutes instead of 1 minute)
          const isDocSite = this.isDocumentationSite(url);
          const defaultTimeout = isDocSite ? 600000 : 60000; // 10 min for docs, 1 min for others
          const pageTimeout = (options as any).pageTimeout || options.timeout || defaultTimeout;

          if (isDocSite) {
            await this.logger.info(`[DocSite] Using extended timeout (${pageTimeout / 1000}s) for documentation site`, { url });
          }

          // Retry navigation with exponential backoff
          const navigationResult = await this.retryManager.retry(
            async () => {
              // Try networkidle2 first (best for SPAs)
              const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: pageTimeout });
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
                const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: pageTimeout });
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
                  const response = await page.goto(url, { waitUntil: 'load', timeout: pageTimeout });
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
      // Maps external URLs to local relative paths - stores MULTIPLE variants for better matching
      for (const asset of capturedAssets || []) {
        if (asset && typeof asset !== 'string' && asset.url && asset.localPath) {
          // Convert absolute localPath to relative path from outputDir
          const relativePath = path.relative(options.outputDir, asset.localPath).replace(/\\/g, '/');

          // Store the original URL
          this.assetUrlMap.set(asset.url, relativePath);

          try {
            const urlObj = new URL(asset.url);

            // Store URL without query string
            const urlWithoutQuery = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
            this.assetUrlMap.set(urlWithoutQuery, relativePath);

            // Store pathname only (for relative matching)
            this.assetUrlMap.set(urlObj.pathname, relativePath);

            // Store both http and https versions
            if (urlObj.protocol === 'https:') {
              this.assetUrlMap.set(`http://${urlObj.host}${urlObj.pathname}`, relativePath);
            } else if (urlObj.protocol === 'http:') {
              this.assetUrlMap.set(`https://${urlObj.host}${urlObj.pathname}`, relativePath);
            }

            // Store protocol-relative version
            this.assetUrlMap.set(`//${urlObj.host}${urlObj.pathname}`, relativePath);

            // Store URL-decoded version if different
            const decodedPath = decodeURIComponent(urlObj.pathname);
            if (decodedPath !== urlObj.pathname) {
              this.assetUrlMap.set(decodedPath, relativePath);
              this.assetUrlMap.set(`${urlObj.protocol}//${urlObj.host}${decodedPath}`, relativePath);
            }

            // Store pathname WITHOUT leading slash (for relative references in HTML)
            if (urlObj.pathname.startsWith('/')) {
              this.assetUrlMap.set(urlObj.pathname.slice(1), relativePath);
              if (decodedPath !== urlObj.pathname) {
                this.assetUrlMap.set(decodedPath.slice(1), relativePath);
              }
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

      // Extract CSS animations and computed styles for visual fidelity
      try {
        const animationResult = await this.cssAnimationExtractor.extractAnimations(page, url);
        const computedResult = await this.computedStyleCapture.captureStyles(page);

        // Inject captured styles into HTML
        if (animationResult.injectableCSS || computedResult.injectableCSS) {
          const styleBlock = `<style type="text/css" data-merlin="captured-styles">
${animationResult.injectableCSS}
${computedResult.injectableCSS}
</style>`;

          // Inject before </head> or at start of <body>
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${styleBlock}\n</head>`);
          } else if (html.includes('<body')) {
            html = html.replace(/<body([^>]*)>/, `<body$1>\n${styleBlock}`);
          }

          await this.logger.debug('Captured CSS animations/styles', {
            url,
            keyframes: animationResult.stats.keyframesCount,
            animations: animationResult.stats.animationsCount,
            computedRules: computedResult.rulesGenerated,
          });
        }
      } catch (styleError) {
        await this.logger.warn('Failed to extract CSS animations/styles', { url, error: String(styleError) });
      }

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
          // Skip invalid or empty links
          if (!link || link === '//' || link === '/' || link.startsWith('javascript:') || link.startsWith('mailto:') || link.startsWith('tel:')) {
            continue;
          }
          try {
            const urlObj = new URL(link, url);
            // CRITICAL FIX: Strip anchor fragments to prevent duplicate page crawling
            // URLs like /docs#section1 and /docs#section2 are the SAME page
            urlObj.hash = '';
            const absoluteUrl = urlObj.href;
            if (!visited.has(absoluteUrl) && this.isSameDomain(absoluteUrl, url)) {
              discoveredLinks.push(absoluteUrl);
            }
          } catch {
            // Invalid URL, skip it
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
      // IMPORTANT: Include raw error message for learning system to properly categorize
      // The raw error contains details like "Runtime.callFunctionOn timed out" or "Target closed"
      const rawErrorMsg = errorObj.message || String(error);
      let errorMessage = `Failed to clone ${url}: ${formatted.userMessage} (${formatted.code})`;
      if (formatted.recovery && formatted.recovery.suggestions.length > 0) {
        errorMessage += `\nRecovery suggestions: ${formatted.recovery.suggestions.slice(0, 2).join(', ')}`;
      }
      // Append raw error for learning categorization (will be parsed by categorizeError)
      errorMessage += `\n[RAW: ${rawErrorMsg}]`;
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
    options: CloneOptions,
    cloneStartTime?: number
  ): Promise<{ pagesCloned: number; assetsCaptured: number; errors: string[]; timeLimitReached?: boolean }> {
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

    const results = { pagesCloned: 0, assetsCaptured: 0, errors: [] as string[], timeLimitReached: false };
    const maxPages = options.unlimited ? Infinity : (options.maxPages || 100);
    const maxDepth = options.unlimited ? Infinity : (options.maxDepth || 5);
    const concurrency = options.concurrency || 5; // Process 5 pages in parallel (reduced from 50 to prevent race conditions)
    const timeLimitMs = options.timeLimitMinutes ? options.timeLimitMinutes * 60 * 1000 : 0;
    
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
      // Check time limit
      if (timeLimitMs > 0 && cloneStartTime) {
        const elapsed = Date.now() - cloneStartTime;
        if (elapsed >= timeLimitMs) {
          const elapsedMinutes = (elapsed / 60000).toFixed(1);
          await this.logger.info(`Time limit reached (${elapsedMinutes} minutes). Stopping clone.`, {
            url: options.url,
            pagesCloned: results.pagesCloned,
            timeLimitMinutes: options.timeLimitMinutes
          });
          results.timeLimitReached = true;
          break;
        }
      }

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
   * Decodes HTML entities in a string
   */
  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Normalizes a URL for matching - removes query strings, fragments, and normalizes protocol
   */
  private normalizeUrlForMatching(url: string): string[] {
    const variants: string[] = [url];

    // Also add HTML-decoded version
    const decodedHtml = this.decodeHtmlEntities(url);
    if (decodedHtml !== url) {
      variants.push(decodedHtml);
    }

    try {
      // Handle protocol-relative URLs
      let normalizedUrl = decodedHtml; // Use decoded version
      if (normalizedUrl.startsWith('//')) {
        normalizedUrl = 'https:' + normalizedUrl;
        variants.push('http:' + decodedHtml);
        variants.push('https:' + decodedHtml);
      }

      const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : 'https://dummy.com' + normalizedUrl);

      // Add URL without query string and fragment
      const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      variants.push(baseUrl);

      // Add pathname only (with and without leading slash)
      variants.push(urlObj.pathname);
      if (urlObj.pathname.startsWith('/')) {
        variants.push(urlObj.pathname.slice(1));
      }

      // Add URL decoded version
      const decodedPath = decodeURIComponent(urlObj.pathname);
      if (decodedPath !== urlObj.pathname) {
        variants.push(decodedPath);
        variants.push(`${urlObj.protocol}//${urlObj.host}${decodedPath}`);
        if (decodedPath.startsWith('/')) {
          variants.push(decodedPath.slice(1));
        }
      }

      // Add both http and https versions
      if (urlObj.protocol === 'https:') {
        variants.push(`http://${urlObj.host}${urlObj.pathname}`);
      } else if (urlObj.protocol === 'http:') {
        variants.push(`https://${urlObj.host}${urlObj.pathname}`);
      }

      // Add protocol-relative version
      variants.push(`//${urlObj.host}${urlObj.pathname}`);

    } catch {
      // Invalid URL, just return original
    }

    return [...new Set(variants)]; // Remove duplicates
  }

  /**
   * Builds a comprehensive URL lookup map from assetUrlMap
   * Maps all possible URL variations to local paths
   */
  private buildUrlLookupMap(outputDir: string, basePath: string): Map<string, string> {
    const lookupMap = new Map<string, string>();

    for (const [originalUrl, relativePath] of this.assetUrlMap.entries()) {
      const htmlRelativePath = path.relative(basePath, path.join(outputDir, relativePath)).replace(/\\/g, '/');

      // Add all normalized variants of the URL
      const variants = this.normalizeUrlForMatching(originalUrl);
      for (const variant of variants) {
        if (!lookupMap.has(variant)) {
          lookupMap.set(variant, htmlRelativePath);
        }
      }
    }

    return lookupMap;
  }

  /**
   * Updates HTML files after image optimization changes file extensions
   * For example: .jpg -> .webp
   */
  private async updateHtmlForOptimizedImages(
    outputDir: string,
    pathChanges: Map<string, string>
  ): Promise<void> {
    if (pathChanges.size === 0) return;

    const htmlFiles = await this.findHtmlFiles(outputDir);
    const cssFiles = await this.findCssFiles(outputDir);

    // Build simple replacement pairs: oldFilename -> newFilename
    const replacements: Array<{ oldFilename: string; newFilename: string }> = [];

    for (const [oldPath, newPath] of pathChanges) {
      const oldFilename = path.basename(oldPath);
      const newFilename = path.basename(newPath);
      if (oldFilename !== newFilename) {
        replacements.push({ oldFilename, newFilename });
      }
    }

    if (replacements.length === 0) return;

    // Process each HTML file with simple string replacement
    for (const htmlFile of htmlFiles) {
      try {
        let html = await fs.readFile(htmlFile, 'utf-8');
        let changed = false;

        for (const { oldFilename, newFilename } of replacements) {
          if (html.includes(oldFilename)) {
            html = html.split(oldFilename).join(newFilename);
            changed = true;
          }
        }

        if (changed) {
          await fs.writeFile(htmlFile, html, 'utf-8');
        }
      } catch (err) {
        // Ignore errors for individual files
      }
    }

    // Also update CSS files that might reference images
    for (const cssFile of cssFiles) {
      try {
        let css = await fs.readFile(cssFile, 'utf-8');
        let changed = false;

        for (const { oldFilename, newFilename } of replacements) {
          if (css.includes(oldFilename)) {
            css = css.split(oldFilename).join(newFilename);
            changed = true;
          }
        }

        if (changed) {
          await fs.writeFile(cssFile, css, 'utf-8');
        }
      } catch (err) {
        // Ignore errors
      }
    }
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

      // Build comprehensive URL lookup map for this HTML file
      const urlLookupMap = this.buildUrlLookupMap(outputDir, basePath);

      // Match all URLs in the HTML and replace them
      // Pattern matches: src="...", href="...", url(...), data-src="...", srcset="..."
      const urlPatternRegex = /((?:src|href|data-src|data-href|poster|data-poster)\s*=\s*["'])([^"']+)(["'])|url\s*\(\s*["']?([^"')]+)["']?\s*\)|(srcset\s*=\s*["'])([^"']+)(["'])/gi;

      html = html.replace(urlPatternRegex, (match, attrPrefix, attrUrl, attrSuffix, cssUrl, srcsetPrefix, srcsetValue, srcsetSuffix) => {
        // Handle srcset separately (contains multiple URLs)
        if (srcsetPrefix && srcsetValue) {
          const fixedSrcset = srcsetValue.split(',').map((part: string) => {
            const trimmed = part.trim();
            const [url, descriptor] = trimmed.split(/\s+/);
            if (url) {
              const variants = this.normalizeUrlForMatching(url);
              for (const variant of variants) {
                const localPath = urlLookupMap.get(variant);
                if (localPath) {
                  return descriptor ? `${localPath} ${descriptor}` : localPath;
                }
              }
            }
            return trimmed;
          }).join(', ');
          return `${srcsetPrefix}${fixedSrcset}${srcsetSuffix}`;
        }

        // Handle CSS url()
        if (cssUrl) {
          const variants = this.normalizeUrlForMatching(cssUrl);
          for (const variant of variants) {
            const localPath = urlLookupMap.get(variant);
            if (localPath) {
              return `url('${localPath}')`;
            }
          }
          return match;
        }

        // Handle regular attributes (src, href, etc.)
        if (attrPrefix && attrUrl) {
          const variants = this.normalizeUrlForMatching(attrUrl);
          for (const variant of variants) {
            const localPath = urlLookupMap.get(variant);
            if (localPath) {
              return `${attrPrefix}${localPath}${attrSuffix}`;
            }
          }
        }

        return match;
      });

      // Second pass: Fix internal page links to proper relative paths with /index.html suffix
      // This handles links like /about -> ../about/index.html (from subdirectory)
      // Or /about -> ./about/index.html (from root)
      const htmlRelDir = path.relative(outputDir, basePath).replace(/\\/g, '/');
      const htmlDepth = htmlRelDir ? htmlRelDir.split('/').filter(p => p).length : 0;

      const internalLinkRegex = /(href\s*=\s*["'])([^"'#?]+)(["'])/gi;
      html = html.replace(internalLinkRegex, (match, prefix, href, suffix) => {
        // Skip external URLs, assets, already has extension, or special links
        if (href.startsWith('http') || href.startsWith('//') ||
            href.startsWith('assets/') || href.startsWith('../assets/') ||
            href.endsWith('/index.html') || href === '#' || href === '' ||
            href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return match;
        }

        // Skip if already has a file extension (not a page link)
        if (/\.[a-z]{2,4}$/i.test(href)) {
          return match;
        }

        // Handle absolute paths (start with /)
        if (href.startsWith('/')) {
          const cleanPath = href.replace(/\/$/, ''); // Remove trailing slash
          if (cleanPath) {
            // Calculate relative path from current HTML to target page
            const upDirs = '../'.repeat(htmlDepth);
            const targetPath = cleanPath.replace(/^\//, ''); // Remove leading slash
            const fixedHref = upDirs + (targetPath ? targetPath + '/index.html' : 'index.html');
            return `${prefix}${fixedHref}${suffix}`;
          }
        }

        // Handle relative paths without extension (page links)
        // Remove leading ./ and trailing /
        let cleanHref = href.replace(/^\.\//, '').replace(/\/$/, '');
        // Check if it has a file extension (skip if it does)
        const hasExtension = /\.[a-z0-9]{2,5}$/i.test(cleanHref);
        if (cleanHref && !hasExtension) {
          // Preserve ./ prefix if original had it
          const prefix2 = href.startsWith('./') ? './' : '';
          const fixedHref = prefix2 + cleanHref + '/index.html';
          return `${prefix}${fixedHref}${suffix}`;
        }

        return match;
      });

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

          // Build lookup map for this CSS file
          const cssLookupMap = this.buildUrlLookupMap(outputDir, cssDir);

          // Match all url() patterns in CSS and replace them
          const cssUrlRegex = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
          css = css.replace(cssUrlRegex, (match, cssUrl) => {
            // Try to find a matching local path
            const variants = this.normalizeUrlForMatching(cssUrl);
            for (const variant of variants) {
              const localPath = cssLookupMap.get(variant);
              if (localPath) {
                return `url('${localPath}')`;
              }
            }
            return match;
          });

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
   * Finds CSS files
   */
  private async findCssFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.findCssFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.css')) {
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

