/**
 * Incremental Updater
 * Only scrapes changed pages and assets
 */

import * as crypto from 'crypto';
import { CacheManager, type PageCacheEntry, type AssetCacheEntry } from './cacheManager.js';

export interface ChangeDetection {
  url: string;
  hasChanged: boolean;
  reason: 'new' | 'etag' | 'last-modified' | 'content-hash' | 'unchanged';
  oldHash?: string;
  newHash?: string;
}

export interface IncrementalUpdateResult {
  pagesToScrape: string[];
  pagesUnchanged: string[];
  assetsToDownload: string[];
  assetsUnchanged: string[];
  changes: ChangeDetection[];
}

/**
 * Incremental Updater
 * Detects changes and only updates what's needed
 */
export class IncrementalUpdater {
  private cacheManager: CacheManager;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Detects which pages have changed
   */
  async detectPageChanges(
    urls: string[],
    etags?: Map<string, string>,
    lastModified?: Map<string, string>
  ): Promise<ChangeDetection[]> {
    const changes: ChangeDetection[] = [];

    for (const url of urls) {
      const cached = await this.cacheManager.getPage(
        url,
        etags?.get(url),
        lastModified?.get(url)
      );

      if (!cached) {
        changes.push({
          url,
          hasChanged: true,
          reason: 'new',
        });
        continue;
      }

      // Check ETag if provided
      if (etags?.has(url)) {
        const newEtag = etags.get(url)!;
        if (cached.etag && cached.etag !== newEtag) {
          changes.push({
            url,
            hasChanged: true,
            reason: 'etag',
            oldHash: cached.contentHash,
          });
          continue;
        }
      }

      // Check Last-Modified if provided
      if (lastModified?.has(url)) {
        const newLastModified = lastModified.get(url)!;
        if (cached.lastModified && cached.lastModified !== newLastModified) {
          changes.push({
            url,
            hasChanged: true,
            reason: 'last-modified',
            oldHash: cached.contentHash,
          });
          continue;
        }
      }

      // Page is unchanged
      changes.push({
        url,
        hasChanged: false,
        reason: 'unchanged',
        oldHash: cached.contentHash,
      });
    }

    return changes;
  }

  /**
   * Detects which assets have changed
   */
  async detectAssetChanges(
    assetUrls: Array<{ url: string; contentHash?: string }>
  ): Promise<ChangeDetection[]> {
    const changes: ChangeDetection[] = [];

    for (const asset of assetUrls) {
      const cached = await this.cacheManager.getAsset(asset.url);

      if (!cached) {
        changes.push({
          url: asset.url,
          hasChanged: true,
          reason: 'new',
        });
        continue;
      }

      // Check content hash if provided
      if (asset.contentHash) {
        if (cached.contentHash !== asset.contentHash) {
          changes.push({
            url: asset.url,
            hasChanged: true,
            reason: 'content-hash',
            oldHash: cached.contentHash,
            newHash: asset.contentHash,
          });
          continue;
        }
      }

      // Asset is unchanged
      changes.push({
        url: asset.url,
        hasChanged: false,
        reason: 'unchanged',
        oldHash: cached.contentHash,
      });
    }

    return changes;
  }

  /**
   * Gets pages that need to be scraped
   */
  async getPagesToScrape(
    urls: string[],
    etags?: Map<string, string>,
    lastModified?: Map<string, string>
  ): Promise<IncrementalUpdateResult> {
    const changes = await this.detectPageChanges(urls, etags, lastModified);

    const pagesToScrape = changes
      .filter(c => c.hasChanged)
      .map(c => c.url);

    const pagesUnchanged = changes
      .filter(c => !c.hasChanged)
      .map(c => c.url);

    return {
      pagesToScrape,
      pagesUnchanged,
      assetsToDownload: [],
      assetsUnchanged: [],
      changes,
    };
  }

  /**
   * Gets assets that need to be downloaded
   */
  async getAssetsToDownload(
    assetUrls: Array<{ url: string; contentHash?: string }>
  ): Promise<string[]> {
    const changes = await this.detectAssetChanges(assetUrls);
    return changes.filter(c => c.hasChanged).map(c => c.url);
  }

  /**
   * Gets complete incremental update plan
   */
  async getUpdatePlan(
    urls: string[],
    assetUrls: Array<{ url: string; contentHash?: string }>,
    etags?: Map<string, string>,
    lastModified?: Map<string, string>
  ): Promise<IncrementalUpdateResult> {
    const pageChanges = await this.detectPageChanges(urls, etags, lastModified);
    const assetChanges = await this.detectAssetChanges(assetUrls);

    const pagesToScrape = pageChanges
      .filter(c => c.hasChanged)
      .map(c => c.url);

    const pagesUnchanged = pageChanges
      .filter(c => !c.hasChanged)
      .map(c => c.url);

    const assetsToDownload = assetChanges
      .filter(c => c.hasChanged)
      .map(c => c.url);

    const assetsUnchanged = assetChanges
      .filter(c => !c.hasChanged)
      .map(c => c.url);

    return {
      pagesToScrape,
      pagesUnchanged,
      assetsToDownload,
      assetsUnchanged,
      changes: [...pageChanges, ...assetChanges],
    };
  }

  /**
   * Calculates content hash for a string
   */
  calculateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Gets cached page content hash
   */
  async getCachedPageHash(url: string): Promise<string | null> {
    const cached = await this.cacheManager.getPage(url);
    return cached?.contentHash || null;
  }

  /**
   * Gets cached asset content hash
   */
  async getCachedAssetHash(url: string): Promise<string | null> {
    const cached = await this.cacheManager.getAsset(url);
    return cached?.contentHash || null;
  }
}

