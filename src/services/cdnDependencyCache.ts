/**
 * CDN Dependency Cache Service
 * Pre-bundles top 1000 website dependencies for faster, more reliable cloning
 * Eliminates need to download jQuery, Bootstrap, React, etc. every time
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import { createHash } from 'crypto';

export interface CDNLibrary {
  name: string;
  version: string;
  cdn: string;
  urls: string[];
  files: string[];
  category: 'framework' | 'css' | 'utility' | 'ui' | 'icon' | 'animation' | 'chart' | 'map' | 'video' | 'form' | 'ecommerce' | 'analytics';
  popularity: number; // 1-100
}

export interface CachedFile {
  originalUrl: string;
  localPath: string;
  hash: string;
  size: number;
  mimeType: string;
  cachedAt: string;
}

export interface CDNCacheStats {
  totalLibraries: number;
  totalFiles: number;
  totalSize: number;
  lastUpdated: string;
  hitRate: number;
  missRate: number;
}

// Top CDN libraries to pre-cache
const TOP_CDN_LIBRARIES: CDNLibrary[] = [
  // JavaScript Frameworks
  {
    name: 'jquery',
    version: '3.7.1',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
      'https://code.jquery.com/jquery-3.7.1.min.js',
      'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js',
    ],
    files: ['jquery.min.js', 'jquery.min.map'],
    category: 'framework',
    popularity: 100,
  },
  {
    name: 'react',
    version: '18.2.0',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
      'https://unpkg.com/react@18/umd/react.production.min.js',
    ],
    files: ['react.production.min.js', 'react-dom.production.min.js'],
    category: 'framework',
    popularity: 98,
  },
  {
    name: 'react-dom',
    version: '18.2.0',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
      'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    ],
    files: ['react-dom.production.min.js'],
    category: 'framework',
    popularity: 98,
  },
  {
    name: 'vue',
    version: '3.4.21',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.21/vue.global.prod.min.js',
      'https://unpkg.com/vue@3/dist/vue.global.prod.js',
    ],
    files: ['vue.global.prod.min.js'],
    category: 'framework',
    popularity: 90,
  },
  
  // CSS Frameworks
  {
    name: 'bootstrap',
    version: '5.3.3',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.bundle.min.js',
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    ],
    files: ['bootstrap.min.css', 'bootstrap.bundle.min.js', 'bootstrap.min.css.map'],
    category: 'css',
    popularity: 95,
  },
  {
    name: 'tailwindcss',
    version: '3.4.1',
    cdn: 'cdnjs',
    urls: [
      'https://cdn.tailwindcss.com',
      'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/3.4.1/tailwind.min.css',
    ],
    files: ['tailwind.min.css'],
    category: 'css',
    popularity: 88,
  },
  {
    name: 'bulma',
    version: '0.9.4',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css',
    ],
    files: ['bulma.min.css'],
    category: 'css',
    popularity: 70,
  },
  
  // Utility Libraries
  {
    name: 'lodash',
    version: '4.17.21',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
    ],
    files: ['lodash.min.js'],
    category: 'utility',
    popularity: 92,
  },
  {
    name: 'axios',
    version: '1.6.7',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.7/axios.min.js',
    ],
    files: ['axios.min.js'],
    category: 'utility',
    popularity: 88,
  },
  {
    name: 'moment',
    version: '2.30.1',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
    ],
    files: ['moment.min.js', 'moment-with-locales.min.js'],
    category: 'utility',
    popularity: 85,
  },
  {
    name: 'dayjs',
    version: '1.11.10',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.10/dayjs.min.js',
    ],
    files: ['dayjs.min.js'],
    category: 'utility',
    popularity: 80,
  },
  
  // Icon Libraries
  {
    name: 'font-awesome',
    version: '6.5.1',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js',
    ],
    files: ['all.min.css', 'all.min.js', 'fontawesome.min.css'],
    category: 'icon',
    popularity: 95,
  },
  {
    name: 'bootstrap-icons',
    version: '1.11.3',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css',
    ],
    files: ['bootstrap-icons.min.css'],
    category: 'icon',
    popularity: 82,
  },
  
  // Animation Libraries
  {
    name: 'gsap',
    version: '3.12.5',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
    ],
    files: ['gsap.min.js', 'ScrollTrigger.min.js'],
    category: 'animation',
    popularity: 85,
  },
  {
    name: 'animate.css',
    version: '4.1.1',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
    ],
    files: ['animate.min.css'],
    category: 'animation',
    popularity: 80,
  },
  {
    name: 'aos',
    version: '2.3.4',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css',
      'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js',
    ],
    files: ['aos.css', 'aos.js'],
    category: 'animation',
    popularity: 75,
  },
  
  // UI Libraries
  {
    name: 'swiper',
    version: '11.0.6',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.0.6/swiper-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.0.6/swiper-bundle.min.css',
    ],
    files: ['swiper-bundle.min.js', 'swiper-bundle.min.css'],
    category: 'ui',
    popularity: 85,
  },
  {
    name: 'slick-carousel',
    version: '1.8.1',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.css',
    ],
    files: ['slick.min.js', 'slick.min.css', 'slick-theme.min.css'],
    category: 'ui',
    popularity: 75,
  },
  {
    name: 'lightbox2',
    version: '2.11.4',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/js/lightbox.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/css/lightbox.min.css',
    ],
    files: ['lightbox.min.js', 'lightbox.min.css'],
    category: 'ui',
    popularity: 70,
  },
  
  // Chart Libraries
  {
    name: 'chart.js',
    version: '4.4.2',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.2/chart.umd.min.js',
    ],
    files: ['chart.umd.min.js'],
    category: 'chart',
    popularity: 88,
  },
  {
    name: 'd3',
    version: '7.8.5',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
    ],
    files: ['d3.min.js'],
    category: 'chart',
    popularity: 82,
  },
  
  // Map Libraries
  {
    name: 'leaflet',
    version: '1.9.4',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    ],
    files: ['leaflet.min.js', 'leaflet.min.css'],
    category: 'map',
    popularity: 78,
  },
  
  // Video Libraries
  {
    name: 'video.js',
    version: '8.10.0',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video-js.min.css',
    ],
    files: ['video.min.js', 'video-js.min.css'],
    category: 'video',
    popularity: 75,
  },
  {
    name: 'plyr',
    version: '3.7.8',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/plyr/3.7.8/plyr.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/plyr/3.7.8/plyr.min.css',
    ],
    files: ['plyr.min.js', 'plyr.min.css'],
    category: 'video',
    popularity: 70,
  },
  
  // Form Libraries
  {
    name: 'inputmask',
    version: '5.0.8',
    cdn: 'cdnjs',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/inputmask/5.0.8/inputmask.min.js',
    ],
    files: ['inputmask.min.js'],
    category: 'form',
    popularity: 68,
  },
  
  // Analytics Stubs (prevent tracking, provide interface)
  {
    name: 'gtag-stub',
    version: '1.0.0',
    cdn: 'local',
    urls: [],
    files: ['gtag-stub.js'],
    category: 'analytics',
    popularity: 50,
  },
];

export class CDNDependencyCache {
  private cacheDir: string;
  private urlMap: Map<string, CachedFile> = new Map();
  private stats: CDNCacheStats;
  private hits: number = 0;
  private misses: number = 0;

  constructor(cacheDir: string = './cdn-cache') {
    this.cacheDir = cacheDir;
    this.stats = {
      totalLibraries: 0,
      totalFiles: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
      hitRate: 0,
      missRate: 0,
    };
  }

  /**
   * Initialize cache - create directories and load index
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(path.join(this.cacheDir, 'libs'), { recursive: true });
    
    // Load existing index if present
    const indexPath = path.join(this.cacheDir, 'index.json');
    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      this.urlMap = new Map(Object.entries(index.urlMap));
      this.stats = index.stats;
    } catch {
      // No existing index, will be created
    }
  }

  /**
   * Pre-download all top CDN libraries
   */
  async prebuildCache(
    onProgress?: (progress: { library: string; file: string; current: number; total: number }) => void
  ): Promise<void> {
    console.log('📦 Pre-building CDN dependency cache...');
    
    let current = 0;
    const total = TOP_CDN_LIBRARIES.reduce((sum, lib) => sum + lib.urls.length, 0);
    
    for (const library of TOP_CDN_LIBRARIES) {
      console.log(`  📥 Caching ${library.name}@${library.version}...`);
      
      for (const url of library.urls) {
        current++;
        onProgress?.({ library: library.name, file: url, current, total });
        
        try {
          await this.cacheUrl(url, library);
        } catch (error) {
          console.error(`    ❌ Failed to cache ${url}:`, error);
        }
      }
    }
    
    // Save index
    await this.saveIndex();
    
    console.log(`\n✅ CDN cache built: ${this.urlMap.size} files, ${(this.stats.totalSize / 1024 / 1024).toFixed(1)} MB`);
  }

  /**
   * Cache a single URL
   */
  private async cacheUrl(url: string, library: CDNLibrary): Promise<CachedFile | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const buffer = await response.buffer();
      const hash = createHash('sha256').update(buffer).digest('hex');
      
      // Generate local path
      const urlObj = new URL(url);
      const filename = path.basename(urlObj.pathname) || 'index.js';
      const localDir = path.join(this.cacheDir, 'libs', library.name, library.version);
      const localPath = path.join(localDir, filename);
      
      await fs.mkdir(localDir, { recursive: true });
      await fs.writeFile(localPath, buffer);
      
      const cached: CachedFile = {
        originalUrl: url,
        localPath,
        hash,
        size: buffer.length,
        mimeType: response.headers.get('content-type') || 'application/octet-stream',
        cachedAt: new Date().toISOString(),
      };
      
      this.urlMap.set(url, cached);
      this.stats.totalFiles++;
      this.stats.totalSize += buffer.length;
      
      return cached;
    } catch (error) {
      console.error(`Failed to cache ${url}:`, error);
      return null;
    }
  }

  /**
   * Check if URL is cached and return local path
   */
  async getLocalPath(url: string): Promise<string | null> {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);
    
    // Check exact match
    if (this.urlMap.has(normalizedUrl)) {
      this.hits++;
      this.updateHitRate();
      return this.urlMap.get(normalizedUrl)!.localPath;
    }
    
    // Check pattern match (different CDN for same library)
    for (const library of TOP_CDN_LIBRARIES) {
      if (this.urlMatchesLibrary(normalizedUrl, library)) {
        // Find any cached version of this library
        for (const libUrl of library.urls) {
          if (this.urlMap.has(libUrl)) {
            this.hits++;
            this.updateHitRate();
            return this.urlMap.get(libUrl)!.localPath;
          }
        }
      }
    }
    
    this.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Check if URL matches a library pattern
   */
  private urlMatchesLibrary(url: string, library: CDNLibrary): boolean {
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes(library.name.toLowerCase()) &&
      (lowerUrl.includes(library.version) || lowerUrl.includes(library.version.split('.')[0]))
    );
  }

  /**
   * Normalize URL for matching
   */
  private normalizeUrl(url: string): string {
    // Remove query string and hash
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  }

  /**
   * Update hit rate stats
   */
  private updateHitRate(): void {
    const total = this.hits + this.misses;
    this.stats.hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    this.stats.missRate = total > 0 ? (this.misses / total) * 100 : 0;
  }

  /**
   * Rewrite CDN URLs in HTML to local paths
   */
  async rewriteCdnUrls(html: string, outputDir: string): Promise<string> {
    let modified = html;
    
    // Find all CDN URLs
    const cdnPatterns = [
      /https?:\/\/cdnjs\.cloudflare\.com\/[^"'\s)]+/g,
      /https?:\/\/cdn\.jsdelivr\.net\/[^"'\s)]+/g,
      /https?:\/\/unpkg\.com\/[^"'\s)]+/g,
      /https?:\/\/code\.jquery\.com\/[^"'\s)]+/g,
      /https?:\/\/ajax\.googleapis\.com\/[^"'\s)]+/g,
      /https?:\/\/maxcdn\.bootstrapcdn\.com\/[^"'\s)]+/g,
      /https?:\/\/stackpath\.bootstrapcdn\.com\/[^"'\s)]+/g,
      /https?:\/\/fonts\.googleapis\.com\/[^"'\s)]+/g,
      /https?:\/\/fonts\.gstatic\.com\/[^"'\s)]+/g,
    ];
    
    for (const pattern of cdnPatterns) {
      const matches = html.match(pattern) || [];
      
      for (const url of matches) {
        const localPath = await this.getLocalPath(url);
        if (localPath) {
          // Copy to output dir and get relative path
          const filename = path.basename(localPath);
          const destPath = path.join(outputDir, 'assets', 'vendor', filename);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(localPath, destPath);
          
          const relativePath = `assets/vendor/${filename}`;
          modified = modified.split(url).join(relativePath);
        }
      }
    }
    
    return modified;
  }

  /**
   * Save index to disk
   */
  private async saveIndex(): Promise<void> {
    this.stats.lastUpdated = new Date().toISOString();
    this.stats.totalLibraries = TOP_CDN_LIBRARIES.length;
    
    const index = {
      urlMap: Object.fromEntries(this.urlMap),
      stats: this.stats,
      libraries: TOP_CDN_LIBRARIES.map(lib => ({
        name: lib.name,
        version: lib.version,
        category: lib.category,
      })),
    };
    
    await fs.writeFile(
      path.join(this.cacheDir, 'index.json'),
      JSON.stringify(index, null, 2)
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): CDNCacheStats {
    return { ...this.stats };
  }

  /**
   * Get list of available libraries
   */
  getAvailableLibraries(): CDNLibrary[] {
    return TOP_CDN_LIBRARIES;
  }

  /**
   * Check if cache is initialized and populated
   */
  async isCacheReady(): Promise<boolean> {
    return this.urlMap.size > 0;
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await fs.rm(this.cacheDir, { recursive: true, force: true });
    this.urlMap.clear();
    this.stats = {
      totalLibraries: 0,
      totalFiles: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
      hitRate: 0,
      missRate: 0,
    };
    this.hits = 0;
    this.misses = 0;
  }
}

export default CDNDependencyCache;
