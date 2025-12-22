/**
 * Logging Service
 * Structured logging with Winston/Pino
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Logging Service
 * Provides structured logging
 */
export class LoggingService {
  private logDir: string;
  private logFile: string;
  private errorLogFile: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.logFile = path.join(logDir, 'app.log');
    this.errorLogFile = path.join(logDir, 'error.log');
  }

  /**
   * Initializes logging directory
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
  }

  /**
   * Logs a message
   */
  async log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    const logLine = JSON.stringify(entry) + '\n';

    // Write to main log file
    await fs.appendFile(this.logFile, logLine, 'utf-8').catch(() => {});

    // Write errors to error log file
    if (level === 'error') {
      await fs.appendFile(this.errorLogFile, logLine, 'utf-8').catch(() => {});
    }

    // Console output
    const consoleMessage = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;
    if (level === 'error') {
      console.error(consoleMessage, context, error);
    } else if (level === 'warn') {
      console.warn(consoleMessage, context);
    } else {
      console.log(consoleMessage, context);
    }

    // Rotate logs if needed
    await this.rotateLogs();
  }

  /**
   * Logs an error
   */
  async error(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
    await this.log('error', message, context, error);
  }

  /**
   * Logs a warning
   */
  async warn(message: string, context?: Record<string, any>): Promise<void> {
    await this.log('warn', message, context);
  }

  /**
   * Logs an info message
   */
  async info(message: string, context?: Record<string, any>): Promise<void> {
    await this.log('info', message, context);
  }

  /**
   * Logs a debug message
   */
  async debug(message: string, context?: Record<string, any>): Promise<void> {
    await this.log('debug', message, context);
  }

  /**
   * Rotates log files
   */
  private async rotateLogs(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFile).catch(() => null);
      if (stats && stats.size > this.maxLogSize) {
        // Rotate log file
        for (let i = this.maxLogFiles - 1; i >= 1; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;
          try {
            await fs.rename(oldFile, newFile);
          } catch {
            // Ignore if file doesn't exist
          }
        }

        // Move current log to .1
        await fs.rename(this.logFile, `${this.logFile}.1`);

        // Create new log file
        await fs.writeFile(this.logFile, '', 'utf-8');
      }
    } catch (error) {
      // Ignore rotation errors
    }
  }

  /**
   * Gets recent log entries
   */
  async getRecentLogs(level?: LogLevel, limit: number = 100): Promise<LogEntry[]> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries: LogEntry[] = lines
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null && (!level || entry.level === level))
        .slice(-limit);

      return entries.reverse(); // Most recent first
    } catch {
      return [];
    }
  }
}

