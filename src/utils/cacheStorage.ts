/**
 * Cache Storage Abstraction
 * Supports both Redis and file-based caching
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number; // Unix timestamp
  createdAt: number;
  etag?: string;
  lastModified?: string;
}

export interface CacheStorageOptions {
  type: 'redis' | 'file' | 'memory';
  redisUrl?: string;
  filePath?: string;
  defaultTTL?: number; // Default time-to-live in milliseconds
}

/**
 * Cache Storage Interface
 */
export interface ICacheStorage {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

/**
 * File-based Cache Storage
 */
export class FileCacheStorage implements ICacheStorage {
  private cacheDir: string;
  private defaultTTL: number;

  constructor(cacheDir: string, defaultTTL: number = 3600000) {
    this.cacheDir = cacheDir;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Gets cache file path for a key
   */
  private getCacheFilePath(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * Gets a cached entry
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const filePath = this.getCacheFilePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(data);

      // Check if expired
      if (entry.expiresAt < Date.now()) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      // File doesn't exist or error reading
      return null;
    }
  }

  /**
   * Sets a cached entry
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });

      const ttlMs = ttl || this.defaultTTL;
      const entry: CacheEntry<T> = {
        key,
        value,
        expiresAt: Date.now() + ttlMs,
        createdAt: Date.now(),
      };

      const filePath = this.getCacheFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }

  /**
   * Deletes a cached entry
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(key);
      await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Clears all cache
   */
  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Checks if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Gets all cache keys
   */
  async keys(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const keys: string[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry<any> = JSON.parse(data);

          // Check if expired
          if (entry.expiresAt >= Date.now()) {
            keys.push(entry.key);
          } else {
            // Delete expired entry
            await fs.unlink(filePath);
          }
        } catch (error) {
          // Skip invalid files
        }
      }

      return keys;
    } catch (error) {
      return [];
    }
  }

  /**
   * Gets cache size
   */
  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }
}

/**
 * Memory Cache Storage (for testing or when Redis/file not available)
 */
export class MemoryCacheStorage implements ICacheStorage {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 3600000) {
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Cleans up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlMs = ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    };
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    return entry !== undefined && entry !== null && entry.expiresAt >= Date.now();
  }

  async keys(): Promise<string[]> {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    this.cleanup();
    return this.cache.size;
  }
}

/**
 * Redis Cache Storage
 */
export class RedisCacheStorage implements ICacheStorage {
  private redis: any; // Redis client (will be imported dynamically)
  private defaultTTL: number;
  private initialized: boolean = false;

  constructor(redisUrl: string, defaultTTL: number = 3600000) {
    this.defaultTTL = defaultTTL;
    this.initializeRedis(redisUrl);
  }

  /**
   * Initializes Redis client
   */
  private async initializeRedis(redisUrl: string): Promise<void> {
    try {
      // Dynamic import to avoid requiring redis if not used
      const Redis = (await import('ioredis')).default;
      this.redis = new Redis(redisUrl);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.initialized = false;
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(data);
      
      // Redis handles TTL, but check anyway
      if (entry.expiresAt < Date.now()) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      const ttlMs = ttl || this.defaultTTL;
      const entry: CacheEntry<T> = {
        key,
        value,
        expiresAt: Date.now() + ttlMs,
        createdAt: Date.now(),
      };

      const ttlSeconds = Math.floor(ttlMs / 1000);
      await this.redis.setex(key, ttlSeconds, JSON.stringify(entry));
    } catch (error) {
      console.error('Error setting Redis cache:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      // Ignore errors
    }
  }

  async clear(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Error clearing Redis cache:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      return false;
    }
  }

  async keys(): Promise<string[]> {
    if (!this.initialized) {
      return [];
    }

    try {
      return await this.redis.keys('*');
    } catch (error) {
      return [];
    }
  }

  async size(): Promise<number> {
    if (!this.initialized) {
      return 0;
    }

    try {
      return await this.redis.dbsize();
    } catch (error) {
      return 0;
    }
  }
}

/**
 * Creates cache storage based on options
 */
export function createCacheStorage(options: CacheStorageOptions): ICacheStorage {
  switch (options.type) {
    case 'redis':
      if (!options.redisUrl) {
        throw new Error('Redis URL required for Redis cache storage');
      }
      return new RedisCacheStorage(options.redisUrl, options.defaultTTL);

    case 'file':
      const filePath = options.filePath || './cache';
      return new FileCacheStorage(filePath, options.defaultTTL);

    case 'memory':
    default:
      return new MemoryCacheStorage(options.defaultTTL);
  }
}

