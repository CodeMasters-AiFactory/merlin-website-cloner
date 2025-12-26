/**
 * Computed Style Capture
 * Captures JavaScript-applied styles from rendered DOM elements
 * Essential for CSS-in-JS frameworks (React, styled-components, emotion)
 */

import type { Page } from 'puppeteer';

export interface ComputedStyleResult {
  injectableCSS: string;
  elementsProcessed: number;
  rulesGenerated: number;
  criticalStyles: string[];
}

// Visual properties we want to capture
const VISUAL_PROPERTIES = [
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'float', 'clear', 'flex', 'flex-direction', 'flex-wrap', 'justify-content',
  'align-items', 'align-content', 'order', 'flex-grow', 'flex-shrink', 'flex-basis',
  'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
  'grid-gap', 'gap', 'grid-area', 'grid-column', 'grid-row',

  // Box model
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'box-sizing', 'overflow', 'overflow-x', 'overflow-y',

  // Visual
  'background', 'background-color', 'background-image', 'background-size',
  'background-position', 'background-repeat', 'background-attachment',
  'border', 'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-shadow', 'outline', 'opacity', 'visibility',

  // Typography
  'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-align', 'text-decoration',
  'text-transform', 'white-space', 'word-wrap', 'word-break',

  // Transform & Animation
  'transform', 'transform-origin', 'perspective', 'perspective-origin',
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',

  // Filters & Effects
  'filter', 'backdrop-filter', 'mix-blend-mode', 'clip-path', 'mask',

  // Other
  'cursor', 'pointer-events', 'user-select', 'object-fit', 'object-position',
];

// Default values to skip (browser defaults)
const DEFAULT_VALUES: Record<string, string[]> = {
  'display': ['inline', 'block'], // Only capture if it's flex, grid, etc.
  'position': ['static'],
  'opacity': ['1'],
  'visibility': ['visible'],
  'z-index': ['auto'],
  'transform': ['none'],
  'filter': ['none'],
  'backdrop-filter': ['none'],
  'animation': ['none'],
  'transition': ['none', 'all 0s ease 0s'],
  'box-shadow': ['none'],
  'background-image': ['none'],
};

export class ComputedStyleCapture {
  /**
   * Capture computed styles from all visible elements
   */
  async captureStyles(page: Page): Promise<ComputedStyleResult> {
    const result = await page.evaluate((props: string[], defaults: Record<string, string[]>) => {
      const rules: Map<string, Set<string>> = new Map();
      const criticalStyles: string[] = [];
      let elementsProcessed = 0;

      // Generate unique selector for element (defined first to avoid hoisting issues)
      const generateUniqueSelector = (el: Element): string | null => {
        // Use ID if available and unique
        if (el.id) {
          return `#${CSS.escape(el.id)}`;
        }

        // Use class if available and specific enough
        if (el.classList.length > 0) {
          const classes = Array.from(el.classList)
            .filter(c => c && !c.includes(':') && !c.match(/^\d/))
            .map(c => CSS.escape(c))
            .join('.');

          if (classes && document.querySelectorAll(`.${classes.replace(/\./g, '.')}`).length === 1) {
            return `.${classes}`;
          }
        }

        // Use tag + nth-child
        const parent = el.parentElement;
        if (!parent) return el.tagName.toLowerCase();

        const children = Array.from(parent.children);
        const index = children.indexOf(el) + 1;
        const tagName = el.tagName.toLowerCase();

        const parentSelector = generateUniqueSelector(parent);
        if (parentSelector) {
          return `${parentSelector} > ${tagName}:nth-child(${index})`;
        }

        return null;
      };

      // Get all elements in the DOM
      const allElements = document.querySelectorAll('*');

      // Process each element
      allElements.forEach((element) => {
        const el = element as HTMLElement;

        // Skip hidden elements
        if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
          return;
        }

        // Skip script and style elements
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'].includes(el.tagName)) {
          return;
        }

        elementsProcessed++;

        // Generate unique selector for this element
        const selector = generateUniqueSelector(el);
        if (!selector) return;

        // Get computed styles
        const computed = window.getComputedStyle(el);
        const styles: string[] = [];

        // Check each visual property
        for (const prop of props) {
          const value = computed.getPropertyValue(prop);
          if (!value || value === '') continue;

          // Skip default values
          const propDefaults = defaults[prop];
          if (propDefaults && propDefaults.includes(value)) continue;

          // Skip inherited text properties for non-text elements
          const textProps = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];
          if (textProps.includes(prop) && !el.textContent?.trim()) continue;

          // Skip if it matches the parent's value (inherited)
          const parent = el.parentElement;
          if (parent) {
            const parentComputed = window.getComputedStyle(parent);
            const parentValue = parentComputed.getPropertyValue(prop);
            if (value === parentValue && !['position', 'display', 'z-index'].includes(prop)) {
              continue;
            }
          }

          styles.push(`${prop}: ${value}`);
        }

        // Only add if we found unique styles
        if (styles.length > 0) {
          if (!rules.has(selector)) {
            rules.set(selector, new Set());
          }
          styles.forEach(s => rules.get(selector)!.add(s));

          // Track critical styles (animations, transforms)
          if (styles.some(s => s.includes('animation') || s.includes('transform') || s.includes('transition'))) {
            criticalStyles.push(`${selector} { ${styles.join('; ')} }`);
          }
        }
      });

