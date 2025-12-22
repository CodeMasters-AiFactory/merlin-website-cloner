/**
 * CDN Asset Optimizer
 * Detects and optimizes CDN assets (Cloudflare, CloudFront, etc.)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';

export interface CDNProvider {
  name: string;
  domains: string[];
  cacheHeaders: string[];
}

export interface CDNAsset {
  url: string;
  provider: string;
  cached: boolean;
  cachePath?: string;
  cacheKey?: string;
}

/**
 * Common CDN providers and their domains
 */
const CDN_PROVIDERS: CDNProvider[] = [
  {
    name: 'Cloudflare',
    domains: ['cloudflare.com', 'cf-cdn.com', 'cloudflareinsights.com'],
    cacheHeaders: ['cf-cache-status', 'cf-ray'],
  },
  {
    name: 'CloudFront',
    domains: ['cloudfront.net', 'amazonaws.com'],
    cacheHeaders: ['x-amz-cf-id', 'x-cache'],
  },
  {
    name: 'Fastly',
    domains: ['fastly.com', 'fastly.net'],
    cacheHeaders: ['x-cache', 'x-served-by'],
  },
  {
    name: 'Akamai',
    domains: ['akamai.net', 'akamaihd.net', 'akamaized.net'],
    cacheHeaders: ['x-cache', 'x-akamai-transformed'],
  },
  {
    name: 'MaxCDN',
    domains: ['maxcdn.com', 'bootstrapcdn.com'],
    cacheHeaders: ['x-cache'],
  },
  {
    name: 'jsDelivr',
    domains: ['jsdelivr.net', 'cdnjs.com'],
    cacheHeaders: ['x-cache'],
  },
  {
    name: 'cdnjs',
    domains: ['cdnjs.cloudflare.com'],
    cacheHeaders: ['cf-cache-status'],
  },
];

/**
 * CDN Optimizer Service
 */
export class CDNOptimizer {
  private cacheDir: string;
  private cacheMap: Map<string, CDNAsset> = new Map();

  constructor(cacheDir: string = './cdn-cache') {
    this.cacheDir = cacheDir;
  }

  /**
   * Detects CDN provider for a URL
   */
  detectCDNProvider(url: string): CDNProvider | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      for (const provider of CDN_PROVIDERS) {
        if (provider.domains.some(domain => hostname.includes(domain))) {
          return provider;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if asset is from a CDN
   */
  isCDNAsset(url: string): boolean {
    return this.detectCDNProvider(url) !== null;
  }

  /**
   * Gets cache key for CDN asset
   */
  getCacheKey(url: string): string {
    try {
      const urlObj = new URL(url);
      // Use hostname + pathname as cache key (ignore query params for CDN assets)
      const key = `${urlObj.hostname}${urlObj.pathname}`;
      return key.replace(/[^a-zA-Z0-9.-]/g, '_');
    } catch {
      return url.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
  }

  /**
   * Caches CDN asset globally
   */
  async cacheCDNAsset(url: string, data: Buffer, headers: Record<string, string>): Promise<string> {
    const provider = this.detectCDNProvider(url);
    if (!provider) {
      throw new Error('Not a CDN asset');
    }

    await fs.mkdir(this.cacheDir, { recursive: true });
    const cacheKey = this.getCacheKey(url);
    const cachePath = path.join(this.cacheDir, `${cacheKey}.cache`);

    // Save asset
    await fs.writeFile(cachePath, data);

    // Save metadata
    const metadataPath = path.join(this.cacheDir, `${cacheKey}.meta.json`);
    await fs.writeFile(
      metadataPath,
      JSON.stringify({
        url,
        provider: provider.name,
        headers,
        cachedAt: Date.now(),
      }),
      'utf-8'
    );

    const asset: CDNAsset = {
      url,
      provider: provider.name,
      cached: true,
      cachePath,
      cacheKey,
    };

    this.cacheMap.set(url, asset);

    return cachePath;
  }

  /**
   * Gets cached CDN asset
   */
  async getCachedAsset(url: string): Promise<Buffer | null> {
    const asset = this.cacheMap.get(url);
    if (!asset || !asset.cachePath) {
      return null;
    }

    try {
      const data = await fs.readFile(asset.cachePath);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Checks if CDN asset is cached
   */
  isCached(url: string): boolean {
    return this.cacheMap.has(url);
  }

  /**
   * Gets all cached CDN assets
   */
  getCachedAssets(): CDNAsset[] {
    return Array.from(this.cacheMap.values());
  }

  /**
   * Clears CDN cache
   */
  async clearCache(): Promise<void> {
    this.cacheMap.clear();
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }
}

