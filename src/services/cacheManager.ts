/**
 * Cache Manager
 * Intelligent caching system for pages and assets
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createCacheStorage,
  type ICacheStorage,
  type CacheStorageOptions,
  type CacheEntry,
} from '../utils/cacheStorage.js';

export interface PageCacheEntry {
  url: string;
  content: string;
  html: string;
  assets: string[];
  etag?: string;
  lastModified?: string;
  contentHash: string;
  timestamp: number;
}

export interface AssetCacheEntry {
  url: string;
  localPath: string;
  mimeType: string;
  size: number;
  contentHash: string;
  timestamp: number;
}

export interface CacheStats {
  pageHits: number;
  pageMisses: number;
  assetHits: number;
  assetMisses: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  cacheSize: number;
}

/**
 * Cache Manager for pages and assets
 */
export class CacheManager {
  private pageCache: ICacheStorage;
  private assetCache: ICacheStorage;
  private stats: CacheStats = {
    pageHits: 0,
    pageMisses: 0,
    assetHits: 0,
    assetMisses: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    cacheSize: 0,
  };

  constructor(options: CacheStorageOptions = { type: 'file' }) {
    this.pageCache = createCacheStorage({
      ...options,
      filePath: options.filePath ? path.join(options.filePath, 'pages') : './cache/pages',
    });
    this.assetCache = createCacheStorage({
      ...options,
      filePath: options.filePath ? path.join(options.filePath, 'assets') : './cache/assets',
    });
  }

  /**
   * Generates cache key for a URL
   */
  private getCacheKey(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  /**
   * Generates content hash
   */
  private getContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Gets cached page
   */
  async getPage(url: string, etag?: string, lastModified?: string): Promise<PageCacheEntry | null> {
    const key = this.getCacheKey(url);
    const entry = await this.pageCache.get<PageCacheEntry>(key);

    if (!entry) {
      this.stats.pageMisses++;
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    const pageEntry = entry.value;

    // Check ETag/Last-Modified if provided
    if (etag && pageEntry.etag && etag !== pageEntry.etag) {
      this.stats.pageMisses++;
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    if (lastModified && pageEntry.lastModified && lastModified !== pageEntry.lastModified) {
      this.stats.pageMisses++;
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    this.stats.pageHits++;
    this.stats.totalHits++;
    this.updateHitRate();
    return pageEntry;
  }

  /**
   * Caches a page
   */
  async cachePage(
    url: string,
    html: string,
    assets: string[],
    etag?: string,
    lastModified?: string,
    ttl?: number
  ): Promise<void> {
    const key = this.getCacheKey(url);
    const contentHash = this.getContentHash(html);

    const entry: PageCacheEntry = {
      url,
      content: html,
      html,
      assets,
      etag,
      lastModified,
      contentHash,
      timestamp: Date.now(),
    };

    await this.pageCache.set(key, entry, ttl);
    await this.updateCacheSize();
  }

  /**
   * Gets cached asset
   */
  async getAsset(url: string): Promise<AssetCacheEntry | null> {
    const key = this.getCacheKey(url);
    const entry = await this.assetCache.get<AssetCacheEntry>(key);

    if (!entry) {
      this.stats.assetMisses++;
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    this.stats.assetHits++;
    this.stats.totalHits++;
    this.updateHitRate();
    return entry.value;
  }

  /**
   * Caches an asset
   */
  async cacheAsset(
    url: string,
    localPath: string,
    mimeType: string,
    size: number,
    contentHash: string,
    ttl?: number
  ): Promise<void> {
    const key = this.getCacheKey(url);

    const entry: AssetCacheEntry = {
      url,
      localPath,
      mimeType,
      size,
      contentHash,
      timestamp: Date.now(),
    };

    await this.assetCache.set(key, entry, ttl);
    await this.updateCacheSize();
  }

  /**
   * Checks if page is cached and valid
   */
  async isPageCached(url: string, etag?: string, lastModified?: string): Promise<boolean> {
    const cached = await this.getPage(url, etag, lastModified);
    return cached !== null;
  }

  /**
   * Checks if asset is cached
   */
  async isAssetCached(url: string): Promise<boolean> {
    const cached = await this.getAsset(url);
    return cached !== null;
  }

  /**
   * Invalidates page cache
   */
  async invalidatePage(url: string): Promise<void> {
    const key = this.getCacheKey(url);
    await this.pageCache.delete(key);
    await this.updateCacheSize();
  }

  /**
   * Invalidates asset cache
   */
  async invalidateAsset(url: string): Promise<void> {
    const key = this.getCacheKey(url);
    await this.assetCache.delete(key);
    await this.updateCacheSize();
  }

  /**
   * Clears all caches
   */
  async clearAll(): Promise<void> {
    await this.pageCache.clear();
    await this.assetCache.clear();
    this.stats = {
      pageHits: 0,
      pageMisses: 0,
      assetHits: 0,
      assetMisses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      cacheSize: 0,
    };
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Updates hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  /**
   * Updates cache size
   */
  private async updateCacheSize(): Promise<void> {
    const pageSize = await this.pageCache.size();
    const assetSize = await this.assetCache.size();
    this.stats.cacheSize = pageSize + assetSize;
  }

  /**
   * Cleans up expired entries
   */
  async cleanup(): Promise<void> {
    // File and Redis storage handle expiration automatically
    // Memory storage has its own cleanup
    await this.updateCacheSize();
  }

  /**
   * Gets cache keys (for debugging)
   */
  async getPageKeys(): Promise<string[]> {
    return await this.pageCache.keys();
  }

  async getAssetKeys(): Promise<string[]> {
    return await this.assetCache.keys();
  }
}

