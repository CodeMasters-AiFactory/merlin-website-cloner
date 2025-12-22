/**
 * Interaction Simulator
 * Simulates user interactions (clicks, navigation, inputs) to trigger dynamic content
 */

import type { Page } from 'puppeteer';
import { simulateClick, simulateTyping, simulateScrolling, simulateMouseMovement } from './behavioralSimulation.js';

export interface InteractionOptions {
  clickButtons?: boolean;
  fillInputs?: boolean;
  triggerModals?: boolean;
  handleDropdowns?: boolean;
  triggerLazyLoading?: boolean;
  handleInfiniteScroll?: boolean;
}

/**
 * Interaction Simulator
 * Simulates user interactions to trigger dynamic content
 */
export class InteractionSimulator {
  /**
   * Simulates interactions on a page
   */
  async simulateInteractions(
    page: Page,
    options: InteractionOptions = {}
  ): Promise<void> {
    // Click buttons
    if (options.clickButtons !== false) {
      await this.clickButtons(page);
    }

    // Fill inputs
    if (options.fillInputs !== false) {
      await this.fillInputs(page);
    }

    // Trigger modals
    if (options.triggerModals !== false) {
      await this.triggerModals(page);
    }

    // Handle dropdowns
    if (options.handleDropdowns !== false) {
      await this.handleDropdowns(page);
    }

    // Trigger lazy loading
    if (options.triggerLazyLoading !== false) {
      await this.triggerLazyLoading(page);
    }

    // Handle infinite scroll
    if (options.handleInfiniteScroll) {
      await this.handleInfiniteScroll(page);
    }
  }

  /**
   * Clicks buttons to trigger dynamic content
   */
  private async clickButtons(page: Page): Promise<void> {
    const buttons = await page.$$('button, a[role="button"], [onclick]');
    
    for (const button of buttons.slice(0, 10)) { // Limit to first 10
      try {
        const isVisible = await button.isIntersectingViewport();
        if (isVisible) {
          await simulateClick(page, await button.evaluate(el => {
            // Get selector
            if (el.id) return `#${el.id}`;
            if (el.className) return `.${el.className.split(' ')[0]}`;
            return el.tagName.toLowerCase();
          }), {});
          
          await page.waitForTimeout(500); // Wait for content to load
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Fills input fields
   */
  private async fillInputs(page: Page): Promise<void> {
    const inputs = await page.$$('input[type="text"], input[type="email"], input[type="search"], textarea');
    
    for (const input of inputs.slice(0, 5)) { // Limit to first 5
      try {
        const isVisible = await input.isIntersectingViewport();
        if (isVisible) {
          const placeholder = await input.evaluate(el => (el as unknown as HTMLInputElement).placeholder);
          const type = await input.evaluate(el => (el as unknown as HTMLInputElement).type);
          
          let value = '';
          if (type === 'email') {
            value = 'test@example.com';
          } else if (type === 'search') {
            value = 'test search';
          } else {
            value = placeholder || 'test input';
          }

          const selector = await input.evaluate(el => {
            if (el.id) return `#${el.id}`;
            if (el.name) return `[name="${el.name}"]`;
            return '';
          });

          if (selector) {
            await simulateTyping(page, selector, value, {});
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Triggers modals and popups
   */
  private async triggerModals(page: Page): Promise<void> {
    // Look for modal triggers
    const modalTriggers = await page.$$('[data-toggle="modal"], [data-bs-toggle="modal"], .modal-trigger, [onclick*="modal"]');
    
    for (const trigger of modalTriggers.slice(0, 5)) {
      try {
        const isVisible = await trigger.isIntersectingViewport();
        if (isVisible) {
          await trigger.click();
          await page.waitForTimeout(1000); // Wait for modal to open
          
          // Close modal
          const closeButton = await page.$('.modal-close, [data-dismiss="modal"], .close');
          if (closeButton) {
            await closeButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Handles dropdowns and selects
   */
  private async handleDropdowns(page: Page): Promise<void> {
    // Handle select elements
    const selects = await page.$$('select');
    
    for (const select of selects.slice(0, 5)) {
      try {
        const isVisible = await select.isIntersectingViewport();
        if (isVisible) {
          const options = await select.$$('option');
          if (options.length > 1) {
            // Select second option (skip first which is often "Select...")
            await select.select(await options[1].evaluate(el => (el as HTMLOptionElement).value));
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Handle custom dropdowns
    const customDropdowns = await page.$$('[data-toggle="dropdown"], .dropdown-toggle');
    
    for (const dropdown of customDropdowns.slice(0, 5)) {
      try {
        const isVisible = await dropdown.isIntersectingViewport();
        if (isVisible) {
          await dropdown.click();
          await page.waitForTimeout(500);
          
          // Click first option
          const option = await page.$('.dropdown-menu a, .dropdown-item');
          if (option) {
            await option.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Triggers lazy loading
   */
  private async triggerLazyLoading(page: Page): Promise<void> {
    // Scroll to trigger lazy-loaded images
    await simulateScrolling(page, 'down', 500, {});
    await page.waitForTimeout(1000);
    
    // Scroll back up
    await simulateScrolling(page, 'up', 500, {});
    await page.waitForTimeout(1000);
  }

  /**
   * Handles infinite scroll
   */
  private async handleInfiniteScroll(page: Page): Promise<void> {
    const maxScrolls = 3;
    
    for (let i = 0; i < maxScrolls; i++) {
      const previousHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // Scroll to bottom
      await simulateScrolling(page, 'down', 1000, {});
      await page.waitForTimeout(2000);
      
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // If height didn't change, no more content
      if (newHeight === previousHeight) {
        break;
      }
    }
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Simulates navigation through links
   */
  async simulateNavigation(page: Page, maxLinks: number = 5): Promise<void> {
    const links = await page.$$('a[href^="/"], a[href^="./"]');
    
    for (const link of links.slice(0, maxLinks)) {
      try {
        const href = await link.evaluate(el => (el as HTMLAnchorElement).href);
        if (href && !href.includes('#')) {
          await link.click();
          await page.waitForTimeout(2000);
          
          // Go back
          await page.goBack();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Triggers all dynamic content
   */
  async triggerAllDynamicContent(page: Page): Promise<void> {
    await this.simulateInteractions(page, {
      clickButtons: true,
      fillInputs: true,
      triggerModals: true,
      handleDropdowns: true,
      triggerLazyLoading: true,
      handleInfiniteScroll: true,
    });
  }
}

