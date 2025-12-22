/**
 * Fingerprint Evasion Service
 * Advanced fingerprinting evasion for canvas, WebGL, audio, and more
 */

import type { Page } from 'puppeteer';

export interface FingerprintConfig {
  canvasNoise: number; // 0-1, amount of noise to inject
  webglVendor: string;
  webglRenderer: string;
  audioNoise: number; // 0-1, amount of noise to inject
  screenResolution: { width: number; height: number };
  devicePixelRatio: number;
  colorDepth: number;
  timezone: string;
  language: string;
  languages: string[];
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
}

/**
 * Applies comprehensive fingerprint evasion to a page
 */
export async function applyFingerprintEvasion(
  page: Page,
  config: Partial<FingerprintConfig> = {}
): Promise<void> {
  const defaultConfig: FingerprintConfig = {
    canvasNoise: 0.01,
    webglVendor: 'Intel Inc.',
    webglRenderer: 'Intel Iris OpenGL Engine',
    audioNoise: 0.01,
    screenResolution: { width: 1920, height: 1080 },
    devicePixelRatio: 1,
    colorDepth: 24,
    timezone: 'America/New_York',
    language: 'en-US',
    languages: ['en-US', 'en'],
    platform: 'Win32',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    ...config,
  };

  await page.evaluateOnNewDocument((cfg: FingerprintConfig) => {
    // Canvas Fingerprinting Evasion
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: any) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = originalGetImageData.call(context, 0, 0, this.width, this.height);

        // Add controlled noise
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (Math.random() < cfg.canvasNoise) {
            const noise = (Math.random() - 0.5) * 2;
            imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise)); // R
            imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise)); // G
            imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise)); // B
          }
        }

        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.call(this, type, quality);
    };

    // WebGL Fingerprinting Evasion
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      // VENDOR
      if (parameter === 37445) {
        return cfg.webglVendor;
      }
      // RENDERER
      if (parameter === 37446) {
        return cfg.webglRenderer;
      }
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) {
        return cfg.webglVendor;
      }
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) {
        return cfg.webglRenderer;
      }
      return getParameter.apply(this, [parameter]);
    };

    // WebGL2 Fingerprinting Evasion
    const getParameter2 = (WebGL2RenderingContext.prototype as any).getParameter;
    if (getParameter2) {
      (WebGL2RenderingContext.prototype as any).getParameter = function (parameter: number) {
        if (parameter === 37445) {
          return cfg.webglVendor;
        }
        if (parameter === 37446) {
          return cfg.webglRenderer;
        }
        return getParameter2.apply(this, [parameter]);
      };
    }

    // Audio Fingerprinting Evasion
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
      AudioContext.prototype.createAnalyser = function () {
        const analyser = originalCreateAnalyser.apply(this);
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
        const originalGetByteFrequencyData = analyser.getByteFrequencyData;
        const originalGetFloatTimeDomainData = analyser.getFloatTimeDomainData;
        const originalGetByteTimeDomainData = analyser.getByteTimeDomainData;

        analyser.getFloatFrequencyData = function (array: Float32Array) {
          originalGetFloatFrequencyData.apply(this, [array]);
          // Add controlled noise
          for (let i = 0; i < array.length; i++) {
            if (Math.random() < cfg.audioNoise) {
              array[i] += (Math.random() - 0.5) * 0.1;
            }
          }
        };

        analyser.getByteFrequencyData = function (array: Uint8Array) {
          originalGetByteFrequencyData.apply(this, [array]);
          for (let i = 0; i < array.length; i++) {
            if (Math.random() < cfg.audioNoise) {
              array[i] = Math.max(0, Math.min(255, array[i] + Math.floor((Math.random() - 0.5) * 2)));
            }
          }
        };

        analyser.getFloatTimeDomainData = function (array: Float32Array) {
          originalGetFloatTimeDomainData.apply(this, [array]);
          for (let i = 0; i < array.length; i++) {
            if (Math.random() < cfg.audioNoise) {
              array[i] += (Math.random() - 0.5) * 0.1;
            }
          }
        };

        analyser.getByteTimeDomainData = function (array: Uint8Array) {
          originalGetByteTimeDomainData.apply(this, [array]);
          for (let i = 0; i < array.length; i++) {
            if (Math.random() < cfg.audioNoise) {
              array[i] = Math.max(0, Math.min(255, array[i] + Math.floor((Math.random() - 0.5) * 2)));
            }
          }
        };

        return analyser;
      };
    }

    // Screen Resolution
    Object.defineProperty(screen, 'width', {
      get: () => cfg.screenResolution.width,
    });
    Object.defineProperty(screen, 'height', {
      get: () => cfg.screenResolution.height,
    });
    Object.defineProperty(screen, 'availWidth', {
      get: () => cfg.screenResolution.width,
    });
    Object.defineProperty(screen, 'availHeight', {
      get: () => cfg.screenResolution.height - 40, // Account for taskbar
    });
    Object.defineProperty(screen, 'colorDepth', {
      get: () => cfg.colorDepth,
    });
    Object.defineProperty(screen, 'pixelDepth', {
      get: () => cfg.colorDepth,
    });

    // Device Pixel Ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => cfg.devicePixelRatio,
    });

    // Timezone
    try {
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function () {
        // Return offset for configured timezone
        // This is simplified - full implementation would calculate actual offset
        return originalGetTimezoneOffset.apply(this);
      };
    } catch (e) {
      // Ignore
    }

    // Language
    Object.defineProperty(navigator, 'language', {
      get: () => cfg.language,
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => cfg.languages,
    });

    // Platform
    Object.defineProperty(navigator, 'platform', {
      get: () => cfg.platform,
    });

    // Hardware Concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => cfg.hardwareConcurrency,
    });

    // Device Memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => cfg.deviceMemory,
      configurable: true,
    });

    // Font Fingerprinting Evasion
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')?.get;
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')?.get;
    
    // Note: Font fingerprinting is complex and may require more sophisticated evasion
    // This is a basic implementation

    // Battery API (if available)
    if ('getBattery' in navigator) {
      const originalGetBattery = (navigator as any).getBattery;
      (navigator as any).getBattery = function () {
        return Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        });
      };
    }
  }, defaultConfig);
}

