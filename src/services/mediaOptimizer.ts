/**
 * Media Optimizer
 * Optimizes video, audio, and image formats with compression and conversion
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { AssetOptimizer } from './assetOptimizer.js';

export interface MediaOptimizationOptions {
  images?: {
    compress: boolean;
    format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'original';
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-100
  };
  videos?: {
    compress: boolean;
    format?: 'mp4' | 'webm' | 'original';
    maxResolution?: { width: number; height: number };
    bitrate?: number;
    codec?: 'h264' | 'vp9' | 'av1';
  };
  audio?: {
    compress: boolean;
    format?: 'mp3' | 'ogg' | 'wav' | 'original';
    bitrate?: number; // kbps
    codec?: 'mp3' | 'opus' | 'aac';
  };
}

export interface MediaOptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savings: number; // Percentage
  format: string;
  duration?: number; // For video/audio
  resolution?: { width: number; height: number }; // For images/video
}

/**
 * Media Optimizer
 * Optimizes media files (images, videos, audio)
 */
export class MediaOptimizer {
  /**
   * Optimizes an image file
   */
  async optimizeImage(
    filePath: string,
    options: MediaOptimizationOptions['images'] = { compress: false }
  ): Promise<MediaOptimizationResult | null> {
    try {
      const stats = await fs.stat(filePath);
      const originalSize = stats.size;
      const ext = path.extname(filePath).toLowerCase();

      // Get image dimensions (would need image library like sharp)
      // Wire to working AssetOptimizer implementation
      const assetOptimizer = new AssetOptimizer();

      // Map format to AssetOptimizer compatible format
      let assetFormat: 'webp' | 'avif' | 'original' | undefined;
      if (options.format === 'original' || options.format === 'jpeg' || options.format === 'png') {
        assetFormat = 'original';
      } else if (options.format === 'webp' || options.format === 'avif') {
        assetFormat = options.format;
      }

      const optimizationResult = await assetOptimizer.optimizeImage(filePath, {
        compress: true,
        quality: options.quality || 80,
        format: assetFormat,
        maxWidth: options.maxWidth,
      });

      if (!optimizationResult) {
        // Optimization failed, return original
        return {
          originalSize,
          optimizedSize: originalSize,
          savings: 0,
          format: ext.substring(1),
        };
      }

      return {
        originalSize: optimizationResult.originalSize,
        optimizedSize: optimizationResult.optimizedSize,
        savings: optimizationResult.savings,
        format: optimizationResult.format || ext.substring(1),
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      return null;
    }
  }

  /**
   * Optimizes a video file
   */
  async optimizeVideo(
    filePath: string,
    options: MediaOptimizationOptions['videos'] = { compress: false }
  ): Promise<MediaOptimizationResult | null> {
    try {
      const stats = await fs.stat(filePath);
      const originalSize = stats.size;
      const ext = path.extname(filePath).toLowerCase();

      const result: MediaOptimizationResult = {
        originalSize,
        optimizedSize: originalSize,
        savings: 0,
        format: ext.substring(1),
      };

      // In production, this would:
      // 1. Use ffmpeg to read video metadata
      // 2. Resize if maxResolution specified
      // 3. Re-encode with specified codec and bitrate
      // 4. Convert format if requested
      // 5. Save optimized version

      // Video optimization requires ffmpeg
      // This is a placeholder implementation

      return result;
    } catch (error) {
      console.error('Error optimizing video:', error);
      return null;
    }
  }

  /**
   * Optimizes an audio file
   */
  async optimizeAudio(
    filePath: string,
    options: MediaOptimizationOptions['audio'] = { compress: false }
  ): Promise<MediaOptimizationResult | null> {
    try {
      const stats = await fs.stat(filePath);
      const originalSize = stats.size;
      const ext = path.extname(filePath).toLowerCase();

      const result: MediaOptimizationResult = {
        originalSize,
        optimizedSize: originalSize,
        savings: 0,
        format: ext.substring(1),
      };

      // In production, this would:
      // 1. Use ffmpeg or similar to read audio metadata
      // 2. Re-encode with specified codec and bitrate
      // 3. Convert format if requested (MP3, OGG, Opus)
      // 4. Save optimized version

      // Audio optimization requires ffmpeg
      // This is a placeholder implementation

      return result;
    } catch (error) {
      console.error('Error optimizing audio:', error);
      return null;
    }
  }

  /**
   * Optimizes media based on file type
   */
  async optimizeMedia(
    filePath: string,
    mimeType: string,
    options: MediaOptimizationOptions = {}
  ): Promise<MediaOptimizationResult | null> {
    if (mimeType.startsWith('image/')) {
      return await this.optimizeImage(filePath, options.images);
    }
    if (mimeType.startsWith('video/')) {
      return await this.optimizeVideo(filePath, options.videos);
    }
    if (mimeType.startsWith('audio/')) {
      return await this.optimizeAudio(filePath, options.audio);
    }

    return null;
  }

  /**
   * Gets media metadata
   */
  async getMediaMetadata(filePath: string, mimeType: string): Promise<{
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    codec?: string;
    format: string;
  } | null> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const format = ext.substring(1);

      // In production, would use appropriate library to read metadata
      // For images: sharp, jimp
      // For video/audio: ffprobe, fluent-ffmpeg

      return {
        format,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if media format is supported
   */
  isFormatSupported(format: string, type: 'image' | 'video' | 'audio'): boolean {
    const supportedFormats: Record<string, string[]> = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
      video: ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'mkv'],
      audio: ['mp3', 'ogg', 'wav', 'aac', 'flac', 'opus', 'm4a'],
    };

    return supportedFormats[type]?.includes(format.toLowerCase()) || false;
  }

  /**
   * Gets recommended format for media type
   */
  getRecommendedFormat(type: 'image' | 'video' | 'audio'): string {
    const recommendations: Record<string, string> = {
      image: 'webp', // Best compression, good browser support
      video: 'mp4', // Best compatibility
      audio: 'mp3', // Best compatibility
    };

    return recommendations[type] || 'original';
  }

  /**
   * Calculates estimated savings
   */
  async estimateSavings(
    filePath: string,
    mimeType: string,
    options: MediaOptimizationOptions
  ): Promise<number> {
    // This would analyze the file and estimate compression savings
    // For now, return 0
    return 0;
  }

  /**
   * Gets file content hash
   */
  async getFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }
}

