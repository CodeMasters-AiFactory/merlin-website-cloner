/**
 * AWS S3 Export Service
 * Export cloned sites to Amazon S3 buckets
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
// Simple console logger
const logger = {
  info: (msg: string) => console.log(`[S3] ${msg}`),
  warn: (msg: string) => console.warn(`[S3] ${msg}`),
  error: (msg: string) => console.error(`[S3] ${msg}`),
};

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
  prefix?: string; // Key prefix for all uploads
}

export interface S3UploadOptions {
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  serverSideEncryption?: 'AES256' | 'aws:kms';
}

export interface S3UploadResult {
  bucket: string;
  key: string;
  location: string;
  etag?: string;
  versionId?: string;
}

export class S3Exporter {
  private config: S3Config | null = null;
  private s3Client: any = null;

  /**
   * Configure S3 connection
   */
  async configure(config: S3Config): Promise<void> {
    this.config = config;

    // Dynamically import AWS SDK
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');

      this.s3Client = new S3Client({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      });

      logger.info(`S3 exporter configured for bucket: ${config.bucket}`);
    } catch (error: any) {
      logger.error(`Failed to configure S3: ${error.message}`);
      throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3');
    }
  }

  /**
   * Check if S3 is configured
   */
  isConfigured(): boolean {
    return this.config !== null && this.s3Client !== null;
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile(
    localPath: string,
    s3Key: string,
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult> {
    if (!this.config || !this.s3Client) {
      throw new Error('S3 not configured');
    }

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    const fileContent = await fs.readFile(localPath);
    const contentType = options.contentType || this.getMimeType(localPath);
    const fullKey = this.config.prefix ? `${this.config.prefix}/${s3Key}` : s3Key;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: fullKey,
      Body: fileContent,
      ContentType: contentType,
      ACL: options.acl || 'private',
      StorageClass: options.storageClass || 'STANDARD',
      Metadata: options.metadata,
      CacheControl: options.cacheControl,
      ServerSideEncryption: options.serverSideEncryption,
    });

    const response = await this.s3Client.send(command);

    const location = this.config.endpoint
      ? `${this.config.endpoint}/${this.config.bucket}/${fullKey}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${fullKey}`;

    return {
      bucket: this.config.bucket,
      key: fullKey,
      location,
      etag: response.ETag,
      versionId: response.VersionId,
    };
  }

  /**
   * Upload an entire directory to S3
   */
  async uploadDirectory(
    localDir: string,
    s3Prefix: string,
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult[]> {
    if (!this.config) {
      throw new Error('S3 not configured');
    }

    const results: S3UploadResult[] = [];
    const files = await this.findAllFiles(localDir);

    logger.info(`Uploading ${files.length} files to S3...`);

    // Upload files in parallel batches
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (filePath) => {
          const relativePath = path.relative(localDir, filePath).replace(/\\/g, '/');
          const s3Key = `${s3Prefix}/${relativePath}`;

          try {
            return await this.uploadFile(filePath, s3Key, options);
          } catch (error: any) {
            logger.error(`Failed to upload ${filePath}: ${error.message}`);
            return null;
          }
        })
      );

      results.push(...batchResults.filter((r): r is S3UploadResult => r !== null));

      // Log progress
      const progress = Math.min(100, Math.round(((i + batch.length) / files.length) * 100));
      logger.info(`S3 upload progress: ${progress}%`);
    }

    logger.info(`Uploaded ${results.length}/${files.length} files to S3`);
    return results;
  }

  /**
   * Export clone to S3
   */
  async exportClone(
    cloneDir: string,
    jobId: string,
    options: S3UploadOptions = {}
  ): Promise<{ results: S3UploadResult[]; manifestUrl: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Prefix = `clones/${jobId}/${timestamp}`;

    // Upload all files
    const results = await this.uploadDirectory(cloneDir, s3Prefix, options);

    // Create and upload manifest
    const manifest = {
      jobId,
      exportedAt: new Date().toISOString(),
      fileCount: results.length,
      files: results.map((r) => ({
        key: r.key,
        location: r.location,
        etag: r.etag,
      })),
    };

    const manifestKey = `${s3Prefix}/manifest.json`;
    const manifestResult = await this.uploadFile(
      await this.createTempManifest(manifest),
      manifestKey,
      { contentType: 'application/json' }
    );

    return {
      results,
      manifestUrl: manifestResult.location,
    };
  }

  /**
   * Create a presigned URL for downloading
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.config || !this.s3Client) {
      throw new Error('S3 not configured');
    }

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * List objects in bucket with prefix
   */
  async listObjects(prefix: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    if (!this.config || !this.s3Client) {
      throw new Error('S3 not configured');
    }

    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const objects: Array<{ key: string; size: number; lastModified: Date }> = [];

    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: this.config.prefix ? `${this.config.prefix}/${prefix}` : prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);

      if (response.Contents) {
        objects.push(
          ...response.Contents.map((obj: any) => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
          }))
        );
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  /**
   * Delete objects from S3
   */
  async deleteObjects(keys: string[]): Promise<number> {
    if (!this.config || !this.s3Client) {
      throw new Error('S3 not configured');
    }

    const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

    // Delete in batches of 1000 (S3 limit)
    let deletedCount = 0;
    const batchSize = 1000;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      const command = new DeleteObjectsCommand({
        Bucket: this.config.bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
        },
      });

      const response = await this.s3Client.send(command);
      deletedCount += response.Deleted?.length || 0;
    }

    return deletedCount;
  }

  /**
   * Find all files in a directory recursively
   */
  private async findAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Create temporary manifest file
   */
  private async createTempManifest(manifest: any): Promise<string> {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-'));
    const manifestPath = path.join(tmpDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    return manifestPath;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.warc': 'application/warc',
      '.wacz': 'application/wacz',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

// Singleton instance
export const s3Exporter = new S3Exporter();
