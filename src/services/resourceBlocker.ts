/**
 * Smart Resource Blocker
 * Blocks ads, trackers, analytics, and other unnecessary resources to improve performance
 */

import type { Page, HTTPRequest } from 'puppeteer';

export interface ResourceBlockingOptions {
  blockAds?: boolean;
  blockTrackers?: boolean;
  blockAnalytics?: boolean;
  blockFonts?: boolean;
  blockImages?: boolean;
  blockStylesheets?: boolean;
  blockScripts?: boolean;
  blockMedia?: boolean;
  blockOther?: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  blockedPatterns?: RegExp[];
}

/**
 * Common ad and tracker domains
 */
const AD_DOMAINS = [
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'google-analytics.com',
  'analytics.google.com',
  'facebook.com/tr',
  'facebook.net',
  'scorecardresearch.com',
  'quantserve.com',
  'outbrain.com',
  'taboola.com',
  'adsafeprotected.com',
  'advertising.com',
  'adnxs.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'adform.net',
  'adtechus.com',
  'googletagmanager.com',
  'googletagservices.com',
];

const TRACKER_DOMAINS = [
  'google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'facebook.com/tr',
  'facebook.net',
  'scorecardresearch.com',
  'quantserve.com',
  'mixpanel.com',
  'segment.com',
  'amplitude.com',
  'hotjar.com',
  'fullstory.com',
  'logrocket.com',
  'sentry.io',
  'newrelic.com',
  'datadoghq.com',
  'cloudflareinsights.com',
  'cloudflare-analytics.com',
];

const ANALYTICS_DOMAINS = [
  'google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'mixpanel.com',
  'segment.com',
  'amplitude.com',
  'hotjar.com',
  'fullstory.com',
  'logrocket.com',
  'sentry.io',
  'newrelic.com',
  'datadoghq.com',
  'cloudflareinsights.com',
  'cloudflare-analytics.com',
  'matomo.org',
  'piwik.org',
  'statcounter.com',
  'histats.com',
];

/**
 * Resource blocker patterns
 */
const BLOCKED_PATTERNS = [
  /\/ads?\//i,
  /\/advertising\//i,
  /\/tracking\//i,
  /\/tracker\//i,
  /\/analytics\//i,
  /\/pixel\//i,
  /\/beacon\//i,
  /\/collect\//i,
  /\/gtm\.js/i,
  /\/ga\.js/i,
  /\/analytics\.js/i,
  /\/urchin\.js/i,
  /\/doubleclick/i,
  /\/googlesyndication/i,
  /\/adservice/i,
  /\/adform/i,
  /\/adtech/i,
  /\/advertising/i,
  /\/adsystem/i,
  /\/adserver/i,
];

/**
 * Resource Blocker class
 */
export class ResourceBlocker {
  /**
   * Enable resource blocking on a page
   */
  async enableBlocking(page: Page, options: ResourceBlockingOptions = {}): Promise<void> {
    const {
      blockAds = true,
      blockTrackers = true,
      blockAnalytics = true,
      blockFonts = false,
      blockImages = false,
      blockStylesheets = false,
      blockScripts = false,
      blockMedia = false,
      blockOther = false,
      allowedDomains = [],
      blockedDomains = [],
      blockedPatterns = [],
    } = options;

    await page.setRequestInterception(true);

    page.on('request', (request: HTTPRequest) => {
      const url = request.url();
      const resourceType = request.resourceType();

      // Check if domain is allowed (whitelist takes precedence)
      if (allowedDomains.length > 0) {
        const urlObj = new URL(url);
        const isAllowed = allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
        if (isAllowed) {
          request.continue();
          return;
        }
      }

      // Check if domain is explicitly blocked
      if (blockedDomains.length > 0) {
        const urlObj = new URL(url);
        const isBlocked = blockedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
        if (isBlocked) {
          request.abort();
          return;
        }
      }

      // Check blocked patterns
      const allPatterns = [...BLOCKED_PATTERNS, ...blockedPatterns];
      for (const pattern of allPatterns) {
        if (pattern.test(url)) {
          request.abort();
          return;
        }
      }

      // Block by domain lists
      if (blockAds) {
        if (AD_DOMAINS.some(domain => url.includes(domain))) {
          request.abort();
          return;
        }
      }

      if (blockTrackers) {
        if (TRACKER_DOMAINS.some(domain => url.includes(domain))) {
          request.abort();
          return;
        }
      }

      if (blockAnalytics) {
        if (ANALYTICS_DOMAINS.some(domain => url.includes(domain))) {
          request.abort();
          return;
        }
      }

      // Block by resource type
      if (blockFonts && resourceType === 'font') {
        request.abort();
        return;
      }

      if (blockImages && resourceType === 'image') {
        request.abort();
        return;
      }

      if (blockStylesheets && resourceType === 'stylesheet') {
        request.abort();
        return;
      }

      if (blockScripts && resourceType === 'script') {
        request.abort();
        return;
      }

      if (blockMedia && resourceType === 'media') {
        request.abort();
        return;
      }

      if (blockOther && !['document', 'xhr', 'fetch'].includes(resourceType)) {
        request.abort();
        return;
      }

      // Allow the request
      request.continue();
    });
  }

  /**
   * Disable resource blocking on a page
   */
  async disableBlocking(page: Page): Promise<void> {
    await page.setRequestInterception(false);
  }
}

