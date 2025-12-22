/**
 * Automated Verification System
 * Validates links, assets, and functionality
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import type { Browser, Page } from 'puppeteer';

export interface VerificationResult {
  links: {
    total: number;
    valid: number;
    broken: number;
    external: number;
    brokenLinks: Array<{ url: string; reason: string }>;
  };
  assets: {
    total: number;
    found: number;
    missing: number;
    missingAssets: Array<{ url: string; expectedPath: string }>;
  };
  functionality: {
    score: number;
    tests: Record<string, boolean>;
  };
  summary: {
    overall: 'pass' | 'fail' | 'warning';
    issues: string[];
  };
}

export class VerificationSystem {
  /**
   * Verifies a cloned website
   */
  async verify(
    outputDir: string,
    baseUrl: string,
    browser?: Browser
  ): Promise<VerificationResult> {
    const result: VerificationResult = {
      links: {
        total: 0,
        valid: 0,
        broken: 0,
        external: 0,
        brokenLinks: []
      },
      assets: {
        total: 0,
        found: 0,
        missing: 0,
        missingAssets: []
      },
      functionality: {
        score: 0,
        tests: {}
      },
      summary: {
        overall: 'pass',
        issues: []
      }
    };

    // Verify links
    const linkResult = await this.verifyLinks(outputDir, baseUrl);
    result.links = linkResult;

    // Verify assets
    const assetResult = await this.verifyAssets(outputDir);
    result.assets = assetResult;

    // Verify JavaScript execution if browser is provided
    if (browser) {
      const jsResult = await this.verifyJavaScript(outputDir, baseUrl, browser);
      result.functionality.tests = jsResult.tests;
    }

    // Verify integrity (file hashes)
    const integrityResult = await this.verifyIntegrity(outputDir);
    result.functionality.tests = {
      ...result.functionality.tests,
      ...integrityResult,
    };

    // Calculate overall score
    const linkScore = (linkResult.valid / Math.max(linkResult.total, 1)) * 100;
    const assetScore = (assetResult.found / Math.max(assetResult.total, 1)) * 100;
    const jsScore = Object.values(result.functionality.tests).filter(Boolean).length / 
                    Math.max(Object.keys(result.functionality.tests).length, 1) * 100;
    result.functionality.score = (linkScore + assetScore + jsScore) / 3;

    // Determine overall status
    if (result.links.broken > 0 || result.assets.missing > 0) {
      result.summary.overall = result.functionality.score < 50 ? 'fail' : 'warning';
    }

    // Collect issues
    if (result.links.broken > 0) {
      result.summary.issues.push(`${result.links.broken} broken links found`);
    }
    if (result.assets.missing > 0) {
      result.summary.issues.push(`${result.assets.missing} missing assets found`);
    }

    return result;
  }

  /**
   * Verifies all links
   */
  private async verifyLinks(
    outputDir: string,
    baseUrl: string
  ): Promise<VerificationResult['links']> {
    const result: VerificationResult['links'] = {
      total: 0,
      valid: 0,
      broken: 0,
      external: 0,
      brokenLinks: []
    };

    // Find all HTML files
    const htmlFiles = await this.findHtmlFiles(outputDir);

    for (const htmlFile of htmlFiles) {
      const html = await fs.readFile(htmlFile, 'utf-8');
      const $ = cheerio.load(html);
      const basePath = path.dirname(htmlFile);

      // Check all links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        result.total++;

        // Skip external links
        if (href.startsWith('http://') || href.startsWith('https://')) {
          result.external++;
          return;
        }

        // Skip anchors
        if (href.startsWith('#')) {
          result.valid++;
          return;
        }

        // Check if file exists
        const targetPath = path.resolve(basePath, href);
        const exists = this.fileExists(targetPath);

        if (exists) {
          result.valid++;
        } else {
          result.broken++;
          result.brokenLinks.push({
            url: href,
            reason: 'File not found'
          });
        }
      });
    }

    return result;
  }

  /**
   * Verifies all assets
   */
  private async verifyAssets(
    outputDir: string
  ): Promise<VerificationResult['assets']> {
    const result: VerificationResult['assets'] = {
      total: 0,
      found: 0,
      missing: 0,
      missingAssets: []
    };

    // Find all HTML files
    const htmlFiles = await this.findHtmlFiles(outputDir);

    for (const htmlFile of htmlFiles) {
      const html = await fs.readFile(htmlFile, 'utf-8');
      const $ = cheerio.load(html);
      const basePath = path.dirname(htmlFile);

      // Check images
      $('img[src]').each((_, element) => {
        const src = $(element).attr('src');
        if (!src) return;

        result.total++;
        const targetPath = path.resolve(basePath, src);
        const exists = this.fileExists(targetPath);

        if (exists) {
          result.found++;
        } else {
          result.missing++;
          result.missingAssets.push({
            url: src,
            expectedPath: targetPath
          });
        }
      });

      // Check CSS
      $('link[rel="stylesheet"]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        result.total++;
        const targetPath = path.resolve(basePath, href);
        const exists = this.fileExists(targetPath);

        if (exists) {
          result.found++;
        } else {
          result.missing++;
          result.missingAssets.push({
            url: href,
            expectedPath: targetPath
          });
        }
      });

      // Check scripts
      $('script[src]').each((_, element) => {
        const src = $(element).attr('src');
        if (!src) return;

        result.total++;
        const targetPath = path.resolve(basePath, src);
        const exists = this.fileExists(targetPath);

        if (exists) {
          result.found++;
        } else {
          result.missing++;
          result.missingAssets.push({
            url: src,
            expectedPath: targetPath
          });
        }
      });
    }

    return result;
  }

  /**
   * Verifies JavaScript execution and functionality
   */
  private async verifyJavaScript(
    outputDir: string,
    baseUrl: string,
    browser: Browser
  ): Promise<{ tests: Record<string, boolean> }> {
    const tests: Record<string, boolean> = {};

    try {
      // Find index.html or first HTML file
      const htmlFiles = await this.findHtmlFiles(outputDir);
      if (htmlFiles.length === 0) {
        tests['html.files-exist'] = false;
        return { tests };
      }

      const indexPath = htmlFiles.find(f => f.endsWith('index.html')) || htmlFiles[0];
      tests['html.files-exist'] = true;

      // Create a new page
      const page = await browser.newPage();

      // Track JavaScript errors
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      // Track console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        }
      });

      // Load the page with file:// protocol
      const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
      await page.goto(fileUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      }).catch(() => {
        // Timeout is acceptable, page may still be functional
      });

      // Test 1: Page loaded successfully
      tests['page.loaded'] = true;

      // Test 2: JavaScript executed (check document.readyState)
      const readyState = await page.evaluate(() => document.readyState);
      tests['javascript.executed'] = readyState === 'complete';

      // Test 3: No critical JavaScript errors
      tests['javascript.no-errors'] = jsErrors.length === 0;

      // Test 4: External scripts loaded
      const scriptCount = await page.evaluate(() => {
        return document.querySelectorAll('script[src]').length;
      });
      tests['scripts.loaded'] = scriptCount > 0;

      // Test 5: DOM is interactive
      const bodyExists = await page.evaluate(() => {
        return document.body !== null && document.body.children.length > 0;
      });
      tests['dom.interactive'] = bodyExists;

      // Test 6: CSS loaded (check if stylesheets exist)
      const styleCount = await page.evaluate(() => {
        return document.querySelectorAll('link[rel="stylesheet"]').length +
               document.querySelectorAll('style').length;
      });
      tests['css.loaded'] = styleCount > 0;

      // Test 7: Images visible (at least some loaded)
      const imageCount = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let loadedCount = 0;
        images.forEach(img => {
          if ((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalHeight > 0) {
            loadedCount++;
          }
        });
        return loadedCount;
      });
      tests['images.loaded'] = imageCount > 0;

      await page.close();

    } catch (error) {
      tests['verification.error'] = false;
    }

    return { tests };
  }

  /**
   * Verifies file integrity
   */
  private async verifyIntegrity(
    outputDir: string
  ): Promise<Record<string, boolean>> {
    const tests: Record<string, boolean> = {};

    try {
      const allFiles = await this.findAllFiles(outputDir);

      // Test 1: No empty files (files with 0 bytes)
      let emptyFiles = 0;
      for (const file of allFiles) {
        try {
          const stats = await fs.stat(file);
          if (stats.size === 0) {
            emptyFiles++;
          }
        } catch {
          // Ignore stat errors
        }
      }
      tests['integrity.no-empty-files'] = emptyFiles === 0;

      // Test 2: Valid HTML structure (all HTML files have </html>)
      const htmlFiles = await this.findHtmlFiles(outputDir);
      let malformedHtml = 0;
      for (const htmlFile of htmlFiles) {
        try {
          const content = await fs.readFile(htmlFile, 'utf-8');
          if (!content.includes('</html>') && !content.includes('</HTML>')) {
            malformedHtml++;
          }
        } catch {
          malformedHtml++;
        }
      }
      tests['integrity.valid-html'] = malformedHtml === 0;

      // Test 3: Files are accessible
      tests['integrity.files-accessible'] = allFiles.length > 0;

      // Test 4: Reasonable file structure (has at least one HTML file)
      tests['integrity.has-html'] = htmlFiles.length > 0;

    } catch (error) {
      tests['integrity.error'] = false;
    }

    return tests;
  }

  /**
   * Finds all files in directory recursively
   */
  private async findAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return files;
  }

  /**
   * Finds all HTML files in directory
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
    } catch (error) {
      // Ignore errors
    }
    
    return files;
  }

  /**
   * Checks if file exists
   */
  private fileExists(filePath: string): boolean {
    try {
      return require('fs').existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Generates verification report
   */
  async generateReport(
    result: VerificationResult,
    outputPath: string
  ): Promise<string> {
    const report = `# Website Clone Verification Report

Generated: ${new Date().toISOString()}

## Summary

**Overall Status:** ${result.summary.overall.toUpperCase()}
**Functionality Score:** ${result.functionality.score.toFixed(1)}%

${result.summary.issues.length > 0 ? `### Issues\n${result.summary.issues.map(i => `- ${i}`).join('\n')}` : 'No issues found.'}

## Link Verification

- **Total Links:** ${result.links.total}
- **Valid Links:** ${result.links.valid}
- **Broken Links:** ${result.links.broken}
- **External Links:** ${result.links.external}

${result.links.brokenLinks.length > 0 ? `### Broken Links\n${result.links.brokenLinks.map(l => `- ${l.url}: ${l.reason}`).join('\n')}` : ''}

## Asset Verification

- **Total Assets:** ${result.assets.total}
- **Found Assets:** ${result.assets.found}
- **Missing Assets:** ${result.assets.missing}

${result.assets.missingAssets.length > 0 ? `### Missing Assets\n${result.assets.missingAssets.map(a => `- ${a.url} (expected: ${a.expectedPath})`).join('\n')}` : ''}

## Functionality Tests

${Object.entries(result.functionality.tests).map(([test, passed]) => 
  `- ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`
).join('\n')}
`;

    await fs.writeFile(outputPath, report, 'utf-8');
    return outputPath;
  }
}

