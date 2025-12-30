/**
 * WARC Playback Engine
 * Serves archived content from WARC files with Wayback Machine-style navigation
 *
 * Features:
 * - CDX index-based fast lookups
 * - Temporal navigation (view archives at specific dates)
 * - URL rewriting for self-contained playback
 * - Memento Protocol support (RFC 7089)
 * - Banner injection for archive context
 * - Multi-archive support
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as http from 'http';
import * as url from 'url';

export interface CDXEntry {
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

export interface ArchiveInfo {
  id: string;
  name: string;
  warcPath: string;
  cdxPath: string;
  createdAt: Date;
  recordCount: number;
  totalSize: number;
  urlCount: number;
}

export interface PlaybackConfig {
  archivesDir: string;
  port?: number;
  host?: string;
  injectBanner?: boolean;
  urlRewriteEnabled?: boolean;
  mementoEnabled?: boolean;
}

export interface PlaybackRequest {
  originalUrl: string;
  timestamp?: string;
  archiveId?: string;
}

export class WARCPlayback extends EventEmitter {
  private config: Required<PlaybackConfig>;
  private archives: Map<string, ArchiveInfo> = new Map();
  private cdxIndex: Map<string, CDXEntry[]> = new Map();
  private server: http.Server | null = null;

  constructor(config: PlaybackConfig) {
    super();
    this.config = {
      archivesDir: config.archivesDir,
      port: config.port || 8080,
      host: config.host || 'localhost',
      injectBanner: config.injectBanner !== false,
      urlRewriteEnabled: config.urlRewriteEnabled !== false,
      mementoEnabled: config.mementoEnabled !== false,
    };
  }

  /**
   * Initialize the playback engine
   */
  async initialize(): Promise<void> {
    await fs.promises.mkdir(this.config.archivesDir, { recursive: true });
    await this.loadArchives();
    console.log(`[WARCPlayback] Loaded ${this.archives.size} archives`);
  }

  /**
   * Load all archives from the directory
   */
  async loadArchives(): Promise<void> {
    const entries = await fs.promises.readdir(this.config.archivesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.cdx')) {
        const cdxPath = path.join(this.config.archivesDir, entry.name);
        const baseName = entry.name.replace('.cdx', '');

        // Find corresponding WARC file
        const warcGz = path.join(this.config.archivesDir, `${baseName}.warc.gz`);
        const warc = path.join(this.config.archivesDir, `${baseName}.warc`);

        let warcPath: string | null = null;
        if (await this.fileExists(warcGz)) {
          warcPath = warcGz;
        } else if (await this.fileExists(warc)) {
          warcPath = warc;
        }

        if (warcPath) {
          await this.loadArchive(baseName, warcPath, cdxPath);
        }
      }
    }
  }

  /**
   * Load a specific archive
   */
  async loadArchive(id: string, warcPath: string, cdxPath: string): Promise<ArchiveInfo> {
    // Load CDX index
    const cdxContent = await fs.promises.readFile(cdxPath, 'utf-8');
    const lines = cdxContent.split('\n').filter((l) => l.trim() && !l.startsWith(' CDX'));

    const entries: CDXEntry[] = [];
    for (const line of lines) {
      const parts = line.split(' ');
      if (parts.length >= 10) {
        const entry: CDXEntry = {
          urlkey: parts[0],
          timestamp: parts[1],
          originalUrl: parts[2],
          mimeType: parts[3],
          statusCode: parseInt(parts[4], 10),
          digest: parts[5],
          length: parseInt(parts[7], 10),
          offset: parseInt(parts[8], 10),
          filename: parts[9],
        };
        entries.push(entry);

        // Index by URL
        const key = entry.originalUrl;
        if (!this.cdxIndex.has(key)) {
          this.cdxIndex.set(key, []);
        }
        this.cdxIndex.get(key)!.push(entry);
      }
    }

    // Get WARC stats
    const warcStats = await fs.promises.stat(warcPath);

    const archiveInfo: ArchiveInfo = {
      id,
      name: id,
      warcPath,
      cdxPath,
      createdAt: warcStats.birthtime,
      recordCount: entries.length,
      totalSize: warcStats.size,
      urlCount: new Set(entries.map((e) => e.originalUrl)).size,
    };

    this.archives.set(id, archiveInfo);
    this.emit('archiveLoaded', archiveInfo);

    return archiveInfo;
  }

  /**
   * Start the playback server
   */
  async startServer(): Promise<void> {
    await this.initialize();

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        console.log(`[WARCPlayback] Server running at http://${this.config.host}:${this.config.port}`);
        this.emit('serverStarted', { port: this.config.port });
        resolve();
      });
    });
  }

  /**
   * Stop the playback server
   */
  async stopServer(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        this.emit('serverStopped');
        resolve();
      });
    });
  }

  /**
   * Get archived URLs for a domain
   */
  getUrlsForDomain(domain: string): string[] {
    const urls: string[] = [];
    for (const url of this.cdxIndex.keys()) {
      try {
        if (new URL(url).hostname === domain) {
          urls.push(url);
        }
      } catch {}
    }
    return urls;
  }

  /**
   * Get available timestamps for a URL
   */
  getTimestampsForUrl(targetUrl: string): string[] {
    const entries = this.cdxIndex.get(targetUrl);
    if (!entries) return [];
    return entries.map((e) => e.timestamp).sort();
  }

  /**
   * Get archive content for a URL
   */
  async getContent(request: PlaybackRequest): Promise<{
    content: Buffer;
    contentType: string;
    statusCode: number;
    headers: Record<string, string>;
    timestamp: string;
  } | null> {
    // Find matching CDX entry
    const entries = this.cdxIndex.get(request.originalUrl);
    if (!entries || entries.length === 0) return null;

    // Find best matching entry
    let entry: CDXEntry;
    if (request.timestamp) {
      entry = this.findClosestEntry(entries, request.timestamp);
    } else {
      entry = entries[entries.length - 1]; // Latest
    }

    // Find archive
    let archiveInfo: ArchiveInfo | undefined;
    for (const archive of this.archives.values()) {
      if (path.basename(archive.warcPath).startsWith(entry.filename.replace('.warc.gz', '').replace('.warc', ''))) {
        archiveInfo = archive;
        break;
      }
    }

    if (!archiveInfo) {
      // Try finding by any archive that contains this filename
      for (const archive of this.archives.values()) {
        archiveInfo = archive;
        break;
      }
    }

    if (!archiveInfo) return null;

    // Read from WARC
    const content = await this.readWARCRecord(archiveInfo.warcPath, entry.offset, entry.length);
    if (!content) return null;

    // Parse HTTP response from content
    const parsed = this.parseHTTPResponse(content);

    return {
      content: parsed.body,
      contentType: entry.mimeType,
      statusCode: entry.statusCode,
      headers: parsed.headers,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Get all archives
   */
  getArchives(): ArchiveInfo[] {
    return Array.from(this.archives.values());
  }

  /**
   * Search archives
   */
  searchArchives(query: string): CDXEntry[] {
    const results: CDXEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const entries of this.cdxIndex.values()) {
      for (const entry of entries) {
        if (entry.originalUrl.toLowerCase().includes(queryLower)) {
          results.push(entry);
        }
      }
    }

    return results.slice(0, 100); // Limit results
  }

  // Private methods

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';

    // API endpoints
    if (pathname.startsWith('/api/')) {
      await this.handleAPIRequest(pathname, parsedUrl.query as Record<string, string>, res);
      return;
    }

    // Memento timegate/timemap
    if (this.config.mementoEnabled) {
      if (pathname.startsWith('/timegate/')) {
        const targetUrl = pathname.slice('/timegate/'.length);
        await this.handleTimegate(targetUrl, req, res);
        return;
      }

      if (pathname.startsWith('/timemap/')) {
        const targetUrl = pathname.slice('/timemap/'.length);
        await this.handleTimemap(targetUrl, res);
        return;
      }
    }

    // Wayback-style URL: /web/TIMESTAMP/URL
    const webMatch = pathname.match(/^\/web\/(\d{14})\/(.+)$/);
    if (webMatch) {
      const [, timestamp, targetUrl] = webMatch;
      await this.handleArchiveRequest(decodeURIComponent(targetUrl), timestamp, res);
      return;
    }

    // Simple archive URL: /archive/URL
    const archiveMatch = pathname.match(/^\/archive\/(.+)$/);
    if (archiveMatch) {
      const targetUrl = archiveMatch[1];
      await this.handleArchiveRequest(decodeURIComponent(targetUrl), undefined, res);
      return;
    }

    // Home page - list archives
    if (pathname === '/' || pathname === '/index.html') {
      await this.handleHomePage(res);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private async handleAPIRequest(
    pathname: string,
    query: Record<string, string>,
    res: http.ServerResponse
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (pathname === '/api/archives') {
      res.writeHead(200);
      res.end(JSON.stringify(this.getArchives()));
      return;
    }

    if (pathname === '/api/search') {
      const results = this.searchArchives(query.q || '');
      res.writeHead(200);
      res.end(JSON.stringify(results));
      return;
    }

    if (pathname === '/api/timestamps') {
      const timestamps = this.getTimestampsForUrl(query.url || '');
      res.writeHead(200);
      res.end(JSON.stringify(timestamps));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
  }

  private async handleArchiveRequest(
    targetUrl: string,
    timestamp: string | undefined,
    res: http.ServerResponse
  ): Promise<void> {
    // Add protocol if missing
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const content = await this.getContent({ originalUrl: targetUrl, timestamp });

    if (!content) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(this.generateNotFoundPage(targetUrl));
      return;
    }

    // Add Memento headers
    if (this.config.mementoEnabled) {
      res.setHeader('Memento-Datetime', this.formatMementoDate(content.timestamp));
      res.setHeader('Link', `<${targetUrl}>; rel="original"`);
    }

    // Set content type
    res.setHeader('Content-Type', content.contentType);

    // Inject banner for HTML content
    let body = content.content;
    if (this.config.injectBanner && content.contentType.includes('text/html')) {
      body = this.injectArchiveBanner(body, targetUrl, content.timestamp);
    }

    // URL rewriting for HTML
    if (this.config.urlRewriteEnabled && content.contentType.includes('text/html')) {
      body = this.rewriteUrls(body, targetUrl, content.timestamp);
    }

    res.writeHead(content.statusCode);
    res.end(body);
  }

  private async handleTimegate(
    targetUrl: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // RFC 7089 Timegate
    const acceptDatetime = req.headers['accept-datetime'];
    let timestamp: string | undefined;

    if (acceptDatetime) {
      const date = new Date(acceptDatetime as string);
      timestamp = this.formatTimestamp(date);
    }

    await this.handleArchiveRequest(targetUrl, timestamp, res);
  }

  private async handleTimemap(targetUrl: string, res: http.ServerResponse): Promise<void> {
    // RFC 7089 Timemap
    const timestamps = this.getTimestampsForUrl(targetUrl);

    if (timestamps.length === 0) {
      res.writeHead(404);
      res.end('No mementos found');
      return;
    }

    const links = timestamps.map((ts) => {
      const date = this.parseTimestamp(ts);
      return `<${this.config.host}:${this.config.port}/web/${ts}/${targetUrl}>; rel="memento"; datetime="${date.toUTCString()}"`;
    });

    res.setHeader('Content-Type', 'application/link-format');
    res.writeHead(200);
    res.end(links.join(',\n'));
  }

  private async handleHomePage(res: http.ServerResponse): Promise<void> {
    const archives = this.getArchives();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Merlin Archive Playback</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .archive { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .archive h2 { margin: 0 0 10px 0; color: #0066cc; }
    .stats { color: #666; font-size: 14px; }
    .search { width: 100%; padding: 10px; margin: 20px 0; font-size: 16px; }
  </style>
</head>
<body>
  <h1>🗄️ Merlin Archive Playback</h1>
  <input type="text" class="search" placeholder="Search archived URLs..." id="searchInput">
  <div id="results"></div>
  <h2>Available Archives</h2>
  ${archives.map((a) => `
    <div class="archive">
      <h2>${a.name}</h2>
      <div class="stats">
        Created: ${a.createdAt.toLocaleString()}<br>
        Records: ${a.recordCount} | URLs: ${a.urlCount} | Size: ${(a.totalSize / 1024 / 1024).toFixed(2)} MB
      </div>
    </div>
  `).join('')}
  <script>
    document.getElementById('searchInput').addEventListener('input', async (e) => {
      const q = e.target.value;
      if (q.length < 3) return;
      const res = await fetch('/api/search?q=' + encodeURIComponent(q));
      const results = await res.json();
      document.getElementById('results').innerHTML = results.map(r =>
        '<a href="/web/' + r.timestamp + '/' + r.originalUrl + '">' + r.originalUrl + ' (' + r.timestamp + ')</a><br>'
      ).join('');
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(html);
  }

  private async readWARCRecord(warcPath: string, offset: number, length: number): Promise<Buffer | null> {
    try {
      const isCompressed = warcPath.endsWith('.gz');

      if (isCompressed) {
        // For gzipped WARC, we need to decompress the whole file
        // In production, use chunked reading with proper gzip member handling
        const content = await fs.promises.readFile(warcPath);
        const decompressed = zlib.gunzipSync(content);

        // Find the record at offset (approximate for compressed)
        return decompressed.slice(offset, offset + length + 4096);
      } else {
        const fd = await fs.promises.open(warcPath, 'r');
        const buffer = Buffer.alloc(length + 4096);
        await fd.read(buffer, 0, length + 4096, offset);
        await fd.close();
        return buffer;
      }
    } catch (error) {
      console.error('[WARCPlayback] Error reading WARC:', error);
      return null;
    }
  }

  private parseHTTPResponse(content: Buffer): { headers: Record<string, string>; body: Buffer } {
    const str = content.toString('utf-8');
    const headerEndIndex = str.indexOf('\r\n\r\n');

    if (headerEndIndex === -1) {
      return { headers: {}, body: content };
    }

    const headerSection = str.slice(0, headerEndIndex);
    const bodyStart = headerEndIndex + 4;

    // Find end of HTTP response within WARC record
    const bodyEndIndex = str.indexOf('\r\n\r\nWARC/', bodyStart);
    const bodyContent =
      bodyEndIndex > 0
        ? content.slice(bodyStart, bodyEndIndex)
        : content.slice(bodyStart);

    const headers: Record<string, string> = {};
    const headerLines = headerSection.split('\r\n').slice(1); // Skip status line

    for (const line of headerLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        const value = line.slice(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    return { headers, body: bodyContent };
  }

  private injectArchiveBanner(content: Buffer, originalUrl: string, timestamp: string): Buffer {
    const html = content.toString('utf-8');
    const date = this.parseTimestamp(timestamp);

    const banner = `
<div id="merlin-archive-banner" style="position:fixed;top:0;left:0;right:0;background:#1a1a2e;color:white;padding:10px 20px;z-index:999999;font-family:system-ui;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    📦 <strong>Archived by Merlin</strong> on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}
  </div>
  <div>
    <a href="${originalUrl}" style="color:#00d4ff;" target="_blank">View Original</a>
  </div>
</div>
<style>#merlin-archive-banner ~ * { margin-top: 50px !important; }</style>
`;

    // Inject after <body> tag
    const injected = html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
    return Buffer.from(injected);
  }

  private rewriteUrls(content: Buffer, baseUrl: string, timestamp: string): Buffer {
    let html = content.toString('utf-8');
    const baseUrlObj = new URL(baseUrl);
    const prefix = `/web/${timestamp}/`;

    // Rewrite absolute URLs
    html = html.replace(
      /(href|src|action)=["'](https?:\/\/[^"']+)["']/gi,
      (match, attr, url) => `${attr}="${prefix}${url}"`
    );

    // Rewrite relative URLs
    html = html.replace(
      /(href|src|action)=["']\/([^"']+)["']/gi,
      (match, attr, path) => `${attr}="${prefix}${baseUrlObj.origin}/${path}"`
    );

    return Buffer.from(html);
  }

  private generateNotFoundPage(targetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><title>Not in Archive</title></head>
<body style="font-family: system-ui; text-align: center; padding: 50px;">
  <h1>😔 Not Found in Archive</h1>
  <p>The URL <code>${targetUrl}</code> is not in our archives.</p>
  <p><a href="/">← Back to Archive Index</a></p>
</body>
</html>`;
  }

  private findClosestEntry(entries: CDXEntry[], targetTimestamp: string): CDXEntry {
    const target = parseInt(targetTimestamp, 10);
    let closest = entries[0];
    let closestDiff = Math.abs(parseInt(closest.timestamp, 10) - target);

    for (const entry of entries) {
      const diff = Math.abs(parseInt(entry.timestamp, 10) - target);
      if (diff < closestDiff) {
        closest = entry;
        closestDiff = diff;
      }
    }

    return closest;
  }

  private formatTimestamp(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }

  private parseTimestamp(timestamp: string): Date {
    const year = parseInt(timestamp.slice(0, 4), 10);
    const month = parseInt(timestamp.slice(4, 6), 10) - 1;
    const day = parseInt(timestamp.slice(6, 8), 10);
    const hour = parseInt(timestamp.slice(8, 10), 10);
    const minute = parseInt(timestamp.slice(10, 12), 10);
    const second = parseInt(timestamp.slice(12, 14), 10);
    return new Date(year, month, day, hour, minute, second);
  }

  private formatMementoDate(timestamp: string): string {
    return this.parseTimestamp(timestamp).toUTCString();
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export const warcPlayback = new WARCPlayback({
  archivesDir: './data/warc',
});
