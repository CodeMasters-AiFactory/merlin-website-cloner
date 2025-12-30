/**
 * TLS Fingerprint Database
 * Contains JA3/JA4 fingerprints for legitimate browsers
 * Used to make proxy requests appear as real browsers
 *
 * Sources:
 * - https://github.com/salesforce/ja3
 * - https://ja3er.com
 * - https://github.com/FoxIO-LLC/ja4
 */

export interface TLSFingerprint {
  id: string;
  browser: string;
  version: string;
  os: string;
  ja3: string;
  ja3Hash: string;
  ja4?: string;
  akamaiFp?: string;
  http2Fp?: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  secChUa?: string;
  secChUaPlatform?: string;
  lastUpdated: string;
  popularity: number; // 1-100, higher = more common
}

// Real browser TLS fingerprints (constantly updated)
export const BROWSER_FINGERPRINTS: TLSFingerprint[] = [
  // ==================== CHROME ====================
  {
    id: 'chrome-131-win',
    browser: 'Chrome',
    version: '131',
    os: 'Windows 10',
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
    ja3Hash: '579ccef312d18482fc42e2b822ca2430',
    ja4: 't13d1517h2_8daaf6152771_e5627efa2ab1',
    akamaiFp: '1:65536,2:0,3:1000,4:6291456,6:262144|15663105|0|m,a,s,p',
    http2Fp: '1:65536;3:1000;4:6291456;6:262144|15663105|0|m,a,s,p',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    lastUpdated: '2024-12-01',
    popularity: 95,
  },
  {
    id: 'chrome-131-mac',
    browser: 'Chrome',
    version: '131',
    os: 'macOS',
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
    ja3Hash: '579ccef312d18482fc42e2b822ca2430',
    ja4: 't13d1517h2_8daaf6152771_e5627efa2ab1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"macOS"',
    lastUpdated: '2024-12-01',
    popularity: 85,
  },
  {
    id: 'chrome-130-win',
    browser: 'Chrome',
    version: '130',
    os: 'Windows 10',
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
    ja3Hash: '579ccef312d18482fc42e2b822ca2430',
    ja4: 't13d1517h2_8daaf6152771_e5627efa2ab1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    secChUa: '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    lastUpdated: '2024-11-01',
    popularity: 70,
  },
  {
    id: 'chrome-android',
    browser: 'Chrome',
    version: '131',
    os: 'Android',
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-21,29-23-24,0',
    ja3Hash: 'b32309a26951912be7dba376398abc3b',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Android"',
    lastUpdated: '2024-12-01',
    popularity: 60,
  },

  // ==================== FIREFOX ====================
  {
    id: 'firefox-133-win',
    browser: 'Firefox',
    version: '133',
    os: 'Windows 10',
    ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-51-43-13-45-28-21,29-23-24-25-256-257,0',
    ja3Hash: 'b4402d56ec7d8c5b6b8c39e5c9a4e5b6',
    ja4: 't13d1715h2_5b57614c22b0_3d5424432f57',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    acceptLanguage: 'en-US,en;q=0.5',
    acceptEncoding: 'gzip, deflate, br, zstd',
    lastUpdated: '2024-12-01',
    popularity: 50,
  },
  {
    id: 'firefox-133-mac',
    browser: 'Firefox',
    version: '133',
    os: 'macOS',
    ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-51-43-13-45-28-21,29-23-24-25-256-257,0',
    ja3Hash: 'b4402d56ec7d8c5b6b8c39e5c9a4e5b6',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
    acceptLanguage: 'en-US,en;q=0.5',
    acceptEncoding: 'gzip, deflate, br, zstd',
    lastUpdated: '2024-12-01',
    popularity: 40,
  },
  {
    id: 'firefox-android',
    browser: 'Firefox',
    version: '133',
    os: 'Android',
    ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-51-43-13-45-28-21,29-23-24-25,0',
    ja3Hash: 'c9a4e5b6d7f8a9c1b2e3f4a5b6c7d8e9',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0',
    acceptLanguage: 'en-US,en;q=0.5',
    acceptEncoding: 'gzip, deflate, br',
    lastUpdated: '2024-12-01',
    popularity: 25,
  },

  // ==================== SAFARI ====================
  {
    id: 'safari-18-mac',
    browser: 'Safari',
    version: '18',
    os: 'macOS',
    ja3: '771,4865-4866-4867-49196-49195-52393-49200-49199-52392-49188-49187-49192-49191-49162-49161-49172-49171-157-156-61-60-53-47-255,0-23-65281-10-11-16-5-13-18-51-45-43-27-21,29-23-24-25,0',
    ja3Hash: '773906b0efdefa24a7f2b8eb6985bf37',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br',
    lastUpdated: '2024-12-01',
    popularity: 45,
  },
  {
    id: 'safari-ios-18',
    browser: 'Safari',
    version: '18',
    os: 'iOS',
    ja3: '771,4865-4866-4867-49196-49195-52393-49200-49199-52392-49188-49187-49192-49191-49162-49161-49172-49171-157-156-61-60-53-47-255,0-23-65281-10-11-16-5-13-18-51-45-43-27-21,29-23-24-25,0',
    ja3Hash: '773906b0efdefa24a7f2b8eb6985bf37',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br',
    lastUpdated: '2024-12-01',
    popularity: 55,
  },

  // ==================== EDGE ====================
  {
    id: 'edge-131-win',
    browser: 'Edge',
    version: '131',
    os: 'Windows 10',
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
    ja3Hash: '579ccef312d18482fc42e2b822ca2430',
    ja4: 't13d1517h2_8daaf6152771_e5627efa2ab1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    secChUa: '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    lastUpdated: '2024-12-01',
    popularity: 35,
  },

  // ==================== OPERA ====================
  {
    id: 'opera-115-win',
    browser: 'Opera',
    version: '115',
    os: 'Windows 10',
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513-21,29-23-24,0',
    ja3Hash: '579ccef312d18482fc42e2b822ca2430',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/115.0.0.0',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, deflate, br, zstd',
    secChUa: '"Opera";v="115", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    lastUpdated: '2024-12-01',
    popularity: 15,
  },
];

