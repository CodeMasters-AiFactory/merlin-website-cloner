/**
 * Error Formatter
 * Provides user-friendly error messages
 */

export interface FormattedError {
  message: string;
  userMessage: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recovery?: {
    suggestions: string[];
    automatic?: boolean; // Whether recovery can be attempted automatically
    retryable?: boolean; // Whether the operation can be retried
  };
  details?: Record<string, any>;
}

/**
 * Formats errors into user-friendly messages
 */
export class ErrorFormatter {
  /**
   * Formats a generic error
   */
  static format(error: Error | string, context?: Record<string, any>): FormattedError {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Check for common error patterns
    if (errorMessage.includes('net::ERR_')) {
      return this.formatNetworkError(errorMessage, context);
    }
    
    if (errorMessage.includes('timeout')) {
      return this.formatTimeoutError(errorMessage, context);
    }
    
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return this.formatNotFoundError(errorMessage, context);
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return this.formatForbiddenError(errorMessage, context);
    }
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return this.formatRateLimitError(errorMessage, context);
    }
    
    if (errorMessage.includes('cloudflare') || errorMessage.includes('challenge')) {
      return this.formatCloudflareError(errorMessage, context);
    }
    
    if (errorMessage.includes('navigation') || errorMessage.includes('navigation timeout')) {
      return this.formatNavigationError(errorMessage, context);
    }
    
    // Default error
    return {
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      code: 'UNKNOWN_ERROR',
      severity: 'medium',
      recovery: {
        suggestions: [
          'Try the operation again',
          'Check your internet connection',
          'Verify the URL is correct',
          'Contact support if the problem persists'
        ],
        automatic: false,
        retryable: true
      },
      details: {
        ...context,
        stack: errorStack
      }
    };
  }
  
  /**
   * Formats network errors
   */
  private static formatNetworkError(message: string, context?: Record<string, any>): FormattedError {
    let userMessage = 'Network connection error. ';
    
    if (message.includes('ERR_CONNECTION_REFUSED')) {
      userMessage += 'The website server refused the connection. The site may be down or blocking requests.';
    } else if (message.includes('ERR_NAME_NOT_RESOLVED')) {
      userMessage += 'Could not resolve the website address. Please check the URL is correct.';
    } else if (message.includes('ERR_CONNECTION_TIMED_OUT')) {
      userMessage += 'Connection timed out. The website may be slow or unreachable.';
    } else if (message.includes('ERR_SSL')) {
      userMessage += 'SSL/TLS connection error. The website may have certificate issues.';
    } else {
      userMessage += 'Unable to connect to the website.';
    }
    
    return {
      message,
      userMessage,
      code: 'NETWORK_ERROR',
      severity: 'high',
      recovery: {
        suggestions: [
          'Check your internet connection',
          'Verify the website is accessible in a regular browser',
          'Try using a proxy or VPN',
          'Wait a few minutes and retry',
          'Check if the website is down (use a status checker)'
        ],
        automatic: true, // Can retry automatically
        retryable: true
      },
      details: context
    };
  }
  
  /**
   * Formats timeout errors
   */
  private static formatTimeoutError(message: string, context?: Record<string, any>): FormattedError {
    return {
      message,
      userMessage: 'The request timed out. The website may be slow or unresponsive. Try increasing the timeout or checking your connection.',
      code: 'TIMEOUT_ERROR',
      severity: 'medium',
      details: context
    };
  }
  
  /**
   * Formats 404 errors
   */
  private static formatNotFoundError(message: string, context?: Record<string, any>): FormattedError {
    return {
      message,
      userMessage: 'The page was not found (404). The URL may be incorrect or the page may have been removed.',
      code: 'NOT_FOUND',
      severity: 'low',
      details: context
    };
  }
  
  /**
   * Formats 403 errors
   */
  private static formatForbiddenError(message: string, context?: Record<string, any>): FormattedError {
    return {
      message,
      userMessage: 'Access forbidden (403). The website is blocking access. This may require authentication or the site may be blocking automated access.',
      code: 'FORBIDDEN',
      severity: 'high',
      details: context
    };
  }
  
  /**
   * Formats rate limit errors
   */
  private static formatRateLimitError(message: string, context?: Record<string, any>): FormattedError {
    return {
      message,
      userMessage: 'Rate limit exceeded (429). Too many requests were made. Please wait a few minutes before trying again.',
      code: 'RATE_LIMIT',
      severity: 'medium',
      details: context
    };
  }
  
  /**
   * Formats Cloudflare errors
   */
  private static formatCloudflareError(message: string, context?: Record<string, any>): FormattedError {
    return {
      message,
      userMessage: 'Cloudflare protection detected. The website is protected by Cloudflare. We\'re attempting to bypass it, but this may take longer or require CAPTCHA solving.',
      code: 'CLOUDFLARE_CHALLENGE',
      severity: 'high',
      details: context
    };
  }
  
  /**
   * Formats navigation errors
   */
  private static formatNavigationError(message: string, context?: Record<string, any>): FormattedError {
    return {
      message,
      userMessage: 'Failed to load the page. The page may be taking too long to load, or there may be JavaScript errors preventing it from rendering.',
      code: 'NAVIGATION_ERROR',
      severity: 'high',
      details: context
    };
  }
  
  /**
   * Formats clone-specific errors
   */
  static formatCloneError(error: Error | string, url: string, context?: Record<string, any>): FormattedError {
    const formatted = this.format(error, { url, ...context });
    
    // Add URL-specific context
    formatted.userMessage = `${formatted.userMessage} (URL: ${url})`;
    
    return formatted;
  }
}

