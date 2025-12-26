/**
 * Asset Optimizer
 * Optimizes assets through compression, resizing, and format conversion
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import pLimit from 'p-limit';

export interface OptimizationOptions {
  images?: {
    compress: boolean;
    format?: 'webp' | 'avif' | 'original';
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-100
  };
  css?: {
    minify: boolean;
    removeUnused: boolean;
  };
  js?: {
    minify: boolean;
    removeComments: boolean;
  };
  fonts?: {
    subset: boolean; // Font subsetting
  };
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savings: number; // Percentage
  format?: string;
}

/**
 * Asset Optimizer
 * Optimizes assets for smaller file sizes
 */
export class AssetOptimizer {
  /**
   * Optimizes an image file using Sharp (PRODUCTION READY)
   */
  async optimizeImage(
    filePath: string,
    options: OptimizationOptions['images'] = { compress: true, quality: 80, maxWidth: 2560 }
  ): Promise<OptimizationResult | null> {
    try {
      const stats = await fs.stat(filePath);
      const originalSize = stats.size;

      // Skip if file doesn't exist or is too small (< 1KB, likely an icon)
      if (originalSize < 1024) {
        return {
          originalSize,
          optimizedSize: originalSize,
          savings: 0,
          format: path.extname(filePath),
        };
      }

      const ext = path.extname(filePath).toLowerCase();
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp', '.avif'];

      // Skip unsupported formats
      if (!supportedFormats.includes(ext)) {
        return {
          originalSize,
          optimizedSize: originalSize,
          savings: 0,
          format: ext,
        };
      }

      if (!options.compress) {
        return {
          originalSize,
          optimizedSize: originalSize,
          savings: 0,
          format: ext,
        };
      }

      // Load image with Sharp
      let pipeline: sharp.Sharp;
      let metadata: sharp.Metadata;

      try {
        pipeline = sharp(filePath);
        // Get image metadata to check dimensions
        metadata = await pipeline.metadata();
      } catch (loadError: any) {
        // Some AVIF files use unsupported bitstreams - skip them gracefully
        if (loadError.message?.includes('heif') || loadError.message?.includes('AVIF') ||
            loadError.message?.includes('Bitstream') || loadError.message?.includes('bad seek')) {
          // Keep original file as-is
          return {
            originalSize,
            optimizedSize: originalSize,
            savings: 0,
            format: ext,
          };
        }
        throw loadError;
      }

      // Resize if needed (max 2560px width by default)
      const maxWidth = options.maxWidth || 2560;
      const maxHeight = options.maxHeight;

      if (metadata.width && metadata.width > maxWidth) {
        pipeline = pipeline.resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to WebP or AVIF (much smaller than JPEG/PNG)
      const targetFormat = options.format || 'webp';
      const quality = options.quality || 80;

      let optimizedBuffer: Buffer;
      let newExtension = ext;

      if (targetFormat === 'webp') {
        optimizedBuffer = await pipeline
          .webp({ quality, effort: 4 }) // effort 4 = good balance of speed/compression
          .toBuffer();
        newExtension = '.webp';
      } else if (targetFormat === 'avif') {
        optimizedBuffer = await pipeline
          .avif({ quality, effort: 4 })
          .toBuffer();
        newExtension = '.avif';
      } else {
        // Keep original format but compress
        if (ext === '.png' || ext === '.webp') {
          optimizedBuffer = await pipeline
            .png({ quality, compressionLevel: 9 })
            .toBuffer();
        } else {
          optimizedBuffer = await pipeline
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
        }
      }

      const optimizedSize = optimizedBuffer.length;
      const savings = ((originalSize - optimizedSize) / originalSize) * 100;

      // Only save if we achieved meaningful savings (> 5%)
      if (savings > 5) {
        const outputPath = newExtension !== ext
          ? filePath.replace(ext, newExtension)
          : filePath;

        await fs.writeFile(outputPath, optimizedBuffer);

        // If we converted to a new format, delete the old file
        if (newExtension !== ext) {
          await fs.unlink(filePath).catch(() => {});
        }

        return {
          originalSize,
          optimizedSize,
          savings,
          format: newExtension,
        };
      }

      // No significant savings, keep original
      return {
        originalSize,
        optimizedSize: originalSize,
        savings: 0,
        format: ext,
      };

    } catch (error) {
      console.error('Error optimizing image:', error);
      return null;
    }
  }

  /**
   * Optimizes all images in a directory (BATCH PROCESSING)
   * Returns optimization stats AND a mapping of original paths to new paths (for format conversion)
   */
  async optimizeAllImages(
    directory: string,
    options: OptimizationOptions['images'] = { compress: true, quality: 80, maxWidth: 2560 }
  ): Promise<{
    totalSavings: number;
    filesProcessed: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    pathChanges: Map<string, string>; // Maps original relative path -> new relative path (for format changes)
  }> {
    const imageFiles = await this.findImageFiles(directory);
    const pathChanges = new Map<string, string>();

    if (imageFiles.length === 0) {
      return {
        totalSavings: 0,
        filesProcessed: 0,
        totalOriginalSize: 0,
        totalOptimizedSize: 0,
        pathChanges
      };
    }

    // Process 20 images concurrently for performance
    const limit = pLimit(20);
    const results = await Promise.all(
      imageFiles.map(file => limit(async () => {
        const result = await this.optimizeImage(file, options);
        if (result) {
          // Track path changes for format conversions
          const ext = path.extname(file).toLowerCase();
          if (result.format && result.format !== ext) {
            // Store relative paths for easier matching in HTML
            const newPath = file.replace(new RegExp(ext.replace('.', '\\.') + '$', 'i'), result.format);
            pathChanges.set(file, newPath);
          }
        }
        return result;
      }))
    );

    // Calculate totals
    const validResults = results.filter(r => r !== null) as OptimizationResult[];
    const totalOriginalSize = validResults.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = validResults.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalSavings = totalOriginalSize > 0
      ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100
      : 0;

    return {
      totalSavings,
      filesProcessed: validResults.length,
      totalOriginalSize,
      totalOptimizedSize,
      pathChanges
    };
  }

  /**
   * Finds all image files in directory recursively
   */
  private async findImageFiles(dir: string): Promise<string[]> {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp', '.avif', '.bmp'];
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findImageFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (imageExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return files;
  }

  /**
   * Optimizes CSS file
   */
  async optimizeCSS(
    filePath: string,
    options: OptimizationOptions['css'] = { minify: false, removeUnused: false }
  ): Promise<OptimizationResult | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const originalSize = Buffer.byteLength(content, 'utf-8');

      let optimized = content;

      if (options.minify) {
        // Basic minification (remove comments, whitespace)
        optimized = optimized
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .replace(/\s+/g, ' ') // Collapse whitespace
          .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
          .trim();
      }

      const optimizedSize = Buffer.byteLength(optimized, 'utf-8');
      const savings = ((originalSize - optimizedSize) / originalSize) * 100;

      if (optimizedSize < originalSize) {
        await fs.writeFile(filePath, optimized, 'utf-8');
      }

      return {
        originalSize,
        optimizedSize,
        savings,
      };
    } catch (error) {
      console.error('Error optimizing CSS:', error);
      return null;
    }
  }

