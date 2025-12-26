/**
 * Enhanced Progress Tracking Service
 * Provides detailed per-page progress with thumbnails and asset breakdown
 * Critical for user confidence and transparency
 */

export interface AssetProgress {
  type: 'css' | 'js' | 'images' | 'fonts' | 'videos' | 'other';
  found: number;
  downloaded: number;
  failed: number;
  totalBytes: number;
  downloadedBytes: number;
}

export interface PageProgress {
  index: number;
  url: string;
  localPath: string;
  status: 'pending' | 'crawling' | 'downloading' | 'verifying' | 'complete' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  
  // Asset breakdown
  assets: {
    css: AssetProgress;
    js: AssetProgress;
    images: AssetProgress;
    fonts: AssetProgress;
    videos: AssetProgress;
    other: AssetProgress;
  };
  
  // Page metrics
  htmlSize: number;
  totalAssets: number;
  assetsDownloaded: number;
  assetsFailed: number;
  
  // Visual preview
  thumbnail?: string; // Base64 encoded small screenshot
  
  // Verification
  verificationStatus: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  verificationScore?: number;
  
  // Errors
  errors: string[];
  warnings: string[];
}

export interface CloneProgressState {
  jobId: string;
  url: string;
  startTime: number;
  
  // Overall status
  status: 'initializing' | 'crawling' | 'downloading' | 'verifying' | 'complete' | 'failed';
  message: string;
  
  // Page tracking
  totalPages: number;
  pagesDiscovered: number;
  pagesCompleted: number;
  pagesFailed: number;
  currentPageIndex: number;
  
  // Asset totals
  totalAssets: number;
  assetsDownloaded: number;
  assetsFailed: number;
  
  // Byte tracking
  totalBytes: number;
  downloadedBytes: number;
  
  // Time estimates
  estimatedTimeRemaining: number; // seconds
  averagePageTime: number; // seconds
  
  // Per-page details
  pages: Map<string, PageProgress>;
  
  // Recent activity (last 10 items)
  recentActivity: Array<{
    timestamp: number;
    type: 'page_start' | 'page_complete' | 'asset_download' | 'error' | 'warning';
    message: string;
    url?: string;
  }>;
  
  // Overall progress percentage
  overallProgress: number;
  
  // Phase progress (for multi-step UI)
  phases: {
    discovery: { status: 'pending' | 'running' | 'complete'; progress: number };
    download: { status: 'pending' | 'running' | 'complete'; progress: number };
    verification: { status: 'pending' | 'running' | 'complete'; progress: number };
    export: { status: 'pending' | 'running' | 'complete'; progress: number };
  };
  
  // Errors and warnings
  errors: string[];
  warnings: string[];
}

export type ProgressListener = (state: CloneProgressState) => void;

export class EnhancedProgressTracker {
  private state: CloneProgressState;
  private listeners: Set<ProgressListener> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private pageTimes: number[] = [];
  
