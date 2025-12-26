/**
 * Fingerprint Generator Service
 *
 * Uses Apify's fingerprint-suite for generating realistic browser fingerprints
 * from real-world telemetry data (100k+ residential browsers).
 *
 * This is critical for anti-detection bypass.
 */

import { FingerprintGenerator } from 'fingerprint-generator';
import { FingerprintInjector } from 'fingerprint-injector';
import type { Page, Browser } from 'puppeteer';
import type { BrowserContext, Page as PlaywrightPage } from 'playwright';

export interface FingerprintOptions {
  browsers?: Array<'chrome' | 'firefox' | 'safari' | 'edge'>;
  operatingSystems?: Array<'windows' | 'macos' | 'linux' | 'android' | 'ios'>;
  devices?: Array<'desktop' | 'mobile'>;
  locales?: string[];
  screen?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
}

export interface GeneratedFingerprint {
  fingerprint: any;
  headers: Record<string, string>;
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  platform: string;
}

// Cache fingerprints for session consistency
const fingerprintCache: Map<string, GeneratedFingerprint> = new Map();

/**
 * Generate a realistic browser fingerprint
 */
export async function generateFingerprint(
  options: FingerprintOptions = {}
): Promise<GeneratedFingerprint> {
  const generator = new FingerprintGenerator({
    browsers: options.browsers || ['chrome'],
    operatingSystems: options.operatingSystems || ['windows', 'macos'],
    devices: options.devices || ['desktop'],
    locales: options.locales || ['en-US', 'en-GB'],
    screen: options.screen || {
      minWidth: 1280,
      maxWidth: 1920,
      minHeight: 720,
      maxHeight: 1080,
    },
  });

  const { fingerprint, headers } = generator.getFingerprint();

  return {
    fingerprint,
    headers,
    userAgent: fingerprint.navigator.userAgent,
    viewport: {
      width: fingerprint.screen.width,
      height: fingerprint.screen.height,
    },
    locale: fingerprint.navigator.language,
    timezone: fingerprint.navigator.timezone || 'America/New_York',
    platform: fingerprint.navigator.platform,
  };
}

/**
 * Get or create a cached fingerprint for a session
 */
export async function getSessionFingerprint(
  sessionId: string,
  options: FingerprintOptions = {}
): Promise<GeneratedFingerprint> {
  if (fingerprintCache.has(sessionId)) {
    return fingerprintCache.get(sessionId)!;
  }

  const fingerprint = await generateFingerprint(options);
  fingerprintCache.set(sessionId, fingerprint);
  return fingerprint;
}

/**
 * Inject fingerprint into Puppeteer page
 */
export async function injectFingerprintPuppeteer(
  page: Page,
  fingerprint: GeneratedFingerprint
): Promise<void> {
  const injector = new FingerprintInjector();

  // Set viewport
  await page.setViewport(fingerprint.viewport);

  // Set user agent
  await page.setUserAgent(fingerprint.userAgent);

  // Inject fingerprint
  await injector.attachFingerprintToPuppeteer(page, {
    fingerprint: fingerprint.fingerprint,
  });

  // Set extra headers
  await page.setExtraHTTPHeaders(fingerprint.headers);

  // Override timezone
  await page.emulateTimezone(fingerprint.timezone);
}

/**
 * Inject fingerprint into Playwright context
 */
export async function injectFingerprintPlaywright(
  context: BrowserContext,
  fingerprint: GeneratedFingerprint
): Promise<void> {
  const injector = new FingerprintInjector();

  // Inject into context
  await injector.attachFingerprintToPlaywright(context, {
    fingerprint: fingerprint.fingerprint,
  });
}

/**
 * Generate fingerprint matching specific requirements
 */
