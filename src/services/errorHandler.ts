/**
 * Error Handler
 * Comprehensive error handling with classification and context
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'parsing' | 'authentication' | 'rate-limit' | 'timeout' | 'unknown';

export interface ErrorContext {
  url?: string;
  method?: string;
  statusCode?: number;
  retryCount?: number;
  timestamp: Date;
  userAgent?: string;
  proxy?: string;
  [key: string]: any;
}

export interface ClassifiedError {
  error: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  recoverable: boolean;
  retryable: boolean;
}

/**
 * Error Handler
 * Classifies and handles errors with context
 */
export class ErrorHandler {
  /**
   * Classifies an error
   */
  classifyError(error: Error, context: ErrorContext = { timestamp: new Date() }): ClassifiedError {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    let category: ErrorCategory = 'unknown';
    let severity: ErrorSeverity = 'medium';
    let recoverable = true;
    let retryable = false;

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound')
    ) {
      category = 'network';
      retryable = true;
      severity = context.statusCode === 503 ? 'high' : 'medium';
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorName.includes('timeout')) {
      category = 'timeout';
      retryable = true;
      severity = 'medium';
    }

    // Rate limit errors
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      context.statusCode === 429
    ) {
      category = 'rate-limit';
      retryable = true;
      severity = 'high';
    }

    // Authentication errors
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      context.statusCode === 401 ||
      context.statusCode === 403
    ) {
      category = 'authentication';
      retryable = false;
      severity = 'high';
      recoverable = false;
    }

    // Parsing errors
    if (
      errorMessage.includes('parse') ||
      errorMessage.includes('json') ||
      errorMessage.includes('syntax')
    ) {
      category = 'parsing';
      retryable = false;
      severity = 'low';
    }

    // Critical errors
    if (
      errorMessage.includes('critical') ||
      errorMessage.includes('fatal') ||
      context.statusCode === 500
    ) {
      severity = 'critical';
    }

    return {
      error,
      category,
      severity,
      context,
      recoverable,
      retryable,
    };
  }

  /**
   * Handles an error with appropriate action
   */
  async handleError(
    error: Error,
    context: ErrorContext = { timestamp: new Date() }
  ): Promise<ClassifiedError> {
    const classified = this.classifyError(error, context);

    // Log error based on severity
    if (classified.severity === 'critical') {
      console.error('CRITICAL ERROR:', classified.error, classified.context);
    } else if (classified.severity === 'high') {
      console.error('HIGH SEVERITY ERROR:', classified.error, classified.context);
    } else {
      console.warn('ERROR:', classified.error, classified.context);
    }

    return classified;
  }

  /**
   * Determines if error should be retried
   */
  shouldRetry(error: ClassifiedError, maxRetries: number = 3): boolean {
    if (!error.retryable) {
      return false;
    }

    const retryCount = error.context.retryCount || 0;
    return retryCount < maxRetries;
  }

  /**
   * Gets error message for user
   */
  getUserFriendlyMessage(error: ClassifiedError): string {
    switch (error.category) {
      case 'network':
        return 'Network error occurred. Please check your connection and try again.';
      case 'timeout':
        return 'Request timed out. The server may be slow or unavailable.';
      case 'rate-limit':
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 'authentication':
        return 'Authentication failed. Please check your credentials.';
      case 'parsing':
        return 'Failed to parse response. The data may be corrupted.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Creates error context from request
   */
  createErrorContext(overrides: Partial<ErrorContext> = {}): ErrorContext {
    return {
      timestamp: new Date(),
      ...overrides,
    };
  }
}