      // Convert map to CSS rules
      const cssRules: string[] = [];
      rules.forEach((styles, selector) => {
        if (styles.size > 0) {
          cssRules.push(`${selector} { ${Array.from(styles).join('; ')}; }`);
        }
      });

      return {
        cssRules,
        criticalStyles,
        elementsProcessed,
        rulesGenerated: cssRules.length,
      };
    }, VISUAL_PROPERTIES, DEFAULT_VALUES);

    // Generate injectable CSS
    const injectableCSS = this.generateInjectableCSS(result.cssRules);

    return {
      injectableCSS,
      elementsProcessed: result.elementsProcessed,
      rulesGenerated: result.rulesGenerated,
      criticalStyles: result.criticalStyles,
    };
  }

  /**
   * Capture critical above-the-fold styles
   */
  async captureCriticalStyles(page: Page, viewportHeight: number = 900): Promise<string> {
    const result = await page.evaluate((height: number, props: string[]) => {
      const rules: string[] = [];

      // Get elements in viewport
      const elements = document.querySelectorAll('*');

      elements.forEach((element) => {
        const el = element as HTMLElement;
        const rect = el.getBoundingClientRect();

        // Only process above-the-fold elements
        if (rect.top > height || rect.bottom < 0) return;
        if (el.offsetParent === null && el.tagName !== 'BODY') return;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) return;

        const computed = window.getComputedStyle(el);
        const selector = el.id ? `#${el.id}` :
                        el.className ? `.${Array.from(el.classList).join('.')}` :
                        el.tagName.toLowerCase();

        const criticalProps = [
          'display', 'position', 'width', 'height', 'margin', 'padding',
          'background', 'background-color', 'color', 'font-size', 'font-family',
          'transform', 'opacity', 'animation', 'flex', 'grid'
        ];

        const styles: string[] = [];
        criticalProps.forEach(prop => {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
            styles.push(`${prop}: ${value}`);
          }
        });

        if (styles.length > 0) {
          rules.push(`${selector} { ${styles.join('; ')}; }`);
        }
      });

      return rules;
    }, viewportHeight, VISUAL_PROPERTIES);

    return `/* Critical Above-the-fold Styles */\n${result.join('\n')}`;
  }

  /**
   * Generate injectable CSS from captured rules
   */
  private generateInjectableCSS(rules: string[]): string {
    if (rules.length === 0) return '';

    const parts: string[] = [
      '/* === MERLIN: Computed Styles Capture === */',
      '/* These styles were computed at render time to preserve JS-applied styles */',
      '',
      ...rules,
      '',
      '/* === End MERLIN Computed Styles === */'
    ];

    return parts.join('\n');
  }
}

// Export singleton instance
export const computedStyleCapture = new ComputedStyleCapture();
