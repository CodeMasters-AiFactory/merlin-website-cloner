/**
 * Configuration Manager
 * Handles loading, saving, and validating YAML/JSON configuration files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { LoggingService } from './logging.js';

export interface CloneConfig {
  // Basic settings
  url: string;
  outputDir?: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  unlimited?: boolean;

  // Proxy settings
  proxy?: {
    enabled?: boolean;
    providers?: Array<{
      name: string;
      apiKey?: string;
      config?: Record<string, any>;
    }>;
    rotationStrategy?: 'round-robin' | 'per-request' | 'per-domain' | 'sticky' | 'speed-based' | 'success-based';
  };

  // User agent settings
  userAgent?: {
    rotation?: boolean;
    customAgents?: string[];
  };

  // Cloudflare bypass
  cloudflare?: {
    enabled?: boolean;
    captchaApiKey?: string;
    capsolverApiKey?: string;
  };

  // Verification
  verifyAfterClone?: boolean;

  // Export format
  exportFormat?: 'zip' | 'tar' | 'mhtml' | 'static' | 'warc';

  // Caching
  cache?: {
    enabled?: boolean;
    ttl?: number; // milliseconds
    type?: 'file' | 'redis' | 'memory';
    redisUrl?: string;
    filePath?: string;
  };

  // Incremental updates
  incremental?: boolean;

  // Screenshots and PDFs
  captureScreenshots?: boolean;
  generatePdfs?: boolean;

  // Distributed scraping
  distributed?: boolean;
  redis?: {
    host?: string;
    port?: number;
    password?: string;
  };

  // Mobile emulation
  mobileEmulation?: {
    enabled?: boolean;
    deviceName?: string;
    viewport?: {
      width: number;
      height: number;
      deviceScaleFactor: number;
      isMobile: boolean;
      hasTouch: boolean;
      isLandscape: boolean;
    };
  };

  // Geolocation
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  // Resource blocking
  resourceBlocking?: {
    blockAds?: boolean;
    blockTrackers?: boolean;
    blockAnalytics?: boolean;
    blockFonts?: boolean;
    blockImages?: boolean;
    blockStylesheets?: boolean;
    blockScripts?: boolean;
    blockMedia?: boolean;
  };

  // Retry settings
  retry?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    multiplier?: number;
    jitter?: boolean;
  };

  // Advanced settings
  advanced?: {
    tlsImpersonation?: boolean;
    webSocketCapture?: boolean;
    apiScraping?: boolean;
    smartCrawling?: boolean;
    cdnOptimization?: boolean;
    assetDeduplication?: boolean;
    linkRewriting?: boolean;
    pwaSupport?: boolean;
  };
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration Manager
 */
export class ConfigManager {
  private configDir: string;
  private logger: LoggingService;

  constructor(configDir: string = './configs', logger?: LoggingService) {
    this.configDir = configDir;
    this.logger = logger || new LoggingService('./logs');
  }

