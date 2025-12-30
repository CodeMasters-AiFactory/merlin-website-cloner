/**
 * Enhanced WARC Generator
 * Full ISO 28500 compliant Web ARChive format generator
 *
 * Features:
 * - Streaming file writes (handles large archives)
 * - Resource deduplication with revisit records
 * - CDX index generation for fast lookups
 * - Multi-file support with automatic rotation
 * - Compression support (gzip)
 * - Full WARC/1.1 compliance
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';

export interface WARCRecord {
  type: 'warcinfo' | 'request' | 'response' | 'resource' | 'metadata' | 'revisit' | 'conversion';
  targetUri?: string;
  date: Date;
  recordId: string;
  contentType?: string;
  contentLength: number;
  payloadDigest?: string;
  refersTo?: string;
  concurrentTo?: string;
  warcInfoId?: string;
  headers: Record<string, string>;
  content: Buffer;
}

export interface CDXRecord {
  urlkey: string;
  timestamp: string;
  originalUrl: string;
  mimeType: string;
  statusCode: number;
  digest: string;
  length: number;
  offset: number;
  filename: string;
}

export interface WARCConfig {
  outputDir: string;
  filename?: string;
  maxFileSize?: number;
  compress?: boolean;
  operator?: string;
  software?: string;
  hostname?: string;
  description?: string;
  robots?: 'obey' | 'ignore' | 'classic';
}

export interface WARCStats {
  recordCount: number;
  fileCount: number;
  totalBytes: number;
  cdxRecords: number;
  uniqueResources: number;
  duplicatesSkipped: number;
}

export class EnhancedWARCGenerator extends EventEmitter {
  private config: Required<WARCConfig>;
  private currentFile: fs.WriteStream | zlib.Gzip | null = null;
  private currentFilePath: string = '';
  private currentFileSize: number = 0;
  private fileIndex: number = 0;
  private recordCount: number = 0;
  private duplicatesSkipped: number = 0;
  private warcInfoId: string = '';
  private cdxRecords: CDXRecord[] = [];
  private seenDigests: Map<string, { recordId: string; uri: string }> = new Map();
  private isStarted: boolean = false;

  constructor(config: WARCConfig) {
    super();
    this.config = {
      outputDir: config.outputDir,
      filename: config.filename || `merlin-archive-${Date.now()}`,
      maxFileSize: config.maxFileSize || 1024 * 1024 * 1024,
      compress: config.compress !== false,
      operator: config.operator || 'Merlin Website Cloner',
      software: config.software || 'Merlin/1.0',
      hostname: config.hostname || 'merlin.local',
      description: config.description || 'Web archive created by Merlin',
      robots: config.robots || 'obey',
    };
  }

  /**
   * Start the WARC archive
   */
  async start(): Promise<string> {
    await fs.promises.mkdir(this.config.outputDir, { recursive: true });
    await this.createNewFile();
    await this.writeWarcInfo();
    this.isStarted = true;
    this.emit('started', { filename: this.currentFilePath });
    return this.currentFilePath;
  }

  /**
   * Write HTTP request/response pair
   */
  async writeRequestResponse(
    url: string,
    request: {
      method: string;
      headers: Record<string, string>;
      body?: Buffer;
    },
    response: {
      statusCode: number;
      statusMessage: string;
      headers: Record<string, string>;
      body: Buffer;
    }
  ): Promise<void> {
    if (!this.isStarted) await this.start();

    const date = new Date();
    const requestRecordId = this.generateRecordId();
    const responseRecordId = this.generateRecordId();

    // Calculate digest for deduplication
    const responseDigest = this.calculateDigest(response.body);
    const digestKey = `${url}:${responseDigest}`;

    // Check for duplicate
    const existing = this.seenDigests.get(digestKey);
    if (existing) {
      await this.writeRevisitRecord(url, date, existing);
      this.duplicatesSkipped++;
      return;
    }

    this.seenDigests.set(digestKey, { recordId: responseRecordId, uri: url });

    // Build request content
    const parsedUrl = new URL(url);
    const requestLine = `${request.method} ${parsedUrl.pathname}${parsedUrl.search || ''} HTTP/1.1\r\n`;
    const requestHeaders = Object.entries(request.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    const requestContent = Buffer.concat([
      Buffer.from(requestLine + requestHeaders + '\r\n\r\n'),
      request.body || Buffer.alloc(0),
    ]);

    // Build response content
    const statusLine = `HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`;
    const responseHeaders = Object.entries(response.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    const responseContent = Buffer.concat([
      Buffer.from(statusLine + responseHeaders + '\r\n\r\n'),
      response.body,
    ]);

    // Write request record
    await this.writeRecord({
      type: 'request',
      targetUri: url,
      date,
      recordId: requestRecordId,
      contentType: 'application/http;msgtype=request',
      contentLength: requestContent.length,
      concurrentTo: responseRecordId,
      warcInfoId: this.warcInfoId,
      headers: {},
      content: requestContent,
    });

    // Write response record
    const offset = this.currentFileSize;
    await this.writeRecord({
      type: 'response',
      targetUri: url,
      date,
      recordId: responseRecordId,
      contentType: 'application/http;msgtype=response',
      contentLength: responseContent.length,
      payloadDigest: `sha256:${responseDigest}`,
      warcInfoId: this.warcInfoId,
      headers: {},
      content: responseContent,
    });

    // Add CDX entry
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    this.cdxRecords.push({
      urlkey: this.toSURT(url),
      timestamp: this.formatTimestamp(date),
      originalUrl: url,
      mimeType: contentType.split(';')[0].trim(),
      statusCode: response.statusCode,
      digest: responseDigest,
      length: responseContent.length,
      offset,
      filename: path.basename(this.currentFilePath),
    });

    this.emit('recordWritten', { url, type: 'response' });
  }

  /**
   * Write a standalone resource
   */
  async writeResource(
    url: string,
    contentType: string,
    body: Buffer,
    date: Date = new Date()
  ): Promise<void> {
    if (!this.isStarted) await this.start();

    const digest = this.calculateDigest(body);
    const digestKey = `${url}:${digest}`;

    // Check for duplicate
    const existing = this.seenDigests.get(digestKey);
    if (existing) {
      await this.writeRevisitRecord(url, date, existing);
      this.duplicatesSkipped++;
      return;
    }

    const recordId = this.generateRecordId();
    this.seenDigests.set(digestKey, { recordId, uri: url });

    const offset = this.currentFileSize;
    await this.writeRecord({
      type: 'resource',
      targetUri: url,
      date,
      recordId,
      contentType,
      contentLength: body.length,
      payloadDigest: `sha256:${digest}`,
      warcInfoId: this.warcInfoId,
      headers: {},
      content: body,
    });

    this.cdxRecords.push({
      urlkey: this.toSURT(url),
      timestamp: this.formatTimestamp(date),
      originalUrl: url,
      mimeType: contentType.split(';')[0].trim(),
      statusCode: 200,
      digest,
      length: body.length,
      offset,
      filename: path.basename(this.currentFilePath),
    });

    this.emit('recordWritten', { url, type: 'resource' });
  }

  /**
   * Write metadata record
   */
  async writeMetadata(
    targetUri: string,
    metadata: Record<string, unknown>,
    date: Date = new Date()
  ): Promise<void> {
    if (!this.isStarted) await this.start();

    const content = Buffer.from(JSON.stringify(metadata, null, 2));

    await this.writeRecord({
      type: 'metadata',
      targetUri,
      date,
      recordId: this.generateRecordId(),
      contentType: 'application/json',
      contentLength: content.length,
      warcInfoId: this.warcInfoId,
      headers: {},
      content,
    });

    this.emit('recordWritten', { url: targetUri, type: 'metadata' });
  }

  /**
   * Finish and close the archive
   */
  async finish(): Promise<{ warcPath: string; cdxPath: string; stats: WARCStats }> {
    if (this.currentFile) {
      await new Promise<void>((resolve, reject) => {
        if (this.currentFile instanceof zlib.Gzip) {
          this.currentFile.end(() => resolve());
        } else if (this.currentFile) {
          this.currentFile.end(() => resolve());
        } else {
          resolve();
        }
      });
      this.currentFile = null;
    }

    const cdxPath = await this.writeCDXIndex();

    const stats: WARCStats = {
      recordCount: this.recordCount,
      fileCount: this.fileIndex,
      totalBytes: this.currentFileSize,
      cdxRecords: this.cdxRecords.length,
      uniqueResources: this.seenDigests.size,
      duplicatesSkipped: this.duplicatesSkipped,
    };

    this.emit('finished', stats);
    return { warcPath: this.currentFilePath, cdxPath, stats };
  }

  /**
   * Get current statistics
   */
  getStats(): WARCStats {
    return {
      recordCount: this.recordCount,
      fileCount: this.fileIndex,
      totalBytes: this.currentFileSize,
      cdxRecords: this.cdxRecords.length,
      uniqueResources: this.seenDigests.size,
      duplicatesSkipped: this.duplicatesSkipped,
    };
  }

  // Private methods

  private async createNewFile(): Promise<void> {
    if (this.currentFile) {
      await new Promise<void>((resolve) => {
        if (this.currentFile instanceof zlib.Gzip) {
          this.currentFile.end(() => resolve());
        } else if (this.currentFile) {
          this.currentFile.end(() => resolve());
        } else {
          resolve();
        }
      });
    }

    this.fileIndex++;
    const ext = this.config.compress ? '.warc.gz' : '.warc';
    const filename =
      this.fileIndex === 1
        ? `${this.config.filename}${ext}`
        : `${this.config.filename}-${this.fileIndex.toString().padStart(5, '0')}${ext}`;

    this.currentFilePath = path.join(this.config.outputDir, filename);

    if (this.config.compress) {
      const gzip = zlib.createGzip({ level: 6 });
      const fileStream = fs.createWriteStream(this.currentFilePath);
      gzip.pipe(fileStream);
      this.currentFile = gzip;
    } else {
      this.currentFile = fs.createWriteStream(this.currentFilePath);
    }

    this.currentFileSize = 0;
  }

  private async writeWarcInfo(): Promise<void> {
    this.warcInfoId = this.generateRecordId();

    const infoContent = [
      `software: ${this.config.software}`,
      `hostname: ${this.config.hostname}`,
      `operator: ${this.config.operator}`,
      `description: ${this.config.description}`,
      `robots: ${this.config.robots}`,
      `format: WARC File Format 1.1`,
      `conformsTo: https://iipc.github.io/warc-specifications/specifications/warc-format/warc-1.1/`,
    ].join('\r\n');

    const content = Buffer.from(infoContent);

    await this.writeRecord({
      type: 'warcinfo',
      date: new Date(),
      recordId: this.warcInfoId,
      contentType: 'application/warc-fields',
      contentLength: content.length,
      headers: {
        'WARC-Filename': path.basename(this.currentFilePath),
      },
      content,
    });
  }

  private async writeRevisitRecord(
    url: string,
    date: Date,
    original: { recordId: string; uri: string }
  ): Promise<void> {
    await this.writeRecord({
      type: 'revisit',
      targetUri: url,
      date,
      recordId: this.generateRecordId(),
      refersTo: original.recordId,
      warcInfoId: this.warcInfoId,
      headers: {
        'WARC-Profile': 'http://netpreserve.org/warc/1.1/revisit/identical-payload-digest',
        'WARC-Refers-To-Target-URI': original.uri,
      },
      contentType: 'application/http;msgtype=response',
      contentLength: 0,
      content: Buffer.alloc(0),
    });

    this.emit('recordWritten', { url, type: 'revisit' });
  }

  private async writeRecord(record: WARCRecord): Promise<void> {
    // Check if file rotation needed
    if (this.currentFileSize > this.config.maxFileSize) {
      await this.createNewFile();
      await this.writeWarcInfo();
    }

    // Build WARC header block
    const headerLines: string[] = [
      'WARC/1.1',
      `WARC-Type: ${record.type}`,
      `WARC-Date: ${record.date.toISOString()}`,
      `WARC-Record-ID: <${record.recordId}>`,
    ];

    if (record.targetUri) {
      headerLines.push(`WARC-Target-URI: ${record.targetUri}`);
    }
    if (record.contentType) {
      headerLines.push(`Content-Type: ${record.contentType}`);
    }
    headerLines.push(`Content-Length: ${record.contentLength}`);
    if (record.payloadDigest) {
      headerLines.push(`WARC-Payload-Digest: ${record.payloadDigest}`);
    }
    if (record.refersTo) {
      headerLines.push(`WARC-Refers-To: <${record.refersTo}>`);
    }
    if (record.concurrentTo) {
      headerLines.push(`WARC-Concurrent-To: <${record.concurrentTo}>`);
    }
    if (record.warcInfoId) {
      headerLines.push(`WARC-Warcinfo-ID: <${record.warcInfoId}>`);
    }

    for (const [key, value] of Object.entries(record.headers)) {
      headerLines.push(`${key}: ${value}`);
    }

    const headerBlock = Buffer.from(headerLines.join('\r\n') + '\r\n\r\n');
    const recordEnd = Buffer.from('\r\n\r\n');
    const fullRecord = Buffer.concat([headerBlock, record.content, recordEnd]);

    // Write to stream
    await new Promise<void>((resolve, reject) => {
      const ok = this.currentFile!.write(fullRecord, (err) => {
        if (err) reject(err);
        else resolve();
      });
      if (ok === false) {
        this.currentFile!.once('drain', resolve);
      }
    });

    this.currentFileSize += fullRecord.length;
    this.recordCount++;
  }

  private async writeCDXIndex(): Promise<string> {
    const cdxPath = path.join(this.config.outputDir, `${this.config.filename}.cdx`);

    // CDX header and sorted records
    const header = ' CDX N b a m s k r M S V g\n';
    const lines = this.cdxRecords
      .sort((a, b) => a.urlkey.localeCompare(b.urlkey) || a.timestamp.localeCompare(b.timestamp))
      .map(
        (r) =>
          `${r.urlkey} ${r.timestamp} ${r.originalUrl} ${r.mimeType} ${r.statusCode} ${r.digest} - ${r.length} ${r.offset} ${r.filename}`
      );

    await fs.promises.writeFile(cdxPath, header + lines.join('\n'));
    return cdxPath;
  }

  private generateRecordId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  private calculateDigest(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('base64');
  }

  private formatTimestamp(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  private toSURT(urlString: string): string {
    try {
      const u = new URL(urlString);
      const hostParts = u.hostname.split('.').reverse();
      return `${hostParts.join(',')})${u.pathname}${u.search}`;
    } catch {
      return urlString;
    }
  }
}

/**
 * Create WARC archive from cloned directory
 */
export async function createWARCFromDirectory(
  cloneDir: string,
  outputDir: string,
  baseUrl: string,
  options?: Partial<WARCConfig>
): Promise<{ warcPath: string; cdxPath: string; stats: WARCStats }> {
  const hostname = new URL(baseUrl).hostname;
  const generator = new EnhancedWARCGenerator({
    outputDir,
    filename: `clone-${hostname}-${Date.now()}`,
    compress: true,
    ...options,
  });

  await generator.start();

  async function walkDir(dir: string, urlPath: string = ''): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      const fileUrlPath = urlPath + '/' + entry.name;

      if (entry.isDirectory()) {
        await walkDir(filePath, fileUrlPath);
      } else {
        const content = await fs.promises.readFile(filePath);
        const contentType = getContentType(entry.name);
        let resourceUrl = baseUrl + fileUrlPath;

        // Handle index.html
        if (entry.name === 'index.html') {
          resourceUrl = baseUrl + urlPath + '/';
        }

        await generator.writeResource(resourceUrl, contentType, content);
      }
    }
  }

  await walkDir(cloneDir);
  return generator.finish();
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.zip': 'application/zip',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

// Export singleton
export const enhancedWarcGenerator = new EnhancedWARCGenerator({
  outputDir: './data/warc',
});