export async function generateMatchingFingerprint(
  requirements: {
    browser?: 'chrome' | 'firefox' | 'safari' | 'edge';
    os?: 'windows' | 'macos' | 'linux';
    device?: 'desktop' | 'mobile';
    minScreenWidth?: number;
    locale?: string;
  }
): Promise<GeneratedFingerprint> {
  const options: FingerprintOptions = {
    browsers: requirements.browser ? [requirements.browser] : ['chrome'],
    operatingSystems: requirements.os ? [requirements.os] : ['windows'],
    devices: requirements.device ? [requirements.device] : ['desktop'],
    locales: requirements.locale ? [requirements.locale] : ['en-US'],
    screen: {
      minWidth: requirements.minScreenWidth || 1280,
      maxWidth: 1920,
      minHeight: 720,
      maxHeight: 1080,
    },
  };

  return generateFingerprint(options);
}

/**
 * Fingerprint profiles for different scenarios
 */
export const FINGERPRINT_PROFILES = {
  // Standard desktop user
  desktop: {
    browsers: ['chrome'] as const,
    operatingSystems: ['windows', 'macos'] as const,
    devices: ['desktop'] as const,
    screen: { minWidth: 1280, maxWidth: 1920, minHeight: 720, maxHeight: 1080 },
  },

  // Mobile user
  mobile: {
    browsers: ['chrome', 'safari'] as const,
    operatingSystems: ['android', 'ios'] as const,
    devices: ['mobile'] as const,
    screen: { minWidth: 320, maxWidth: 430, minHeight: 568, maxHeight: 932 },
  },

  // Enterprise/business user
  enterprise: {
    browsers: ['chrome', 'edge'] as const,
    operatingSystems: ['windows'] as const,
    devices: ['desktop'] as const,
    locales: ['en-US'],
    screen: { minWidth: 1920, maxWidth: 2560, minHeight: 1080, maxHeight: 1440 },
  },

  // Developer
  developer: {
    browsers: ['chrome', 'firefox'] as const,
    operatingSystems: ['macos', 'linux'] as const,
    devices: ['desktop'] as const,
    screen: { minWidth: 1440, maxWidth: 2560, minHeight: 900, maxHeight: 1600 },
  },

  // Random realistic
  random: {
    browsers: ['chrome', 'firefox', 'safari', 'edge'] as const,
    operatingSystems: ['windows', 'macos', 'linux'] as const,
    devices: ['desktop'] as const,
    screen: { minWidth: 1280, maxWidth: 1920, minHeight: 720, maxHeight: 1080 },
  },
};

/**
 * Generate fingerprint from profile
 */
export async function generateFromProfile(
  profile: keyof typeof FINGERPRINT_PROFILES
): Promise<GeneratedFingerprint> {
  const options = FINGERPRINT_PROFILES[profile];
  return generateFingerprint(options);
}

/**
 * Rotate fingerprint for a session
 */
export async function rotateSessionFingerprint(
  sessionId: string,
  options: FingerprintOptions = {}
): Promise<GeneratedFingerprint> {
  fingerprintCache.delete(sessionId);
  return getSessionFingerprint(sessionId, options);
}

/**
 * Clear all cached fingerprints
 */
export function clearFingerprintCache(): void {
  fingerprintCache.clear();
}

/**
 * Get cache stats
 */
export function getFingerprintCacheStats(): { size: number; sessions: string[] } {
  return {
    size: fingerprintCache.size,
    sessions: Array.from(fingerprintCache.keys()),
  };
}

/**
 * Validate fingerprint consistency
 */
export function validateFingerprint(fingerprint: GeneratedFingerprint): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check user agent matches platform
  const ua = fingerprint.userAgent.toLowerCase();
  const platform = fingerprint.platform.toLowerCase();

  if (platform.includes('win') && !ua.includes('windows')) {
    issues.push('Platform/UserAgent mismatch: Windows platform but no Windows in UA');
  }

  if (platform.includes('mac') && !ua.includes('mac')) {
    issues.push('Platform/UserAgent mismatch: Mac platform but no Mac in UA');
  }

  // Check viewport is reasonable
  if (fingerprint.viewport.width < 320 || fingerprint.viewport.width > 3840) {
    issues.push(`Unusual viewport width: ${fingerprint.viewport.width}`);
  }

  if (fingerprint.viewport.height < 480 || fingerprint.viewport.height > 2160) {
    issues.push(`Unusual viewport height: ${fingerprint.viewport.height}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
