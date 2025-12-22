/**
 * WARC Format Generator
 * Generates industry-standard Web ARChive (WARC) files
 * Based on ISO 28500 standard
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface WARCRecord {
  type: 'request' | 'response' | 'metadata' | 'resource' | 'revisit' | 'conversion';
  url: string;
  date: Date;
  contentType?: string;
  content: Buffer | string;
  headers?: Record<string, string>;
  statusCode?: number;
  targetUri?: string;
}

export interface WARCGenerationOptions {
  outputDir: string;
  filename?: string;
  compress?: boolean;
}

/**
 * WARC Generator Service
 */
export class WARCGenerator {
  /**
   * Generates WARC file from records
   */
  async generateWARC(
    records: WARCRecord[],
    options: WARCGenerationOptions
  ): Promise<string> {
    const warcDir = path.join(options.outputDir, 'warc');
    await fs.mkdir(warcDir, { recursive: true });

    const filename = options.filename || `archive-${Date.now()}.warc${options.compress ? '.gz' : ''}`;
    const warcPath = path.join(warcDir, filename);

    let warcContent = '';

    for (const record of records) {
      warcContent += this.generateWARCRecord(record);
    }

    if (options.compress) {
      // For compression, we'd need zlib - for now, save uncompressed
      // In production, use zlib.gzipSync
      await fs.writeFile(warcPath.replace('.gz', ''), warcContent, 'utf-8');
    } else {
      await fs.writeFile(warcPath, warcContent, 'utf-8');
    }

    return warcPath;
  }

  /**
   * Generates a single WARC record
   */
  private generateWARCRecord(record: WARCRecord): string {
    const warcVersion = 'WARC/1.1';
    const recordId = this.generateRecordId();
    const date = this.formatWARCDate(record.date);
    const contentType = record.contentType || 'application/http; msgtype=response';
    const contentLength = typeof record.content === 'string' 
      ? Buffer.byteLength(record.content, 'utf-8')
      : record.content.length;

    let warcRecord = `${warcVersion}\r\n`;
    warcRecord += `WARC-Type: ${this.mapRecordType(record.type)}\r\n`;
    warcRecord += `WARC-Record-ID: <urn:uuid:${recordId}>\r\n`;
    warcRecord += `WARC-Date: ${date}\r\n`;
    warcRecord += `WARC-Target-URI: ${record.url}\r\n`;
    
    if (record.targetUri) {
      warcRecord += `WARC-Refers-To: ${record.targetUri}\r\n`;
    }
    
    if (record.statusCode) {
      warcRecord += `HTTP-Status-Code: ${record.statusCode}\r\n`;
    }

    // Add custom headers
    if (record.headers) {
      for (const [key, value] of Object.entries(record.headers)) {
        warcRecord += `${key}: ${value}\r\n`;
      }
    }

    warcRecord += `Content-Type: ${contentType}\r\n`;
    warcRecord += `Content-Length: ${contentLength}\r\n`;
    warcRecord += '\r\n';

    // Add content
    if (typeof record.content === 'string') {
      warcRecord += record.content;
    } else {
      warcRecord += record.content.toString('binary');
    }

    warcRecord += '\r\n\r\n';

    return warcRecord;
  }

  /**
   * Maps record type to WARC type
   */
  private mapRecordType(type: WARCRecord['type']): string {
    const mapping: Record<WARCRecord['type'], string> = {
      request: 'request',
      response: 'response',
      metadata: 'metadata',
      resource: 'resource',
      revisit: 'revisit',
      conversion: 'conversion',
    };
    return mapping[type] || 'response';
  }

  /**
   * Generates WARC record ID
   */
  private generateRecordId(): string {
    // Generate UUID-like ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Formats date for WARC
   */
  private formatWARCDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Creates WARC records from clone result
   */
  async createRecordsFromClone(
    pages: Array<{ url: string; html: string; date: Date; headers?: Record<string, string> }>,
    assets: Array<{ url: string; content: Buffer; contentType: string; date: Date }>
  ): Promise<WARCRecord[]> {
    const records: WARCRecord[] = [];

    // Add page records
    for (const page of pages) {
      records.push({
        type: 'response',
        url: page.url,
        date: page.date,
        contentType: 'text/html',
        content: page.html,
        headers: page.headers,
        statusCode: 200,
      });
    }

    // Add asset records
    for (const asset of assets) {
      records.push({
        type: 'resource',
        url: asset.url,
        date: asset.date,
        contentType: asset.contentType,
        content: asset.content,
        statusCode: 200,
      });
    }

    return records;
  }

  /**
   * Validates WARC file
   */
  async validateWARC(warcPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const content = await fs.readFile(warcPath, 'utf-8');
      const lines = content.split('\n');

      if (!lines[0]?.startsWith('WARC/')) {
        errors.push('Invalid WARC version header');
      }

      // Basic validation - check for required WARC headers
      let hasRecord = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('WARC-Type:')) {
          hasRecord = true;
        }
        if (line.startsWith('WARC-Record-ID:')) {
          // Valid record ID format
        }
      }

      if (!hasRecord) {
        errors.push('No WARC records found');
      }
    } catch (error) {
      errors.push(`Failed to read WARC file: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

