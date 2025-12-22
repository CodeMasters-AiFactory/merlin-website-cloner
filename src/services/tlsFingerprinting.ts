/**
 * TLS Fingerprinting Service
 * Matches TLS client hello fingerprints to real browsers
 * Implements JA3 fingerprint matching
 */

export interface TLSFingerprint {
  ja3: string;
  ja3Hash: string;
  cipherSuites: string[];
  extensions: string[];
  curves: string[];
  pointFormats: string[];
}

export interface BrowserTLSProfile {
  browser: string;
  version: string;
  fingerprint: TLSFingerprint;
  userAgent: string;
}

/**
 * Common browser TLS fingerprints
 * These match real browser TLS handshakes
 */
export const BROWSER_TLS_PROFILES: BrowserTLSProfile[] = [
  {
    browser: 'Chrome',
    version: '120',
    fingerprint: {
      ja3: '772,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
      ja3Hash: 'b32309a26951912be7dba376398abc3b',
      cipherSuites: [
        'TLS_AES_128_GCM_SHA256',
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
        'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
        'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
        'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
        'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
        'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
      ],
      extensions: [
        'server_name',
        'status_request',
        'supported_groups',
        'signature_algorithms',
        'application_layer_protocol_negotiation',
        'signed_certificate_timestamp',
        'padding',
        'key_share',
        'supported_versions',
        'psk_key_exchange_modes',
        'compress_certificate',
        'record_size_limit',
      ],
      curves: ['X25519', 'P-256', 'P-384'],
      pointFormats: ['uncompressed'],
    },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    browser: 'Firefox',
    version: '121',
    fingerprint: {
      ja3: '772,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0',
      ja3Hash: 'e7d705a3286e19ea42f587b344ee6865',
      cipherSuites: [
        'TLS_AES_128_GCM_SHA256',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_256_GCM_SHA384',
        'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
        'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
        'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
        'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
        'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
        'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
      ],
      extensions: [
        'server_name',
        'status_request',
        'supported_groups',
        'signature_algorithms',
        'application_layer_protocol_negotiation',
        'signed_certificate_timestamp',
        'padding',
        'key_share',
        'supported_versions',
        'psk_key_exchange_modes',
      ],
      curves: ['X25519', 'P-256', 'P-384', 'P-521'],
      pointFormats: ['uncompressed'],
    },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  },
  {
    browser: 'Safari',
    version: '17',
    fingerprint: {
      ja3: '772,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13,29-23-24,0',
      ja3Hash: 'c4aaf13b5e23c996016f3f3c2a7833c3',
      cipherSuites: [
        'TLS_AES_128_GCM_SHA256',
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
        'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
        'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
        'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
        'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
        'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
      ],
      extensions: [
        'server_name',
        'status_request',
        'supported_groups',
        'signature_algorithms',
        'application_layer_protocol_negotiation',
        'signed_certificate_timestamp',
        'padding',
        'key_share',
        'supported_versions',
      ],
      curves: ['X25519', 'P-256', 'P-384'],
      pointFormats: ['uncompressed'],
    },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  },
];

export class TLSFingerprintMatcher {
  /**
   * Gets a TLS fingerprint profile for a given user agent
   * Enhanced matching with better browser detection
   */
  static getProfileForUserAgent(userAgent: string): BrowserTLSProfile | null {
    const ua = userAgent.toLowerCase();
    
    // Edge (Chromium-based)
    if (ua.includes('edg') || ua.includes('edge/')) {
      // Edge uses Chrome-like TLS but with slight variations
      // For now, use Chrome profile as Edge is Chromium-based
      return BROWSER_TLS_PROFILES.find((p) => p.browser === 'Chrome') || null;
    }
    
    // Chrome (but not Edge)
    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
      return BROWSER_TLS_PROFILES.find((p) => p.browser === 'Chrome') || null;
    }
    
    // Firefox
    if (ua.includes('firefox')) {
      return BROWSER_TLS_PROFILES.find((p) => p.browser === 'Firefox') || null;
    }
    
    // Safari (but not Chrome-based)
    if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios')) {
      return BROWSER_TLS_PROFILES.find((p) => p.browser === 'Safari') || null;
    }
    
    // Opera (Chromium-based, similar to Chrome)
    if (ua.includes('opr') || ua.includes('opera')) {
      return BROWSER_TLS_PROFILES.find((p) => p.browser === 'Chrome') || null;
    }
    
    // Brave (Chromium-based)
    if (ua.includes('brave')) {
      return BROWSER_TLS_PROFILES.find((p) => p.browser === 'Chrome') || null;
    }
    
    // Default to Chrome (most common)
    return BROWSER_TLS_PROFILES[0];
  }
  
  /**
   * Validates TLS fingerprint against known browser profiles
   */
  static validateFingerprint(fingerprint: TLSFingerprint): {
    isValid: boolean;
    matches: BrowserTLSProfile[];
  } {
    const matches = BROWSER_TLS_PROFILES.filter(
      (profile) => profile.fingerprint.ja3Hash === fingerprint.ja3Hash
    );
    
    return {
      isValid: matches.length > 0,
      matches,
    };
  }
  
  /**
   * Gets the best matching profile based on user agent and fingerprint
   */
  static getBestMatch(
    userAgent: string,
    fingerprint?: TLSFingerprint
  ): BrowserTLSProfile {
    const uaProfile = this.getProfileForUserAgent(userAgent);
    
    // If fingerprint is provided, try to match it
    if (fingerprint) {
      const validation = this.validateFingerprint(fingerprint);
      if (validation.isValid && validation.matches.length > 0) {
        // Prefer profile that matches both UA and fingerprint
        const matching = validation.matches.find(
          (m) => m.browser === uaProfile?.browser
        );
        if (matching) {
          return matching;
        }
        // Otherwise return first fingerprint match
        return validation.matches[0];
      }
    }
    
    // Fall back to UA-based profile
    return uaProfile || BROWSER_TLS_PROFILES[0];
  }

  /**
   * Gets TLS fingerprint configuration for Puppeteer
   * Note: Puppeteer doesn't directly support TLS fingerprinting,
   * but we can document the expected fingerprint for reference
   */
  static getTLSConfig(userAgent: string): {
    cipherSuites: string[];
    extensions: string[];
    curves: string[];
  } {
    const profile = this.getProfileForUserAgent(userAgent);
    if (!profile) {
      return {
        cipherSuites: BROWSER_TLS_PROFILES[0].fingerprint.cipherSuites,
        extensions: BROWSER_TLS_PROFILES[0].fingerprint.extensions,
        curves: BROWSER_TLS_PROFILES[0].fingerprint.curves,
      };
    }
    return {
      cipherSuites: profile.fingerprint.cipherSuites,
      extensions: profile.fingerprint.extensions,
      curves: profile.fingerprint.curves,
    };
  }

  /**
   * Generates JA3 fingerprint string
   */
  static generateJA3(fingerprint: TLSFingerprint): string {
    return fingerprint.ja3;
  }

  /**
   * Generates JA3 hash
   */
  static generateJA3Hash(fingerprint: TLSFingerprint): string {
    return fingerprint.ja3Hash;
  }
}

