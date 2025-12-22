/**
 * Worker Pool Management
 * Manages multiple worker instances for distributed scraping
 */

import { TaskQueue, type Task, type TaskResult } from './taskQueue.js';

export interface WorkerConfig {
  id: string;
  host: string;
  port: number;
  capacity: number; // Max concurrent tasks
  status: 'idle' | 'busy' | 'offline';
  lastHeartbeat: Date;
}

export interface WorkerPoolOptions {
  redisConnection: {
    host: string;
    port: number;
    password?: string;
  };
  maxWorkers?: number;
  workerCapacity?: number;
}

/**
 * Worker Pool Manager
 * Manages multiple worker instances for distributed scraping
 */
export class WorkerPool {
  private workers: Map<string, WorkerConfig> = new Map();
  private taskQueue: TaskQueue;
  private options: WorkerPoolOptions;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(options: WorkerPoolOptions) {
    this.options = {
      maxWorkers: options.maxWorkers || 10,
      workerCapacity: options.workerCapacity || 10,
      ...options,
    };

    this.taskQueue = new TaskQueue({
      connection: options.redisConnection,
      queueName: 'merlin-worker-pool',
    });
  }

  /**
   * Registers a worker
   */
  registerWorker(workerId: string, host: string, port: number, capacity?: number): void {
    const worker: WorkerConfig = {
      id: workerId,
      host,
      port,
      capacity: capacity || this.options.workerCapacity || 10,
      status: 'idle',
      lastHeartbeat: new Date(),
    };

    this.workers.set(workerId, worker);
  }

  /**
   * Unregisters a worker
   */
  unregisterWorker(workerId: string): void {
    this.workers.delete(workerId);
  }

  /**
   * Updates worker heartbeat
   */
  updateWorkerHeartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = new Date();
      worker.status = 'busy';
    }
  }

  /**
   * Sets worker status
   */
  setWorkerStatus(workerId: string, status: WorkerConfig['status']): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = status;
    }
  }

  /**
   * Gets available workers
   */
  getAvailableWorkers(): WorkerConfig[] {
    const now = Date.now();
    const heartbeatTimeout = 30000; // 30 seconds

    return Array.from(this.workers.values()).filter(
      worker =>
        worker.status === 'idle' &&
        now - worker.lastHeartbeat.getTime() < heartbeatTimeout
    );
  }

  /**
   * Gets worker by ID
   */
  getWorker(workerId: string): WorkerConfig | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Gets all workers
   */
  getAllWorkers(): WorkerConfig[] {
    return Array.from(this.workers.values());
  }

  /**
   * Gets worker statistics
   */
  getWorkerStats(): {
    total: number;
    available: number;
    busy: number;
    offline: number;
  } {
    const now = Date.now();
    const heartbeatTimeout = 30000;

    let available = 0;
    let busy = 0;
    let offline = 0;

    for (const worker of this.workers.values()) {
      const isOffline = now - worker.lastHeartbeat.getTime() >= heartbeatTimeout;

      if (isOffline) {
        offline++;
      } else if (worker.status === 'busy') {
        busy++;
      } else {
        available++;
      }
    }

    return {
      total: this.workers.size,
      available,
      busy,
      offline,
    };
  }

  /**
   * Distributes tasks to workers
   */
  async distributeTasks(tasks: Task[]): Promise<void> {
    const availableWorkers = this.getAvailableWorkers();

    if (availableWorkers.length === 0) {
      throw new Error('No available workers');
    }

    // Add tasks to queue (workers will pick them up)
    await this.taskQueue.addTasks(tasks);
  }

  /**
   * Starts heartbeat monitoring
   */
  startHeartbeatMonitoring(interval: number = 10000): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.checkWorkerHealth();
    }, interval);
  }

  /**
   * Stops heartbeat monitoring
   */
  stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Checks worker health
   */
  private checkWorkerHealth(): void {
    const now = Date.now();
    const heartbeatTimeout = 30000; // 30 seconds

    for (const [workerId, worker] of this.workers.entries()) {
      const timeSinceHeartbeat = now - worker.lastHeartbeat.getTime();

      if (timeSinceHeartbeat >= heartbeatTimeout) {
        worker.status = 'offline';
      }
    }
  }

  /**
   * Gets task queue
   */
  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  /**
   * Closes the worker pool
   */
  async close(): Promise<void> {
    this.stopHeartbeatMonitoring();
    await this.taskQueue.close();
  }
}

