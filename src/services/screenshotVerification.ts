/**
 * Screenshot Verification Service
 * Takes screenshots of original and cloned pages, compares them pixel-by-pixel
 * CRITICAL for disaster recovery verification - PROVES backup is visually correct
 */

import type { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCanvas, loadImage, Image } from 'canvas';
import { createHash } from 'crypto';

export interface ScreenshotConfig {
  viewport: { width: number; height: number };
  fullPage: boolean;
  quality: number;
  format: 'png' | 'jpeg' | 'webp';
  waitTime: number; // ms to wait after page load
}

export interface PageScreenshot {
  url: string;
  localPath: string;
  screenshotPath: string;
  timestamp: string;
  viewport: { width: number; height: number };
  hash: string;
  fileSize: number;
}

export interface VisualComparison {
  originalUrl: string;
  clonedPath: string;
  originalScreenshot: string;
  clonedScreenshot: string;
  diffScreenshot: string;
  diffPercentage: number;
  pixelsDifferent: number;
  totalPixels: number;
  passed: boolean;
  threshold: number;
  issues: string[];
}

export interface VerificationReport {
  jobId: string;
  timestamp: string;
  totalPages: number;
  pagesVerified: number;
  pagesPassed: number;
  pagesFailed: number;
  overallScore: number;
  comparisons: VisualComparison[];
  summary: string;
  certified: boolean;
  certificateHash?: string;
}

const DEFAULT_CONFIG: ScreenshotConfig = {
  viewport: { width: 1920, height: 1080 },
  fullPage: true,
  quality: 90,
  format: 'png',
  waitTime: 2000,
};

// Multiple viewports for responsive testing
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

export class ScreenshotVerification {
  private config: ScreenshotConfig;
  private screenshotDir: string;
  
  constructor(outputDir: string, config: Partial<ScreenshotConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.screenshotDir = path.join(outputDir, 'verification', 'screenshots');
  }

  /**
   * Initialize screenshot directories
   */
  async initialize(): Promise<void> {
    await fs.mkdir(path.join(this.screenshotDir, 'original'), { recursive: true });
    await fs.mkdir(path.join(this.screenshotDir, 'cloned'), { recursive: true });
    await fs.mkdir(path.join(this.screenshotDir, 'diff'), { recursive: true });
    await fs.mkdir(path.join(this.screenshotDir, 'reports'), { recursive: true });
  }

  /**
   * Take screenshot of a live URL (original website)
   */
  async captureOriginal(
    page: Page,
    url: string,
    pageIndex: number,
    onProgress?: (status: string) => void
  ): Promise<PageScreenshot> {
    onProgress?.(`📸 Capturing original: ${url}`);
    
    const filename = this.generateFilename(url, pageIndex, 'original');
    const screenshotPath = path.join(this.screenshotDir, 'original', filename);
    
    // Navigate and wait for content
    await page.setViewport(this.config.viewport);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.waitForPageReady(page);
    
    // Take screenshot
    const buffer = await page.screenshot({
      path: screenshotPath,
      fullPage: this.config.fullPage,
      type: this.config.format,
      quality: this.config.format === 'png' ? undefined : this.config.quality,
    });
    
    const stats = await fs.stat(screenshotPath);
    const hash = createHash('sha256').update(buffer as Buffer).digest('hex');
    
    onProgress?.(`✅ Original captured: ${path.basename(screenshotPath)}`);
    
    return {
      url,
      localPath: '',
      screenshotPath,
      timestamp: new Date().toISOString(),
      viewport: this.config.viewport,
      hash,
      fileSize: stats.size,
    };
  }

