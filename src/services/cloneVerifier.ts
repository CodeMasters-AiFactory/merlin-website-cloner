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
  category: 'html' | 'css' | 'js' | 'images' | 'fonts' | 'links' | 'animations' | 'videos' | 'content' | 'resources' | 'styling' | 'scripts';
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

      // Check animations
      const animationChecks = await this.verifyAnimations(htmlFiles);
      checks.push(...animationChecks);

      // Check videos
      const videoChecks = await this.verifyVideos(htmlFiles);
      checks.push(...videoChecks);

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

        const linkPath = this.resolveLocalPath(href.split('#')[0].split('?')[0], htmlDir);
        // Use localPathExists which checks for index.html in directories
        if (await this.localPathExists(linkPath)) {
          working.push(href);
        } else {
          broken.push(href);
        }
      }
    }

    const total = broken.length + working.length;
    // Calculate broken percentage - we want less than 5% broken links for a pass
    const brokenPercentage = total > 0 ? (broken.length / total) * 100 : 0;
    const passed = broken.length === 0 || brokenPercentage <= 5;

    return {
      name: 'Internal Links',
      category: 'links',
      passed,
      message: total === 0
        ? 'No internal links'
        : broken.length === 0
          ? `All ${working.length} internal links valid`
          : `${broken.length}/${total} links broken (${brokenPercentage.toFixed(1)}%)`,
      details: broken.length > 0 ? broken.slice(0, 10).map(b => `✗ Broken: ${b}`) : undefined
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
   * Handles directory-style URLs by checking for index.html
   */
  private resolveLocalPath(ref: string, baseDir: string): string {
    let resolved: string;

    // Handle absolute paths from root
    if (ref.startsWith('/')) {
      resolved = path.join(this.options.outputDir, ref);
    } else {
      // Handle relative paths
      resolved = path.join(baseDir, ref);
    }

    return resolved;
  }

  /**
   * Check if a local path exists, considering index.html for directories
   */
  private async localPathExists(localPath: string): Promise<boolean> {
    // First, check if the path exists as-is
    if (await fs.pathExists(localPath)) {
      return true;
    }

    // If it doesn't have an extension, it might be a directory-style link
    // Check for index.html inside
    const ext = path.extname(localPath);
    if (!ext) {
      // Try path/index.html
      const indexPath = path.join(localPath, 'index.html');
      if (await fs.pathExists(indexPath)) {
        return true;
      }

      // Try path.html (in case page was saved as about.html instead of about/index.html)
      const htmlPath = localPath + '.html';
      if (await fs.pathExists(htmlPath)) {
        return true;
      }
    }

    // Handle self-referential paths like "./about/index.html" from "about/index.html"
    // This happens when a page links to itself using its own pathname
    // e.g., the resolved path might be "jeton-test/about/about/index.html" but should check "jeton-test/about/index.html"
    if (localPath.includes('/index.html')) {
      // Get the directory containing the target index.html
      const targetDir = path.dirname(localPath);
      const parentDir = path.dirname(targetDir);
      const targetDirName = path.basename(targetDir);

      // Check if parent directory has the same name as target subdirectory
      // This would indicate a self-referential link pattern
      const parentName = path.basename(parentDir);
      if (parentName === targetDirName) {
        // Try the parent's index.html instead
        const parentIndexPath = path.join(parentDir, 'index.html');
        if (await fs.pathExists(parentIndexPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Verify CSS animations are captured
   */
  private async verifyAnimations(htmlFiles: string[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    let keyframesFound = 0;
    let animationRulesFound = 0;
    let merlinStylesFound = false;
    const details: string[] = [];

    for (const htmlFile of htmlFiles) {
      try {
        const content = await fs.readFile(htmlFile, 'utf-8');

        // Check for Merlin captured styles
        if (content.includes('data-merlin="captured-styles"')) {
          merlinStylesFound = true;
          details.push('✓ Merlin animation capture enabled');
        }

        // Count @keyframes
        const keyframeMatches = content.match(/@keyframes\s+[\w-]+/gi) || [];
        keyframesFound += keyframeMatches.length;

        // Count animation rules
        const animationMatches = content.match(/animation\s*:/gi) || [];
        animationRulesFound += animationMatches.length;

      } catch {
        // Ignore read errors
      }
    }

    // Also check CSS files in assets
    const cssDir = path.join(this.options.outputDir, 'assets', 'css');
    if (await fs.pathExists(cssDir)) {
      const cssFiles = await this.findFiles(cssDir, '.css');
      for (const cssFile of cssFiles) {
        try {
          const content = await fs.readFile(cssFile, 'utf-8');
          const keyframeMatches = content.match(/@keyframes\s+[\w-]+/gi) || [];
          keyframesFound += keyframeMatches.length;
          const animationMatches = content.match(/animation\s*:/gi) || [];
          animationRulesFound += animationMatches.length;
        } catch {
          // Ignore
        }
      }
    }

    if (keyframesFound > 0) {
      details.push(`✓ ${keyframesFound} @keyframes rules captured`);
    }
    if (animationRulesFound > 0) {
      details.push(`✓ ${animationRulesFound} animation rules captured`);
    }

    const hasAnimations = keyframesFound > 0 || animationRulesFound > 0;
    checks.push({
      name: 'CSS Animations',
      category: 'animations',
      passed: hasAnimations || merlinStylesFound,
      message: hasAnimations
        ? `${keyframesFound} keyframes, ${animationRulesFound} animation rules captured`
        : merlinStylesFound
          ? 'Merlin style capture enabled (animations preserved)'
          : 'No CSS animations detected',
      details: details.length > 0 ? details : undefined,
    });

    return checks;
  }

  /**
   * Verify videos are captured
   */
  private async verifyVideos(htmlFiles: string[]): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    let videoElementsFound = 0;
    let videoFilesFound = 0;
    let embeddedVideosFound = 0;
    let thumbnailsFound = 0;
    const details: string[] = [];

    // Check HTML for video elements
    for (const htmlFile of htmlFiles) {
      try {
        const content = await fs.readFile(htmlFile, 'utf-8');
        const $ = cheerio.load(content);

        // Count video elements
        const videos = $('video');
        videoElementsFound += videos.length;

        // Count embedded videos (iframes)
        const youtubeEmbeds = $('iframe[src*="youtube"], iframe[src*="youtu.be"]').length;
        const vimeoEmbeds = $('iframe[src*="vimeo"]').length;
        embeddedVideosFound += youtubeEmbeds + vimeoEmbeds;

        // Check for Merlin video placeholders
        const placeholders = $('.merlin-video-placeholder').length;
        if (placeholders > 0) {
          details.push(`✓ ${placeholders} video placeholders created`);
        }

      } catch {
        // Ignore read errors
      }
    }

    // Check for downloaded video files
    const videoDir = path.join(this.options.outputDir, 'assets', 'videos');
    if (await fs.pathExists(videoDir)) {
      try {
        const files = await fs.readdir(videoDir);
        videoFilesFound = files.filter(f =>
          f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.ogg')
        ).length;
        if (videoFilesFound > 0) {
          details.push(`✓ ${videoFilesFound} video files downloaded`);
        }
      } catch {
        // Ignore
      }
    }

    // Check for video thumbnails
    const thumbnailDir = path.join(this.options.outputDir, 'assets', 'video-thumbnails');
    if (await fs.pathExists(thumbnailDir)) {
      try {
        const files = await fs.readdir(thumbnailDir);
        thumbnailsFound = files.length;
        if (thumbnailsFound > 0) {
          details.push(`✓ ${thumbnailsFound} video thumbnails captured`);
        }
      } catch {
        // Ignore
      }
    }

    // Check for embedded videos manifest
    const manifestPath = path.join(this.options.outputDir, 'assets', 'embedded-videos.json');
    if (await fs.pathExists(manifestPath)) {
      details.push('✓ Embedded videos manifest created');
    }

    const totalVideos = videoElementsFound + embeddedVideosFound;
    const capturedContent = videoFilesFound + thumbnailsFound;

    checks.push({
      name: 'Video Content',
      category: 'videos',
      passed: totalVideos === 0 || capturedContent > 0,
      message: totalVideos === 0
        ? 'No videos detected on page'
        : capturedContent > 0
          ? `${videoFilesFound} videos, ${thumbnailsFound} thumbnails captured`
          : `${totalVideos} videos detected but not captured`,
      details: details.length > 0 ? details : undefined,
    });

    return checks;
  }
}

/**
 * Quick verification function
 */
export async function verifyClone(outputDir: string, baseUrl: string): Promise<VerificationResult> {
  const verifier = new CloneVerifier({ outputDir, baseUrl });
  return verifier.verify();
}