  constructor(jobId: string, url: string) {
    this.state = {
      jobId,
      url,
      startTime: Date.now(),
      status: 'initializing',
      message: 'Initializing clone job...',
      totalPages: 0,
      pagesDiscovered: 0,
      pagesCompleted: 0,
      pagesFailed: 0,
      currentPageIndex: 0,
      totalAssets: 0,
      assetsDownloaded: 0,
      assetsFailed: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      estimatedTimeRemaining: 0,
      averagePageTime: 0,
      pages: new Map(),
      recentActivity: [],
      overallProgress: 0,
      phases: {
        discovery: { status: 'pending', progress: 0 },
        download: { status: 'pending', progress: 0 },
        verification: { status: 'pending', progress: 0 },
        export: { status: 'pending', progress: 0 },
      },
      errors: [],
      warnings: [],
    };
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    // Send initial state
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state (serializable)
   */
  getState(): CloneProgressState {
    return {
      ...this.state,
      pages: new Map(this.state.pages),
    };
  }

  /**
   * Get state as JSON (for API responses)
   */
  toJSON(): any {
    return {
      ...this.state,
      pages: Array.from(this.state.pages.entries()).map(([pageUrl, page]) => ({
        ...page,
        url: pageUrl, // Use map key as canonical URL
      })),
    };
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    const now = Date.now();
    // Throttle updates to max 10 per second
    if (now - this.lastUpdateTime < 100) return;
    this.lastUpdateTime = now;
    
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Progress listener error:', error);
      }
    });
  }

  /**
   * Add activity to recent list
   */
  public addActivity(type: 'page_start' | 'page_complete' | 'asset_download' | 'error' | 'warning', message: string, url?: string): void {
    this.state.recentActivity.unshift({
      timestamp: Date.now(),
      type,
      message,
      url,
    });
    // Keep only last 20 items
    if (this.state.recentActivity.length > 20) {
      this.state.recentActivity = this.state.recentActivity.slice(0, 20);
    }
  }

  /**
   * Calculate overall progress
   */
  private calculateProgress(): void {
    const { phases } = this.state;
    
    // Weight each phase
    const weights = {
      discovery: 0.1,
      download: 0.6,
      verification: 0.2,
      export: 0.1,
    };
    
    this.state.overallProgress = 
      phases.discovery.progress * weights.discovery +
      phases.download.progress * weights.download +
      phases.verification.progress * weights.verification +
      phases.export.progress * weights.export;
    
    // Calculate time estimate
    if (this.pageTimes.length > 0 && this.state.totalPages > 0) {
      this.state.averagePageTime = this.pageTimes.reduce((a, b) => a + b, 0) / this.pageTimes.length;
      const remainingPages = this.state.totalPages - this.state.pagesCompleted;
      this.state.estimatedTimeRemaining = Math.ceil((remainingPages * this.state.averagePageTime) / 1000);
    }
  }

  // ========== Phase Updates ==========

  /**
   * Start discovery phase
   */
  startDiscovery(): void {
    this.state.status = 'crawling';
    this.state.message = 'Discovering pages...';
    this.state.phases.discovery.status = 'running';
    this.addActivity('page_start', 'Started crawling website');
    this.notify();
  }

  /**
   * Update discovery progress
   */
  updateDiscovery(pagesFound: number, currentUrl: string): void {
    this.state.pagesDiscovered = pagesFound;
    this.state.totalPages = pagesFound;
    this.state.message = `Found ${pagesFound} pages... Crawling: ${currentUrl}`;
    this.state.phases.discovery.progress = Math.min(pagesFound * 5, 100); // Estimate
    this.calculateProgress();
    this.notify();
  }

  /**
   * Complete discovery phase
   */
  completeDiscovery(totalPages: number): void {
    this.state.totalPages = totalPages;
    this.state.pagesDiscovered = totalPages;
    this.state.phases.discovery.status = 'complete';
    this.state.phases.discovery.progress = 100;
    this.addActivity('page_complete', `Discovery complete: ${totalPages} pages found`);
    this.calculateProgress();
    this.notify();
  }

  // ========== Page Progress ==========

  /**
   * Start downloading a page
   */
  startPage(url: string, index: number): PageProgress {
    const page: PageProgress = {
      index,
      url,
      localPath: '',
      status: 'crawling',
      startTime: Date.now(),
      assets: {
        css: { type: 'css', found: 0, downloaded: 0, failed: 0, totalBytes: 0, downloadedBytes: 0 },
        js: { type: 'js', found: 0, downloaded: 0, failed: 0, totalBytes: 0, downloadedBytes: 0 },
        images: { type: 'images', found: 0, downloaded: 0, failed: 0, totalBytes: 0, downloadedBytes: 0 },
        fonts: { type: 'fonts', found: 0, downloaded: 0, failed: 0, totalBytes: 0, downloadedBytes: 0 },
        videos: { type: 'videos', found: 0, downloaded: 0, failed: 0, totalBytes: 0, downloadedBytes: 0 },
        other: { type: 'other', found: 0, downloaded: 0, failed: 0, totalBytes: 0, downloadedBytes: 0 },
      },
      htmlSize: 0,
      totalAssets: 0,
      assetsDownloaded: 0,
      assetsFailed: 0,
      verificationStatus: 'pending',
      errors: [],
      warnings: [],
    };
    
    this.state.pages.set(url, page);
    this.state.currentPageIndex = index;
    this.state.status = 'downloading';
    this.state.message = `Downloading page ${index + 1}/${this.state.totalPages}: ${url}`;
    this.state.phases.download.status = 'running';
    
    this.addActivity('page_start', `Started: ${new URL(url).pathname}`, url);
    this.notify();
    
    return page;
  }

  /**
   * Update page HTML downloaded
   */
  updatePageHtml(url: string, htmlSize: number, localPath: string): void {
    const page = this.state.pages.get(url);
    if (!page) return;
    
    page.htmlSize = htmlSize;
    page.localPath = localPath;
    page.status = 'downloading';
    this.state.downloadedBytes += htmlSize;
    
    this.addActivity('asset_download', `HTML: ${(htmlSize / 1024).toFixed(1)} KB`, url);
    this.notify();
  }

  /**
   * Update asset counts for a page
   */
  updatePageAssets(url: string, assetType: keyof PageProgress['assets'], found: number): void {
    const page = this.state.pages.get(url);
    if (!page) return;
    
    page.assets[assetType].found = found;
    page.totalAssets = Object.values(page.assets).reduce((sum, a) => sum + a.found, 0);
    this.state.totalAssets = Array.from(this.state.pages.values())
      .reduce((sum, p) => sum + p.totalAssets, 0);
    
    this.notify();
  }

  /**
   * Record asset download
   */
  recordAssetDownload(url: string, assetType: keyof PageProgress['assets'], bytes: number, success: boolean): void {
    const page = this.state.pages.get(url);
    if (!page) return;
    
    const asset = page.assets[assetType];
    if (success) {
      asset.downloaded++;
      asset.downloadedBytes += bytes;
      page.assetsDownloaded++;
      this.state.assetsDownloaded++;
      this.state.downloadedBytes += bytes;
    } else {
      asset.failed++;
      page.assetsFailed++;
      this.state.assetsFailed++;
    }
    
    // Update download phase progress
    if (this.state.totalAssets > 0) {
      this.state.phases.download.progress = 
        (this.state.assetsDownloaded / this.state.totalAssets) * 100;
    }
    
    this.calculateProgress();
    this.notify();
  }

  /**
   * Set page thumbnail
   */
  setPageThumbnail(url: string, thumbnailBase64: string): void {
    const page = this.state.pages.get(url);
    if (!page) return;
    
    page.thumbnail = thumbnailBase64;
    this.notify();
  }

  /**
   * Complete a page
   */
  completePage(url: string, success: boolean, errors?: string[]): void {
    const page = this.state.pages.get(url);
    if (!page) return;
    
    page.endTime = Date.now();
    page.duration = page.endTime - page.startTime;
    page.status = success ? 'complete' : 'failed';
    
    if (errors) {
      page.errors.push(...errors);
    }
    
    if (success) {
      this.state.pagesCompleted++;
      this.pageTimes.push(page.duration);
    } else {
      this.state.pagesFailed++;
    }
    
    // Update download phase progress
    const totalProcessed = this.state.pagesCompleted + this.state.pagesFailed;
    this.state.phases.download.progress = (totalProcessed / this.state.totalPages) * 100;
    
    this.addActivity(
      success ? 'page_complete' : 'error',
      success 
        ? `Completed: ${new URL(url).pathname} (${(page.duration / 1000).toFixed(1)}s)`
        : `Failed: ${new URL(url).pathname}`,
      url
    );
    
    this.calculateProgress();
    this.notify();
  }

  // ========== Verification Phase ==========

  /**
   * Start verification phase
   */
  startVerification(): void {
    this.state.status = 'verifying';
    this.state.message = 'Verifying backup integrity...';
    this.state.phases.download.status = 'complete';
    this.state.phases.download.progress = 100;
    this.state.phases.verification.status = 'running';
    this.addActivity('page_start', 'Started verification');
    this.notify();
  }

  /**
   * Update page verification
   */
  updatePageVerification(url: string, status: 'running' | 'passed' | 'failed', score?: number): void {
    const page = this.state.pages.get(url);
    if (!page) return;
    
    page.verificationStatus = status;
    if (score !== undefined) {
      page.verificationScore = score;
    }
    
    // Calculate verification progress
    const verified = Array.from(this.state.pages.values())
      .filter(p => p.verificationStatus !== 'pending' && p.verificationStatus !== 'running')
      .length;
    this.state.phases.verification.progress = (verified / this.state.totalPages) * 100;
    
    this.calculateProgress();
    this.notify();
  }

  /**
   * Complete verification phase
   */
  completeVerification(overallScore: number): void {
    this.state.phases.verification.status = 'complete';
    this.state.phases.verification.progress = 100;
    this.state.message = `Verification complete: ${overallScore.toFixed(1)}% match`;
    this.addActivity('page_complete', `Verification complete: ${overallScore.toFixed(1)}% accuracy`);
    this.calculateProgress();
    this.notify();
  }

  // ========== Export Phase ==========

  /**
   * Start export phase
   */
  startExport(format: string): void {
    this.state.status = 'complete'; // Almost done
    this.state.message = `Exporting to ${format}...`;
    this.state.phases.export.status = 'running';
    this.addActivity('page_start', `Exporting to ${format}`);
    this.notify();
  }

  /**
   * Update export progress
   */
  updateExport(progress: number): void {
    this.state.phases.export.progress = progress;
    this.calculateProgress();
    this.notify();
  }

  /**
   * Complete export
   */
  completeExport(exportPath: string): void {
    this.state.phases.export.status = 'complete';
    this.state.phases.export.progress = 100;
    this.addActivity('page_complete', `Export complete: ${exportPath}`);
    this.calculateProgress();
    this.notify();
  }

  // ========== Final State ==========

  /**
   * Mark job as complete
   */
  complete(success: boolean, message?: string): void {
    this.state.status = success ? 'complete' : 'failed';
    this.state.message = message || (success ? 'Clone completed successfully!' : 'Clone failed');
    this.state.overallProgress = success ? 100 : this.state.overallProgress;
    
    // Mark all pending phases as complete or skipped
    if (success) {
      Object.values(this.state.phases).forEach(phase => {
        if (phase.status === 'pending') {
          phase.status = 'complete';
          phase.progress = 100;
        }
      });
    }
    
    this.notify();
  }

  /**
   * Add error
   */
  addError(error: string): void {
    this.state.errors.push(error);
    this.addActivity('error', error);
    this.notify();
  }

  /**
   * Add warning
   */
  addWarning(warning: string): void {
    this.state.warnings.push(warning);
    this.addActivity('warning', warning);
    this.notify();
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.listeners.clear();
  }
}

export default EnhancedProgressTracker;