  /**
   * Take screenshot of a cloned page (local file)
   */
  async captureCloned(
    page: Page,
    localPath: string,
    originalUrl: string,
    pageIndex: number,
    onProgress?: (status: string) => void
  ): Promise<PageScreenshot> {
    onProgress?.(`📸 Capturing cloned: ${path.basename(localPath)}`);
    
    const filename = this.generateFilename(originalUrl, pageIndex, 'cloned');
    const screenshotPath = path.join(this.screenshotDir, 'cloned', filename);
    
    // Navigate to local file
    await page.setViewport(this.config.viewport);
    const fileUrl = `file://${path.resolve(localPath)}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.waitForPageReady(page);
    
    // Take screenshot
    const buffer = await page.screenshot({
      path: screenshotPath,
      fullPage: this.config.fullPage,
      type: this.config.format,
      quality: this.config.format === 'png' ? undefined : this.config.quality,
    });
    
    const stats = await fs.stat(screenshotPath);
    const hash = createHash('sha256').update(buffer as Buffer).digest('hex');
    
    onProgress?.(`✅ Cloned captured: ${path.basename(screenshotPath)}`);
    
    return {
      url: originalUrl,
      localPath,
      screenshotPath,
      timestamp: new Date().toISOString(),
      viewport: this.config.viewport,
      hash,
      fileSize: stats.size,
    };
  }

  /**
   * Compare two screenshots pixel-by-pixel using pure JavaScript
   */
  async compareScreenshots(
    originalPath: string,
    clonedPath: string,
    threshold: number = 0.05 // 5% difference allowed
  ): Promise<VisualComparison> {
    const issues: string[] = [];
    
    try {
      // Read image files
      const originalBuffer = await fs.readFile(originalPath);
      const clonedBuffer = await fs.readFile(clonedPath);
      
      // Use sharp for image comparison (simpler approach)
      const sharp = await import('sharp');
      
      // Get image metadata
      const originalMeta = await sharp.default(originalBuffer).metadata();
      const clonedMeta = await sharp.default(clonedBuffer).metadata();
      
      // Resize to same dimensions if different
      const width = Math.min(originalMeta.width || 1920, clonedMeta.width || 1920);
      const height = Math.min(originalMeta.height || 1080, clonedMeta.height || 1080);
      
      // Get raw pixel data
      const originalRaw = await sharp.default(originalBuffer)
        .resize(width, height)
        .raw()
        .toBuffer();
      
      const clonedRaw = await sharp.default(clonedBuffer)
        .resize(width, height)
        .raw()
        .toBuffer();
      
      // Compare pixels
      let diffPixels = 0;
      const totalPixels = width * height;
      const diffBuffer = Buffer.alloc(originalRaw.length);
      
      for (let i = 0; i < originalRaw.length; i += 3) {
        const rDiff = Math.abs(originalRaw[i] - clonedRaw[i]);
        const gDiff = Math.abs(originalRaw[i + 1] - clonedRaw[i + 1]);
        const bDiff = Math.abs(originalRaw[i + 2] - clonedRaw[i + 2]);
        
        // If any channel differs by more than 30, count as different
        if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
          diffPixels++;
          // Mark as red in diff image
          diffBuffer[i] = 255;
          diffBuffer[i + 1] = 0;
          diffBuffer[i + 2] = 0;
        } else {
          // Copy original with reduced opacity
          diffBuffer[i] = Math.floor(originalRaw[i] * 0.3);
          diffBuffer[i + 1] = Math.floor(originalRaw[i + 1] * 0.3);
          diffBuffer[i + 2] = Math.floor(originalRaw[i + 2] * 0.3);
        }
      }
      
      // Save diff image
      const diffFilename = path.basename(originalPath).replace('original', 'diff');
      const diffPath = path.join(this.screenshotDir, 'diff', diffFilename);
      
      await sharp.default(diffBuffer, {
        raw: { width, height, channels: 3 }
      })
        .png()
        .toFile(diffPath);
      
      const diffPercentage = (diffPixels / totalPixels) * 100;
      const passed = diffPercentage <= (threshold * 100);
      
      if (!passed) {
        issues.push(`Visual difference: ${diffPercentage.toFixed(2)}% (threshold: ${threshold * 100}%)`);
      }
      
      // Check for size differences
      if (originalMeta.width !== clonedMeta.width || originalMeta.height !== clonedMeta.height) {
        issues.push(`Size mismatch: Original ${originalMeta.width}x${originalMeta.height}, Cloned ${clonedMeta.width}x${clonedMeta.height}`);
      }
      
      return {
        originalUrl: '',
        clonedPath: '',
        originalScreenshot: originalPath,
        clonedScreenshot: clonedPath,
        diffScreenshot: diffPath,
        diffPercentage,
        pixelsDifferent: diffPixels,
        totalPixels,
        passed,
        threshold,
        issues,
      };
    } catch (error) {
      issues.push(`Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        originalUrl: '',
        clonedPath: '',
        originalScreenshot: originalPath,
        clonedScreenshot: clonedPath,
        diffScreenshot: '',
        diffPercentage: 100,
        pixelsDifferent: 0,
        totalPixels: 0,
        passed: false,
        threshold,
        issues,
      };
    }
  }

  /**
   * Run full visual verification on all pages
   */
  async verifyAllPages(
    browser: Browser,
    pages: Array<{ url: string; localPath: string }>,
    onProgress?: (progress: { current: number; total: number; status: string; comparison?: VisualComparison }) => void
  ): Promise<VerificationReport> {
    await this.initialize();
    
    const comparisons: VisualComparison[] = [];
    const page = await browser.newPage();
    
    try {
      for (let i = 0; i < pages.length; i++) {
        const { url, localPath } = pages[i];
        
        onProgress?.({
          current: i + 1,
          total: pages.length,
          status: `Verifying page ${i + 1}/${pages.length}: ${url}`,
        });
        
        // Capture original
        const originalScreenshot = await this.captureOriginal(
          page, url, i,
          (status) => onProgress?.({ current: i + 1, total: pages.length, status })
        );
        
        // Capture cloned
        const clonedScreenshot = await this.captureCloned(
          page, localPath, url, i,
          (status) => onProgress?.({ current: i + 1, total: pages.length, status })
        );
        
        // Compare
        onProgress?.({
          current: i + 1,
          total: pages.length,
          status: `🔍 Comparing screenshots...`,
        });
        
        const comparison = await this.compareScreenshots(
          originalScreenshot.screenshotPath,
          clonedScreenshot.screenshotPath
        );
        
        comparison.originalUrl = url;
        comparison.clonedPath = localPath;
        
        comparisons.push(comparison);
        
        onProgress?.({
          current: i + 1,
          total: pages.length,
          status: comparison.passed 
            ? `✅ Page ${i + 1} verified (${comparison.diffPercentage.toFixed(1)}% diff)`
            : `❌ Page ${i + 1} failed (${comparison.diffPercentage.toFixed(1)}% diff)`,
          comparison,
        });
      }
    } finally {
      await page.close();
    }
    
    // Generate report
    const pagesPassed = comparisons.filter(c => c.passed).length;
    const overallScore = (pagesPassed / comparisons.length) * 100;
    
    const report: VerificationReport = {
      jobId: createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 16),
      timestamp: new Date().toISOString(),
      totalPages: pages.length,
      pagesVerified: comparisons.length,
      pagesPassed,
      pagesFailed: comparisons.length - pagesPassed,
      overallScore,
      comparisons,
      summary: this.generateSummary(comparisons, overallScore),
      certified: overallScore >= 95,
    };
    
    if (report.certified) {
      report.certificateHash = createHash('sha256')
        .update(JSON.stringify(report))
        .digest('hex');
    }
    
    // Save report
    await this.saveReport(report);
    
    return report;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(comparisons: VisualComparison[], score: number): string {
    const passed = comparisons.filter(c => c.passed).length;
    const failed = comparisons.filter(c => !c.passed).length;
    
    if (score >= 95) {
      return `✅ CERTIFIED: ${passed}/${comparisons.length} pages verified with ${score.toFixed(1)}% visual accuracy. Backup is disaster-recovery ready.`;
    } else if (score >= 80) {
      return `⚠️ PARTIAL: ${passed}/${comparisons.length} pages verified. ${failed} pages have visual differences. Review recommended.`;
    } else {
      return `❌ FAILED: Only ${passed}/${comparisons.length} pages match original. Significant visual differences detected. Re-clone recommended.`;
    }
  }

  /**
   * Save verification report
   */
  private async saveReport(report: VerificationReport): Promise<void> {
    const reportPath = path.join(this.screenshotDir, 'reports', `report-${report.jobId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(this.screenshotDir, 'reports', `report-${report.jobId}.html`);
    await fs.writeFile(htmlPath, htmlReport);
  }

  /**
   * Generate HTML report for client viewing
   */
  private generateHtmlReport(report: VerificationReport): string {
    const statusColor = report.certified ? '#22c55e' : report.overallScore >= 80 ? '#f59e0b' : '#ef4444';
    const statusIcon = report.certified ? '✅' : report.overallScore >= 80 ? '⚠️' : '❌';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merlin Backup Verification Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .score { font-size: 4rem; font-weight: bold; }
    .status { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; background: ${statusColor}; color: white; font-weight: 600; margin-top: 1rem; }
    .summary { background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    .card { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .card-header { padding: 1rem; border-bottom: 1px solid #e2e8f0; }
    .card-body { padding: 1rem; }
    .card img { width: 100%; height: auto; }
    .passed { border-left: 4px solid #22c55e; }
    .failed { border-left: 4px solid #ef4444; }
    .meta { font-size: 0.875rem; color: #64748b; }
    .diff-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
    .diff-low { background: #dcfce7; color: #166534; }
    .diff-medium { background: #fef3c7; color: #92400e; }
    .diff-high { background: #fee2e2; color: #991b1b; }
    .certificate { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 2rem; border-radius: 1rem; text-align: center; margin-top: 2rem; }
    .certificate h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .certificate-hash { font-family: monospace; font-size: 0.75rem; opacity: 0.8; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔮 Merlin Backup Verification Report</h1>
      <p class="meta">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
      <div class="score">${report.overallScore.toFixed(1)}%</div>
      <div class="status">${statusIcon} ${report.certified ? 'CERTIFIED' : report.overallScore >= 80 ? 'PARTIAL MATCH' : 'VERIFICATION FAILED'}</div>
    </div>
    
    <div class="summary">
      <h2>Summary</h2>
      <p style="margin-top: 0.5rem;">${report.summary}</p>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 1rem;">
        <div><strong>${report.totalPages}</strong><br><span class="meta">Total Pages</span></div>
        <div><strong>${report.pagesVerified}</strong><br><span class="meta">Verified</span></div>
        <div style="color: #22c55e;"><strong>${report.pagesPassed}</strong><br><span class="meta">Passed</span></div>
        <div style="color: #ef4444;"><strong>${report.pagesFailed}</strong><br><span class="meta">Failed</span></div>
      </div>
    </div>
    
    <h2 style="margin-bottom: 1rem;">Page Comparisons</h2>
    <div class="grid">
      ${report.comparisons.map((c, i) => `
        <div class="card ${c.passed ? 'passed' : 'failed'}">
          <div class="card-header">
            <strong>Page ${i + 1}</strong>
            <span class="diff-badge ${c.diffPercentage < 5 ? 'diff-low' : c.diffPercentage < 20 ? 'diff-medium' : 'diff-high'}">
              ${c.diffPercentage.toFixed(1)}% diff
            </span>
            <p class="meta" style="margin-top: 0.25rem;">${c.originalUrl}</p>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
              <div>
                <p class="meta">Original</p>
                <img src="../original/${path.basename(c.originalScreenshot)}" alt="Original">
              </div>
              <div>
                <p class="meta">Cloned</p>
                <img src="../cloned/${path.basename(c.clonedScreenshot)}" alt="Cloned">
              </div>
              <div>
                <p class="meta">Diff</p>
                <img src="../diff/${path.basename(c.diffScreenshot)}" alt="Diff">
              </div>
            </div>
            ${c.issues.length > 0 ? `<div style="margin-top: 0.5rem; color: #ef4444; font-size: 0.875rem;">${c.issues.join('<br>')}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    ${report.certified ? `
    <div class="certificate">
      <h2>🏆 Disaster Recovery Certified</h2>
      <p>This backup has been verified and is ready for disaster recovery.</p>
      <p class="certificate-hash" style="margin-top: 1rem;">Certificate Hash: ${report.certificateHash}</p>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Wait for page to be fully ready
   */
  private async waitForPageReady(page: Page): Promise<void> {
    // Wait for configured time
    await new Promise(resolve => setTimeout(resolve, this.config.waitTime));
    
    // Wait for no network activity
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', () => resolve());
        }
      });
    });
    
    // Additional wait for lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Generate safe filename from URL
   */
  private generateFilename(url: string, index: number, type: string): string {
    const urlObj = new URL(url);
    const safePath = urlObj.pathname
      .replace(/\//g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50) || 'index';
    
    return `${String(index + 1).padStart(3, '0')}_${type}_${safePath}.${this.config.format}`;
  }
}

export default ScreenshotVerification;
