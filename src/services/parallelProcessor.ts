/**
 * Parallel Processing System
 * Smart queue management with 10-20 concurrent requests
 */

export interface Task<T> {
  id: string;
  execute: () => Promise<T>;
  priority?: number;
  retries?: number;
  maxRetries?: number;
  dependencies?: string[]; // Task IDs that must complete first
  estimatedDuration?: number; // Estimated duration in ms
  domain?: string; // For domain-based rate limiting
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retries: number;
}

export interface AdaptiveConcurrencyConfig {
  min: number;
  max: number;
  initial: number;
  adjustmentInterval: number; // ms
  successThreshold: number; // Success rate to increase
  failureThreshold: number; // Failure rate to decrease
}

export class ParallelProcessor<T> {
  private queue: Task<T>[] = [];
  private processing: Set<string> = new Set();
  private completed: Map<string, T> = new Map();
  private failed: Map<string, Error> = new Map();
  private concurrency: number;
  private adaptiveConfig?: AdaptiveConcurrencyConfig;
  private isRunning: boolean = false;
  private responseTimes: number[] = []; // Track response times for adaptive concurrency
  private domainRateLimits: Map<string, { requests: number[]; maxRequests: number; timeWindow: number }> = new Map();
  private stats: QueueStats = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    retries: 0
  };

  constructor(concurrency: number = 10, adaptiveConfig?: AdaptiveConcurrencyConfig) {
    this.concurrency = Math.max(1, Math.min(20, concurrency));
    this.adaptiveConfig = adaptiveConfig;

    if (adaptiveConfig) {
      this.startAdaptiveConcurrency();
    }
  }

  /**
   * Adds a task to the queue
   */
  addTask(task: Task<T>): void {
    task.retries = task.retries || 0;
    task.maxRetries = task.maxRetries || 3;
    
    // Insert based on priority (higher priority first)
    const priority = task.priority || 0;
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = this.queue[i].priority || 0;
      if (priority > currentPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, task);
    this.stats.total++;
    this.stats.pending++;
  }

  /**
   * Adds multiple tasks
   */
  addTasks(tasks: Task<T>[]): void {
    tasks.forEach(task => this.addTask(task));
  }

  /**
   * Starts processing the queue
   */
  async start(): Promise<Map<string, T>> {
    if (this.isRunning) {
      throw new Error('Processor is already running');
    }

    this.isRunning = true;

    const workers: Promise<void>[] = [];

    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.worker());
    }

    await Promise.all(workers);
    this.isRunning = false;

    return this.completed;
  }

  /**
   * Worker function that processes tasks
   */
  private async worker(): Promise<void> {
    while (this.queue.length > 0 || this.processing.size > 0) {
      const task = this.getNextTask();
      
      if (!task) {
        // Wait a bit if no tasks available
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      this.processing.add(task.id);
      this.stats.pending--;
      this.stats.processing++;

      const startTime = Date.now();

      try {
        // Record domain request if applicable
        if (task.domain) {
          this.recordDomainRequest(task.domain);
        }

        const result = await task.execute();
        const duration = Date.now() - startTime;
        
        // Track response time for adaptive concurrency
        this.responseTimes.push(duration);
        if (this.responseTimes.length > 1000) {
          this.responseTimes.shift(); // Keep last 1000
        }

        this.completed.set(task.id, result);
        this.stats.completed++;
      } catch (error) {
        // Retry logic
        if (task.retries! < task.maxRetries!) {
          task.retries!++;
          this.stats.retries++;
          this.addTask(task); // Re-add to queue
        } else {
          this.failed.set(task.id, error as Error);
          this.stats.failed++;
        }
      } finally {
        this.processing.delete(task.id);
        this.stats.processing--;
      }
    }
  }

  /**
   * Gets the next task from queue (with dependency checking)
   */
  private getNextTask(): Task<T> | undefined {
    // Find first task with no unmet dependencies
    for (let i = 0; i < this.queue.length; i++) {
      const task = this.queue[i];
      
      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const allDependenciesMet = task.dependencies.every(
          depId => this.completed.has(depId)
        );
        
        if (!allDependenciesMet) {
          continue; // Skip this task, dependencies not met
        }
      }

      // Check domain rate limit
      if (task.domain) {
        if (!this.canProcessDomain(task.domain)) {
          continue; // Rate limited for this domain
        }
      }

      // Found a processable task
      return this.queue.splice(i, 1)[0];
    }

    return undefined;
  }

  /**
   * Checks if domain can be processed (rate limiting)
   */
  private canProcessDomain(domain: string): boolean {
    if (!this.domainRateLimits.has(domain)) {
      this.domainRateLimits.set(domain, {
        requests: [],
        maxRequests: 10,
        timeWindow: 1000, // 1 second
      });
    }

    const limit = this.domainRateLimits.get(domain)!;
    const now = Date.now();

    // Remove old requests
    limit.requests = limit.requests.filter(
      timestamp => now - timestamp < limit.timeWindow
    );

    return limit.requests.length < limit.maxRequests;
  }

  /**
   * Records domain request
   */
  private recordDomainRequest(domain: string): void {
    if (this.domainRateLimits.has(domain)) {
      const limit = this.domainRateLimits.get(domain)!;
      limit.requests.push(Date.now());
    }
  }

  /**
   * Starts adaptive concurrency adjustment
   */
  private startAdaptiveConcurrency(): void {
    if (!this.adaptiveConfig) return;

    setInterval(() => {
      this.adjustConcurrency();
    }, this.adaptiveConfig.adjustmentInterval);
  }

  /**
   * Adjusts concurrency based on performance
   */
  private adjustConcurrency(): void {
    if (!this.adaptiveConfig) return;

    const recentResponseTimes = this.responseTimes.slice(-100); // Last 100 requests
    if (recentResponseTimes.length === 0) return;

    const avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
    const successRate = this.stats.completed / (this.stats.completed + this.stats.failed) || 1;

    // Increase concurrency if performance is good
    if (avgResponseTime < 1000 && successRate > this.adaptiveConfig.successThreshold) {
      if (this.concurrency < this.adaptiveConfig.max) {
        this.concurrency = Math.min(this.concurrency + 1, this.adaptiveConfig.max);
      }
    }
    // Decrease concurrency if performance is poor
    else if (avgResponseTime > 5000 || successRate < this.adaptiveConfig.failureThreshold) {
      if (this.concurrency > this.adaptiveConfig.min) {
        this.concurrency = Math.max(this.concurrency - 1, this.adaptiveConfig.min);
      }
    }
  }

  /**
   * Pauses processing
   */
  pause(): void {
    this.isRunning = false;
  }

  /**
   * Gets current statistics
   */
  getStats(): QueueStats {
    return {
      ...this.stats,
      pending: this.queue.length,
      processing: this.processing.size
    };
  }

  /**
   * Gets completed results
   */
  getResults(): Map<string, T> {
    return new Map(this.completed);
  }

  /**
   * Gets failed tasks
   */
  getFailed(): Map<string, Error> {
    return new Map(this.failed);
  }

  /**
   * Clears the queue
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
    this.completed.clear();
    this.failed.clear();
    this.stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retries: 0
    };
  }
}

/**
 * Rate limiter for controlling request rate
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 10, timeWindow: number = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  /**
   * Waits if necessary to respect rate limit
   */
  async wait(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(Date.now());
  }

  /**
   * Resets the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

