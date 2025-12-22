/**
 * Distributed Task Queue
 * Redis-based task queue using BullMQ
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import type { Job, JobsOptions } from 'bullmq';

export interface Task {
  id: string;
  type: 'clone' | 'page' | 'asset';
  url: string;
  data: Record<string, any>;
  priority?: number;
  attempts?: number;
  delay?: number;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QueueOptions {
  connection: {
    host: string;
    port: number;
    password?: string;
  };
  queueName?: string;
}

/**
 * Distributed Task Queue Manager
 */
export class TaskQueue {
  private queue: Queue;
  private worker?: Worker;
  private queueEvents: QueueEvents;
  private connection: QueueOptions['connection'];

  constructor(options: QueueOptions) {
    this.connection = options.connection;
    const queueName = options.queueName || 'merlin-clone-queue';

    this.queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep last 1000 jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    this.queueEvents = new QueueEvents(queueName, {
      connection: this.connection,
    });
  }

  /**
   * Adds a task to the queue
   */
  async addTask(task: Task, options: JobsOptions = {}): Promise<Job> {
    return await this.queue.add(
      task.type,
      {
        id: task.id,
        url: task.url,
        ...task.data,
      },
      {
        jobId: task.id,
        priority: task.priority || 0,
        attempts: task.attempts || 3,
        delay: task.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Adds multiple tasks to the queue
   */
  async addTasks(tasks: Task[], options: JobsOptions = {}): Promise<Job[]> {
    const jobs = tasks.map(task =>
      this.queue.add(
        task.type,
        {
          id: task.id,
          url: task.url,
          ...task.data,
        },
        {
          jobId: task.id,
          priority: task.priority || 0,
          attempts: task.attempts || 3,
          delay: task.delay || 0,
          ...options,
        }
      )
    );

    return await Promise.all(jobs);
  }

  /**
   * Gets a job by ID
   */
  async getJob(jobId: string): Promise<Job | undefined> {
    return await this.queue.getJob(jobId);
  }

  /**
   * Gets job state
   */
  async getJobState(jobId: string): Promise<string | null> {
    const job = await this.getJob(jobId);
    if (!job) {
      return null;
    }
    return await job.getState();
  }

  /**
   * Cancels a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Pauses the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
  }

  /**
   * Resumes the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
  }

  /**
   * Cleans the queue
   */
  async clean(grace: number = 0, limit: number = 100): Promise<void> {
    await this.queue.clean(grace, limit);
  }

  /**
   * Gets queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    const isPaused = await this.queue.isPaused();

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Creates a worker to process tasks
   */
  createWorker(
    processor: (job: Job) => Promise<TaskResult>,
    options: {
      concurrency?: number;
      limiter?: {
        max: number;
        duration: number;
      };
    } = {}
  ): Worker {
    if (this.worker) {
      return this.worker;
    }

    this.worker = new Worker(
      this.queue.name,
      async (job: Job) => {
        try {
          const result = await processor(job);
          return result;
        } catch (error) {
          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: options.concurrency || 10,
        limiter: options.limiter,
      }
    );

    // Set up event handlers
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });

    return this.worker;
  }

  /**
   * Closes the queue
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
    await this.queueEvents.close();
  }

  /**
   * Gets queue events for monitoring
   */
  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }
}

