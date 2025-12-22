/**
 * Asset Deduplication Service
 * Detects identical assets and shares storage using symlinks or references
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface DeduplicatedAsset {
  originalPath: string;
  sharedPath: string;
  hash: string;
  size: number;
  references: string[]; // All paths that reference this asset
}

/**
 * Asset Deduplicator Service
 */
export class AssetDeduplicator {
  private sharedDir: string;
  private hashMap: Map<string, DeduplicatedAsset> = new Map(); // hash -> asset
  private pathMap: Map<string, string> = new Map(); // original path -> hash

  constructor(sharedDir: string = './shared-assets') {
    this.sharedDir = sharedDir;
  }

  /**
   * Calculates file hash
   */
  async calculateHash(filePath: string): Promise<string> {
    try {
      const data = await fs.readFile(filePath);
      return createHash('sha256').update(data).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Deduplicates an asset
   */
  async deduplicateAsset(originalPath: string): Promise<DeduplicatedAsset | null> {
    try {
      // Check if already processed
      if (this.pathMap.has(originalPath)) {
        const hash = this.pathMap.get(originalPath)!;
        return this.hashMap.get(hash) || null;
      }

      // Calculate hash
      const hash = await this.calculateHash(originalPath);
      if (!hash) {
        return null;
      }

      // Check if we already have this asset
      let asset = this.hashMap.get(hash);
      
      if (asset) {
        // Asset already exists, add reference
        if (!asset.references.includes(originalPath)) {
          asset.references.push(originalPath);
        }
        
        // Create symlink or copy reference
        await this.createReference(originalPath, asset.sharedPath);
        
        this.pathMap.set(originalPath, hash);
        return asset;
      }

      // New unique asset, move to shared directory
      await fs.mkdir(this.sharedDir, { recursive: true });
      
      const stats = await fs.stat(originalPath);
      const ext = path.extname(originalPath) || '.bin';
      const sharedPath = path.join(this.sharedDir, `${hash}${ext}`);

      // Move file to shared directory
      await fs.copyFile(originalPath, sharedPath);

      asset = {
        originalPath,
        sharedPath,
        hash,
        size: stats.size,
        references: [originalPath],
      };

      this.hashMap.set(hash, asset);
      this.pathMap.set(originalPath, hash);

      // Create symlink from original to shared
      // On Windows, symlinks require admin privileges, so we keep the original copy
      try {
        const relativePath = path.relative(path.dirname(originalPath), sharedPath);
        // First try to create symlink without deleting original
        await fs.symlink(relativePath, originalPath + '.link');
        // If symlink succeeded, remove original and rename symlink
        await fs.unlink(originalPath);
        await fs.rename(originalPath + '.link', originalPath);
      } catch {
        // Symlink failed (Windows or permission issue)
        // Keep both copies - the original and shared
        // This is less efficient but works on all platforms
      }

      return asset;
    } catch (error) {
      return null;
    }
  }

  /**
   * Creates a reference (symlink or copy) to shared asset
   */
  private async createReference(originalPath: string, sharedPath: string): Promise<void> {
    try {
      // Try to create symlink first
      const relativePath = path.relative(path.dirname(originalPath), sharedPath);
      const tempLink = originalPath + '.link';
      await fs.symlink(relativePath, tempLink);
      // If symlink succeeded, remove original and rename symlink
      await fs.unlink(originalPath).catch(() => {});
      await fs.rename(tempLink, originalPath);
    } catch {
      // Symlink failed (Windows or permission issue), copy file instead
      try {
        await fs.copyFile(sharedPath, originalPath);
      } catch {
        // If copy also fails, just keep the original if it exists
      }
    }
  }

  /**
   * Deduplicates multiple assets
   */
  async deduplicateAssets(assetPaths: string[]): Promise<DeduplicatedAsset[]> {
    const results: DeduplicatedAsset[] = [];
    
    for (const assetPath of assetPaths) {
      const asset = await this.deduplicateAsset(assetPath);
      if (asset) {
        results.push(asset);
      }
    }
    
    return results;
  }

  /**
   * Gets deduplication statistics
   */
  getStats(): {
    totalAssets: number;
    uniqueAssets: number;
    savedSpace: number;
    deduplicationRatio: number;
  } {
    let totalSize = 0;
    let uniqueSize = 0;

    for (const asset of this.hashMap.values()) {
      totalSize += asset.size * asset.references.length;
      uniqueSize += asset.size;
    }

    const savedSpace = totalSize - uniqueSize;
    const deduplicationRatio = totalSize > 0 ? savedSpace / totalSize : 0;

    return {
      totalAssets: this.pathMap.size,
      uniqueAssets: this.hashMap.size,
      savedSpace,
      deduplicationRatio,
    };
  }

  /**
   * Gets all deduplicated assets
   */
  getDeduplicatedAssets(): DeduplicatedAsset[] {
    return Array.from(this.hashMap.values());
  }

  /**
   * Clears deduplication data
   */
  clear(): void {
    this.hashMap.clear();
    this.pathMap.clear();
  }
}

