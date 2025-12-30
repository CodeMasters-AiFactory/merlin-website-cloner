/**
 * Protection Detector
 * Identifies anti-bot systems and selects optimal bypass strategies
 *
 * Supports detection of:
 * - Cloudflare (JS Challenge, Turnstile, Under Attack Mode)
 * - DataDome (Bot Manager)
 * - Akamai (Bot Manager Premier)
 * - PerimeterX (HUMAN)
 * - Imperva (Incapsula)
 * - AWS WAF
 * - Kasada
 * - Shape Security
 */

import type { Page, HTTPResponse } from 'puppeteer';

export type ProtectionType =
  | 'cloudflare'
  | 'cloudflare-turnstile'
  | 'cloudflare-challenge'
  | 'datadome'
  | 'akamai'
  | 'perimeterx'
  | 'imperva'
  | 'aws-waf'
  | 'kasada'
  | 'shape'
  | 'recaptcha'
  | 'hcaptcha'
  | 'unknown'
  | 'none';

export interface ProtectionInfo {
  type: ProtectionType;
  confidence: number; // 0-1
  details: {
    siteKey?: string;
    challengeType?: string;
    rayId?: string;
    version?: string;
    headers?: Record<string, string>;
  };
  bypassStrategy: BypassStrategy;
}

export interface BypassStrategy {
  name: string;
  priority: number;
  steps: BypassStep[];
  estimatedTime: number; // ms
  requiresCaptcha: boolean;
  requiresProxy: boolean;
  proxyType?: 'residential' | 'mobile' | 'datacenter';
}

export interface BypassStep {
  action: 'wait' | 'solve-captcha' | 'stealth' | 'fingerprint' | 'cookie' | 'retry' | 'proxy-rotate';
  params?: Record<string, unknown>;
}

// Detection signatures
const SIGNATURES = {
  cloudflare: {
    headers: ['cf-ray', 'cf-cache-status', 'cf-request-id'],
    cookies: ['__cf_bm', 'cf_clearance', '__cfduid'],
    bodyPatterns: [
      /cloudflare/i,
      /cf-browser-verification/i,
      /challenge-platform/i,
      /ray id:/i,
      /_cf_chl_opt/,
      /cdn-cgi\/challenge-platform/,
    ],
    jsVariables: ['__cf_chl_opt', 'cf_chl_prog'],
  },
  datadome: {
    headers: ['x-datadome', 'x-dd-b'],
    cookies: ['datadome', 'datadome-_'],
    bodyPatterns: [
      /datadome/i,
      /dd\.js/,
      /geo\.captcha-delivery\.com/,
      /t\.datadome\.co/,
    ],
    jsVariables: ['ddjskey', 'dd', 'DataDome'],
  },
  akamai: {
    headers: ['akamai-grn', 'x-akamai-transformed'],
    cookies: ['_abck', 'bm_sv', 'bm_sz', 'ak_bmsc'],
    bodyPatterns: [
      /akamai/i,
      /_bm\/bm\.png/,
      /ak\.sail/,
      /akamaized\.net/,
    ],
    jsVariables: ['bmak', '_abck'],
  },
  perimeterx: {
    headers: ['x-px-enforcer', 'x-px-first-party'],
    cookies: ['_px3', '_px2', '_pxvid', '_pxhd'],
    bodyPatterns: [
      /perimeterx/i,
      /px-captcha/i,
      /human\.px-cdn/,
      /\/px\/v\d+/,
    ],
    jsVariables: ['_pxAppId', 'PX'],
  },
  imperva: {
    headers: ['x-iinfo', 'x-cdn'],
    cookies: ['incap_ses', 'visid_incap', 'nlbi_', 'reese84'],
    bodyPatterns: [
      /incapsula/i,
      /imperva/i,
      /blocked by imperva/i,
      /_Incapsula_Resource/,
    ],
    jsVariables: ['reese84'],
  },
  kasada: {
    headers: ['x-kpsdk-ct', 'x-kpsdk-v'],
    cookies: ['x-kpsdk-ct', 'x-kpsdk-cd'],
    bodyPatterns: [
      /kasada/i,
      /ips\.js/,
      /\/149e9513-01fa-4fb0-aad4-566afd725d1b/,
    ],
    jsVariables: ['KPSDK'],
  },
  shape: {
    headers: ['x-px-cd'],
    cookies: ['s_sh'],
    bodyPatterns: [
      /shape security/i,
      /shapeblacklist/i,
    ],
    jsVariables: ['_shape_guard'],
  },
};