  /**
   * Initializes config directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      await this.logger.error('Failed to create config directory', error as Error, { configDir: this.configDir });
      throw error;
    }
  }

  /**
   * Loads a config file (YAML or JSON)
   */
  async loadConfig(filePath: string): Promise<CloneConfig> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.yaml' || ext === '.yml') {
        // Parse YAML
        const yaml = await import('yaml');
        return yaml.parse(content) as CloneConfig;
      } else if (ext === '.json') {
        return JSON.parse(content) as CloneConfig;
      } else {
        throw new Error(`Unsupported config file format: ${ext}. Use .yaml, .yml, or .json`);
      }
    } catch (error) {
      await this.logger.error('Failed to load config file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Saves a config file (YAML or JSON)
   */
  async saveConfig(config: CloneConfig, filePath: string, format: 'yaml' | 'json' = 'yaml'): Promise<void> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      let content: string;
      if (format === 'yaml') {
        const yamlModule = await import('yaml');
        content = yamlModule.stringify(config);
      } else {
        content = JSON.stringify(config, null, 2);
      }

      await fs.writeFile(filePath, content, 'utf-8');
      await this.logger.info('Config file saved', { filePath, format });
    } catch (error) {
      await this.logger.error('Failed to save config file', error as Error, { filePath, format });
      throw error;
    }
  }

  /**
   * Validates a config object
   */
  validateConfig(config: CloneConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.url) {
      errors.push('URL is required');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('URL must be a valid URL');
      }
    }

    // Validate numeric fields
    if (config.maxPages !== undefined && config.maxPages < 1) {
      errors.push('maxPages must be at least 1');
    }

    if (config.maxDepth !== undefined && config.maxDepth < 0) {
      errors.push('maxDepth must be non-negative');
    }

    if (config.concurrency !== undefined && config.concurrency < 1) {
      errors.push('concurrency must be at least 1');
    }

    // Validate cache TTL
    if (config.cache?.ttl !== undefined && config.cache.ttl < 0) {
      errors.push('cache.ttl must be non-negative');
    }

    // Validate geolocation
    if (config.geolocation) {
      if (config.geolocation.latitude < -90 || config.geolocation.latitude > 90) {
        errors.push('geolocation.latitude must be between -90 and 90');
      }
      if (config.geolocation.longitude < -180 || config.geolocation.longitude > 180) {
        errors.push('geolocation.longitude must be between -180 and 180');
      }
    }

    // Validate retry settings
    if (config.retry) {
      if (config.retry.maxRetries !== undefined && config.retry.maxRetries < 0) {
        errors.push('retry.maxRetries must be non-negative');
      }
      if (config.retry.initialDelay !== undefined && config.retry.initialDelay < 0) {
        errors.push('retry.initialDelay must be non-negative');
      }
      if (config.retry.maxDelay !== undefined && config.retry.maxDelay < 0) {
        errors.push('retry.maxDelay must be non-negative');
      }
      if (config.retry.maxDelay !== undefined && config.retry.initialDelay !== undefined && 
          config.retry.maxDelay < config.retry.initialDelay) {
        errors.push('retry.maxDelay must be greater than or equal to retry.initialDelay');
      }
    }

    // Warnings
    if (config.unlimited && config.maxPages) {
      warnings.push('unlimited is true but maxPages is set - maxPages will be ignored');
    }

    if (config.distributed && !config.redis) {
      warnings.push('distributed is enabled but redis config is missing - distributed mode may not work');
    }

    if (config.cloudflare?.enabled && !config.cloudflare.captchaApiKey && !config.cloudflare.capsolverApiKey) {
      warnings.push('Cloudflare bypass is enabled but no CAPTCHA API key is configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Gets default config template
   */
  getDefaultConfig(): CloneConfig {
    return {
      url: '',
      outputDir: './output',
      maxPages: 100,
      maxDepth: 5,
      concurrency: 5,
      unlimited: false,
      proxy: {
        enabled: false,
        rotationStrategy: 'round-robin',
      },
      userAgent: {
        rotation: true,
      },
      cloudflare: {
        enabled: true,
      },
      verifyAfterClone: true,
      exportFormat: 'static',
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        type: 'file',
        filePath: './cache',
      },
      incremental: false,
      captureScreenshots: false,
      generatePdfs: false,
      distributed: false,
      mobileEmulation: {
        enabled: false,
      },
      resourceBlocking: {
        blockAds: true,
        blockTrackers: true,
        blockAnalytics: true,
        blockFonts: false,
        blockImages: false,
        blockStylesheets: false,
        blockScripts: false,
        blockMedia: false,
      },
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        jitter: true,
      },
      advanced: {
        tlsImpersonation: true,
        webSocketCapture: true,
        apiScraping: true,
        smartCrawling: true,
        cdnOptimization: true,
        assetDeduplication: true,
        linkRewriting: true,
        pwaSupport: true,
      },
    };
  }

  /**
   * Lists all config files
   */
  async listConfigs(): Promise<Array<{ name: string; path: string; format: 'yaml' | 'json'; modified: Date }>> {
    try {
      const files = await fs.readdir(this.configDir);
      const configs: Array<{ name: string; path: string; format: 'yaml' | 'json'; modified: Date }> = [];

      for (const file of files) {
        const filePath = path.join(this.configDir, file);
        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
          const stats = await fs.stat(filePath);
          configs.push({
            name: path.basename(file, ext === '.yaml' || ext === '.yml' ? '.yaml' : '.json'),
            path: filePath,
            format: (ext === '.yaml' || ext === '.yml') ? 'yaml' : 'json',
            modified: stats.mtime,
          });
        }
      }

      return configs.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      await this.logger.error('Failed to list configs', error as Error, { configDir: this.configDir });
      return [];
    }
  }

  /**
   * Deletes a config file
   */
  async deleteConfig(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      await this.logger.info('Config file deleted', { filePath });
    } catch (error) {
      await this.logger.error('Failed to delete config file', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Converts config to CloneOptions format
   */
  configToCloneOptions(config: CloneConfig): any {
    return {
      url: config.url,
      outputDir: config.outputDir,
      maxPages: config.maxPages,
      maxDepth: config.maxDepth,
      concurrency: config.concurrency,
      unlimited: config.unlimited,
      proxyConfig: config.proxy ? {
        enabled: config.proxy.enabled,
        providers: config.proxy.providers,
      } : undefined,
      userAgentRotation: config.userAgent?.rotation,
      cloudflareBypass: config.cloudflare ? {
        enabled: config.cloudflare.enabled,
        captchaApiKey: config.cloudflare.captchaApiKey,
        capsolverApiKey: config.cloudflare.capsolverApiKey,
      } : undefined,
      verifyAfterClone: config.verifyAfterClone,
      exportFormat: config.exportFormat,
      useCache: config.cache?.enabled,
      cacheTTL: config.cache?.ttl,
      incremental: config.incremental,
      captureScreenshots: config.captureScreenshots,
      generatePdfs: config.generatePdfs,
      distributed: config.distributed,
      mobileEmulation: config.mobileEmulation?.enabled ? {
        enabled: true,
        deviceName: config.mobileEmulation.deviceName,
        viewport: config.mobileEmulation.viewport,
      } : undefined,
      geolocation: config.geolocation,
    };
  }
}

