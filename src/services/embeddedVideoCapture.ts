/**
 * Embedded Video Capture
 * Detects and captures YouTube, Vimeo, Wistia, and other embedded videos
 * Creates placeholder HTML with poster images for offline viewing
 */

import type { Page } from 'puppeteer';
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EmbeddedVideo {
  platform: 'youtube' | 'vimeo' | 'wistia' | 'dailymotion' | 'twitch' | 'other';
  videoId: string;
  originalUrl: string;
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
  element: {
    tagName: string;
    selector: string;
  };
}

export interface EmbeddedVideoCaptureResult {
  videos: EmbeddedVideo[];
  thumbnailsDownloaded: number;
  placeholdersGenerated: number;
  errors: string[];
}

export class EmbeddedVideoCapture {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Detect all embedded videos on the page
   */
  async detectEmbeddedVideos(page: Page): Promise<EmbeddedVideo[]> {
    const videos = await page.evaluate(() => {
      const results: Array<{
        platform: string;
        videoId: string;
        originalUrl: string;
        embedUrl: string;
        thumbnailUrl?: string;
        element: { tagName: string; selector: string };
      }> = [];

      // Helper to generate selector
      const getSelector = (el: Element): string => {
        if (el.id) return `#${el.id}`;
        if (el.className) {
          const classes = Array.from(el.classList).join('.');
          if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
        }
        return el.tagName.toLowerCase();
      };

      // 1. Check iframes for video embeds
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        const src = iframe.src || iframe.getAttribute('data-src') || '';

        // YouTube
        if (src.includes('youtube.com/embed/') || src.includes('youtube-nocookie.com/embed/')) {
          const match = src.match(/embed\/([a-zA-Z0-9_-]{11})/);
          if (match) {
            results.push({
              platform: 'youtube',
              videoId: match[1],
              originalUrl: src,
              embedUrl: `https://www.youtube.com/embed/${match[1]}`,
              thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`,
              element: { tagName: 'iframe', selector: getSelector(iframe) },
            });
          }
        }
        // YouTube short URL
        else if (src.includes('youtu.be/')) {
          const match = src.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
          if (match) {
            results.push({
              platform: 'youtube',
              videoId: match[1],
              originalUrl: src,
              embedUrl: `https://www.youtube.com/embed/${match[1]}`,
              thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`,
              element: { tagName: 'iframe', selector: getSelector(iframe) },
            });
          }
        }
        // Vimeo
        else if (src.includes('player.vimeo.com/video/')) {
          const match = src.match(/video\/(\d+)/);
          if (match) {
            results.push({
              platform: 'vimeo',
              videoId: match[1],
              originalUrl: src,
              embedUrl: `https://player.vimeo.com/video/${match[1]}`,
              element: { tagName: 'iframe', selector: getSelector(iframe) },
            });
          }
        }
        // Wistia
        else if (src.includes('wistia.com/') || src.includes('wistia.net/')) {
          const match = src.match(/medias\/([a-zA-Z0-9]+)/);
          if (match) {
            results.push({
              platform: 'wistia',
              videoId: match[1],
              originalUrl: src,
              embedUrl: src,
              element: { tagName: 'iframe', selector: getSelector(iframe) },
            });
          }
        }
        // Dailymotion
        else if (src.includes('dailymotion.com/embed/')) {
          const match = src.match(/embed\/video\/([a-zA-Z0-9]+)/);
          if (match) {
            results.push({
              platform: 'dailymotion',
              videoId: match[1],
              originalUrl: src,
              embedUrl: `https://www.dailymotion.com/embed/video/${match[1]}`,
              thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${match[1]}`,
              element: { tagName: 'iframe', selector: getSelector(iframe) },
            });
          }
        }
        // Twitch
        else if (src.includes('player.twitch.tv/')) {
          const channelMatch = src.match(/channel=([a-zA-Z0-9_]+)/);
          const videoMatch = src.match(/video=(\d+)/);
          if (channelMatch || videoMatch) {
            results.push({
              platform: 'twitch',
              videoId: channelMatch?.[1] || videoMatch?.[1] || '',
              originalUrl: src,
              embedUrl: src,
              element: { tagName: 'iframe', selector: getSelector(iframe) },
            });
          }
        }
      });

      // 2. Check for YouTube/Vimeo lite-embeds or custom players
      const videoContainers = document.querySelectorAll('[data-youtube-id], [data-video-id], [data-vimeo-id]');
      videoContainers.forEach(container => {
        const youtubeId = container.getAttribute('data-youtube-id');
        const vimeoId = container.getAttribute('data-vimeo-id');
        const videoId = container.getAttribute('data-video-id');

        if (youtubeId) {
          results.push({
            platform: 'youtube',
            videoId: youtubeId,
            originalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
            embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
            element: { tagName: container.tagName.toLowerCase(), selector: getSelector(container) },
          });
        } else if (vimeoId) {
          results.push({
            platform: 'vimeo',
            videoId: vimeoId,
            originalUrl: `https://vimeo.com/${vimeoId}`,
            embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
            element: { tagName: container.tagName.toLowerCase(), selector: getSelector(container) },
          });
        } else if (videoId) {
          results.push({
            platform: 'other',
            videoId: videoId,
            originalUrl: container.getAttribute('data-video-src') || '',
            embedUrl: container.getAttribute('data-video-src') || '',
            element: { tagName: container.tagName.toLowerCase(), selector: getSelector(container) },
          });
        }
      });

      // 3. Check for YouTube links that might be players
      const youtubeLinks = document.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtu.be/"]');
      youtubeLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        let videoId = '';

        if (href.includes('youtube.com/watch')) {
          const urlParams = new URLSearchParams(href.split('?')[1]);
          videoId = urlParams.get('v') || '';
        } else if (href.includes('youtu.be/')) {
          const match = href.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
          videoId = match ? match[1] : '';
        }

        if (videoId && !results.some(r => r.videoId === videoId)) {
          results.push({
            platform: 'youtube',
            videoId: videoId,
            originalUrl: href,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            element: { tagName: 'a', selector: getSelector(link) },
          });
        }
      });