// Bypass strategies for each protection type
const BYPASS_STRATEGIES: Record<ProtectionType, BypassStrategy> = {
  'cloudflare': {
    name: 'Cloudflare Standard',
    priority: 1,
    steps: [
      { action: 'stealth' },
      { action: 'wait', params: { duration: 5000 } },
      { action: 'fingerprint' },
    ],
    estimatedTime: 8000,
    requiresCaptcha: false,
    requiresProxy: false,
  },
  'cloudflare-turnstile': {
    name: 'Cloudflare Turnstile',
    priority: 2,
    steps: [
      { action: 'stealth' },
      { action: 'solve-captcha', params: { type: 'turnstile' } },
      { action: 'cookie' },
    ],
    estimatedTime: 45000,
    requiresCaptcha: true,
    requiresProxy: true,
    proxyType: 'residential',
  },
  'cloudflare-challenge': {
    name: 'Cloudflare JS Challenge',
    priority: 1,
    steps: [
      { action: 'stealth' },
      { action: 'wait', params: { duration: 6000 } },
      { action: 'fingerprint' },
      { action: 'retry', params: { maxRetries: 2 } },
    ],
    estimatedTime: 15000,
    requiresCaptcha: false,
    requiresProxy: false,
  },
  'datadome': {
    name: 'DataDome Bypass',
    priority: 3,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
      { action: 'proxy-rotate' },
      { action: 'solve-captcha', params: { type: 'datadome' } },
    ],
    estimatedTime: 60000,
    requiresCaptcha: true,
    requiresProxy: true,
    proxyType: 'residential',
  },
  'akamai': {
    name: 'Akamai Bypass',
    priority: 3,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
      { action: 'wait', params: { duration: 3000 } },
      { action: 'proxy-rotate' },
    ],
    estimatedTime: 30000,
    requiresCaptcha: false,
    requiresProxy: true,
    proxyType: 'residential',
  },
  'perimeterx': {
    name: 'PerimeterX/HUMAN Bypass',
    priority: 3,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
      { action: 'wait', params: { duration: 5000 } },
      { action: 'solve-captcha', params: { type: 'perimeterx' } },
    ],
    estimatedTime: 50000,
    requiresCaptcha: true,
    requiresProxy: true,
    proxyType: 'mobile',
  },
  'imperva': {
    name: 'Imperva/Incapsula Bypass',
    priority: 2,
    steps: [
      { action: 'stealth' },
      { action: 'cookie' },
      { action: 'wait', params: { duration: 4000 } },
    ],
    estimatedTime: 10000,
    requiresCaptcha: false,
    requiresProxy: false,
  },
  'aws-waf': {
    name: 'AWS WAF Bypass',
    priority: 1,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
    ],
    estimatedTime: 5000,
    requiresCaptcha: false,
    requiresProxy: false,
  },
  'kasada': {
    name: 'Kasada Bypass',
    priority: 4,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
      { action: 'proxy-rotate' },
      { action: 'wait', params: { duration: 5000 } },
    ],
    estimatedTime: 40000,
    requiresCaptcha: false,
    requiresProxy: true,
    proxyType: 'residential',
  },
  'shape': {
    name: 'Shape Security Bypass',
    priority: 4,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
      { action: 'proxy-rotate' },
    ],
    estimatedTime: 30000,
    requiresCaptcha: false,
    requiresProxy: true,
    proxyType: 'residential',
  },
  'recaptcha': {
    name: 'reCAPTCHA Solve',
    priority: 2,
    steps: [
      { action: 'solve-captcha', params: { type: 'recaptcha' } },
    ],
    estimatedTime: 45000,
    requiresCaptcha: true,
    requiresProxy: false,
  },
  'hcaptcha': {
    name: 'hCaptcha Solve',
    priority: 2,
    steps: [
      { action: 'solve-captcha', params: { type: 'hcaptcha' } },
    ],
    estimatedTime: 45000,
    requiresCaptcha: true,
    requiresProxy: false,
  },
  'unknown': {
    name: 'Generic Bypass',
    priority: 5,
    steps: [
      { action: 'stealth' },
      { action: 'fingerprint' },
      { action: 'wait', params: { duration: 3000 } },
      { action: 'retry', params: { maxRetries: 3 } },
    ],
    estimatedTime: 20000,
    requiresCaptcha: false,
    requiresProxy: false,
  },
  'none': {
    name: 'No Protection',
    priority: 0,
    steps: [],
    estimatedTime: 0,
    requiresCaptcha: false,
    requiresProxy: false,
  },
};

