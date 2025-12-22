/**
 * Clone Verification Service
 * Automatically tests cloned websites to ensure they work offline
 */

import fs from 'fs-extra';
import * as path from 'path';
import * as cheerio from 'cheerio';

export interface VerificationResult {
  passed: boolean;
  score: number; // 0-100
  checks: VerificationCheck[];
  summary: string;
  timestamp: string;
}

export interface VerificationCheck {
  name: string;
  category: 'html' | 'css' | 'js' | 'images' | 'fonts' | 'links';
  passed: boolean;
  message: string;
  details?: string[];
}

export interface VerificationOptions {
  outputDir: string;
  baseUrl: string;
  strictMode?: boolean; // Fail on any missing asset
}

export class CloneVerifier {
  private options: VerificationOptions;

  constructor(options: VerificationOptions) {
    this.options = options;
  }

  /**
   * Run full verification on a cloned site
   */
  async verify(): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    const startTime = Date.now();

    try {
      // Find all HTML files
      const htmlFiles = await this.findFiles(this.options.outputDir, '.html');

      if (htmlFiles.length === 0) {
        return {
          passed: false,
          score: 0,
          checks: [{
            name: 'HTML Files',
            category: 'html',
            passed: false,
            message: 'No HTML files found in clone'
          }],
          summary: 'Clone verification failed: No HTML files found',
          timestamp: new Date().toISOString()
        };
      }

      // Check each HTML file
      for (const htmlFile of htmlFiles) {
        const htmlChecks = await this.verifyHtmlFile(htmlFile);
        checks.push(...htmlChecks);
      }

      // Check assets directory
      const assetChecks = await this.verifyAssets();
      checks.push(...assetChecks);

      // Calculate overall score
      const passedChecks = checks.filter(c => c.passed).length;
      const totalChecks = checks.length;
      const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

      // Determine if passed based on critical checks
      const criticalChecks = checks.filter(c =>
        c.category === 'html' || c.category === 'css' || c.category === 'js'
      );
      const criticalPassed = criticalChecks.every(c => c.passed);
      const passed = this.options.strictMode ? score === 100 : (score >= 70 && criticalPassed);

      // Generate summary
      const failedChecks = checks.filter(c => !c.passed);
      let summary = '';
      if (passed) {
        summary = `✅ Clone verified successfully! Score: ${score}%`;
        if (failedChecks.length > 0) {
          summary += ` (${failedChecks.length} minor issues)`;
        }
      } else {
        summary = `⚠️ Clone has issues. Score: ${score}%`;
        if (failedChecks.length > 0) {
          summary += ` - ${failedChecks.length} failed checks`;
        }
      }

      return {
        passed,
        score,
        checks,
        summary,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        passed: false,
        score: 0,
        checks: [{
          name: 'Verification Error',
          category: 'html',
          passed: false,
          message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        summary: 'Clone verification encountered an error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify a single HTML file
   */
  private async verifyHtmlFile(htmlPath: string): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const relativePath = path.relative(this.options.outputDir, htmlPath);

    try {
      const content = await fs.readFile(htmlPath, 'utf-8');
      const $ = cheerio.load(content);

      // Check 1: HTML is valid (has basic structure)
      const hasDoctype = content.toLowerCase().includes('<!doctype html');
      const hasHtml = $('html').length > 0;
      const hasHead = $('head').length > 0;
      const hasBody = $('body').length > 0;

      checks.push({
        name: `HTML Structure: ${relativePath}`,
        category: 'html',
        passed: hasDoctype && hasHtml && hasHead && hasBody,
        message: hasDoctype && hasHtml && hasHead && hasBody
          ? 'Valid HTML structure'
          : 'Invalid HTML structure',
        details: [
          hasDoctype ? '✓ DOCTYPE' : '✗ Missing DOCTYPE',
          hasHtml ? '✓ <html>' : '✗ Missing <html>',
          hasHead ? '✓ <head>' : '✗ Missing <head>',
          hasBody ? '✓ <body>' : '✗ Missing <body>'
        ]
      });

      // Check 2: CSS references exist locally
      const cssCheck = await this.verifyCssReferences($, htmlPath);
      checks.push(cssCheck);

      // Check 3: JS references exist locally
      const jsCheck = await this.verifyJsReferences($, htmlPath);
      checks.push(jsCheck);

      // Check 4: Image references exist locally
      const imgCheck = await this.verifyImageReferences($, htmlPath);
      checks.push(imgCheck);

      // Check 5: No broken internal links
      const linkCheck = await this.verifyInternalLinks($, htmlPath);
      checks.push(linkCheck);

    } catch (error) {
      checks.push({
        name: `HTML Read: ${relativePath}`,
        category: 'html',
        passed: false,
        message: `Failed to read HTML: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return checks;
  }

  /**
   * Verify CSS file references
   */
  private async verifyCssReferences($: cheerio.CheerioAPI, htmlPath: string): Promise<VerificationCheck> {
    const cssLinks = $('link[rel="stylesheet"]');
    const htmlDir = path.dirname(htmlPath);
    const missing: string[] = [];
    const found: string[] = [];

    for (let i = 0; i < cssLinks.length; i++) {
      const href = $(cssLinks[i]).attr('href');
      if (href && !this.isExternalUrl(href) && !href.startsWith('data:')) {
        const cssPath = this.resolveLocalPath(href, htmlDir);
        if (await fs.pathExists(cssPath)) {
          found.push(href);
        } else {
          missing.push(href);
        }
      }
    }

    // Also check inline <style> tags with @import
    const styleTags = $('style');
    for (let i = 0; i < styleTags.length; i++) {
      const styleContent = $(styleTags[i]).html() || '';
      const imports = styleContent.match(/@import\s+(?:url\s*\()?\s*['"]?([^'"\)]+)['"]?\s*\)?/gi);
      if (imports) {
        for (const imp of imports) {
          const urlMatch = imp.match(/['"]([^'"]+)['"]/);
          if (urlMatch && !this.isExternalUrl(urlMatch[1])) {
            const cssPath = this.resolveLocalPath(urlMatch[1], htmlDir);
            if (await fs.pathExists(cssPath)) {
              found.push(urlMatch[1]);
            } else {
              missing.push(urlMatch[1]);
            }
          }
        }
      }
    }

    const total = found.length + missing.length;
    return {
      name: 'CSS Dependencies',
      category: 'css',
      passed: missing.length === 0,
      message: total === 0
        ? 'No CSS files referenced'
        : missing.length === 0
          ? `All ${found.length} CSS files found`
          : `${missing.length}/${total} CSS files missing`,
      details: missing.length > 0 ? missing.map(m => `✗ Missing: ${m}`) : found.map(f => `✓ ${f}`)
    };
  }

  /**
   * Verify JS file references
   */
  private async verifyJsReferences($: cheerio.CheerioAPI, htmlPath: string): Promise<VerificationCheck> {
    const scripts = $('script[src]');
    const htmlDir = path.dirname(htmlPath);
    const missing: string[] = [];
    const found: string[] = [];

    for (let i = 0; i < scripts.length; i++) {
      const src = $(scripts[i]).attr('src');
      if (src && !this.isExternalUrl(src) && !src.startsWith('data:')) {
        const jsPath = this.resolveLocalPath(src, htmlDir);
        if (await fs.pathExists(jsPath)) {
          found.push(src);
        } else {
          missing.push(src);
        }
      }
    }

    const total = found.length + missing.length;
    return {
      name: 'JavaScript Dependencies',
      category: 'js',
      passed: missing.length === 0,
      message: total === 0
        ? 'No JS files referenced'
        : missing.length === 0
          ? `All ${found.length} JS files found`
          : `${missing.length}/${total} JS files missing`,
      details: missing.length > 0 ? missing.map(m => `✗ Missing: ${m}`) : found.map(f => `✓ ${f}`)
    };
  }

  /**
   * Verify image references
   */
  private async verifyImageReferences($: cheerio.CheerioAPI, htmlPath: string): Promise<VerificationCheck> {
    const images = $('img[src]');
    const htmlDir = path.dirname(htmlPath);
    const missing: string[] = [];
    const found: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const src = $(images[i]).attr('src');
      if (src && !this.isExternalUrl(src) && !src.startsWith('data:')) {
        const imgPath = this.resolveLocalPath(src, htmlDir);
        if (await fs.pathExists(imgPath)) {
          found.push(src);
        } else {
          missing.push(src);
        }
      }
    }

    // Also check background images in inline styles
    const elementsWithStyle = $('[style*="background"]');
    for (let i = 0; i < elementsWithStyle.length; i++) {
      const style = $(elementsWithStyle[i]).attr('style') || '';
      const urlMatch = style.match(/url\s*\(\s*['"]?([^'"\)]+)['"]?\s*\)/i);
      if (urlMatch && !this.isExternalUrl(urlMatch[1]) && !urlMatch[1].startsWith('data:')) {
        const imgPath = this.resolveLocalPath(urlMatch[1], htmlDir);
        if (await fs.pathExists(imgPath)) {
          found.push(urlMatch[1]);
        } else {
          missing.push(urlMatch[1]);
        }
      }
    }

    const total = found.length + missing.length;
    return {
      name: 'Image Assets',
      category: 'images',
      passed: missing.length === 0 || missing.length <= Math.ceil(total * 0.1), // Allow 10% missing
      message: total === 0
        ? 'No images referenced'
        : missing.length === 0
          ? `All ${found.length} images found`
          : `${missing.length}/${total} images missing`,
      details: missing.length > 0 ? missing.slice(0, 10).map(m => `✗ Missing: ${m}`) : undefined
    };
  }

  /**
   * Verify internal links
   */
  private async verifyInternalLinks($: cheerio.CheerioAPI, htmlPath: string): Promise<VerificationCheck> {
    const links = $('a[href]');
    const htmlDir = path.dirname(htmlPath);
    const broken: string[] = [];
    const working: string[] = [];

    for (let i = 0; i < links.length; i++) {
      const href = $(links[i]).attr('href');
      if (href &&
          !this.isExternalUrl(href) &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:') &&
          !href.startsWith('javascript:') &&
          !href.startsWith('data:')) {

        const linkPath = this.resolveLocalPath(href.split('#')[0], htmlDir);
        if (await fs.pathExists(linkPath)) {
          working.push(href);
        } else {
          broken.push(href);
        }
      }
    }

    const total = broken.length + working.length;
    return {
      name: 'Internal Links',
      category: 'links',
      passed: broken.length === 0 || broken.length <= Math.ceil(total * 0.2), // Allow 20% broken
      message: total === 0
        ? 'No internal links'
        : broken.length === 0
          ? `All ${working.length} internal links valid`
          : `${broken.length}/${total} links broken`,
      details: broken.length > 0 ? broken.slice(0, 5).map(b => `✗ Broken: ${b}`) : undefined
    };
  }

  /**
   * Verify assets directory structure
   */
  private async verifyAssets(): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const assetsDir = path.join(this.options.outputDir, 'assets');

    if (!await fs.pathExists(assetsDir)) {
      // No assets directory - might be okay for simple sites
      return [{
        name: 'Assets Directory',
        category: 'images',
        passed: true,
        message: 'No assets directory (may be inline or no assets needed)'
      }];
    }

    // Check CSS files
    const cssDir = path.join(assetsDir, 'css');
    if (await fs.pathExists(cssDir)) {
      const cssFiles = await this.findFiles(cssDir, '.css');
      const validCss = await this.validateCssFiles(cssFiles);
      checks.push({
        name: 'CSS Files Valid',
        category: 'css',
        passed: validCss.invalid.length === 0,
        message: validCss.invalid.length === 0
          ? `${validCss.valid.length} CSS files valid`
          : `${validCss.invalid.length} CSS files have issues`,
        details: validCss.invalid.length > 0 ? validCss.invalid : undefined
      });
    }

    // Check JS files
    const jsDir = path.join(assetsDir, 'js');
    if (await fs.pathExists(jsDir)) {
      const jsFiles = await this.findFiles(jsDir, '.js');
      checks.push({
        name: 'JavaScript Files',
        category: 'js',
        passed: true,
        message: `${jsFiles.length} JavaScript files captured`
      });
    }

    // Check font files
    const fontsDir = path.join(assetsDir, 'fonts');
    if (await fs.pathExists(fontsDir)) {
      const fontFiles = await fs.readdir(fontsDir);
      checks.push({
        name: 'Font Files',
        category: 'fonts',
        passed: fontFiles.length > 0,
        message: `${fontFiles.length} font files captured`
      });
    }

    return checks;
  }

  /**
   * Validate CSS files for common issues
   */
  private async validateCssFiles(cssFiles: string[]): Promise<{ valid: string[], invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const cssFile of cssFiles) {
      try {
        const content = await fs.readFile(cssFile, 'utf-8');
        // Basic check: file has content and looks like CSS
        if (content.length > 0 && (content.includes('{') || content.includes('@'))) {
          valid.push(path.basename(cssFile));
        } else {
          invalid.push(`${path.basename(cssFile)}: Empty or invalid CSS`);
        }
      } catch {
        invalid.push(`${path.basename(cssFile)}: Could not read`);
      }
    }

    return { valid, invalid };
  }

  /**
   * Helper: Find files with specific extension
   */
  private async findFiles(dir: string, ext: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (directory: string) => {
      try {
        // Normalize the path for the current OS
        const normalizedDir = path.normalize(directory);

        if (!await fs.pathExists(normalizedDir)) {
          return;
        }

        const entries = await fs.readdir(normalizedDir);
        for (const entry of entries) {
          const fullPath = path.join(normalizedDir, entry);
          try {
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
              await walk(fullPath);
            } else if (entry.endsWith(ext)) {
              files.push(fullPath);
            }
          } catch {
            // Skip files we can't stat
          }
        }
      } catch (err) {
        // Ignore directory read errors
        console.error(`[CloneVerifier] Error reading directory ${directory}:`, err);
      }
    };

    await walk(dir);
    return files;
  }

  /**
   * Helper: Check if URL is external
   */
  private isExternalUrl(url: string): boolean {
    return url.startsWith('http://') ||
           url.startsWith('https://') ||
           url.startsWith('//');
  }

  /**
   * Helper: Resolve local path from href/src
   */
  private resolveLocalPath(ref: string, baseDir: string): string {
    // Handle absolute paths from root
    if (ref.startsWith('/')) {
      return path.join(this.options.outputDir, ref);
    }
    // Handle relative paths
    return path.join(baseDir, ref);
  }
}

/**
 * Quick verification function
 */
export async function verifyClone(outputDir: string, baseUrl: string): Promise<VerificationResult> {
  const verifier = new CloneVerifier({ outputDir, baseUrl });
  return verifier.verify();
}
