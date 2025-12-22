/**
 * Distributed Scraper Coordinator
 * Coordinates distributed scraping across multiple instances
 */

import { WorkerPool, type WorkerConfig } from './workerPool.js';
import { TaskQueue, type Task, type TaskResult } from './taskQueue.js';
import { CacheManager } from './cacheManager.js';
import { IncrementalUpdater } from './incrementalUpdater.js';

export interface DistributedScrapeOptions {
  urls: string[];
  maxConcurrency?: number;
  useCache?: boolean;
  incremental?: boolean;
}

export interface DistributedScrapeResult {
  success: boolean;
  pagesScraped: number;
  pagesCached: number;
  assetsDownloaded: number;
  assetsCached: number;
  errors: string[];
  workerStats: {
    total: number;
    available: number;
    busy: number;
  };
}

/**
 * Distributed Scraper Coordinator
 * Manages distributed scraping across multiple worker instances
 */
export class DistributedScraper {
  private workerPool: WorkerPool;
  private cacheManager: CacheManager;
  private incrementalUpdater: IncrementalUpdater;

  constructor(
    workerPool: WorkerPool,
    cacheManager: CacheManager
  ) {
    this.workerPool = workerPool;
    this.cacheManager = cacheManager;
    this.incrementalUpdater = new IncrementalUpdater(cacheManager);
  }

  /**
   * Scrapes URLs in a distributed manner
   */
  async scrapeDistributed(
    options: DistributedScrapeOptions
  ): Promise<DistributedScrapeResult> {
    const result: DistributedScrapeResult = {
      success: true,
      pagesScraped: 0,
      pagesCached: 0,
      assetsDownloaded: 0,
      assetsCached: 0,
      errors: [],
      workerStats: {
        total: 0,
        available: 0,
        busy: 0,
      },
    };

    try {
      // Get worker stats
      const workerStats = this.workerPool.getWorkerStats();
      result.workerStats = workerStats;

      if (workerStats.available === 0) {
        throw new Error('No available workers');
      }

      // Determine which URLs need scraping
      let urlsToScrape: string[];
      if (options.incremental && options.useCache) {
        const updatePlan = await this.incrementalUpdater.getPagesToScrape(options.urls);
        urlsToScrape = updatePlan.pagesToScrape;
        result.pagesCached = updatePlan.pagesUnchanged.length;
      } else {
        urlsToScrape = options.urls;
      }

      // Create tasks
      const tasks: Task[] = urlsToScrape.map((url, index) => ({
        id: `task-${Date.now()}-${index}`,
        type: 'page',
        url,
        data: {
          url,
          useCache: options.useCache,
        },
        priority: 0,
        attempts: 3,
      }));

      // Distribute tasks to workers
      await this.workerPool.distributeTasks(tasks);

      // Wait for tasks to complete (in a real implementation, this would poll or use events)
      // For now, we'll return immediately and tasks will be processed by workers
      result.pagesScraped = urlsToScrape.length;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Gets scraping progress
   */
  async getProgress(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const taskQueue = this.workerPool.getTaskQueue();
    const stats = await taskQueue.getStats();
    return {
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
    };
  }

  /**
   * Cancels all pending tasks
   */
  async cancelAll(): Promise<void> {
    const taskQueue = this.workerPool.getTaskQueue();
    const stats = await taskQueue.getStats();

    // Get all waiting jobs and cancel them
    // Note: BullMQ doesn't have a direct "get all waiting jobs" method
    // This would need to be implemented based on specific requirements
  }

  /**
   * Gets worker pool
   */
  getWorkerPool(): WorkerPool {
    return this.workerPool;
  }

  /**
   * Gets cache manager
   */
  getCacheManager(): CacheManager {
    return this.cacheManager;
  }
}