export class ProtectionDetector {
  private detectionCache: Map<string, ProtectionInfo> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect protection from page content and response
   */
  async detectFromPage(page: Page, response?: HTTPResponse): Promise<ProtectionInfo> {
    const url = page.url();
    const hostname = new URL(url).hostname;

    // Check cache
    const cached = this.detectionCache.get(hostname);
    if (cached) {
      return cached;
    }

    const detectedProtections: Array<{ type: ProtectionType; confidence: number; details: Record<string, unknown> }> = [];

    // Get page content
    const content = await page.content();

    // Get response headers if available
    const headers = response ? response.headers() : {};

    // Get cookies
    const cookies = await page.cookies();
    const cookieNames = cookies.map(c => c.name);

    // Check each protection signature
    for (const [protection, signature] of Object.entries(SIGNATURES)) {
      let confidence = 0;
      const details: Record<string, unknown> = {};

      // Check headers
      const matchedHeaders = signature.headers.filter(h =>
        Object.keys(headers).some(k => k.toLowerCase() === h.toLowerCase())
      );
      if (matchedHeaders.length > 0) {
        confidence += 0.3;
        details.headers = matchedHeaders;
      }

      // Check cookies
      const matchedCookies = signature.cookies.filter(c =>
        cookieNames.some(cn => cn.includes(c) || c.includes(cn))
      );
      if (matchedCookies.length > 0) {
        confidence += 0.3;
        details.cookies = matchedCookies;
      }

      // Check body patterns
      const matchedPatterns = signature.bodyPatterns.filter(p => p.test(content));
      if (matchedPatterns.length > 0) {
        confidence += 0.3;
        details.patterns = matchedPatterns.length;
      }

      // Check JS variables
      const jsVarMatches = await page.evaluate((vars: string[]) => {
        return vars.filter(v => (window as any)[v] !== undefined);
      }, signature.jsVariables);
      if (jsVarMatches.length > 0) {
        confidence += 0.2;
        details.jsVariables = jsVarMatches;
      }

      if (confidence > 0.3) {
        detectedProtections.push({
          type: protection as ProtectionType,
          confidence: Math.min(1, confidence),
          details,
        });
      }
    }

    // Check for specific challenge types
    if (content.includes('cf-turnstile') || content.includes('challenges.cloudflare.com')) {
      const existing = detectedProtections.find(p => p.type.startsWith('cloudflare'));
      if (existing) {
        existing.type = 'cloudflare-turnstile';
        existing.confidence = 1;
      } else {
        detectedProtections.push({ type: 'cloudflare-turnstile', confidence: 0.9, details: {} });
      }
    }

    if (content.includes('challenge-form') || content.includes('_cf_chl_opt')) {
      const existing = detectedProtections.find(p => p.type.startsWith('cloudflare'));
      if (existing && existing.type !== 'cloudflare-turnstile') {
        existing.type = 'cloudflare-challenge';
        existing.confidence = Math.max(existing.confidence, 0.8);
      }
    }

    // Check for CAPTCHA
    const recaptchaMatch = content.match(/data-sitekey="([^"]+)".*?grecaptcha/s) ||
                          content.match(/grecaptcha\.render.*?sitekey.*?["']([^"']+)/);
    if (recaptchaMatch) {
      detectedProtections.push({
        type: 'recaptcha',
        confidence: 0.95,
        details: { siteKey: recaptchaMatch[1] },
      });
    }

    const hcaptchaMatch = content.match(/h-captcha.*?data-sitekey="([^"]+)"/s) ||
                         content.match(/hcaptcha\.render.*?sitekey.*?["']([^"']+)/);
    if (hcaptchaMatch) {
      detectedProtections.push({
        type: 'hcaptcha',
        confidence: 0.95,
        details: { siteKey: hcaptchaMatch[1] },
      });
    }

    // Extract Cloudflare ray ID if present
    const rayIdMatch = headers['cf-ray'] || content.match(/Ray ID:\s*([a-f0-9]+)/i);
    if (rayIdMatch) {
      const cfProtection = detectedProtections.find(p => p.type.startsWith('cloudflare'));
      if (cfProtection) {
        cfProtection.details.rayId = typeof rayIdMatch === 'string' ? rayIdMatch : rayIdMatch[1];
      }
    }

    // Sort by confidence
    detectedProtections.sort((a, b) => b.confidence - a.confidence);

    // Get highest confidence protection
    const detected = detectedProtections[0];

    const result: ProtectionInfo = {
      type: detected?.type || 'none',
      confidence: detected?.confidence || 1,
      details: {
        ...detected?.details,
        allDetected: detectedProtections.map(p => p.type),
      } as ProtectionInfo['details'],
      bypassStrategy: BYPASS_STRATEGIES[detected?.type || 'none'],
    };

    // Cache result
    this.detectionCache.set(hostname, result);
    setTimeout(() => this.detectionCache.delete(hostname), this.cacheTTL);

    return result;
  }

  /**
   * Quick detection from URL without page
   */
  async detectFromResponse(response: HTTPResponse): Promise<ProtectionInfo> {
    const headers = response.headers();
    const status = response.status();

    // Quick header-based detection
    if (headers['cf-ray']) {
      if (status === 403 || status === 503) {
        return {
          type: 'cloudflare-challenge',
          confidence: 0.8,
          details: { rayId: headers['cf-ray'] },
          bypassStrategy: BYPASS_STRATEGIES['cloudflare-challenge'],
        };
      }
      return {
        type: 'cloudflare',
        confidence: 0.7,
        details: { rayId: headers['cf-ray'] },
        bypassStrategy: BYPASS_STRATEGIES['cloudflare'],
      };
    }

    if (headers['x-datadome']) {
      return {
        type: 'datadome',
        confidence: 0.9,
        details: {},
        bypassStrategy: BYPASS_STRATEGIES['datadome'],
      };
    }

    if (headers['akamai-grn'] || headers['x-akamai-transformed']) {
      return {
        type: 'akamai',
        confidence: 0.8,
        details: {},
        bypassStrategy: BYPASS_STRATEGIES['akamai'],
      };
    }

    if (headers['x-px-enforcer']) {
      return {
        type: 'perimeterx',
        confidence: 0.9,
        details: {},
        bypassStrategy: BYPASS_STRATEGIES['perimeterx'],
      };
    }

    if (headers['x-iinfo']) {
      return {
        type: 'imperva',
        confidence: 0.8,
        details: {},
        bypassStrategy: BYPASS_STRATEGIES['imperva'],
      };
    }

    return {
      type: 'none',
      confidence: 1,
      details: {},
      bypassStrategy: BYPASS_STRATEGIES['none'],
    };
  }

  /**
   * Get bypass strategy for a protection type
   */
  getBypassStrategy(protectionType: ProtectionType): BypassStrategy {
    return BYPASS_STRATEGIES[protectionType] || BYPASS_STRATEGIES['unknown'];
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * Get all detection signatures (for debugging)
   */
  getSignatures(): typeof SIGNATURES {
    return SIGNATURES;
  }
}

// Singleton instance
export const protectionDetector = new ProtectionDetector();
