/**
 * JavaScript Execution Verification
 * Verifies JavaScript works and captures dynamic content
 */

import type { Page } from 'puppeteer';

export interface JSVerificationResult {
  executed: boolean;
  errors: string[];
  dynamicContent: string[];
  executionTime: number;
  functionalityScore: number;
}

export class JSVerification {
  /**
   * Verifies JavaScript execution
   */
  async verifyExecution(page: Page): Promise<JSVerificationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const dynamicContent: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait for JavaScript to execute
    await page.waitForTimeout(3000);

    // Check for dynamic content
    const content = await page.evaluate(() => {
      const dynamic: string[] = [];

      // Check for dynamically loaded content
      const scripts = Array.from(document.querySelectorAll('script'));
      scripts.forEach(script => {
        if (script.src && !script.src.startsWith('data:')) {
          dynamic.push(script.src);
        }
      });

      // Check for lazy-loaded images
      const images = Array.from(document.querySelectorAll('img[data-src], img[data-lazy-src]'));
      images.forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (src) dynamic.push(src);
      });

      return dynamic;
    });

    const executionTime = Date.now() - startTime;

    // Calculate functionality score
    const functionalityScore = this.calculateFunctionalityScore(errors, content.length);

    return {
      executed: errors.length === 0,
      errors,
      dynamicContent: content,
      executionTime,
      functionalityScore
    };
  }

  /**
   * Captures post-render state
   */
  async capturePostRenderState(page: Page): Promise<string> {
    // Wait for all dynamic content to load
    await page.evaluate(async () => {
      // Scroll to trigger lazy loading
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Get final HTML
    const html = await page.content();
    return html;
  }

  /**
   * Verifies specific functionality
   */
  async verifyFunctionality(
    page: Page,
    testCases: Array<{ name: string; test: string }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const testCase of testCases) {
      try {
        const result = await page.evaluate((test) => {
          try {
            return eval(test);
          } catch (e) {
            return false;
          }
        }, testCase.test);

        results[testCase.name] = result === true;
      } catch (error) {
        results[testCase.name] = false;
      }
    }

    return results;
  }

  /**
   * Calculates functionality score
   */
  private calculateFunctionalityScore(errors: string[], dynamicContentCount: number): number {
    let score = 100;

    // Deduct for errors
    score -= errors.length * 10;

    // Bonus for dynamic content (shows JS is working)
    if (dynamicContentCount > 0) {
      score += Math.min(dynamicContentCount * 2, 20);
    }

    return Math.max(0, Math.min(100, score));
  }
}

