/**
 * Behavioral Simulation Service
 * Simulates human-like behavior patterns (mouse movements, scrolling, typing)
 */

import type { Page } from 'puppeteer';

export interface BehavioralConfig {
  mouseMovement: boolean;
  scrollBehavior: boolean;
  typingSpeed: number; // Characters per second
  clickDelay: { min: number; max: number }; // Milliseconds
  scrollDelay: { min: number; max: number }; // Milliseconds
  mouseMovementSpeed: { min: number; max: number }; // Pixels per movement
}

const DEFAULT_CONFIG: BehavioralConfig = {
  mouseMovement: true,
  scrollBehavior: true,
  typingSpeed: 50, // 50 chars/sec
  clickDelay: { min: 100, max: 500 },
  scrollDelay: { min: 50, max: 200 },
  mouseMovementSpeed: { min: 1, max: 5 },
};

/**
 * Simulates human-like mouse movement
 */
export async function simulateMouseMovement(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.mouseMovement) return;

  const steps = Math.max(10, Math.floor(Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2) / 10));
  const stepX = (toX - fromX) / steps;
  const stepY = (toY - fromY) / steps;

  for (let i = 0; i <= steps; i++) {
    const x = fromX + stepX * i + (Math.random() - 0.5) * 2;
    const y = fromY + stepY * i + (Math.random() - 0.5) * 2;

    await page.mouse.move(x, y, {
      steps: 1,
    });

    // Random small delay
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 10)
    );
  }
}

/**
 * Simulates human-like scrolling
 */
export async function simulateScrolling(
  page: Page,
  direction: 'down' | 'up' = 'down',
  amount: number = 300,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.scrollBehavior) {
    await page.evaluate((amt, dir) => {
      window.scrollBy(0, dir === 'down' ? amt : -amt);
    }, amount, direction);
    return;
  }

  const steps = Math.max(5, Math.floor(amount / 50));
  const stepAmount = amount / steps;
  const delayRange = cfg.scrollDelay;

  for (let i = 0; i < steps; i++) {
    await page.evaluate((amt, dir) => {
      window.scrollBy(0, dir === 'down' ? amt : -amt);
    }, stepAmount, direction);

    // Random delay between scroll steps
    const delay = delayRange.min + Math.random() * (delayRange.max - delayRange.min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Simulates human-like typing
 */
export async function simulateTyping(
  page: Page,
  selector: string,
  text: string,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const typingSpeed = cfg.typingSpeed;
  const delayPerChar = 1000 / typingSpeed;

  await page.focus(selector);

  for (const char of text) {
    await page.keyboard.type(char, { delay: delayPerChar + (Math.random() - 0.5) * delayPerChar * 0.5 });
  }
}

/**
 * Simulates human-like clicking with delay
 */
export async function simulateClick(
  page: Page,
  selector: string,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const delayRange = cfg.clickDelay;

  // Move mouse to element first (if mouse movement is enabled)
  if (cfg.mouseMovement) {
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await simulateMouseMovement(page, 0, 0, x, y, cfg);
      }
    }
  }

  // Random delay before click
  const delay = delayRange.min + Math.random() * (delayRange.max - delayRange.min);
  await new Promise(resolve => setTimeout(resolve, delay));

  await page.click(selector, { delay: 50 + Math.random() * 50 });
}

/**
 * Applies behavioral patterns to page interactions
 */
export async function applyBehavioralPatterns(
  page: Page,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Inject behavioral helpers into page
  await page.evaluateOnNewDocument((cfg: BehavioralConfig) => {
    // Store config for use in page context
    (window as any).__behavioralConfig = cfg;
  }, cfg);

  // Random initial scroll to simulate reading
  if (cfg.scrollBehavior && Math.random() > 0.5) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    await simulateScrolling(page, 'down', 200 + Math.random() * 300, cfg);
  }
}

/**
 * Simulates reading behavior (scrolling, pauses)
 */
export async function simulateReadingBehavior(
  page: Page,
  duration: number = 3000,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    // Random scroll
    if (Math.random() > 0.3) {
      await simulateScrolling(page, 'down', 100 + Math.random() * 200, cfg);
    }

    // Random pause (simulating reading)
    const pauseTime = 500 + Math.random() * 1500;
    await new Promise(resolve => setTimeout(resolve, pauseTime));
  }
}

/**
 * Generates realistic mouse movement path
 */
export function generateMousePath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const steps = Math.max(5, Math.floor(distance / 20));

  // Bezier curve control points for natural movement
  const controlX1 = fromX + (toX - fromX) * 0.3 + (Math.random() - 0.5) * 50;
  const controlY1 = fromY + (toY - fromY) * 0.3 + (Math.random() - 0.5) * 50;
  const controlX2 = fromX + (toX - fromX) * 0.7 + (Math.random() - 0.5) * 50;
  const controlY2 = fromY + (toY - fromY) * 0.7 + (Math.random() - 0.5) * 50;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Bezier curve calculation
    const x =
      (1 - t) ** 3 * fromX +
      3 * (1 - t) ** 2 * t * controlX1 +
      3 * (1 - t) * t ** 2 * controlX2 +
      t ** 3 * toX;
    const y =
      (1 - t) ** 3 * fromY +
      3 * (1 - t) ** 2 * t * controlY1 +
      3 * (1 - t) * t ** 2 * controlY2 +
      t ** 3 * toY;

    path.push({ x, y });
  }

  return path;
}

