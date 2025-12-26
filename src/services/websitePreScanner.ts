/**
 * Website Pre-Scanner
 *
 * Scans a website BEFORE cloning to detect:
 * - Framework (Next.js, React, Vue, etc.)
 * - Page load time and JS execution time
 * - Asset count and complexity
 * - Recommended clone settings
 *
 * This prevents failures by auto-adjusting concurrency, timeouts, etc.
 */

import { Page, Browser } from 'puppeteer';
import { SPADetector } from './spaDetector.js';
import { LoggingService } from './logging.js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PreScanResult {
  // URL info
  url: string;
  domain: string;

  // Framework & Tech Stack
  framework: string | null;
  frameworkConfidence: number;
  techStack: string[];
  isSPA: boolean;

  // Performance Metrics
  pageLoadTime: number;       // ms - time to networkidle
  domReadyTime: number;       // ms - time to DOMContentLoaded
  jsExecutionTime: number;    // ms - script duration from metrics

  // Content Metrics
  pageSize: number;           // bytes - HTML size
  scriptCount: number;        // number of <script> tags
  styleCount: number;         // number of <link rel="stylesheet">
  imageCount: number;         // number of <img> tags
  iframeCount: number;        // number of <iframe> tags

  // Complexity Assessment
  complexity: 'simple' | 'moderate' | 'complex' | 'heavy';
  complexityScore: number;    // 0-100

  // Recommended Clone Settings
  recommendedSettings: {
    concurrency: number;
    timeout: number;
    protocolTimeout: number;
    delayBetweenPages: number;
    waitForDynamic: boolean;
  };

  // Analysis metadata
  scanDuration: number;       // ms
  timestamp: number;
  warnings: string[];
}

// ============================================================================
// WEBSITE PRE-SCANNER CLASS
// ============================================================================

export class WebsitePreScanner {
  private logger: LoggingService;
  private spaDetector: SPADetector;

  constructor() {
    this.logger = new LoggingService('./logs');
    this.spaDetector = new SPADetector();
  }

  /**
   * Scan a website to analyze its complexity and determine optimal clone settings
   */
  async scan(browser: Browser, url: string): Promise<PreScanResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    await this.logger.info('[PreScan] Starting website analysis', { url });

    let page: Page | null = null;

