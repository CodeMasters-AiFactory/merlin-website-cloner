/**
 * Comprehensive Asset Capture
 * Captures fonts, videos, audio, icons, SVG, PDFs, data URIs, blob URLs
 */

import type { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

export interface Asset {
  url: string;
  type: string;
  localPath: string;
  size: number;
  mimeType?: string;
}

export interface AssetCaptureOptions {
  outputDir: string;
  baseUrl: string;
  captureFonts?: boolean;
  captureVideos?: boolean;
  captureAudio?: boolean;
  captureIcons?: boolean;
  captureSvg?: boolean;
  capturePdfs?: boolean;
  captureStylesheets?: boolean;
  captureScripts?: boolean;
  convertDataUris?: boolean;
  convertBlobUrls?: boolean;
  parallelDownloads?: boolean;
  maxConcurrentDownloads?: number;
  triggerLazyLoading?: boolean;
  handleInfiniteScroll?: boolean;
  optimizeAssets?: boolean;
  onFileDownloaded?: (file: { path: string; size: number; type: string }) => void;
}

export class AssetCapture {
  private capturedAssets: Map<string, Asset> = new Map();
  private downloadQueue: Array<{ url: string; priority: number; type: string }> = [];
  private downloading: Set<string> = new Set();

  /**
   * Captures all assets from a page
   */
  async captureAllAssets(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const assets: Asset[] = [];

    // Trigger lazy loading if enabled
    if (options.triggerLazyLoading !== false) {
      await this.triggerLazyLoading(page);
    }

    // Handle infinite scroll if enabled
    if (options.handleInfiniteScroll) {
      await this.handleInfiniteScroll(page);
    }

    // Capture images (already handled, but ensure completeness)
    const images = await this.captureImages(page, options);
    assets.push(...images);

    // Capture fonts
    if (options.captureFonts !== false) {
      const fonts = await this.captureFonts(page, options);
      assets.push(...fonts);
    }

    // Capture videos
    if (options.captureVideos !== false) {
      const videos = await this.captureVideos(page, options);
      assets.push(...videos);
    }

    // Capture audio
    if (options.captureAudio !== false) {
      const audio = await this.captureAudio(page, options);
      assets.push(...audio);
    }

    // Capture icons
    if (options.captureIcons !== false) {
      const icons = await this.captureIcons(page, options);
      assets.push(...icons);
    }

    // Capture SVG
    if (options.captureSvg !== false) {
      const svgs = await this.captureSvgs(page, options);
      assets.push(...svgs);
    }

    // Capture PDFs
    if (options.capturePdfs !== false) {
      const pdfs = await this.capturePdfs(page, options);
      assets.push(...pdfs);
    }

    // Capture Stylesheets (CSS) - CRITICAL for proper rendering
    if (options.captureStylesheets !== false) {
      const stylesheets = await this.captureStylesheets(page, options);
      assets.push(...stylesheets);
    }

    // Capture Scripts (JS) - CRITICAL for interactivity
    if (options.captureScripts !== false) {
      const scripts = await this.captureScripts(page, options);
      assets.push(...scripts);
    }

    // Convert data URIs
    if (options.convertDataUris) {
      const dataUriAssets = await this.convertDataUris(page, options);
      assets.push(...dataUriAssets);
    }

    // Convert blob URLs
    if (options.convertBlobUrls) {
      const blobAssets = await this.convertBlobUrls(page, options);
      assets.push(...blobAssets);
    }

    return assets;
  }

  /**
   * Captures images
   */
  private async captureImages(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const images = await page.evaluate(() => {
      const imgElements = Array.from(document.querySelectorAll('img'));
      const sources = Array.from(document.querySelectorAll('source[srcset]'));
      
      const urls: string[] = [];
      
      imgElements.forEach(img => {
        if (img.src) urls.push(img.src);
        if (img.srcset) {
          img.srcset.split(',').forEach(src => {
            const url = src.trim().split(' ')[0];
            if (url) urls.push(url);
          });
        }
        if (img.dataset.src) urls.push(img.dataset.src);
        if (img.dataset.lazySrc) urls.push(img.dataset.lazySrc);
      });
      
      const sourceElements = Array.from(sources) as HTMLSourceElement[];
      sourceElements.forEach((source: HTMLSourceElement) => {
        if (source.srcset) {
          source.srcset.split(',').forEach((src: string) => {
            const url = src.trim().split(' ')[0];
            if (url) urls.push(url);
          });
        }
      });
      
      // Background images
      const elements = Array.from(document.querySelectorAll('*'));
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const match = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (match) urls.push(match[1]);
        }
      });
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(images, 'images', options);
  }

  /**
   * Captures fonts
   */
  private async captureFonts(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const fonts = await page.evaluate(() => {
      const urls: string[] = [];
      
      // Find @font-face declarations
      const styleSheets = Array.from(document.styleSheets);
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule instanceof CSSFontFaceRule) {
              const style = rule.style as CSSStyleDeclaration & { src?: string };
              const src = style.src;
              if (src) {
                const match = src.match(/url\(['"]?([^'")]+)['"]?\)/);
                if (match) {
                  urls.push(match[1]);
                }
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheet
        }
      });
      
      // Find link tags with font files
      const links = Array.from(document.querySelectorAll('link[href]'));
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (/\.(woff|woff2|ttf|otf|eot)$/i.test(href)) {
          urls.push(href);
        }
      });
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(fonts, 'fonts', options);
  }

  /**
   * Extracts video metadata (transcripts, thumbnails, etc.)
   */
  async extractVideoMetadata(page: Page): Promise<Array<{
    url: string;
    title?: string;
    duration?: number;
    thumbnail?: string;
    transcript?: string;
    description?: string;
    format?: string;
  }>> {
    const metadata: Array<{
      url: string;
      title?: string;
      duration?: number;
      thumbnail?: string;
      transcript?: string;
      description?: string;
      format?: string;
    }> = [];
    
    try {
      const videoData = await page.evaluate(() => {
        const videos: Array<{
          url: string;
          title?: string;
          duration?: number;
          thumbnail?: string;
          transcript?: string;
          description?: string;
          format?: string;
        }> = [];
        
        // Get all video elements
        const videoElements = Array.from(document.querySelectorAll('video'));
        videoElements.forEach((video: HTMLVideoElement) => {
          const data: any = {
            url: video.src || video.currentSrc || '',
          };
          
          // Get title
          if (video.getAttribute('title')) {
            data.title = video.getAttribute('title')!;
          } else if (video.closest('article')?.querySelector('h1, h2, h3')?.textContent) {
            data.title = video.closest('article')!.querySelector('h1, h2, h3')!.textContent!.trim();
          }
          
          // Get duration
          if (!isNaN(video.duration) && video.duration > 0) {
            data.duration = video.duration;
          }
          
          // Get poster/thumbnail
          if (video.poster) {
            data.thumbnail = video.poster;
          }
          
          // Get description from nearby elements
          const description = video.closest('article')?.querySelector('.description, .video-description, p')?.textContent?.trim();
          if (description) {
            data.description = description;
          }
          
          // Try to find transcript
          const transcriptElement = document.querySelector(`[data-video-id="${video.id}"], .transcript, .video-transcript`);
          if (transcriptElement) {
            data.transcript = transcriptElement.textContent?.trim();
          }
          
          // Get format from source elements
          const source = video.querySelector('source');
          if (source && source.type) {
            data.format = source.type;
          }
          
          if (data.url) {
            videos.push(data);
          }
        });
        
        return videos;
      });
      
      metadata.push(...videoData);
    } catch (error) {
      console.error('Failed to extract video metadata:', error);
      // Continue processing other videos
    }

    return metadata;
  }

  /**
   * Captures videos
   */
  private async captureVideos(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const videos = await page.evaluate(() => {
      const videoElements = Array.from(document.querySelectorAll('video'));
      const sources = Array.from(document.querySelectorAll('video source, source[type*="video"]'));
      
      const urls: string[] = [];
      
      videoElements.forEach(video => {
        if (video.src) urls.push(video.src);
        if (video.poster) urls.push(video.poster);
      });
      
      const sourceElements = Array.from(sources) as HTMLSourceElement[];
      sourceElements.forEach((source: HTMLSourceElement) => {
        if (source.src) urls.push(source.src);
      });
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(videos, 'videos', options);
  }

  /**
   * Captures audio
   */
  private async captureAudio(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const audio = await page.evaluate(() => {
      const audioElements = Array.from(document.querySelectorAll('audio'));
      const sources = Array.from(document.querySelectorAll('audio source, source[type*="audio"]'));
      
      const urls: string[] = [];
      
      audioElements.forEach(audio => {
        if (audio.src) urls.push(audio.src);
      });
      
      const sourceElements = Array.from(sources) as HTMLSourceElement[];
      sourceElements.forEach((source: HTMLSourceElement) => {
        if (source.src) urls.push(source.src);
      });
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(audio, 'audio', options);
  }

  /**
   * Captures icons (favicons, app icons)
   */
  private async captureIcons(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const icons = await page.evaluate(() => {
      const urls: string[] = [];
      
      // Favicon
      const favicon = document.querySelector('link[rel*="icon"]');
      if (favicon) {
        const href = favicon.getAttribute('href');
        if (href) urls.push(href);
      }
      
      // Apple touch icons
      const appleIcons = Array.from(document.querySelectorAll('link[rel*="apple-touch-icon"]'));
      appleIcons.forEach(icon => {
        const href = icon.getAttribute('href');
        if (href) urls.push(href);
      });
      
      // Manifest icons
      const manifest = document.querySelector('link[rel="manifest"]');
      if (manifest) {
        const href = manifest.getAttribute('href');
        if (href) urls.push(href);
      }
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(icons, 'icons', options);
  }

  /**
   * Captures SVG files
   */
  private async captureSvgs(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const svgs = await page.evaluate(() => {
      const urls: string[] = [];
      
      // SVG images
      const svgImages = Array.from(document.querySelectorAll('img[src$=".svg"]')) as HTMLImageElement[];
      svgImages.forEach((img: HTMLImageElement) => {
        if (img.src) urls.push(img.src);
      });
      
      // SVG in CSS
      const elements = Array.from(document.querySelectorAll('*'));
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage.includes('.svg')) {
          const match = bgImage.match(/url\(['"]?([^'")]+\.svg)['"]?\)/);
          if (match) urls.push(match[1]);
        }
      });
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(svgs, 'images', options);
  }

  /**
   * Captures PDF files
   */
  private async capturePdfs(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const pdfs = await page.evaluate(() => {
      const urls: string[] = [];
      
      const links = Array.from(document.querySelectorAll('a[href$=".pdf"]'));
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) urls.push(href);
      });
      
      const embeds = Array.from(document.querySelectorAll('embed[src$=".pdf"], object[data$=".pdf"]'));
      embeds.forEach(embed => {
        const src = embed.getAttribute('src') || embed.getAttribute('data');
        if (src) urls.push(src);
      });
      
      return [...new Set(urls)];
    });

    return this.downloadAssets(pdfs, 'documents', options);
  }

  /**
   * Captures stylesheets (CSS files)
   */
  private async captureStylesheets(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const stylesheets = await page.evaluate(() => {
      const urls: string[] = [];

      // Get all <link rel="stylesheet"> elements
      const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
      linkElements.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('data:')) {
          urls.push(href);
        }
      });

      // Get CSS from @import rules in style tags and stylesheets
      const styleSheets = Array.from(document.styleSheets);
      styleSheets.forEach(sheet => {
        try {
          // Get the stylesheet URL itself
          if (sheet.href && !sheet.href.startsWith('data:')) {
            urls.push(sheet.href);
          }

          // Get @import rules
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule instanceof CSSImportRule && rule.href) {
              urls.push(rule.href);
            }
          });
        } catch (e) {
          // Cross-origin stylesheet - can't access rules but can still get href
          if (sheet.href) {
            urls.push(sheet.href);
          }
        }
      });

      return [...new Set(urls)];
    });

    return this.downloadAssets(stylesheets, 'css', options);
  }

  /**
   * Captures scripts (JS files)
   */
  private async captureScripts(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const scripts = await page.evaluate(() => {
      const urls: string[] = [];

      // Get all <script src="..."> elements
      const scriptElements = Array.from(document.querySelectorAll('script[src]'));
      scriptElements.forEach(script => {
        const src = script.getAttribute('src');
        if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
          urls.push(src);
        }
      });

      // Get preloaded scripts
      const preloadElements = Array.from(document.querySelectorAll('link[rel="preload"][as="script"], link[rel="modulepreload"]'));
      preloadElements.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('data:')) {
          urls.push(href);
        }
      });

      return [...new Set(urls)];
    });

    return this.downloadAssets(scripts, 'js', options);
  }

  /**
   * Converts data URIs to files
   */
  private async convertDataUris(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const dataUris = await page.evaluate(() => {
      const urls: Array<{ data: string; type: string }> = [];
      
      // Find data URIs in images
      const images = Array.from(document.querySelectorAll('img[src^="data:"]')) as HTMLImageElement[];
      images.forEach((img: HTMLImageElement) => {
        if (img.src.startsWith('data:')) {
          urls.push({ data: img.src, type: 'image' });
        }
      });
      
      // Find data URIs in CSS
      const elements = Array.from(document.querySelectorAll('*'));
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage.startsWith('url("data:')) {
          const match = bgImage.match(/url\(['"]?(data:[^'")]+)['"]?\)/);
          if (match) {
            urls.push({ data: match[1], type: 'image' });
          }
        }
      });
      
      return urls;
    });

    const assets: Asset[] = [];
    let index = 0;

    for (const dataUri of dataUris) {
      try {
        const [header, data] = dataUri.data.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const ext = this.getExtensionFromMimeType(mimeType);
        
        const buffer = Buffer.from(data, 'base64');
        const filename = `data-uri-${index++}.${ext}`;
        const localPath = path.join(options.outputDir, 'assets', 'images', filename);
        
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, buffer);
        
        assets.push({
          url: dataUri.data.substring(0, 50) + '...',
          type: 'data-uri',
          localPath,
          size: buffer.length,
          mimeType
        });
      } catch (error) {
        console.error('Error converting data URI:', error);
      }
    }

    return assets;
  }

  /**
   * Converts blob URLs to files
   */
  private async convertBlobUrls(
    page: Page,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    // This requires intercepting blob URL creation
    // For now, return empty array - would need more complex implementation
    return [];
  }

  /**
   * Downloads assets (with parallel download support)
   */
  private async downloadAssets(
    urls: string[],
    assetType: string,
    options: AssetCaptureOptions
  ): Promise<Asset[]> {
    const assets: Asset[] = [];
    const assetDir = path.join(options.outputDir, 'assets', assetType);
    await fs.mkdir(assetDir, { recursive: true });

    // Filter out already captured assets
    const urlsToDownload = urls.filter(url => !this.capturedAssets.has(url));

    if (urlsToDownload.length === 0) {
      // Return already captured assets
      return urls.map(url => this.capturedAssets.get(url)!).filter(Boolean);
    }

    // Enhanced parallel downloads with p-limit for better concurrency control
    if (options.parallelDownloads !== false) {
      const maxConcurrent = options.maxConcurrentDownloads || 20; // Increased default
      const limit = pLimit(maxConcurrent);

      // Create download promises with concurrency limit
      const downloadPromises = urlsToDownload.map(url =>
        limit(() => this.downloadSingleAsset(url, assetDir, options))
      );

      // Execute all downloads with controlled concurrency
      const results = await Promise.allSettled(downloadPromises);
      
      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          assets.push(result.value);
        }
      }
    } else {
      // Sequential downloads
      for (const url of urlsToDownload) {
        const asset = await this.downloadSingleAsset(url, assetDir, options);
        if (asset) {
          assets.push(asset);
        }
      }
    }

    // Add already captured assets
    for (const url of urls) {
      if (this.capturedAssets.has(url) && !assets.find(a => a.url === url)) {
        assets.push(this.capturedAssets.get(url)!);
      }
    }

    return assets;
  }

  /**
   * Downloads a single asset (with CDN optimization)
   */
  private async downloadSingleAsset(
    url: string,
    assetDir: string,
    options: AssetCaptureOptions
  ): Promise<Asset | null> {
    if (this.capturedAssets.has(url)) {
      return this.capturedAssets.get(url)!;
    }

    if (this.downloading.has(url)) {
      // Already downloading, wait for it
      return null;
    }

    this.downloading.add(url);

    try {
      // Convert to absolute URL
      const absoluteUrl = new URL(url, options.baseUrl).href;
      
      // Check CDN cache first if CDN optimizer is available
      let buffer: Buffer | null = null;
      let headers: Record<string, string> = {};
      
      if ((options as any).cdnOptimizer) {
        const cdnOptimizer = (options as any).cdnOptimizer;
        if (cdnOptimizer.isCDNAsset(absoluteUrl)) {
          const cached = await cdnOptimizer.getCachedAsset(absoluteUrl);
          if (cached) {
            buffer = cached;
            // Use cached asset
          }
        }
      }
      
      // If not cached, fetch
      if (!buffer) {
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          this.downloading.delete(url);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        
        // Store headers
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        // Cache CDN asset if CDN optimizer is available
        if ((options as any).cdnOptimizer) {
          const cdnOptimizer = (options as any).cdnOptimizer;
          if (cdnOptimizer.isCDNAsset(absoluteUrl)) {
            try {
              await cdnOptimizer.cacheCDNAsset(absoluteUrl, buffer, headers);
            } catch (cacheError) {
              // Ignore cache errors
            }
          }
        }
      }
      
      const contentType = headers['content-type'] || '';
      const ext = this.getExtensionFromUrl(absoluteUrl) || this.getExtensionFromMimeType(contentType) || 'bin';

      const filename = this.createSafeFilename(absoluteUrl, ext);
      const localPath = path.join(assetDir, filename);

      await fs.writeFile(localPath, buffer);

      const asset: Asset = {
        url: absoluteUrl,
        type: path.basename(assetDir),
        localPath,
        size: buffer.length,
        mimeType: contentType
      };

      // Report file download
      if (options.onFileDownloaded) {
        options.onFileDownloaded({
          path: localPath,
          size: buffer.length,
          type: path.basename(assetDir)
        });
      }

      this.capturedAssets.set(url, asset);
      this.downloading.delete(url);
      return asset;
    } catch (error) {
      console.error(`Error downloading asset ${url}:`, error);
      this.downloading.delete(url);
      return null;
    }
  }

  /**
   * Triggers lazy loading for images and content
   */
  async triggerLazyLoading(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Trigger lazy-loaded images
      const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy-src], img[loading="lazy"]');
      lazyImages.forEach((img: any) => {
        if (img.dataset.src) {
          img.src = img.dataset.src;
        } else if (img.dataset.lazySrc) {
          img.src = img.dataset.lazySrc;
        }
      });

      // Trigger Intersection Observer callbacks
      if ((window as any).IntersectionObserver) {
        // Force intersection by scrolling
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
      }

      // Trigger lazy-loaded backgrounds
      const lazyBackgrounds = document.querySelectorAll('[data-bg], [data-background]');
      lazyBackgrounds.forEach((el: any) => {
        if (el.dataset.bg) {
          el.style.backgroundImage = `url(${el.dataset.bg})`;
        } else if (el.dataset.background) {
          el.style.backgroundImage = `url(${el.dataset.background})`;
        }
      });
    });

    // Wait for lazy-loaded content to load
    await page.waitForTimeout(2000);
  }

  /**
   * Handles infinite scroll
   */
  async handleInfiniteScroll(page: Page, maxScrolls: number = 5): Promise<void> {
    for (let i = 0; i < maxScrolls; i++) {
      const previousHeight = await page.evaluate(() => document.body.scrollHeight);

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for new content
      await page.waitForTimeout(2000);

      const newHeight = await page.evaluate(() => document.body.scrollHeight);

      // If height didn't change, no more content
      if (newHeight === previousHeight) {
        break;
      }

      // Scroll back up a bit to trigger more loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight - 500);
      });

      await page.waitForTimeout(1000);
    }

    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  /**
   * Gets file extension from URL
   */
  private getExtensionFromUrl(url: string): string | null {
    const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Gets file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'font/woff': 'woff',
      'font/woff2': 'woff2',
      'font/ttf': 'ttf',
      'font/otf': 'otf',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
      'text/css': 'css',
      'text/javascript': 'js',
      'application/javascript': 'js',
      'application/x-javascript': 'js',
      'text/x-javascript': 'js'
    };

    return mimeMap[mimeType] || 'bin';
  }

  /**
   * Creates safe filename from URL
   */
  private createSafeFilename(url: string, ext: string): string {
    const urlObj = new URL(url);
    let filename = urlObj.pathname.split('/').pop() || 'asset';
    
    // Remove extension if present
    filename = filename.replace(/\.[^.]*$/, '');
    
    // Sanitize
    filename = filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
    
    // Add hash for uniqueness
    const hash = this.simpleHash(url);
    
    return `${filename}_${hash}.${ext}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }
}