      return results;
    });

    return videos as EmbeddedVideo[];
  }

  /**
   * Download video thumbnails
   */
  async downloadThumbnails(
    videos: EmbeddedVideo[],
    outputDir: string
  ): Promise<Map<string, string>> {
    const thumbnailMap = new Map<string, string>();
    const thumbnailDir = path.join(outputDir, 'assets', 'video-thumbnails');
    await fs.mkdir(thumbnailDir, { recursive: true });

    for (const video of videos) {
      if (!video.thumbnailUrl) continue;

      try {
        // For Vimeo, we need to fetch the thumbnail URL from their API
        let thumbnailUrl: string | null = video.thumbnailUrl || null;
        if (video.platform === 'vimeo') {
          thumbnailUrl = await this.getVimeoThumbnail(video.videoId);
        }
        if (!thumbnailUrl) continue;

        const response = await fetch(thumbnailUrl, {
          headers: { 'User-Agent': this.userAgent },
        });

        if (!response.ok) {
          // Try fallback for YouTube (hqdefault instead of maxresdefault)
          if (video.platform === 'youtube') {
            const fallbackUrl = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
            const fallbackResponse = await fetch(fallbackUrl, {
              headers: { 'User-Agent': this.userAgent },
            });
            if (!fallbackResponse.ok) continue;

            const buffer = await fallbackResponse.buffer();
            const filename = `${video.platform}-${video.videoId}.jpg`;
            const filePath = path.join(thumbnailDir, filename);
            await fs.writeFile(filePath, buffer);
            thumbnailMap.set(video.videoId, `assets/video-thumbnails/${filename}`);
          }
          continue;
        }

        const buffer = await response.buffer();
        const ext = video.platform === 'vimeo' ? '.jpg' : '.jpg';
        const filename = `${video.platform}-${video.videoId}${ext}`;
        const filePath = path.join(thumbnailDir, filename);
        await fs.writeFile(filePath, buffer);
        thumbnailMap.set(video.videoId, `assets/video-thumbnails/${filename}`);

      } catch (error) {
        // Silent fail for thumbnails
      }
    }

    return thumbnailMap;
  }

  /**
   * Get Vimeo thumbnail URL via oEmbed
   */
  private async getVimeoThumbnail(videoId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`,
        { headers: { 'User-Agent': this.userAgent } }
      );

      if (!response.ok) return null;

      const data = await response.json() as { thumbnail_url?: string };
      return data.thumbnail_url || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate placeholder HTML for embedded videos
   */
  generatePlaceholderHTML(
    video: EmbeddedVideo,
    localThumbnailPath?: string
  ): string {
    const thumbnailSrc = localThumbnailPath || video.thumbnailUrl || '';
    const playButtonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 48" width="68" height="48"><path fill="#f00" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.63-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"/><path fill="#fff" d="M45 24L27 14v20z"/></svg>`;

    return `
<div class="merlin-video-placeholder"
     data-video-platform="${video.platform}"
     data-video-id="${video.videoId}"
     data-original-url="${video.originalUrl}"
     style="position:relative;width:100%;aspect-ratio:16/9;background:#000;cursor:pointer;overflow:hidden;">
  ${thumbnailSrc ? `<img src="${thumbnailSrc}" alt="Video thumbnail" style="width:100%;height:100%;object-fit:cover;">` : ''}
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);">
    ${video.platform === 'youtube' ? playButtonSvg : `
    <div style="width:68px;height:48px;background:rgba(0,0,0,0.8);border-radius:12px;display:flex;align-items:center;justify-content:center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
    </div>
    `}
  </div>
  <a href="${video.originalUrl}" target="_blank" rel="noopener noreferrer"
     style="position:absolute;inset:0;z-index:10;"
     title="Watch on ${video.platform}">
  </a>
</div>
`;
  }

  /**
   * Full capture process: detect, download thumbnails, generate placeholders
   */
  async captureEmbeddedVideos(
    page: Page,
    outputDir: string
  ): Promise<EmbeddedVideoCaptureResult> {
    const errors: string[] = [];

    // 1. Detect embedded videos
    const videos = await this.detectEmbeddedVideos(page);

    if (videos.length === 0) {
      return {
        videos: [],
        thumbnailsDownloaded: 0,
        placeholdersGenerated: 0,
        errors: [],
      };
    }

    // 2. Download thumbnails
    const thumbnailMap = await this.downloadThumbnails(videos, outputDir);

    // 3. Generate placeholder file
    const placeholders: string[] = [];
    for (const video of videos) {
      const localThumbnail = thumbnailMap.get(video.videoId);
      placeholders.push(this.generatePlaceholderHTML(video, localThumbnail));
    }

    // Save placeholder templates
    try {
      const placeholderPath = path.join(outputDir, 'assets', 'video-placeholders.html');
      await fs.writeFile(placeholderPath, placeholders.join('\n\n'), 'utf-8');
    } catch (error) {
      errors.push(`Failed to save video placeholders: ${error}`);
    }

    // 4. Save video manifest
    try {
      const manifestPath = path.join(outputDir, 'assets', 'embedded-videos.json');
      await fs.writeFile(manifestPath, JSON.stringify(videos, null, 2), 'utf-8');
    } catch (error) {
      errors.push(`Failed to save video manifest: ${error}`);
    }

    return {
      videos,
      thumbnailsDownloaded: thumbnailMap.size,
      placeholdersGenerated: placeholders.length,
      errors,
    };
  }
}

// Export singleton instance
export const embeddedVideoCapture = new EmbeddedVideoCapture();
