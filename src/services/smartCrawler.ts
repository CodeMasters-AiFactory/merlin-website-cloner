/**
 * Smart Crawler Service
 * Intelligent crawling with sitemap parsing and link prioritization
 */

import type { Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface CrawlPriority {
  url: string;
  priority: number; // 0-1, higher is more important
  reason: string;
}

/**
 * Smart Crawler Service
 */
export class SmartCrawler {
  /**
   * Parses sitemap.xml
   */
  async parseSitemap(sitemapUrl: string): Promise<SitemapUrl[]> {
    try {
      const response = await fetch(sitemapUrl);
      const xml = await response.text();
      
      const urls: SitemapUrl[] = [];
      const $ = cheerio.load(xml, { xmlMode: true });
      
      // Parse sitemap index (contains other sitemaps)
      $('sitemapindex > sitemap').each((_, el) => {
        const loc = $(el).find('loc').text();
        if (loc) {
          // Recursively parse nested sitemap
          this.parseSitemap(loc).then(nestedUrls => {
            urls.push(...nestedUrls);
          }).catch(() => {
            // Ignore errors
          });
        }
      });
      
      // Parse URL set
      $('urlset > url').each((_, el) => {
        const loc = $(el).find('loc').text();
        const lastmod = $(el).find('lastmod').text();
        const changefreq = $(el).find('changefreq').text();
        const priority = $(el).find('priority').text();
        
        if (loc) {
          urls.push({
            loc,
            lastmod: lastmod || undefined,
            changefreq: changefreq || undefined,
            priority: priority ? parseFloat(priority) : undefined,
          });
        }
      });
      
      return urls;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Finds sitemap URL from robots.txt
   */
  async findSitemapFromRobots(robotsUrl: string): Promise<string[]> {
    try {
      const response = await fetch(robotsUrl);
      const text = await response.text();
      
      const sitemaps: string[] = [];
      const lines = text.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('sitemap:')) {
          const sitemapUrl = trimmed.substring(8).trim();
          if (sitemapUrl) {
            sitemaps.push(sitemapUrl);
          }
        }
      }
      
      return sitemaps;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Discovers sitemap from a page
   */
  async discoverSitemap(pageUrl: string): Promise<string[]> {
    const sitemaps: string[] = [];
    const url = new URL(pageUrl);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    
    // Common sitemap locations
    const commonSitemaps = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap-index.xml`,
      `${baseUrl}/sitemaps.xml`,
      `${baseUrl}/sitemap1.xml`,
    ];
    
    // Check robots.txt first
    try {
      const robotsSitemaps = await this.findSitemapFromRobots(`${baseUrl}/robots.txt`);
      sitemaps.push(...robotsSitemaps);
    } catch (error) {
      // Ignore errors
    }
    
    // Check common locations
    for (const sitemapUrl of commonSitemaps) {
      try {
        const response = await fetch(sitemapUrl, { method: 'HEAD' });
        if (response.ok) {
          sitemaps.push(sitemapUrl);
        }
      } catch (error) {
        // Not found, continue
      }
    }
    
    return sitemaps;
  }
  
  /**
   * Prioritizes URLs for crawling
   */
  prioritizeUrls(
    urls: string[],
    sitemapUrls?: SitemapUrl[],
    options: {
      preferSitemap?: boolean;
      preferRecent?: boolean;
      preferHighPriority?: boolean;
    } = {}
  ): CrawlPriority[] {
    const {
      preferSitemap = true,
      preferRecent = true,
      preferHighPriority = true,
    } = options;
    
    const priorities: CrawlPriority[] = [];
    const sitemapMap = new Map<string, SitemapUrl>();
    
    if (sitemapUrls) {
      for (const sitemapUrl of sitemapUrls) {
        sitemapMap.set(sitemapUrl.loc, sitemapUrl);
      }
    }
    
    for (const url of urls) {
      let priority = 0.5; // Default priority
      const reasons: string[] = [];
      
      const sitemapUrl = sitemapMap.get(url);
      if (sitemapUrl) {
        if (preferSitemap) {
          priority += 0.2;
          reasons.push('in-sitemap');
        }
        
        if (preferHighPriority && sitemapUrl.priority) {
          priority += sitemapUrl.priority * 0.2;
          reasons.push(`priority-${sitemapUrl.priority}`);
        }
        
        if (preferRecent && sitemapUrl.lastmod) {
          const lastmod = new Date(sitemapUrl.lastmod);
          const daysSinceMod = (Date.now() - lastmod.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceMod < 7) {
            priority += 0.1;
            reasons.push('recently-updated');
          }
        }
      } else {
        // Not in sitemap, lower priority
        priority -= 0.1;
        reasons.push('not-in-sitemap');
      }
      
      // Prioritize homepage
      try {
        const urlObj = new URL(url);
        if (urlObj.pathname === '/' || urlObj.pathname === '') {
          priority += 0.3;
          reasons.push('homepage');
        }
      } catch {
        // Invalid URL
      }
      
      // Prioritize important paths
      const importantPaths = ['/about', '/contact', '/products', '/services', '/blog'];
      try {
        const urlObj = new URL(url);
        if (importantPaths.some(path => urlObj.pathname.startsWith(path))) {
          priority += 0.1;
          reasons.push('important-path');
        }
      } catch {
        // Invalid URL
      }
      
      priorities.push({
        url,
        priority: Math.max(0, Math.min(1, priority)), // Clamp to 0-1
        reason: reasons.join(', '),
      });
    }
    
    // Sort by priority (highest first)
    priorities.sort((a, b) => b.priority - a.priority);
    
    return priorities;
  }
  
  /**
   * Respects robots.txt rules
   */
  async checkRobotsTxt(url: string, userAgent: string = '*'): Promise<{
    allowed: boolean;
    crawlDelay?: number;
  }> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
      
      const response = await fetch(robotsUrl);
      const text = await response.text();
      
      const lines = text.split('\n');
      let currentUserAgent = '*';
      let allowed = true;
      let crawlDelay: number | undefined;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('user-agent:')) {
          currentUserAgent = trimmed.substring(11).trim();
        } else if (trimmed.toLowerCase().startsWith('disallow:')) {
          const disallowPath = trimmed.substring(9).trim();
          if ((currentUserAgent === '*' || currentUserAgent === userAgent) && disallowPath) {
            if (urlObj.pathname.startsWith(disallowPath) || disallowPath === '/') {
              allowed = false;
            }
          }
        } else if (trimmed.toLowerCase().startsWith('allow:')) {
          const allowPath = trimmed.substring(6).trim();
          if ((currentUserAgent === '*' || currentUserAgent === userAgent) && allowPath) {
            if (urlObj.pathname.startsWith(allowPath)) {
              allowed = true;
            }
          }
        } else if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
          const delay = trimmed.substring(12).trim();
          if (currentUserAgent === '*' || currentUserAgent === userAgent) {
            crawlDelay = parseFloat(delay) * 1000; // Convert to milliseconds
          }
        }
      }
      
      return { allowed, crawlDelay };
    } catch (error) {
      // If robots.txt doesn't exist or can't be fetched, allow by default
      return { allowed: true };
    }
  }

  /**
   * Discovers all URLs from a website for distributed scraping
   */
  async discoverUrls(
    startUrl: string,
    options: {
      maxPages?: number;
      maxDepth?: number;
      respectRobotsTxt?: boolean;
    } = {}
  ): Promise<string[]> {
    const { maxPages = 100, maxDepth = 3, respectRobotsTxt = true } = options;
    const discovered = new Set<string>();
    const toVisit: Array<{ url: string; depth: number }> = [];

    try {
      const url = new URL(startUrl);
      const baseUrl = `${url.protocol}//${url.hostname}`;

      // Start with the initial URL
      discovered.add(startUrl);
      toVisit.push({ url: startUrl, depth: 0 });

      // Try to get URLs from sitemap first (most efficient)
      const sitemaps = await this.discoverSitemap(startUrl);
      for (const sitemapUrl of sitemaps) {
        try {
          const sitemapUrls = await this.parseSitemap(sitemapUrl);
          for (const entry of sitemapUrls) {
            if (discovered.size >= maxPages) break;

            // Check robots.txt if required
            if (respectRobotsTxt) {
              const robotsCheck = await this.checkRobotsTxt(entry.loc);
              if (!robotsCheck.allowed) continue;
            }

            discovered.add(entry.loc);
          }
        } catch {
          // Continue with other sitemaps
        }

        if (discovered.size >= maxPages) break;
      }

      // If sitemap didn't give us enough URLs, crawl the page
      if (discovered.size < maxPages) {
        while (toVisit.length > 0 && discovered.size < maxPages) {
          const current = toVisit.shift();
          if (!current || current.depth >= maxDepth) continue;

          try {
            const response = await fetch(current.url);
            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract all links
            $('a[href]').each((_, el) => {
              if (discovered.size >= maxPages) return;

              const href = $(el).attr('href');
              if (!href) return;

              try {
                // Resolve relative URLs
                const resolvedUrl = new URL(href, current.url);

                // Only include same-domain URLs
                if (resolvedUrl.hostname !== url.hostname) return;

                // Skip anchors and query strings for deduplication
                resolvedUrl.hash = '';
                const cleanUrl = resolvedUrl.toString();

                if (!discovered.has(cleanUrl)) {
                  discovered.add(cleanUrl);
                  toVisit.push({ url: cleanUrl, depth: current.depth + 1 });
                }
              } catch {
                // Invalid URL, skip
              }
            });
          } catch {
            // Failed to fetch, skip
          }
        }
      }

      // Prioritize the discovered URLs
      const prioritized = this.prioritizeUrls(Array.from(discovered));
      return prioritized.slice(0, maxPages).map(p => p.url);

    } catch (error) {
      // Return at least the start URL on error
      return [startUrl];
    }
  }
}

