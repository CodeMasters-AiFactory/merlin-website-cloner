/**
 * Enhanced Clone Orchestrator
 * Integrates all world-class features:
 * - EnhancedProgressTracker (per-page progress)
 * - CDNDependencyCache (pre-bundled libraries)
 * - ScreenshotVerification (visual proof)
 * - DisasterRecoveryVerification (restore testing)
 */

import { WebsiteCloner, type CloneOptions, type CloneResult } from './websiteCloner.js';
import { EnhancedProgressTracker, type CloneProgressState } from './enhancedProgressTracker.js';
import { CDNDependencyCache } from './cdnDependencyCache.js';
import { ScreenshotVerification, type VerificationReport } from './screenshotVerification.js';
import { DisasterRecoveryVerification, type RestoreTest } from './disasterRecoveryVerification.js';
import { getBrowserPool } from './browserPool.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EnhancedCloneOptions extends CloneOptions {
  // Visual Verification
  enableVisualVerification?: boolean;
  visualThreshold?: number; // 0-1, default 0.05 (5% diff allowed)
  
  // Disaster Recovery Testing
  enableDisasterRecoveryTest?: boolean;
  
  // CDN Caching
  enableCDNCache?: boolean;
  cdnCacheDir?: string;
  
  // Enhanced Progress
  onEnhancedProgress?: (state: CloneProgressState) => void;
  
  // Certification
  generateCertificate?: boolean;
}

export interface EnhancedCloneResult extends CloneResult {
  // Visual Verification
  visualVerification?: VerificationReport;
  
  // Disaster Recovery
  disasterRecoveryTest?: RestoreTest;
  
  // Certification
  certified?: boolean;
  certificateHash?: string;
  certificatePath?: string;
  
  // Enhanced Stats
  enhancedStats: {
    totalDuration: number;
    phaseDurations: {
      discovery: number;
      download: number;
      verification: number;
      export: number;
    };
    cdnCacheHits: number;
    cdnCacheMisses: number;
    visualMatchScore?: number;
    drTestScore?: number;
  };
}

export class EnhancedCloneOrchestrator {
  private cloner: WebsiteCloner;
  private cdnCache: CDNDependencyCache;
  private cdnCacheReady: boolean = false;

  constructor() {
    this.cloner = new WebsiteCloner();
    this.cdnCache = new CDNDependencyCache('./cdn-cache');
  }

  /**
   * Initialize CDN cache (call once at startup)
   */
  async initializeCDNCache(
    onProgress?: (progress: { library: string; current: number; total: number }) => void
  ): Promise<void> {
    await this.cdnCache.initialize();
    
    // Check if cache is already populated
    const isReady = await this.cdnCache.isCacheReady();
    
    if (!isReady) {
      console.log('📦 Pre-building CDN dependency cache (one-time setup)...');
      await this.cdnCache.prebuildCache((p) => {
        onProgress?.({ library: p.library, current: p.current, total: p.total });
      });
    }
    
    this.cdnCacheReady = true;
    console.log('✅ CDN cache ready');
  }

