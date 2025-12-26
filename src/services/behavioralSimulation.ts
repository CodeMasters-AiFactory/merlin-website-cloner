/**
 * Behavioral Simulation Service v2.0
 * Advanced human-like behavior patterns for anti-detection bypass
 *
 * Features:
 * - Bezier curve mouse movements (natural acceleration/deceleration)
 * - Variable scroll patterns (fast scan, slow read, momentum)
 * - Realistic typing with errors and corrections
 * - Session duration variation
 * - Time-of-day activity patterns
 * - Hesitation and pause patterns
 * - Focus/blur simulation
 */

import type { Page } from 'puppeteer';

export interface BehavioralConfig {
  mouseMovement: boolean;
  scrollBehavior: boolean;
  typingSpeed: number; // Characters per second (base)
  clickDelay: { min: number; max: number }; // Milliseconds
  scrollDelay: { min: number; max: number }; // Milliseconds
  mouseMovementSpeed: { min: number; max: number }; // Pixels per movement

  // V2.0 Advanced options
  enableTypingErrors: boolean; // Simulate typos and corrections
  typingErrorRate: number; // 0-1, chance of typo per character
  enableHesitation: boolean; // Random pauses during actions
  hesitationChance: number; // 0-1, chance of hesitation
  sessionPersona: 'fast' | 'normal' | 'slow' | 'random'; // User browsing speed
  simulateFocusBlur: boolean; // Simulate tab switching
  enableMomentumScroll: boolean; // Natural scroll deceleration
}

const DEFAULT_CONFIG: BehavioralConfig = {
  mouseMovement: true,
  scrollBehavior: true,
  typingSpeed: 45, // Realistic typing speed
  clickDelay: { min: 80, max: 400 },
  scrollDelay: { min: 30, max: 150 },
  mouseMovementSpeed: { min: 2, max: 8 },

  // V2.0 defaults
  enableTypingErrors: true,
  typingErrorRate: 0.02, // 2% typo rate
  enableHesitation: true,
  hesitationChance: 0.15, // 15% chance of hesitation
  sessionPersona: 'random',
  simulateFocusBlur: true,
  enableMomentumScroll: true,
};

// Persona speed multipliers
const PERSONA_SPEEDS = {
  fast: { typing: 1.4, scroll: 1.6, delay: 0.6 },
  normal: { typing: 1.0, scroll: 1.0, delay: 1.0 },
  slow: { typing: 0.6, scroll: 0.7, delay: 1.5 },
  random: { typing: 1.0, scroll: 1.0, delay: 1.0 }, // Will be randomized
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

/**
 * Advanced mouse movement with Bezier curves and natural acceleration
 */
export async function advancedMouseMove(
  page: Page,
  toX: number,
  toY: number,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.mouseMovement) return;

  // Get current mouse position (approximate from page center if unknown)
  const viewport = page.viewport();
  const fromX = viewport ? viewport.width / 2 : 500;
  const fromY = viewport ? viewport.height / 2 : 300;

  const path = generateMousePath(fromX, fromY, toX, toY);

  // Natural acceleration curve - slow start, fast middle, slow end
  for (let i = 0; i < path.length; i++) {
    const progress = i / (path.length - 1);
    // Ease in-out timing
    const easedProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Variable delay based on position in path
    const baseDelay = 5;
    const delay = baseDelay + (1 - Math.abs(easedProgress - 0.5) * 2) * 10;

    await page.mouse.move(path[i].x, path[i].y);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Optional hesitation at destination
  if (cfg.enableHesitation && Math.random() < cfg.hesitationChance) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
  }
}

/**
 * Momentum-based scrolling (like trackpad/touch)
 */
export async function momentumScroll(
  page: Page,
  totalDistance: number,
  direction: 'down' | 'up' = 'down',
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const sign = direction === 'down' ? 1 : -1;

  // Initial velocity (pixels per frame)
  let velocity = 50 + Math.random() * 30;
  const friction = 0.95; // Deceleration factor
  let scrolled = 0;

  while (scrolled < totalDistance && velocity > 1) {
    const scrollAmount = velocity * sign;

    await page.evaluate((amt) => {
      window.scrollBy(0, amt);
    }, scrollAmount);

    scrolled += Math.abs(scrollAmount);
    velocity *= friction;

    // Variable frame timing
    await new Promise(resolve => setTimeout(resolve, 16 + Math.random() * 8));
  }
}

/**
 * Typing with realistic errors and corrections
 */