    try {
      // Create a new page for scanning
      page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Track timing
      const navigationStart = Date.now();
      let domReadyTime = 0;

      // Listen for DOMContentLoaded
      page.once('domcontentloaded', () => {
        domReadyTime = Date.now() - navigationStart;
      });

      // Navigate to the page
      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 60000  // 60 second timeout for scan
        });
      } catch (navError) {
        // Try with domcontentloaded as fallback
        warnings.push('Full page load timed out, using partial load');
        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
        } catch {
          warnings.push('Navigation failed completely');
          throw navError;
        }
      }

      const pageLoadTime = Date.now() - navigationStart;

      // Get page metrics (includes JS execution time)
      const metrics = await page.metrics();
      const jsExecutionTime = Math.round((metrics.ScriptDuration || 0) * 1000);

      // Detect framework using SpaDetector
      let framework: string | null = null;
      let frameworkConfidence = 0;
      let isSPA = false;
      const techStack: string[] = [];

      try {
        const spaResult = await this.spaDetector.detectFramework(page);
        if (spaResult) {
          framework = spaResult.name;
          frameworkConfidence = spaResult.confidence;
          isSPA = true;
          techStack.push(spaResult.name);
          if (spaResult.version) {
            techStack.push(`${spaResult.name} ${spaResult.version}`);
          }
        }
      } catch {
        warnings.push('Framework detection failed');
      }

      // Additional tech stack detection
      const additionalTech = await this.detectAdditionalTechStack(page);
      techStack.push(...additionalTech);

      // Count page elements
      const contentMetrics = await page.evaluate(() => {
        return {
          scriptCount: document.querySelectorAll('script').length,
          styleCount: document.querySelectorAll('link[rel="stylesheet"]').length,
          imageCount: document.querySelectorAll('img').length,
          iframeCount: document.querySelectorAll('iframe').length,
          pageSize: document.documentElement.outerHTML.length
        };
      });

      // Calculate complexity score (0-100)
      const complexityScore = this.calculateComplexityScore({
        jsExecutionTime,
        pageLoadTime,
        scriptCount: contentMetrics.scriptCount,
        imageCount: contentMetrics.imageCount,
        iframeCount: contentMetrics.iframeCount,
        isSPA,
        framework
      });

      // Determine complexity level
      const complexity = this.getComplexityLevel(complexityScore);

      // Get recommended settings based on complexity
      const recommendedSettings = this.getRecommendedSettings(complexity, {
        framework,
        jsExecutionTime,
        pageLoadTime,
        isSPA
      });

      // Extract domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      const result: PreScanResult = {
        url,
        domain,
        framework,
        frameworkConfidence,
        techStack: [...new Set(techStack)], // Remove duplicates
        isSPA,
        pageLoadTime,
        domReadyTime: domReadyTime || pageLoadTime,
        jsExecutionTime,
        pageSize: contentMetrics.pageSize,
        scriptCount: contentMetrics.scriptCount,
        styleCount: contentMetrics.styleCount,
        imageCount: contentMetrics.imageCount,
        iframeCount: contentMetrics.iframeCount,
        complexity,
        complexityScore,
        recommendedSettings,
        scanDuration: Date.now() - startTime,
        timestamp: Date.now(),
        warnings
      };

      await this.logger.info('[PreScan] Analysis complete', {
        url,
        framework: framework || 'none',
        complexity,
        complexityScore,
        pageLoadTime: `${pageLoadTime}ms`,
        jsExecutionTime: `${jsExecutionTime}ms`,
        recommendedConcurrency: recommendedSettings.concurrency
      });

      return result;

    } finally {
      // Always close the page
      if (page) {
        try {
          await page.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  /**
   * Detect additional technologies beyond framework
   */
  private async detectAdditionalTechStack(page: Page): Promise<string[]> {
    const tech: string[] = [];

    try {
      const detected = await page.evaluate(() => {
        const stack: string[] = [];

        // Check for common libraries/frameworks
        if ((window as any).jQuery || (window as any).$) stack.push('jQuery');
        if ((window as any).angular) stack.push('AngularJS');
        if ((window as any).Backbone) stack.push('Backbone.js');
        if ((window as any).Ember) stack.push('Ember.js');
        if ((window as any).gsap || (window as any).TweenMax) stack.push('GSAP');
        if ((window as any).THREE) stack.push('Three.js');
        if ((window as any).Swiper) stack.push('Swiper');
        if ((window as any).AOS) stack.push('AOS');
        if ((window as any).Lottie || (window as any).lottie) stack.push('Lottie');

        // Check for analytics/tracking
        if ((window as any).gtag || (window as any).ga) stack.push('Google Analytics');
        if ((window as any).fbq) stack.push('Facebook Pixel');

        // Check for CMS indicators
        if (document.querySelector('meta[name="generator"]')) {
          const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content');
          if (generator) {
            if (generator.includes('WordPress')) stack.push('WordPress');
            if (generator.includes('Drupal')) stack.push('Drupal');
            if (generator.includes('Joomla')) stack.push('Joomla');
            if (generator.includes('Shopify')) stack.push('Shopify');
            if (generator.includes('Wix')) stack.push('Wix');
            if (generator.includes('Squarespace')) stack.push('Squarespace');
          }
        }

        // Check for Next.js specifically
        if (document.querySelector('#__next') || document.querySelector('script[src*="/_next/"]')) {
          stack.push('Next.js');
        }

        // Check for Nuxt.js
        if (document.querySelector('#__nuxt') || (window as any).__NUXT__) {
          stack.push('Nuxt.js');
        }

        // Check for Gatsby
        if (document.querySelector('#___gatsby')) {
          stack.push('Gatsby');
        }

        return stack;
      });

      tech.push(...detected);
    } catch {
      // Ignore detection errors
    }

    return tech;
  }

  /**
   * Calculate complexity score (0-100)
   */
  private calculateComplexityScore(params: {
    jsExecutionTime: number;
    pageLoadTime: number;
    scriptCount: number;
    imageCount: number;
    iframeCount: number;
    isSPA: boolean;
    framework: string | null;
  }): number {
    let score = 0;

    // JS execution time factor (0-30 points)
    // >5s = 30, 3-5s = 20, 1-3s = 10, <1s = 0
    if (params.jsExecutionTime > 5000) score += 30;
    else if (params.jsExecutionTime > 3000) score += 20;
    else if (params.jsExecutionTime > 1000) score += 10;

    // Page load time factor (0-25 points)
    // >10s = 25, 5-10s = 15, 2-5s = 8, <2s = 0
    if (params.pageLoadTime > 10000) score += 25;
    else if (params.pageLoadTime > 5000) score += 15;
    else if (params.pageLoadTime > 2000) score += 8;

    // Script count factor (0-15 points)
    if (params.scriptCount > 30) score += 15;
    else if (params.scriptCount > 15) score += 10;
    else if (params.scriptCount > 5) score += 5;

    // Image count factor (0-10 points)
    if (params.imageCount > 50) score += 10;
    else if (params.imageCount > 20) score += 5;

    // iFrame factor (0-10 points) - iframes are heavy
    if (params.iframeCount > 3) score += 10;
    else if (params.iframeCount > 0) score += 5;

    // SPA factor (+10 points if SPA)
    if (params.isSPA) score += 10;

    // Heavy framework bonus
    const heavyFrameworks = ['Next.js', 'Nuxt.js', 'Angular', 'Gatsby'];
    if (params.framework && heavyFrameworks.some(f => params.framework!.includes(f))) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Get complexity level from score
   */
  private getComplexityLevel(score: number): 'simple' | 'moderate' | 'complex' | 'heavy' {
    if (score < 20) return 'simple';
    if (score < 45) return 'moderate';
    if (score < 70) return 'complex';
    return 'heavy';
  }

  /**
   * Get recommended clone settings based on complexity
   */
  private getRecommendedSettings(
    complexity: 'simple' | 'moderate' | 'complex' | 'heavy',
    context: {
      framework: string | null;
      jsExecutionTime: number;
      pageLoadTime: number;
      isSPA: boolean;
    }
  ): PreScanResult['recommendedSettings'] {
    // Base settings by complexity - CONSERVATIVE for low CPU/RAM usage
    // Max 50% CPU, minimal RAM - use single-threaded with delays
    const baseSettings = {
      simple: {
        concurrency: 2,           // Reduced from 10
        timeout: 30000,
        protocolTimeout: 60000,
        delayBetweenPages: 500,   // Added delay
        waitForDynamic: false
      },
      moderate: {
        concurrency: 1,           // Reduced from 5 to single-threaded
        timeout: 60000,
        protocolTimeout: 120000,
        delayBetweenPages: 1500,  // Increased from 500
        waitForDynamic: true
      },
      complex: {
        concurrency: 1,           // Reduced from 3 to single-threaded
        timeout: 90000,
        protocolTimeout: 180000,
        delayBetweenPages: 2500,  // Increased from 1000
        waitForDynamic: true
      },
      heavy: {
        concurrency: 1,           // Reduced from 2
        timeout: 120000,
        protocolTimeout: 240000,
        delayBetweenPages: 4000,  // Increased from 2000
        waitForDynamic: true
      }
    };

    const settings = { ...baseSettings[complexity] };

    // Adjust based on specific conditions

    // Next.js sites need even lower concurrency
    if (context.framework?.includes('Next.js')) {
      settings.concurrency = Math.min(settings.concurrency, 2);
      settings.delayBetweenPages = Math.max(settings.delayBetweenPages, 1500);
    }

    // Very slow JS execution = single threaded
    if (context.jsExecutionTime > 8000) {
      settings.concurrency = 1;
      settings.delayBetweenPages = 3000;
    }

    // Very slow page load = increase timeout
    if (context.pageLoadTime > 15000) {
      settings.timeout = 180000;
      settings.protocolTimeout = 300000;
    }

    return settings;
  }

  /**
   * Get a human-readable summary of the pre-scan result
   */
  getSummary(result: PreScanResult): string {
    const lines: string[] = [
      `📊 Pre-Scan Results for ${result.domain}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🔧 Tech Stack:`,
      `   Framework: ${result.framework || 'None detected'}${result.frameworkConfidence ? ` (${result.frameworkConfidence}% confidence)` : ''}`,
      `   SPA: ${result.isSPA ? 'Yes' : 'No'}`,
      result.techStack.length > 0 ? `   Other: ${result.techStack.filter(t => t !== result.framework).join(', ')}` : '',
      ``,
      `⏱️ Performance:`,
      `   Page Load: ${result.pageLoadTime}ms`,
      `   DOM Ready: ${result.domReadyTime}ms`,
      `   JS Execution: ${result.jsExecutionTime}ms`,
      ``,
      `📄 Content:`,
      `   Page Size: ${(result.pageSize / 1024).toFixed(1)} KB`,
      `   Scripts: ${result.scriptCount}`,
      `   Stylesheets: ${result.styleCount}`,
      `   Images: ${result.imageCount}`,
      `   iFrames: ${result.iframeCount}`,
      ``,
      `🎯 Complexity: ${result.complexity.toUpperCase()} (score: ${result.complexityScore}/100)`,
      ``,
      `⚙️ Recommended Settings:`,
      `   Concurrency: ${result.recommendedSettings.concurrency}`,
      `   Timeout: ${result.recommendedSettings.timeout / 1000}s`,
      `   Protocol Timeout: ${result.recommendedSettings.protocolTimeout / 1000}s`,
      `   Delay Between Pages: ${result.recommendedSettings.delayBetweenPages}ms`,
      `   Wait for Dynamic: ${result.recommendedSettings.waitForDynamic}`,
      ``,
      `⏱️ Scan Duration: ${result.scanDuration}ms`
    ];

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push(`⚠️ Warnings:`);
      result.warnings.forEach(w => lines.push(`   - ${w}`));
    }

    return lines.filter(l => l !== '').join('\n');
  }
}

// Singleton instance
let _preScanner: WebsitePreScanner | null = null;

export function getPreScanner(): WebsitePreScanner {
  if (!_preScanner) {
    _preScanner = new WebsitePreScanner();
  }
  return _preScanner;
}