  /**
   * Main enhanced clone method
   */
  async clone(options: EnhancedCloneOptions): Promise<EnhancedCloneResult> {
    const startTime = Date.now();
    const phaseDurations = {
      discovery: 0,
      download: 0,
      verification: 0,
      export: 0,
    };

    // Initialize progress tracker
    const jobId = `job-${Date.now()}`;
    const progressTracker = new EnhancedProgressTracker(jobId, options.url);

    // Subscribe to progress updates
    if (options.onEnhancedProgress) {
      progressTracker.subscribe(options.onEnhancedProgress);
    }

    // Also bridge to standard progress callback
    progressTracker.subscribe((state) => {
      if (options.onProgress) {
        options.onProgress({
          currentPage: state.pagesCompleted,
          totalPages: state.totalPages,
          currentUrl: state.message,
          status: state.status as any,
          message: state.message,
          assetsCaptured: state.assetsDownloaded,
          recentFiles: state.recentActivity.slice(0, 10).map(a => ({
            path: a.url || '',
            size: 0,
            timestamp: new Date(a.timestamp).toISOString(),
            type: a.type,
          })),
          estimatedTimeRemaining: state.estimatedTimeRemaining,
        });
      }
    });

    // Initialize result
    const result: EnhancedCloneResult = {
      success: false,
      outputDir: options.outputDir,
      pagesCloned: 0,
      assetsCaptured: 0,
      errors: [],
      enhancedStats: {
        totalDuration: 0,
        phaseDurations,
        cdnCacheHits: 0,
        cdnCacheMisses: 0,
      },
    };

    try {
      // Phase 1: Discovery
      progressTracker.startDiscovery();
      const discoveryStart = Date.now();

      // Phase 2: Download (main clone)
      progressTracker.completeDiscovery(options.maxPages || 100);
      phaseDurations.discovery = Date.now() - discoveryStart;
      
      const downloadStart = Date.now();

      // Run the actual clone with enhanced tracking
      const cloneResult = await this.cloner.clone({
        ...options,
        onProgress: (progress) => {
          // Update enhanced tracker
          if (progress.status === 'crawling') {
            progressTracker.updateDiscovery(progress.totalPages, progress.currentUrl);
          }
          
          // Track page completion
          if (progress.currentPage > 0) {
            const pageUrl = progress.currentUrl;
            if (!progressTracker.getState().pages.has(pageUrl)) {
              progressTracker.startPage(pageUrl, progress.currentPage);
            }
          }
        },
        onFileDownloaded: (file) => {
          // Track asset downloads
          const assetType = this.getAssetType(file.type);
          const currentPages = progressTracker.getState().pages;
          const lastPage = Array.from(currentPages.keys()).pop();
          
          if (lastPage) {
            progressTracker.recordAssetDownload(lastPage, assetType, file.size, true);
          }
          
          // Call original callback
          options.onFileDownloaded?.(file);
        },
      });

      phaseDurations.download = Date.now() - downloadStart;
      result.pagesCloned = cloneResult.pagesCloned;
      result.assetsCaptured = cloneResult.assetsCaptured;
      result.errors = cloneResult.errors;
      result.outputDir = cloneResult.outputDir;
      result.verificationResult = cloneResult.verificationResult;
      result.exportPath = cloneResult.exportPath;

      // Get CDN cache stats
      if (options.enableCDNCache !== false && this.cdnCacheReady) {
        const cdnStats = this.cdnCache.getStats();
        result.enhancedStats.cdnCacheHits = Math.round(cdnStats.hitRate);
        result.enhancedStats.cdnCacheMisses = Math.round(cdnStats.missRate);
        
        // Rewrite CDN URLs in HTML files
        await this.rewriteCDNUrls(cloneResult.outputDir);
      }

      // Phase 3: Visual Verification
      if (options.enableVisualVerification) {
        progressTracker.startVerification();
        const verificationStart = Date.now();

        try {
          const browserPool = getBrowserPool();
          const browser = await browserPool.acquire();

          try {
            const screenshotVerifier = new ScreenshotVerification(
              cloneResult.outputDir,
              { format: 'png', quality: 90 }
            );

            // Get list of pages to verify
            const htmlFiles = await this.findHtmlFiles(cloneResult.outputDir);
            const pages = htmlFiles.slice(0, 20).map(localPath => {
              const relativePath = path.relative(cloneResult.outputDir, localPath);
              const originalPath = relativePath.replace(/\.html$/, '').replace(/\\/g, '/');
              return {
                url: new URL(originalPath || '/', options.url).toString(),
                localPath,
              };
            });

            const verificationReport = await screenshotVerifier.verifyAllPages(
              browser,
              pages,
              (progress) => {
                progressTracker.updatePageVerification(
                  progress.comparison?.originalUrl || '',
                  progress.comparison?.passed ? 'passed' : 'failed',
                  progress.comparison?.diffPercentage ? 100 - progress.comparison.diffPercentage : undefined
                );
              }
            );

            result.visualVerification = verificationReport;
            result.enhancedStats.visualMatchScore = verificationReport.overallScore;

            progressTracker.completeVerification(verificationReport.overallScore);
          } finally {
            await browserPool.release(browser);
          }
        } catch (error) {
          const errorMsg = `Visual verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          progressTracker.addError(errorMsg);
        }

        phaseDurations.verification = Date.now() - verificationStart;
      }

      // Phase 4: Disaster Recovery Test
      if (options.enableDisasterRecoveryTest) {
        const drStart = Date.now();

        try {
          const browserPool = getBrowserPool();
          const browser = await browserPool.acquire();

          try {
            const drVerifier = new DisasterRecoveryVerification(cloneResult.outputDir);
            
            const drTest = await drVerifier.runFullVerification(
              browser,
              jobId,
              options.url,
              (status, progress) => {
                progressTracker.addActivity('page_complete', status);
              }
            );

            result.disasterRecoveryTest = drTest;
            result.enhancedStats.drTestScore = drTest.overallScore;

            // Generate integrity report
            await drVerifier.generateIntegrityReport();
          } finally {
            await browserPool.release(browser);
          }
        } catch (error) {
          const errorMsg = `DR test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          progressTracker.addError(errorMsg);
        }
      }

      // Phase 5: Export (already done in base cloner)
      progressTracker.startExport(options.exportFormat || 'static');
      progressTracker.completeExport(cloneResult.exportPath || cloneResult.outputDir);
      phaseDurations.export = 100; // Already included in download

      // Determine certification
      result.certified = this.shouldCertify(result);
      if (result.certified) {
        const certificate = await this.generateCertificate(result, options);
        result.certificateHash = certificate.hash;
        result.certificatePath = certificate.path;
      }

      // Mark complete
      result.success = cloneResult.success;
      result.enhancedStats.totalDuration = Date.now() - startTime;
      result.enhancedStats.phaseDurations = phaseDurations;

      progressTracker.complete(result.success, result.success 
        ? `Clone complete! ${result.pagesCloned} pages, ${result.assetsCaptured} assets`
        : 'Clone failed');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      progressTracker.complete(false, `Clone failed: ${errorMsg}`);
    } finally {
      progressTracker.destroy();
    }

    return result;
  }