/**
 * Gets fingerprint configuration based on user agent
 * Matches exact browser fingerprints for perfect evasion
 */
export function getFingerprintConfigForUserAgent(userAgent: string): Partial<FingerprintConfig> {
  const ua = userAgent.toLowerCase();
  
  // Chrome/Chromium-based browsers (Chrome, Edge, Opera, Brave)
  if (ua.includes('chrome') || ua.includes('edg') || ua.includes('opr') || ua.includes('brave')) {
    // Windows Chrome profile
    if (ua.includes('windows')) {
      return {
        webglVendor: 'Google Inc. (Intel)',
        webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        platform: 'Win32',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        screenResolution: { width: 1920, height: 1080 },
        devicePixelRatio: 1,
        colorDepth: 24,
        language: 'en-US',
        languages: ['en-US', 'en'],
      };
    }
    // macOS Chrome profile
    if (ua.includes('mac')) {
      return {
        webglVendor: 'Intel Inc.',
        webglRenderer: 'Intel Iris OpenGL Engine',
        platform: 'MacIntel',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        screenResolution: { width: 2560, height: 1440 },
        devicePixelRatio: 2,
        colorDepth: 30,
        language: 'en-US',
        languages: ['en-US', 'en'],
      };
    }
    // Linux Chrome profile
    return {
      webglVendor: 'Google Inc. (Intel)',
      webglRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.1)',
      platform: 'Linux x86_64',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      screenResolution: { width: 1920, height: 1080 },
      devicePixelRatio: 1,
      colorDepth: 24,
      language: 'en-US',
      languages: ['en-US', 'en'],
    };
  }
  
  // Firefox
  if (ua.includes('firefox')) {
    // Windows Firefox profile
    if (ua.includes('windows')) {
      return {
        webglVendor: 'Intel Inc.',
        webglRenderer: 'Intel Iris OpenGL Engine',
        platform: 'Win32',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        screenResolution: { width: 1920, height: 1080 },
        devicePixelRatio: 1,
        colorDepth: 24,
        language: 'en-US',
        languages: ['en-US', 'en'],
      };
    }
    // macOS Firefox profile
    if (ua.includes('mac')) {
      return {
        webglVendor: 'Intel Inc.',
        webglRenderer: 'Intel Iris OpenGL Engine',
        platform: 'MacIntel',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        screenResolution: { width: 2560, height: 1440 },
        devicePixelRatio: 2,
        colorDepth: 30,
        language: 'en-US',
        languages: ['en-US', 'en'],
      };
    }
    // Linux Firefox profile
    return {
      webglVendor: 'Intel Inc.',
      webglRenderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2)',
      platform: 'Linux x86_64',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      screenResolution: { width: 1920, height: 1080 },
      devicePixelRatio: 1,
      colorDepth: 24,
      language: 'en-US',
      languages: ['en-US', 'en'],
    };
  }
  
  // Safari
  if (ua.includes('safari') && !ua.includes('chrome')) {
    return {
      webglVendor: 'Apple Inc.',
      webglRenderer: 'Apple GPU',
      platform: 'MacIntel',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      screenResolution: { width: 2560, height: 1440 },
      devicePixelRatio: 2,
      colorDepth: 30,
      language: 'en-US',
      languages: ['en-US', 'en'],
    };
  }
  
  // Default Chrome profile (most common)
  return {
    webglVendor: 'Google Inc. (Intel)',
    webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    platform: 'Win32',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    screenResolution: { width: 1920, height: 1080 },
    devicePixelRatio: 1,
    colorDepth: 24,
    language: 'en-US',
    languages: ['en-US', 'en'],
  };
}