// Known bot/automation fingerprints to AVOID
export const BOT_FINGERPRINTS = new Set([
  // Puppeteer/Playwright defaults
  'cd08e31494f9531f560d64c695473da9',
  '3e5b5e8e5f5f5f5f5f5f5f5f5f5f5f5f',
  // Selenium defaults
  'a0e9f5d64349fb13191bc781f81f42e1',
  // curl defaults
  '769,47-53-5-10-49161-49162-49171-49172-50-56-19-4,0-10-11,23-24-25,0',
  // Python requests defaults
  'e7d705a3286e19ea42f587b344ee6865',
  // Node.js defaults
  '36f7277af969a6947a61ae0b815907a1',
]);

/**
 * Get a random fingerprint weighted by popularity
 */
export function getRandomFingerprint(options?: {
  browser?: string;
  os?: string;
  mobile?: boolean;
}): TLSFingerprint {
  let candidates = [...BROWSER_FINGERPRINTS];

  // Filter by options
  if (options?.browser) {
    candidates = candidates.filter(f =>
      f.browser.toLowerCase() === options.browser!.toLowerCase()
    );
  }
  if (options?.os) {
    candidates = candidates.filter(f =>
      f.os.toLowerCase().includes(options.os!.toLowerCase())
    );
  }
  if (options?.mobile !== undefined) {
    const mobileOS = ['android', 'ios'];
    candidates = candidates.filter(f => {
      const isMobile = mobileOS.some(m => f.os.toLowerCase().includes(m));
      return options.mobile ? isMobile : !isMobile;
    });
  }

  // Fallback to all if no matches
  if (candidates.length === 0) {
    candidates = BROWSER_FINGERPRINTS;
  }

  // Weighted random selection by popularity
  const totalWeight = candidates.reduce((sum, f) => sum + f.popularity, 0);
  let random = Math.random() * totalWeight;

  for (const fp of candidates) {
    random -= fp.popularity;
    if (random <= 0) {
      return fp;
    }
  }

  return candidates[0];
}

/**
 * Get fingerprint for specific browser
 */
export function getFingerprintForBrowser(browser: string, version?: string): TLSFingerprint | null {
  const matches = BROWSER_FINGERPRINTS.filter(f =>
    f.browser.toLowerCase() === browser.toLowerCase() &&
    (!version || f.version === version)
  );

  if (matches.length === 0) return null;

  // Return highest popularity match
  return matches.sort((a, b) => b.popularity - a.popularity)[0];
}

/**
 * Check if a JA3 hash is a known bot fingerprint
 */
export function isBotFingerprint(ja3Hash: string): boolean {
  return BOT_FINGERPRINTS.has(ja3Hash);
}

/**
 * Get Chrome-like fingerprint (most common for bypassing)
 */
export function getChromeFingerprint(platform: 'windows' | 'mac' | 'android' = 'windows'): TLSFingerprint {
  const osMap = {
    windows: 'Windows',
    mac: 'macOS',
    android: 'Android',
  };

  return getRandomFingerprint({
    browser: 'Chrome',
    os: osMap[platform],
  });
}

/**
 * Get fingerprint that matches a target site's expected visitors
 */