  /**
   * Optimizes JavaScript file
   */
  async optimizeJS(
    filePath: string,
    options: OptimizationOptions['js'] = { minify: false, removeComments: false }
  ): Promise<OptimizationResult | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const originalSize = Buffer.byteLength(content, 'utf-8');

      let optimized = content;

      if (options.removeComments) {
        // Remove single-line and multi-line comments
        optimized = optimized
          .replace(/\/\/.*$/gm, '') // Single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, ''); // Multi-line comments
      }

      if (options.minify) {
        // Basic minification
        optimized = optimized
          .replace(/\s+/g, ' ') // Collapse whitespace
          .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
          .trim();
      }

      const optimizedSize = Buffer.byteLength(optimized, 'utf-8');
      const savings = ((originalSize - optimizedSize) / originalSize) * 100;

      if (optimizedSize < originalSize) {
        await fs.writeFile(filePath, optimized, 'utf-8');
      }

      return {
        originalSize,
        optimizedSize,
        savings,
      };
    } catch (error) {
      console.error('Error optimizing JS:', error);
      return null;
    }
  }

  /**
   * Optimizes font file (subsetting)
   */
  async optimizeFont(
    filePath: string,
    options: OptimizationOptions['fonts'] = { subset: false }
  ): Promise<OptimizationResult | null> {
    try {
      const stats = await fs.stat(filePath);
      const originalSize = stats.size;

      // Font subsetting would require fonttools or similar
      // For now, return original

      return {
        originalSize,
        optimizedSize: originalSize,
        savings: 0,
      };
    } catch (error) {
      console.error('Error optimizing font:', error);
      return null;
    }
  }

  /**
   * Optimizes asset based on file type
   */
  async optimizeAsset(
    filePath: string,
    mimeType: string,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult | null> {
    if (mimeType.startsWith('image/')) {
      return await this.optimizeImage(filePath, options.images);
    }
    if (mimeType === 'text/css') {
      return await this.optimizeCSS(filePath, options.css);
    }
    if (mimeType === 'application/javascript' || mimeType === 'text/javascript') {
      return await this.optimizeJS(filePath, options.js);
    }
    if (mimeType.startsWith('font/') || mimeType.includes('font')) {
      return await this.optimizeFont(filePath, options.fonts);
    }

    return null;
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

