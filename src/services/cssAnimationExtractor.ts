/**
 * CSS Animation Extractor
 * Captures @keyframes, animations, and transitions from all stylesheets
 * Critical for achieving 95%+ visual fidelity in clones
 */

import type { Page } from 'puppeteer';
import fetch from 'node-fetch';

export interface AnimationExtractionResult {
  keyframes: string[];
  animationRules: string[];
  transitionRules: string[];
  cssVariables: string[];
  injectableCSS: string;
  stats: {
    keyframesCount: number;
    animationsCount: number;
    transitionsCount: number;
    variablesCount: number;
    stylesheetsProcessed: number;
    crossOriginFetched: number;
  };
}

export class CSSAnimationExtractor {
  private processedUrls: Set<string> = new Set();
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Extract all CSS animations from a page
   */
  async extractAnimations(page: Page, baseUrl: string): Promise<AnimationExtractionResult> {
    const keyframes: string[] = [];
    const animationRules: string[] = [];
    const transitionRules: string[] = [];
    const cssVariables: string[] = [];
    let stylesheetsProcessed = 0;
    let crossOriginFetched = 0;

    try {
      // 1. Extract from inline <style> tags
      const inlineStyles = await page.evaluate(() => {
        const styles: string[] = [];
        document.querySelectorAll('style').forEach(style => {
          if (style.textContent) {
            styles.push(style.textContent);
          }
        });
        return styles;
      });

      for (const css of inlineStyles) {
        this.extractFromCSS(css, keyframes, animationRules, transitionRules, cssVariables);
        stylesheetsProcessed++;
      }

      // 2. Extract from linked stylesheets
      const stylesheetUrls = await page.evaluate(() => {
        const urls: string[] = [];
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
          const href = link.getAttribute('href');
          if (href) urls.push(href);
        });
        return urls;
      });

      for (const href of stylesheetUrls) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (this.processedUrls.has(absoluteUrl)) continue;
        this.processedUrls.add(absoluteUrl);