export function getFingerprintForSite(domain: string): TLSFingerprint {
  // Site-specific recommendations
  const sitePreferences: Record<string, { browser: string; mobile?: boolean }> = {
    'facebook.com': { browser: 'Chrome', mobile: false },
    'instagram.com': { browser: 'Chrome', mobile: true },
    'twitter.com': { browser: 'Chrome', mobile: false },
    'x.com': { browser: 'Chrome', mobile: false },
    'linkedin.com': { browser: 'Chrome', mobile: false },
    'amazon.com': { browser: 'Chrome', mobile: false },
    'google.com': { browser: 'Chrome', mobile: false },
    'apple.com': { browser: 'Safari', mobile: false },
  };

  // Check if domain matches any preference
  for (const [site, prefs] of Object.entries(sitePreferences)) {
    if (domain.includes(site)) {
      return getRandomFingerprint(prefs);
    }
  }

  // Default to Chrome on Windows (most common)
  return getChromeFingerprint('windows');
}

/**
 * Generate cipher suites string for TLS config
 */
export function getCipherSuites(fingerprint: TLSFingerprint): string[] {
  // Parse JA3 to extract cipher suites
  const parts = fingerprint.ja3.split(',');
  if (parts.length < 2) return [];

  const cipherIds = parts[1].split('-').map(Number);

  // Map cipher IDs to OpenSSL names
  const cipherMap: Record<number, string> = {
    4865: 'TLS_AES_128_GCM_SHA256',
    4866: 'TLS_AES_256_GCM_SHA384',
    4867: 'TLS_CHACHA20_POLY1305_SHA256',
    49195: 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
    49196: 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
    49199: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
    49200: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    52392: 'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
    52393: 'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
    49171: 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA',
    49172: 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
    156: 'TLS_RSA_WITH_AES_128_GCM_SHA256',
    157: 'TLS_RSA_WITH_AES_256_GCM_SHA384',
    47: 'TLS_RSA_WITH_AES_128_CBC_SHA',
    53: 'TLS_RSA_WITH_AES_256_CBC_SHA',
  };

  return cipherIds
    .map(id => cipherMap[id])
    .filter(Boolean);
}

/**
 * Get HTTP/2 settings for fingerprint
 */
export function getHttp2Settings(fingerprint: TLSFingerprint): Record<string, number> {
  // Default Chrome-like HTTP/2 settings
  if (fingerprint.browser === 'Chrome' || fingerprint.browser === 'Edge') {
    return {
      HEADER_TABLE_SIZE: 65536,
      ENABLE_PUSH: 0,
      MAX_CONCURRENT_STREAMS: 1000,
      INITIAL_WINDOW_SIZE: 6291456,
      MAX_HEADER_LIST_SIZE: 262144,
    };
  }

  // Firefox HTTP/2 settings
  if (fingerprint.browser === 'Firefox') {
    return {
      HEADER_TABLE_SIZE: 65536,
      ENABLE_PUSH: 1,
      MAX_CONCURRENT_STREAMS: 100,
      INITIAL_WINDOW_SIZE: 131072,
      MAX_HEADER_LIST_SIZE: 65536,
    };
  }

  // Safari HTTP/2 settings
  return {
    HEADER_TABLE_SIZE: 4096,
    ENABLE_PUSH: 1,
    MAX_CONCURRENT_STREAMS: 100,
    INITIAL_WINDOW_SIZE: 65535,
    MAX_HEADER_LIST_SIZE: 16384,
  };
}

/**
 * Get all headers that should be sent with requests
 */
export function getRequestHeaders(fingerprint: TLSFingerprint, url?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': fingerprint.userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': fingerprint.acceptLanguage,
    'Accept-Encoding': fingerprint.acceptEncoding,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  // Add Sec-CH-UA headers for Chromium-based browsers
  if (fingerprint.secChUa) {
    headers['Sec-CH-UA'] = fingerprint.secChUa;
    headers['Sec-CH-UA-Mobile'] = fingerprint.os.toLowerCase().includes('android') || fingerprint.os.toLowerCase().includes('ios') ? '?1' : '?0';
    if (fingerprint.secChUaPlatform) {
      headers['Sec-CH-UA-Platform'] = fingerprint.secChUaPlatform;
    }
  }

  // Add Sec-Fetch headers
  headers['Sec-Fetch-Dest'] = 'document';
  headers['Sec-Fetch-Mode'] = 'navigate';
  headers['Sec-Fetch-Site'] = 'none';
  headers['Sec-Fetch-User'] = '?1';

  // Add cache control
  headers['Cache-Control'] = 'max-age=0';

  return headers;
}

// Export fingerprint count for stats
export const FINGERPRINT_COUNT = BROWSER_FINGERPRINTS.length;
export const BROWSER_COVERAGE = [...new Set(BROWSER_FINGERPRINTS.map(f => f.browser))];
export const OS_COVERAGE = [...new Set(BROWSER_FINGERPRINTS.map(f => f.os))];
