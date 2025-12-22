/**
 * Advanced Mobile Emulation Service
 * Perfect mobile device profiles with touch event simulation
 */

import type { Page, Browser } from 'puppeteer';

export interface MobileDeviceProfile {
  name: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
    isLandscape: boolean;
  };
  screen: {
    width: number;
    height: number;
  };
  touch: {
    enabled: boolean;
    maxTouchPoints: number;
  };
}

/**
 * Predefined mobile device profiles
 */
export const MOBILE_DEVICE_PROFILES: Record<string, MobileDeviceProfile> = {
  'iPhone 14 Pro': {
    name: 'iPhone 14 Pro',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    screen: {
      width: 393,
      height: 852,
    },
    touch: {
      enabled: true,
      maxTouchPoints: 5,
    },
  },
  'iPhone 14 Pro Max': {
    name: 'iPhone 14 Pro Max',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 430,
      height: 932,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    screen: {
      width: 430,
      height: 932,
    },
    touch: {
      enabled: true,
      maxTouchPoints: 5,
    },
  },
  'Samsung Galaxy S21': {
    name: 'Samsung Galaxy S21',
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    viewport: {
      width: 360,
      height: 800,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    screen: {
      width: 360,
      height: 800,
    },
    touch: {
      enabled: true,
      maxTouchPoints: 10,
    },
  },
  'Samsung Galaxy S21 Ultra': {
    name: 'Samsung Galaxy S21 Ultra',
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    viewport: {
      width: 412,
      height: 915,
      deviceScaleFactor: 3.5,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    screen: {
      width: 412,
      height: 915,
    },
    touch: {
      enabled: true,
      maxTouchPoints: 10,
    },
  },
  'iPad Pro': {
    name: 'iPad Pro',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 1024,
      height: 1366,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    screen: {
      width: 1024,
      height: 1366,
    },
    touch: {
      enabled: true,
      maxTouchPoints: 5,
    },
  },
  'Google Pixel 7': {
    name: 'Google Pixel 7',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    viewport: {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      isLandscape: false,
    },
    screen: {
      width: 412,
      height: 915,
    },
    touch: {
      enabled: true,
      maxTouchPoints: 10,
    },
  },
};

/**
 * Mobile Emulation Service
 */
export class MobileEmulation {
  /**
   * Applies mobile device profile to a page
   */
  async applyMobileProfile(page: Page, deviceName: string): Promise<void> {
    const profile = MOBILE_DEVICE_PROFILES[deviceName];
    if (!profile) {
      throw new Error(`Unknown device profile: ${deviceName}`);
    }

    // Set viewport
    await page.setViewport(profile.viewport);

    // Set user agent
    await page.setUserAgent(profile.userAgent);

    // Enable touch events
    await page.evaluateOnNewDocument((prof) => {
      // Override navigator properties
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => prof.touch.maxTouchPoints,
        configurable: true,
      });

      // Add touch event support
      if (!('ontouchstart' in window)) {
        (window as any).ontouchstart = null;
        (window as any).ontouchend = null;
        (window as any).ontouchmove = null;
        (window as any).ontouchcancel = null;
      }

      // Override screen properties
      Object.defineProperty(screen, 'width', {
        get: () => prof.screen.width,
        configurable: true,
      });
      Object.defineProperty(screen, 'height', {
        get: () => prof.screen.height,
        configurable: true,
      });
      Object.defineProperty(screen, 'availWidth', {
        get: () => prof.screen.width,
        configurable: true,
      });
      Object.defineProperty(screen, 'availHeight', {
        get: () => prof.screen.height - 40, // Account for status bar
        configurable: true,
      });

      // Override device pixel ratio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => prof.viewport.deviceScaleFactor,
        configurable: true,
      });

      // Override platform
      Object.defineProperty(navigator, 'platform', {
        get: () => prof.viewport.isMobile ? 'iPhone' : 'MacIntel',
        configurable: true,
      });

      // Add mobile-specific properties
      (navigator as any).standalone = prof.viewport.isMobile;
      (window as any).orientation = 0;
    }, profile);
  }

  /**
   * Simulates touch event
   */
  async simulateTouch(
    page: Page,
    x: number,
    y: number,
    type: 'touchstart' | 'touchend' | 'touchmove' = 'touchstart'
  ): Promise<void> {
    await page.evaluate((touchX, touchY, touchType) => {
      // Touch and TouchEvent are browser APIs available in page.evaluate context
      const TouchConstructor = (window as any).Touch || class Touch {
        constructor(options: any) {
          Object.assign(this, options);
        }
      };
      
      const TouchEventConstructor = (window as any).TouchEvent || class TouchEvent {
        constructor(type: string, options: any) {
          Object.assign(this, { type, ...options });
        }
      };
      
      const touch = new TouchConstructor({
        identifier: Date.now(),
        target: document.elementFromPoint(touchX, touchY) || document.body,
        clientX: touchX,
        clientY: touchY,
        radiusX: 2.5,
        radiusY: 2.5,
        rotationAngle: 10,
        force: 0.5,
      });

      const touchEvent = new TouchEventConstructor(touchType, {
        cancelable: true,
        bubbles: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
      });

      const element = document.elementFromPoint(touchX, touchY);
      if (element) {
        element.dispatchEvent(touchEvent as Event);
      }
    }, x, y, type);
  }

  /**
   * Simulates tap (touchstart + touchend)
   */
  async simulateTap(page: Page, x: number, y: number): Promise<void> {
    await this.simulateTouch(page, x, y, 'touchstart');
    await page.waitForTimeout(50); // Small delay
    await this.simulateTouch(page, x, y, 'touchend');
  }

  /**
   * Simulates swipe gesture
   */
  async simulateSwipe(
    page: Page,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 300
  ): Promise<void> {
    await this.simulateTouch(page, startX, startY, 'touchstart');
    
    const steps = 10;
    const stepX = (endX - startX) / steps;
    const stepY = (endY - startY) / steps;
    const stepDelay = duration / steps;

    for (let i = 1; i <= steps; i++) {
      await page.waitForTimeout(stepDelay);
      await this.simulateTouch(page, startX + stepX * i, startY + stepY * i, 'touchmove');
    }

    await this.simulateTouch(page, endX, endY, 'touchend');
  }

  /**
   * Gets available device profiles
   */
  getAvailableProfiles(): string[] {
    return Object.keys(MOBILE_DEVICE_PROFILES);
  }

  /**
   * Gets device profile by name
   */
  getProfile(deviceName: string): MobileDeviceProfile | null {
    return MOBILE_DEVICE_PROFILES[deviceName] || null;
  }
}