        try {
          // Try to get CSS from page context first (same-origin)
          const cssContent = await page.evaluate(async (url) => {
            try {
              for (const sheet of Array.from(document.styleSheets)) {
                if (sheet.href === url) {
                  try {
                    const rules = sheet.cssRules || sheet.rules;
                    if (rules) {
                      return Array.from(rules).map(r => r.cssText).join('\n');
                    }
                  } catch {
                    // Cross-origin, can't access rules
                    return null;
                  }
                }
              }
            } catch {
              return null;
            }
            return null;
          }, absoluteUrl);

          if (cssContent) {
            this.extractFromCSS(cssContent, keyframes, animationRules, transitionRules, cssVariables);
            stylesheetsProcessed++;
          } else {
            // Cross-origin: fetch directly
            const fetched = await this.fetchStylesheet(absoluteUrl);
            if (fetched) {
              this.extractFromCSS(fetched, keyframes, animationRules, transitionRules, cssVariables);
              stylesheetsProcessed++;
              crossOriginFetched++;
            }
          }
        } catch (error) {
          // Silent fail for individual stylesheets
        }
      }

      // 3. Extract from CSSOM (catches dynamically added styles)
      const cssomRules = await page.evaluate(() => {
        const rules: string[] = [];
        try {
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              const cssRules = sheet.cssRules || sheet.rules;
              if (cssRules) {
                for (const rule of Array.from(cssRules)) {
                  // Only extract animation-related rules
                  const text = rule.cssText;
                  if (text.includes('@keyframes') ||
                      text.includes('animation') ||
                      text.includes('transition') ||
                      text.includes('--')) {
                    rules.push(text);
                  }
                }
              }
            } catch {
              // Cross-origin stylesheet
            }
          }
        } catch {
          // CSSOM access failed
        }
        return rules;
      });

      for (const rule of cssomRules) {
        if (rule.startsWith('@keyframes')) {
          if (!keyframes.includes(rule)) {
            keyframes.push(rule);
          }
        } else if (rule.includes('animation')) {
          if (!animationRules.includes(rule)) {
            animationRules.push(rule);
          }
        } else if (rule.includes('transition')) {
          if (!transitionRules.includes(rule)) {
            transitionRules.push(rule);
          }
        }
      }

      // 4. Extract CSS custom properties (variables) from :root
      const rootVariables = await page.evaluate(() => {
        const root = document.documentElement;
        const computed = getComputedStyle(root);
        const vars: string[] = [];

        // Get all CSS custom properties
        for (const prop of Array.from(computed)) {
          if (prop.startsWith('--')) {
            const value = computed.getPropertyValue(prop).trim();
            if (value) {
              vars.push(`${prop}: ${value};`);
            }
          }
        }
        return vars;
      });

      cssVariables.push(...rootVariables.filter(v => !cssVariables.includes(v)));

    } catch (error) {
      console.error('Animation extraction error:', error);
    }

    // Generate injectable CSS
    const injectableCSS = this.generateInjectableCSS(keyframes, animationRules, transitionRules, cssVariables);

    return {
      keyframes,
      animationRules,
      transitionRules,
      cssVariables,
      injectableCSS,
      stats: {
        keyframesCount: keyframes.length,
        animationsCount: animationRules.length,
        transitionsCount: transitionRules.length,
        variablesCount: cssVariables.length,
        stylesheetsProcessed,
        crossOriginFetched,
      },
    };
  }

  /**
   * Extract animation-related rules from CSS text
   */
  private extractFromCSS(
    css: string,
    keyframes: string[],
    animationRules: string[],
    transitionRules: string[],
    cssVariables: string[]
  ): void {
    // Extract @keyframes
    const keyframeRegex = /@keyframes\s+[\w-]+\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/gi;
    const keyframeMatches = css.match(keyframeRegex) || [];
    for (const match of keyframeMatches) {
      const normalized = this.normalizeCSS(match);
      if (!keyframes.some(k => this.normalizeCSS(k) === normalized)) {
        keyframes.push(match);
      }
    }

    // Extract @-webkit-keyframes (for Safari compatibility)
    const webkitKeyframeRegex = /@-webkit-keyframes\s+[\w-]+\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/gi;
    const webkitMatches = css.match(webkitKeyframeRegex) || [];
    for (const match of webkitMatches) {
      const normalized = this.normalizeCSS(match);
      if (!keyframes.some(k => this.normalizeCSS(k) === normalized)) {
        keyframes.push(match);
      }
    }

    // Extract rules with animation properties
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let ruleMatch;
    while ((ruleMatch = ruleRegex.exec(css)) !== null) {
      const selector = ruleMatch[1].trim();
      const declarations = ruleMatch[2];

      // Skip @keyframes rules (already captured)
      if (selector.includes('@keyframes') || selector.includes('@-webkit-keyframes')) {
        continue;
      }

      // Check for animation properties
      if (declarations.includes('animation') && !declarations.includes('animation:none')) {
        const rule = `${selector} { ${declarations} }`;
        const normalized = this.normalizeCSS(rule);
        if (!animationRules.some(r => this.normalizeCSS(r) === normalized)) {
          animationRules.push(rule);
        }
      }

      // Check for transition properties
      if (declarations.includes('transition') && !declarations.includes('transition:none')) {
        const rule = `${selector} { ${declarations} }`;
        const normalized = this.normalizeCSS(rule);
        if (!transitionRules.some(r => this.normalizeCSS(r) === normalized)) {
          transitionRules.push(rule);
        }
      }

      // Check for CSS variables in :root
      if (selector === ':root' && declarations.includes('--')) {
        const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
        let varMatch;
        while ((varMatch = varRegex.exec(declarations)) !== null) {
          const varDecl = `${varMatch[1]}: ${varMatch[2].trim()};`;
          if (!cssVariables.includes(varDecl)) {
            cssVariables.push(varDecl);
          }
        }
      }
    }
  }

  /**
   * Fetch a stylesheet directly (for cross-origin)
   */
  private async fetchStylesheet(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/css,*/*;q=0.1',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('css') && !contentType.includes('text/plain')) {
        return null;
      }

      return await response.text();
    } catch {
      return null;
    }
  }

  /**
   * Resolve relative URL to absolute
   */
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

  /**
   * Normalize CSS for comparison (remove whitespace variations)
   */
  private normalizeCSS(css: string): string {
    return css.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /**
   * Generate injectable CSS string
   */
  private generateInjectableCSS(
    keyframes: string[],
    animationRules: string[],
    transitionRules: string[],
    cssVariables: string[]
  ): string {
    const parts: string[] = [];

    // Add comment header
    parts.push('/* === MERLIN: Extracted CSS Animations === */');

    // Add CSS variables to :root
    if (cssVariables.length > 0) {
      parts.push(':root {');
      parts.push(cssVariables.join('\n  '));
      parts.push('}');
    }

    // Add keyframes
    if (keyframes.length > 0) {
      parts.push('\n/* @keyframes */');
      parts.push(keyframes.join('\n\n'));
    }

    // Add animation rules
    if (animationRules.length > 0) {
      parts.push('\n/* Animation Rules */');
      parts.push(animationRules.join('\n'));
    }

    // Add transition rules
    if (transitionRules.length > 0) {
      parts.push('\n/* Transition Rules */');
      parts.push(transitionRules.join('\n'));
    }

    parts.push('\n/* === End MERLIN Animations === */');

    return parts.join('\n');
  }

  /**
   * Clear processed URLs cache
   */
  clearCache(): void {
    this.processedUrls.clear();
  }
}

// Export singleton instance
export const cssAnimationExtractor = new CSSAnimationExtractor();