export async function realisticTyping(
  page: Page,
  text: string,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const persona = cfg.sessionPersona === 'random'
    ? (['fast', 'normal', 'slow'] as const)[Math.floor(Math.random() * 3)]
    : cfg.sessionPersona;
  const speedMultiplier = PERSONA_SPEEDS[persona].typing;

  const baseDelay = 1000 / (cfg.typingSpeed * speedMultiplier);

  // Common typo replacements
  const typoMap: Record<string, string[]> = {
    'a': ['s', 'q', 'z'],
    'e': ['w', 'r', 'd'],
    'i': ['u', 'o', 'k'],
    'o': ['i', 'p', 'l'],
    'n': ['b', 'm', 'h'],
    't': ['r', 'y', 'g'],
    's': ['a', 'd', 'w'],
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Maybe make a typo
    if (cfg.enableTypingErrors && Math.random() < cfg.typingErrorRate) {
      const typos = typoMap[char.toLowerCase()];
      if (typos) {
        // Type wrong character
        const wrongChar = typos[Math.floor(Math.random() * typos.length)];
        await page.keyboard.type(wrongChar);
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        // Realize mistake, delete
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }
    }

    // Type correct character
    const delay = baseDelay + (Math.random() - 0.5) * baseDelay * 0.6;
    await page.keyboard.type(char, { delay });

    // Occasional pause (thinking)
    if (cfg.enableHesitation && char === ' ' && Math.random() < 0.1) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
    }
  }
}

/**
 * Simulate focus/blur events (tab switching)
 */
export async function simulateFocusBlur(
  page: Page,
  duration: number = 2000
): Promise<void> {
  // Simulate losing focus
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    (document as any).hidden = true;
  });

  // Random "away" duration
  await new Promise(resolve => setTimeout(resolve, duration + Math.random() * 1000));

  // Simulate regaining focus
  await page.evaluate(() => {
    (document as any).hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}

/**
 * Generate session with time-of-day appropriate behavior
 */
export function getTimeOfDayConfig(): Partial<BehavioralConfig> {
  const hour = new Date().getHours();

  // Early morning (5-8): Slow, tired
  if (hour >= 5 && hour < 8) {
    return {
      sessionPersona: 'slow',
      typingSpeed: 35,
      hesitationChance: 0.25,
    };
  }

  // Peak hours (9-12, 14-17): Normal to fast
  if ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 17)) {
    return {
      sessionPersona: 'fast',
      typingSpeed: 55,
      hesitationChance: 0.1,
    };
  }

  // Afternoon lull (12-14): Normal, occasional distraction
  if (hour >= 12 && hour < 14) {
    return {
      sessionPersona: 'normal',
      simulateFocusBlur: true,
      hesitationChance: 0.2,
    };
  }

  // Evening (17-22): Relaxed browsing
  if (hour >= 17 && hour < 22) {
    return {
      sessionPersona: 'slow',
      enableMomentumScroll: true,
    };
  }

  // Late night (22-5): Either very slow or very fast (night owl)
  return Math.random() > 0.5
    ? { sessionPersona: 'slow', hesitationChance: 0.3 }
    : { sessionPersona: 'fast', hesitationChance: 0.05 };
}

/**
 * Full page interaction simulation
 */
export async function simulateFullPageInteraction(
  page: Page,
  config: Partial<BehavioralConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...getTimeOfDayConfig(), ...config };

  // Initial page load pause
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

  // Random mouse movement to simulate looking around
  const viewport = page.viewport();
  if (viewport && cfg.mouseMovement) {
    const randomX = Math.random() * viewport.width * 0.8 + viewport.width * 0.1;
    const randomY = Math.random() * viewport.height * 0.5 + viewport.height * 0.1;
    await advancedMouseMove(page, randomX, randomY, cfg);
  }

  // Scroll down to simulate reading
  if (cfg.scrollBehavior) {
    const scrollAmount = 200 + Math.random() * 400;
    if (cfg.enableMomentumScroll) {
      await momentumScroll(page, scrollAmount, 'down', cfg);
    } else {
      await simulateScrolling(page, 'down', scrollAmount, cfg);
    }
  }

  // Maybe simulate tab switch
  if (cfg.simulateFocusBlur && Math.random() < 0.1) {
    await simulateFocusBlur(page, 1000 + Math.random() * 3000);
  }

  // Reading pause
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
}

/**
 * Create a session persona for consistent behavior throughout clone
 */
export function createSessionPersona(): BehavioralConfig {
  const baseConfig = { ...DEFAULT_CONFIG };

  // Random persona selection weighted towards 'normal'
  const rand = Math.random();
  if (rand < 0.2) {
    baseConfig.sessionPersona = 'fast';
  } else if (rand < 0.8) {
    baseConfig.sessionPersona = 'normal';
  } else {
    baseConfig.sessionPersona = 'slow';
  }

  // Apply time-of-day adjustments
  const timeConfig = getTimeOfDayConfig();
  Object.assign(baseConfig, timeConfig);

  // Random individual variations
  baseConfig.typingSpeed += (Math.random() - 0.5) * 10;
  baseConfig.hesitationChance += (Math.random() - 0.5) * 0.1;

  return baseConfig;
}
