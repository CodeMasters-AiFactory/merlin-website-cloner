/**
 * Retry Manager
 * Retry logic with exponential backoff and jitter
 */

import { ErrorHandler, type ClassifiedError } from './errorHandler.js';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  multiplier: number; // exponential multiplier
  jitter: boolean; // Add random jitter
  retryableErrors?: string[]; // Error patterns to retry
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * Retry Manager
 * Manages retries with exponential backoff
 */
export class RetryManager {
  private errorHandler: ErrorHandler;
  private defaultOptions: RetryOptions;

  constructor(errorHandler: ErrorHandler, defaultOptions: Partial<RetryOptions> = {}) {
    this.errorHandler = errorHandler;
    this.defaultOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
      ...defaultOptions,
    };
  }

  /**
   * Retries a function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts,
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Classify error
        const classified = this.errorHandler.classifyError(lastError, {
          timestamp: new Date(),
          retryCount: attempt,
        });

        // Check if should retry
        if (!this.shouldRetry(classified, opts)) {
          return {
            success: false,
            error: lastError,
            attempts,
            totalDuration: Date.now() - startTime,
          };
        }

        // If not last attempt, wait before retrying
        if (attempt < opts.maxRetries) {
          const delay = this.calculateDelay(attempt, opts);
          await this.wait(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Calculates delay with exponential backoff
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.initialDelay * Math.pow(options.multiplier, attempt);

    // Cap at max delay
    delay = Math.min(delay, options.maxDelay);

    // Add jitter if enabled
    if (options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }

    return Math.floor(delay);
  }

  /**
   * Waits for specified duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determines if error should be retried
   */
  private shouldRetry(error: ClassifiedError, options: RetryOptions): boolean {
    if (!error.retryable) {
      return false;
    }

    // Check retryable error patterns
    if (options.retryableErrors && options.retryableErrors.length > 0) {
      const errorMessage = error.error.message.toLowerCase();
      const matches = options.retryableErrors.some(pattern =>
        errorMessage.includes(pattern.toLowerCase())
      );
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Retries with circuit breaker pattern
   */
  async retryWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    circuitBreaker: CircuitBreaker,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    if (circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await this.retry(fn, options);
      if (result.success) {
        circuitBreaker.recordSuccess();
      } else {
        circuitBreaker.recordFailure();
      }
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      throw error;
    }
  }
}

/**
 * Circuit Breaker
 * Prevents cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private successes: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime?: Date;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number; // milliseconds

  constructor(
    failureThreshold: number = 5,
    successThreshold: number = 2,
    timeout: number = 60000
  ) {
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeout = timeout;
  }

  /**
   * Records a success
   */
  recordSuccess(): void {
    this.successes++;
    this.failures = 0;

    if (this.state === 'half-open' && this.successes >= this.successThreshold) {
      this.state = 'closed';
      this.successes = 0;
    }
  }

  /**
   * Records a failure
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Checks if circuit breaker is open
   */
  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (this.lastFailureTime) {
        const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
        if (timeSinceFailure >= this.timeout) {
          this.state = 'half-open';
          this.failures = 0;
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Gets current state
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  /**
   * Resets circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
  }
}

