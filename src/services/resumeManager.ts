/**
 * Resume Manager - Checkpoint/Resume System for Website Cloning
 *
 * Enables resuming interrupted downloads after:
 * - Power failure
 * - Network disconnection
 * - Manual stop
 * - Application crash
 *
 * This is a CRITICAL feature that HTTrack has and we didn't - until now.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface CloneCheckpoint {
  version: string;
  jobId: string;
  url: string;
  outputDir: string;
  startedAt: string;
  lastUpdatedAt: string;

  // Progress state
  completedUrls: string[];
  pendingUrls: string[];
  failedUrls: Array<{ url: string; error: string; attempts: number }>;

  // Asset state
  downloadedAssets: Array<{
    url: string;
    localPath: string;
    hash: string;
    size: number;
  }>;
  pendingAssets: string[];

  // Metrics
  pagesCloned: number;
  totalPages: number;
  assetsDownloaded: number;
  totalAssets: number;
  bytesDownloaded: number;

  // Options (to restore exact settings)
  options: {
    maxPages?: number;
    maxDepth?: number;
    timeout?: number;
    javascript?: boolean;
    respectRobots?: boolean;
    [key: string]: any;
  };
}

export interface ResumeResult {
  canResume: boolean;
  checkpoint?: CloneCheckpoint;
  reason?: string;
}

export class ResumeManager {
  private static readonly CHECKPOINT_VERSION = '1.0.0';
  private static readonly CHECKPOINT_FILENAME = '.merlin-checkpoint.json';
  private static readonly CHECKPOINT_BACKUP = '.merlin-checkpoint.backup.json';
  private static readonly SAVE_INTERVAL_PAGES = 5; // Save every N pages

  private outputDir: string;
  private checkpoint: CloneCheckpoint | null = null;
  private pagesSinceLastSave: number = 0;
  private isSaving: boolean = false;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  /**
   * Check if a previous clone can be resumed
   */
  async checkForResume(): Promise<ResumeResult> {
    const checkpointPath = path.join(this.outputDir, ResumeManager.CHECKPOINT_FILENAME);

    try {
      const exists = await fs.access(checkpointPath).then(() => true).catch(() => false);

      if (!exists) {
        return { canResume: false, reason: 'No checkpoint file found' };
      }

      const data = await fs.readFile(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(data) as CloneCheckpoint;

      // Validate checkpoint version
      if (checkpoint.version !== ResumeManager.CHECKPOINT_VERSION) {
        return {
          canResume: false,
          reason: `Checkpoint version mismatch: ${checkpoint.version} vs ${ResumeManager.CHECKPOINT_VERSION}`
        };
      }

      // Check if output directory still exists
      const outputExists = await fs.access(this.outputDir).then(() => true).catch(() => false);
      if (!outputExists) {
        return { canResume: false, reason: 'Output directory no longer exists' };
      }

      // Validate some downloaded files still exist
      if (checkpoint.downloadedAssets.length > 0) {
        const sampleAsset = checkpoint.downloadedAssets[0];
        const assetExists = await fs.access(sampleAsset.localPath).then(() => true).catch(() => false);
        if (!assetExists) {
          return { canResume: false, reason: 'Downloaded files have been moved or deleted' };
        }
      }

      return { canResume: true, checkpoint };

    } catch (error) {
      // Try backup checkpoint
      const backupPath = path.join(this.outputDir, ResumeManager.CHECKPOINT_BACKUP);
      try {
        const backupData = await fs.readFile(backupPath, 'utf-8');
        const checkpoint = JSON.parse(backupData) as CloneCheckpoint;
        return { canResume: true, checkpoint };
      } catch {
        return { canResume: false, reason: 'Checkpoint file corrupted and no valid backup' };
      }
    }
  }

  /**
   * Initialize a new checkpoint for a fresh clone
   */
  async initializeCheckpoint(
    url: string,
    options: CloneCheckpoint['options']
  ): Promise<void> {
    this.checkpoint = {
      version: ResumeManager.CHECKPOINT_VERSION,
      jobId: this.generateJobId(),
      url,
      outputDir: this.outputDir,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      completedUrls: [],
      pendingUrls: [url],
      failedUrls: [],
      downloadedAssets: [],
      pendingAssets: [],
      pagesCloned: 0,
      totalPages: 0,
      assetsDownloaded: 0,
      totalAssets: 0,
      bytesDownloaded: 0,
      options
    };

    await this.saveCheckpoint();
  }

  /**
   * Restore checkpoint state for resuming
   */
  restoreCheckpoint(checkpoint: CloneCheckpoint): void {
    this.checkpoint = checkpoint;
    this.checkpoint.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Mark a URL as completed
   */
  async markUrlCompleted(url: string): Promise<void> {
    if (!this.checkpoint) return;

    // Remove from pending
    this.checkpoint.pendingUrls = this.checkpoint.pendingUrls.filter(u => u !== url);

    // Add to completed if not already there
    if (!this.checkpoint.completedUrls.includes(url)) {
      this.checkpoint.completedUrls.push(url);
      this.checkpoint.pagesCloned++;
    }

    this.pagesSinceLastSave++;

    // Auto-save every N pages
    if (this.pagesSinceLastSave >= ResumeManager.SAVE_INTERVAL_PAGES) {
      await this.saveCheckpoint();
      this.pagesSinceLastSave = 0;
    }
  }

  /**
   * Mark a URL as failed
   */
  async markUrlFailed(url: string, error: string): Promise<void> {
    if (!this.checkpoint) return;

    // Remove from pending
    this.checkpoint.pendingUrls = this.checkpoint.pendingUrls.filter(u => u !== url);

    // Check if already in failed list
    const existingFailed = this.checkpoint.failedUrls.find(f => f.url === url);
    if (existingFailed) {
      existingFailed.attempts++;
      existingFailed.error = error;
    } else {
      this.checkpoint.failedUrls.push({ url, error, attempts: 1 });
    }

    await this.saveCheckpoint();
  }

  /**
   * Add new URLs to pending queue
   */
  async addPendingUrls(urls: string[]): Promise<void> {
    if (!this.checkpoint) return;

    for (const url of urls) {
      // Don't add if already completed or pending
      if (!this.checkpoint.completedUrls.includes(url) &&
          !this.checkpoint.pendingUrls.includes(url) &&
          !this.checkpoint.failedUrls.some(f => f.url === url)) {
        this.checkpoint.pendingUrls.push(url);
      }
    }

    this.checkpoint.totalPages =
      this.checkpoint.completedUrls.length +
      this.checkpoint.pendingUrls.length;
  }

  /**
   * Record a downloaded asset
   */
  async recordAsset(url: string, localPath: string, size: number): Promise<void> {
    if (!this.checkpoint) return;

    // Remove from pending assets
    this.checkpoint.pendingAssets = this.checkpoint.pendingAssets.filter(a => a !== url);

    // Calculate hash
    try {
      const content = await fs.readFile(localPath);
      const hash = createHash('sha256').update(content).digest('hex');

      this.checkpoint.downloadedAssets.push({
        url,
        localPath,
        hash,
        size
      });

      this.checkpoint.assetsDownloaded++;
      this.checkpoint.bytesDownloaded += size;
    } catch {
      // File might have been deleted, skip
    }
  }

  /**
   * Add pending assets
   */
  async addPendingAssets(urls: string[]): Promise<void> {
    if (!this.checkpoint) return;

    for (const url of urls) {
      if (!this.checkpoint.downloadedAssets.some(a => a.url === url) &&
          !this.checkpoint.pendingAssets.includes(url)) {
        this.checkpoint.pendingAssets.push(url);
      }
    }

    this.checkpoint.totalAssets =
      this.checkpoint.downloadedAssets.length +
      this.checkpoint.pendingAssets.length;
  }

  /**
   * Get URLs that need to be cloned (for resume)
   */
  getPendingUrls(): string[] {
    return this.checkpoint?.pendingUrls || [];
  }

  /**
   * Get assets that need to be downloaded (for resume)
   */
  getPendingAssets(): string[] {
    return this.checkpoint?.pendingAssets || [];
  }

  /**
   * Check if a URL has already been cloned
   */
  isUrlCompleted(url: string): boolean {
    return this.checkpoint?.completedUrls.includes(url) || false;
  }

  /**
   * Check if an asset has already been downloaded
   */
  isAssetDownloaded(url: string): boolean {
    return this.checkpoint?.downloadedAssets.some(a => a.url === url) || false;
  }

  /**
   * Get current progress
   */
  getProgress(): { pages: number; total: number; assets: number; bytes: number } {
    if (!this.checkpoint) {
      return { pages: 0, total: 0, assets: 0, bytes: 0 };
    }

    return {
      pages: this.checkpoint.pagesCloned,
      total: this.checkpoint.totalPages,
      assets: this.checkpoint.assetsDownloaded,
      bytes: this.checkpoint.bytesDownloaded
    };
  }

  /**
   * Save checkpoint to disk with atomic write
   */
  async saveCheckpoint(): Promise<void> {
    if (!this.checkpoint || this.isSaving) return;

    this.isSaving = true;

    try {
      this.checkpoint.lastUpdatedAt = new Date().toISOString();

      const checkpointPath = path.join(this.outputDir, ResumeManager.CHECKPOINT_FILENAME);
      const backupPath = path.join(this.outputDir, ResumeManager.CHECKPOINT_BACKUP);
      const tempPath = path.join(this.outputDir, '.merlin-checkpoint.tmp');

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Write to temp file first
      const data = JSON.stringify(this.checkpoint, null, 2);
      await fs.writeFile(tempPath, data, 'utf-8');

      // Backup existing checkpoint
      try {
        await fs.copyFile(checkpointPath, backupPath);
      } catch {
        // No existing checkpoint to backup
      }

      // Atomic rename
      await fs.rename(tempPath, checkpointPath);

    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Mark clone as completed and clean up checkpoint
   */
  async markCompleted(): Promise<void> {
    if (!this.checkpoint) return;

    const checkpointPath = path.join(this.outputDir, ResumeManager.CHECKPOINT_FILENAME);
    const backupPath = path.join(this.outputDir, ResumeManager.CHECKPOINT_BACKUP);

    // Remove checkpoint files
    try {
      await fs.unlink(checkpointPath);
    } catch {}

    try {
      await fs.unlink(backupPath);
    } catch {}

    this.checkpoint = null;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `clone-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get summary for logging
   */
  getSummary(): string {
    if (!this.checkpoint) return 'No active checkpoint';

    return [
      `Job: ${this.checkpoint.jobId}`,
      `URL: ${this.checkpoint.url}`,
      `Progress: ${this.checkpoint.pagesCloned}/${this.checkpoint.totalPages} pages`,
      `Assets: ${this.checkpoint.assetsDownloaded}/${this.checkpoint.totalAssets}`,
      `Downloaded: ${this.formatBytes(this.checkpoint.bytesDownloaded)}`,
      `Pending: ${this.checkpoint.pendingUrls.length} URLs`,
      `Failed: ${this.checkpoint.failedUrls.length} URLs`
    ].join('\n');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Factory function to create resume manager
 */
export function createResumeManager(outputDir: string): ResumeManager {
  return new ResumeManager(outputDir);
}
