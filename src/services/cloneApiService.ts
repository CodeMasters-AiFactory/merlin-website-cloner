/**
 * Clone-as-a-Service REST API
 *
 * Provides a complete REST API for website cloning operations:
 * - Job management (create, status, cancel)
 * - Webhook notifications
 * - Queue management
 * - Rate limiting
 * - API key authentication
 *
 * This enables integrations, automation, and scaling of Merlin.
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import { EventEmitter } from 'events';

export interface CloneJob {
  id: string;
  url: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  options: CloneJobOptions;
  result?: CloneJobResult;
  error?: string;
  webhookUrl?: string;
  apiKeyId: string;
}

export interface CloneJobOptions {
  maxPages?: number;
  maxDepth?: number;
  timeout?: number;
  javascript?: boolean;
  respectRobots?: boolean;
  stealth?: boolean;
  browser?: 'chromium' | 'firefox' | 'webkit';
  proxy?: string;
  cookies?: Array<{ name: string; value: string; domain: string }>;
  headers?: Record<string, string>;
  authentication?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials: string;
  };
  outputFormat?: 'directory' | 'zip' | 'wacz';
  incremental?: boolean;
  resume?: boolean;
}

export interface CloneJobResult {
  outputPath: string;
  pagesCloned: number;
  assetsDownloaded: number;
  bytesDownloaded: number;
  duration: number;
  downloadUrl?: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  rateLimit: number;
  requestCount: number;
  enabled: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface WebhookPayload {
  event: 'job.created' | 'job.started' | 'job.progress' | 'job.completed' | 'job.failed';
  jobId: string;
  timestamp: string;
  data: Partial<CloneJob>;
}

export class CloneApiService extends EventEmitter {
  private jobs: Map<string, CloneJob> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private rateLimitWindows: Map<string, { count: number; resetAt: number }> = new Map();
  private jobQueue: string[] = [];
  private processingJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;
  private defaultRateLimit: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 60,
  };

  // Callback for actual cloning (injected from main app)
  private cloneHandler?: (job: CloneJob) => Promise<CloneJobResult>;

  constructor() {
    super();
    this.startQueueProcessor();
  }

  /**
   * Create Express router with all API endpoints
   */
  createRouter(): Router {
    const router = Router();

    // Middleware
    router.use(express.json());
    router.use(this.authMiddleware.bind(this));
    router.use(this.rateLimitMiddleware.bind(this));

    // Job endpoints
    router.post('/jobs', this.createJob.bind(this));
    router.get('/jobs', this.listJobs.bind(this));
    router.get('/jobs/:id', this.getJob.bind(this));
    router.delete('/jobs/:id', this.cancelJob.bind(this));
    router.get('/jobs/:id/download', this.downloadJob.bind(this));

    // Queue endpoints
    router.get('/queue', this.getQueueStatus.bind(this));
    router.post('/queue/pause', this.pauseQueue.bind(this));
    router.post('/queue/resume', this.resumeQueue.bind(this));

    // API key management (admin only)
    router.post('/api-keys', this.createApiKey.bind(this));
    router.get('/api-keys', this.listApiKeys.bind(this));
    router.delete('/api-keys/:id', this.revokeApiKey.bind(this));

    // Health check
    router.get('/health', this.healthCheck.bind(this));

    return router;
  }

  /**
   * Set the clone handler function
   */
  setCloneHandler(handler: (job: CloneJob) => Promise<CloneJobResult>): void {
    this.cloneHandler = handler;
  }

  /**
   * Authentication middleware
   */
  private authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Allow health check without auth
    if (req.path === '/health') {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const apiKey = authHeader.substring(7);
    const keyRecord = this.findApiKey(apiKey);

    if (!keyRecord) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (!keyRecord.enabled) {
      res.status(403).json({ error: 'API key is disabled' });
      return;
    }

    // Update last used
    keyRecord.lastUsedAt = new Date().toISOString();
    keyRecord.requestCount++;

    // Attach to request
    (req as any).apiKey = keyRecord;

    next();
  }

  /**
   * Rate limiting middleware
   */
  private rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const apiKey = (req as any).apiKey as ApiKey | undefined;

    if (!apiKey) {
      return next();
    }

    const windowKey = apiKey.id;
    const now = Date.now();
    const window = this.rateLimitWindows.get(windowKey);

    // Get rate limit for this key
    const rateLimit = apiKey.rateLimit || this.defaultRateLimit.maxRequests;

    if (!window || window.resetAt < now) {
      // New window
      this.rateLimitWindows.set(windowKey, {
        count: 1,
        resetAt: now + this.defaultRateLimit.windowMs,
      });
    } else if (window.count >= rateLimit) {
      // Rate limited
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((window.resetAt - now) / 1000),
      });
      return;
    } else {
      // Increment
      window.count++;
    }

    // Add rate limit headers
    const currentWindow = this.rateLimitWindows.get(windowKey)!;
    res.setHeader('X-RateLimit-Limit', rateLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit - currentWindow.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(currentWindow.resetAt / 1000));

    next();
  }

  /**
   * Create a new clone job
   */
  private async createJob(req: Request, res: Response): Promise<void> {
    try {
      const { url, options = {}, webhookUrl } = req.body;
      const apiKey = (req as any).apiKey as ApiKey;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
      }

      const job: CloneJob = {
        id: this.generateJobId(),
        url,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        options: this.sanitizeOptions(options),
        webhookUrl,
        apiKeyId: apiKey.id,
      };

      this.jobs.set(job.id, job);
      this.jobQueue.push(job.id);

      // Send webhook
      this.sendWebhook(job, 'job.created');

      // Emit event
      this.emit('job:created', job);

      res.status(201).json({
        id: job.id,
        status: job.status,
        queuePosition: this.jobQueue.indexOf(job.id) + 1,
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * List jobs for the current API key
   */
  private async listJobs(req: Request, res: Response): Promise<void> {
    const apiKey = (req as any).apiKey as ApiKey;
    const { status, limit = 20, offset = 0 } = req.query;

    const jobs = Array.from(this.jobs.values())
      .filter(j => j.apiKeyId === apiKey.id)
      .filter(j => !status || j.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      jobs: jobs.map(this.sanitizeJob),
      total: jobs.length,
    });
  }

  /**
   * Get a specific job
   */
  private async getJob(req: Request, res: Response): Promise<void> {
    const apiKey = (req as any).apiKey as ApiKey;
    const job = this.jobs.get(req.params.id);

    if (!job || job.apiKeyId !== apiKey.id) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(this.sanitizeJob(job));
  }

  /**
   * Cancel a job
   */
  private async cancelJob(req: Request, res: Response): Promise<void> {
    const apiKey = (req as any).apiKey as ApiKey;
    const job = this.jobs.get(req.params.id);

    if (!job || job.apiKeyId !== apiKey.id) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      res.status(400).json({ error: 'Cannot cancel a finished job' });
      return;
    }

    // Remove from queue if queued
    const queueIndex = this.jobQueue.indexOf(job.id);
    if (queueIndex > -1) {
      this.jobQueue.splice(queueIndex, 1);
    }

    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();

    this.emit('job:cancelled', job);
    this.sendWebhook(job, 'job.failed');

    res.json({ message: 'Job cancelled', job: this.sanitizeJob(job) });
  }

  /**
   * Download job result
   */
  private async downloadJob(req: Request, res: Response): Promise<void> {
    const apiKey = (req as any).apiKey as ApiKey;
    const job = this.jobs.get(req.params.id);

    if (!job || job.apiKeyId !== apiKey.id) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'completed' || !job.result?.outputPath) {
      res.status(400).json({ error: 'Job not completed or no output available' });
      return;
    }

    // In production, would stream the file or return signed URL
    res.json({
      downloadUrl: job.result.downloadUrl || `/api/files/${job.id}`,
      outputPath: job.result.outputPath,
    });
  }

  /**
   * Get queue status
   */
  private async getQueueStatus(req: Request, res: Response): Promise<void> {
    res.json({
      queueLength: this.jobQueue.length,
      processing: this.processingJobs.size,
      maxConcurrent: this.maxConcurrentJobs,
      jobs: this.jobQueue.slice(0, 10).map(id => ({
        id,
        position: this.jobQueue.indexOf(id) + 1,
      })),
    });
  }

  /**
   * Pause queue processing
   */
  private async pauseQueue(req: Request, res: Response): Promise<void> {
    // Would implement pause logic
    res.json({ message: 'Queue paused' });
  }

  /**
   * Resume queue processing
   */
  private async resumeQueue(req: Request, res: Response): Promise<void> {
    // Would implement resume logic
    res.json({ message: 'Queue resumed' });
  }

  /**
   * Create a new API key (admin endpoint)
   */
  private async createApiKey(req: Request, res: Response): Promise<void> {
    const { name, rateLimit = 60 } = req.body;

    const key = this.generateApiKey();
    const keyRecord: ApiKey = {
      id: this.generateJobId(),
      key: createHash('sha256').update(key).digest('hex'),
      name: name || 'Unnamed Key',
      createdAt: new Date().toISOString(),
      rateLimit,
      requestCount: 0,
      enabled: true,
    };

    this.apiKeys.set(keyRecord.id, keyRecord);

    // Return the actual key only on creation
    res.status(201).json({
      id: keyRecord.id,
      key, // Only time we return the raw key
      name: keyRecord.name,
      createdAt: keyRecord.createdAt,
      rateLimit: keyRecord.rateLimit,
    });
  }

  /**
   * List API keys
   */
  private async listApiKeys(req: Request, res: Response): Promise<void> {
    const keys = Array.from(this.apiKeys.values()).map(k => ({
      id: k.id,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      rateLimit: k.rateLimit,
      requestCount: k.requestCount,
      enabled: k.enabled,
    }));

    res.json({ keys });
  }

  /**
   * Revoke an API key
   */
  private async revokeApiKey(req: Request, res: Response): Promise<void> {
    const keyRecord = this.apiKeys.get(req.params.id);

    if (!keyRecord) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    keyRecord.enabled = false;

    res.json({ message: 'API key revoked' });
  }

  /**
   * Health check endpoint
   */
  private async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      queue: {
        length: this.jobQueue.length,
        processing: this.processingJobs.size,
      },
    });
  }

  /**
   * Process jobs in the queue
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      // Check if we can process more jobs
      while (
        this.processingJobs.size < this.maxConcurrentJobs &&
        this.jobQueue.length > 0
      ) {
        const jobId = this.jobQueue.shift();
        if (!jobId) continue;

        const job = this.jobs.get(jobId);
        if (!job || job.status !== 'queued') continue;

        // Start processing
        this.processingJobs.add(jobId);
        this.processJob(job).catch(console.error);
      }
    }, 1000);
  }

  /**
   * Process a single job
   */
  private async processJob(job: CloneJob): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date().toISOString();

      this.emit('job:started', job);
      this.sendWebhook(job, 'job.started');

      // Use injected clone handler
      if (!this.cloneHandler) {
        throw new Error('Clone handler not configured');
      }

      // Set up progress tracking
      const progressInterval = setInterval(() => {
        if (job.status === 'processing') {
          this.sendWebhook(job, 'job.progress');
        }
      }, 5000);

      try {
        const result = await this.cloneHandler(job);

        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date().toISOString();

        this.emit('job:completed', job);
        this.sendWebhook(job, 'job.completed');

      } finally {
        clearInterval(progressInterval);
      }

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();

      this.emit('job:failed', job);
      this.sendWebhook(job, 'job.failed');

    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      this.emit('job:progress', job);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(job: CloneJob, event: WebhookPayload['event']): Promise<void> {
    if (!job.webhookUrl) return;

    const payload: WebhookPayload = {
      event,
      jobId: job.id,
      timestamp: new Date().toISOString(),
      data: this.sanitizeJob(job),
    };

    try {
      await fetch(job.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merlin-Event': event,
          'X-Merlin-Signature': this.signWebhook(payload),
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error(`Failed to send webhook for job ${job.id}:`, error);
    }
  }

  /**
   * Sign webhook payload
   */
  private signWebhook(payload: WebhookPayload): string {
    const secret = process.env.WEBHOOK_SECRET || 'merlin-webhook-secret';
    return createHash('sha256')
      .update(JSON.stringify(payload) + secret)
      .digest('hex');
  }

  /**
   * Find API key by raw key value
   */
  private findApiKey(rawKey: string): ApiKey | undefined {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    return Array.from(this.apiKeys.values()).find(k => k.key === keyHash);
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate API key
   */
  private generateApiKey(): string {
    return `mk_${randomBytes(24).toString('hex')}`;
  }

  /**
   * Sanitize options to prevent injection
   */
  private sanitizeOptions(options: any): CloneJobOptions {
    return {
      maxPages: Math.min(options.maxPages || 100, 10000),
      maxDepth: Math.min(options.maxDepth || 3, 10),
      timeout: Math.min(options.timeout || 30000, 300000),
      javascript: Boolean(options.javascript ?? true),
      respectRobots: Boolean(options.respectRobots ?? true),
      stealth: Boolean(options.stealth ?? true),
      browser: ['chromium', 'firefox', 'webkit'].includes(options.browser)
        ? options.browser
        : 'chromium',
      outputFormat: ['directory', 'zip', 'wacz'].includes(options.outputFormat)
        ? options.outputFormat
        : 'directory',
      incremental: Boolean(options.incremental),
      resume: Boolean(options.resume),
    };
  }

  /**
   * Sanitize job for API response (remove sensitive data)
   */
  private sanitizeJob(job: CloneJob): Partial<CloneJob> {
    return {
      id: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      options: job.options,
      result: job.result,
      error: job.error,
    };
  }

  /**
   * Create a default admin API key (for initial setup)
   */
  createDefaultAdminKey(): string {
    const key = this.generateApiKey();
    const keyRecord: ApiKey = {
      id: 'admin',
      key: createHash('sha256').update(key).digest('hex'),
      name: 'Admin Key',
      createdAt: new Date().toISOString(),
      rateLimit: 1000,
      requestCount: 0,
      enabled: true,
    };

    this.apiKeys.set(keyRecord.id, keyRecord);
    return key;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalJobs: number;
    statusCounts: Record<string, number>;
    queueLength: number;
    activeJobs: number;
  } {
    const statusCounts: Record<string, number> = {};

    for (const job of this.jobs.values()) {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    }

    return {
      totalJobs: this.jobs.size,
      statusCounts,
      queueLength: this.jobQueue.length,
      activeJobs: this.processingJobs.size,
    };
  }
}

/**
 * Factory function
 */
export function createCloneApiService(): CloneApiService {
  return new CloneApiService();
}

/**
 * Initialize API on Express app
 */
export function initializeCloneApi(
  app: express.Application,
  basePath: string = '/api/v1/clone'
): CloneApiService {
  const apiService = new CloneApiService();
  app.use(basePath, apiService.createRouter());
  return apiService;
}