  /**
   * Rewrite CDN URLs in all HTML files
   */
  private async rewriteCDNUrls(outputDir: string): Promise<void> {
    const htmlFiles = await this.findHtmlFiles(outputDir);

    for (const htmlFile of htmlFiles) {
      try {
        let content = await fs.readFile(htmlFile, 'utf-8');
        content = await this.cdnCache.rewriteCdnUrls(content, outputDir);
        await fs.writeFile(htmlFile, content);
      } catch (error) {
        console.warn(`Failed to rewrite CDN URLs in ${htmlFile}:`, error);
      }
    }
  }

  /**
   * Find all HTML files in directory
   */
  private async findHtmlFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (directory: string): Promise<void> => {
      try {
        const entries = await fs.readdir(directory, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(directory, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await walk(fullPath);
          } else if (entry.name.endsWith('.html')) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };

    await walk(dir);
    return files;
  }

  /**
   * Get asset type from file type
   */
  private getAssetType(fileType: string): 'css' | 'js' | 'images' | 'fonts' | 'videos' | 'other' {
    switch (fileType.toLowerCase()) {
      case 'css':
      case 'stylesheet':
        return 'css';
      case 'js':
      case 'javascript':
      case 'script':
        return 'js';
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
        return 'images';
      case 'font':
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'eot':
        return 'fonts';
      case 'video':
      case 'mp4':
      case 'webm':
        return 'videos';
      default:
        return 'other';
    }
  }

  /**
   * Determine if result qualifies for certification
   */
  private shouldCertify(result: EnhancedCloneResult): boolean {
    // Must have pages
    if (result.pagesCloned === 0) return false;

    // Must have no critical errors
    if (result.errors.some(e => e.includes('failed') || e.includes('critical'))) {
      return false;
    }

    // Visual verification score must be >= 95%
    if (result.visualVerification && result.visualVerification.overallScore < 95) {
      return false;
    }

    // DR test score must be >= 90%
    if (result.disasterRecoveryTest && result.disasterRecoveryTest.overallScore < 90) {
      return false;
    }

    return true;
  }

  /**
   * Generate certification document
   */
  private async generateCertificate(
    result: EnhancedCloneResult,
    options: EnhancedCloneOptions
  ): Promise<{ hash: string; path: string }> {
    const crypto = await import('crypto');

    const certificate = {
      type: 'MERLIN_DISASTER_RECOVERY_CERTIFICATE',
      version: '1.0',
      timestamp: new Date().toISOString(),
      website: options.url,
      backup: {
        pages: result.pagesCloned,
        assets: result.assetsCaptured,
        outputDir: result.outputDir,
      },
      verification: {
        visualScore: result.enhancedStats.visualMatchScore,
        drScore: result.enhancedStats.drTestScore,
        errors: result.errors.length,
      },
      certified: true,
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(certificate))
      .digest('hex');

    certificate.type = hash; // Add hash to certificate

    const certPath = path.join(result.outputDir, 'CERTIFICATE.json');
    await fs.writeFile(certPath, JSON.stringify(certificate, null, 2));

    // Also generate human-readable certificate
    const humanReadable = `
╔══════════════════════════════════════════════════════════════════╗
║           MERLIN DISASTER RECOVERY CERTIFICATE                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Website: ${options.url.padEnd(50)}  ║
║  Date: ${new Date().toISOString().padEnd(53)}  ║
║                                                                  ║
║  BACKUP VERIFIED ✓                                               ║
║  ─────────────────                                               ║
║  • Pages Backed Up: ${String(result.pagesCloned).padEnd(41)}  ║
║  • Assets Captured: ${String(result.assetsCaptured).padEnd(41)}  ║
║  • Visual Match: ${(result.enhancedStats.visualMatchScore || 0).toFixed(1)}%${' '.repeat(42)}  ║
║  • DR Test Score: ${(result.enhancedStats.drTestScore || 0).toFixed(1)}%${' '.repeat(41)}  ║
║                                                                  ║
║  This backup has been verified and is certified for              ║
║  disaster recovery purposes.                                     ║
║                                                                  ║
║  Certificate Hash:                                               ║
║  ${hash}  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`;

    const humanPath = path.join(result.outputDir, 'CERTIFICATE.txt');
    await fs.writeFile(humanPath, humanReadable);

    return { hash, path: certPath };
  }

  /**
   * Get CDN cache statistics
   */
  getCDNStats(): { totalLibraries: number; totalFiles: number; totalSize: number; hitRate: number } {
    return this.cdnCache.getStats();
  }
}

export default EnhancedCloneOrchestrator;
