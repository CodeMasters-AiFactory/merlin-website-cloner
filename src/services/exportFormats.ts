/**
 * Export Formats
 * Multiple export formats (ZIP, TAR, MHTML, static HTML)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';

export interface ExportOptions {
  format: 'zip' | 'tar' | 'mhtml' | 'static' | 'warc' | 'pdf';
  outputPath: string;
  compressionLevel?: number;
  includeServerFiles?: boolean;
  pdfOptions?: PDFExportOptions;
}

export interface PDFExportOptions {
  format?: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  landscape?: boolean;
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  scale?: number;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export class ExportFormats {
  /**
   * Exports to ZIP archive
   */
  async exportToZip(
    sourceDir: string,
    options: ExportOptions
  ): Promise<string> {
    const outputPath = options.outputPath.endsWith('.zip')
      ? options.outputPath
      : `${options.outputPath}.zip`;

    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: options.compressionLevel || 9 }
      });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Exports to TAR archive
   */
  async exportToTar(
    sourceDir: string,
    options: ExportOptions
  ): Promise<string> {
    const outputPath = options.outputPath.endsWith('.tar.gz')
      ? options.outputPath
      : `${options.outputPath}.tar.gz`;

    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: { level: options.compressionLevel || 9 }
      });

      output.on('close', () => resolve(outputPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Exports to MHTML (single HTML file)
   */
  async exportToMHTML(
    sourceDir: string,
    options: ExportOptions
  ): Promise<string> {
    const outputPath = options.outputPath.endsWith('.mhtml')
      ? options.outputPath
      : `${options.outputPath}.mhtml`;

    // Find main HTML file
    const indexPath = path.join(sourceDir, 'index.html');
    let mainHtml = '';
    
    try {
      mainHtml = await fs.readFile(indexPath, 'utf-8');
    } catch {
      // Try to find any HTML file
      const files = await fs.readdir(sourceDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      if (htmlFile) {
        mainHtml = await fs.readFile(path.join(sourceDir, htmlFile), 'utf-8');
      }
    }

    // Convert to MHTML format (includes all assets as base64)
    const mhtml = await this.convertToMHTML(mainHtml, sourceDir);

    await fs.writeFile(outputPath, mhtml, 'utf-8');
    return outputPath;
  }

  /**
   * Converts HTML to MHTML format with all assets
   */
  private async convertToMHTML(html: string, sourceDir: string): Promise<string> {
    const boundary = '----=_NextPart_000_0000_01DA1234567890AB';
    let mhtml = `From: <saved-by-merlin-clone>
Date: ${new Date().toUTCString()}
Subject: Cloned Website
MIME-Version: 1.0
Content-Type: multipart/related;
\ttype="text/html";
\tboundary="${boundary}"

`;

    // Main HTML part
    mhtml += `--${boundary}
Content-Type: text/html; charset="utf-8"
Content-Location: file:///index.html

${html}

`;

    // Find and include all assets (CSS, JS, images, fonts, etc.)
    const assetDir = path.join(sourceDir, 'assets');

    try {
      const assetTypes = ['css', 'js', 'images', 'fonts', 'videos', 'audio', 'documents', 'icons'];

      for (const assetType of assetTypes) {
        const typePath = path.join(assetDir, assetType);

        try {
          const files = await this.findAllFiles(typePath);

          for (const filePath of files) {
            const relativePath = path.relative(sourceDir, filePath);
            const content = await fs.readFile(filePath);
            const base64Content = content.toString('base64');
            const mimeType = this.getMimeType(filePath);

            mhtml += `--${boundary}
Content-Type: ${mimeType}
Content-Transfer-Encoding: base64
Content-Location: ${relativePath.replace(/\\/g, '/')}

${base64Content}

`;
          }
        } catch (err) {
          // Directory doesn't exist, skip
        }
      }
    } catch (err) {
      // Assets directory doesn't exist, skip
    }

    mhtml += `--${boundary}--
`;

    return mhtml;
  }

  /**
   * Recursively finds all files in a directory
   */
  private async findAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Gets MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',

      // Fonts
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.eot': 'application/vnd.ms-fontobject',

      // Stylesheets
      '.css': 'text/css',

      // Scripts
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',

      // Videos
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',

      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',

      // Documents
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.xml': 'application/xml',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Exports as static HTML (ready to serve)
   */
  async exportToStatic(
    sourceDir: string,
    options: ExportOptions
  ): Promise<string> {
    // Static export is just copying the directory
    // This ensures all files are in place
    const outputPath = options.outputPath;

    // Copy directory
    await this.copyDirectory(sourceDir, outputPath);

    // Generate server files if requested
    if (options.includeServerFiles) {
      const { generateAllServerFiles } = await import('../utils/localServerGenerator.js');
      await generateAllServerFiles(outputPath, 'cloned-site');
    }

    return outputPath;
  }

  /**
   * Copies directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Exports to PDF (renders all pages as PDF documents)
   */
  async exportToPDF(
    sourceDir: string,
    options: ExportOptions
  ): Promise<string> {
    const puppeteer = await import('puppeteer');
    const outputDir = options.outputPath.endsWith('.pdf')
      ? path.dirname(options.outputPath)
      : options.outputPath;

    await fs.mkdir(outputDir, { recursive: true });

    // Find all HTML files
    const htmlFiles = await this.findHTMLFiles(sourceDir);

    if (htmlFiles.length === 0) {
      throw new Error('No HTML files found to convert to PDF');
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pdfPaths: string[] = [];
    const pdfOptions = options.pdfOptions || {};

    try {
      for (const htmlFile of htmlFiles) {
        const relativePath = path.relative(sourceDir, htmlFile);
        const pdfFileName = relativePath.replace(/\.html?$/i, '.pdf');
        const pdfPath = path.join(outputDir, pdfFileName);

        // Ensure directory exists for nested files
        await fs.mkdir(path.dirname(pdfPath), { recursive: true });

        const page = await browser.newPage();

        // Load the HTML file
        const fileUrl = `file://${htmlFile.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Generate PDF
        await page.pdf({
          path: pdfPath,
          format: pdfOptions.format || 'A4',
          landscape: pdfOptions.landscape || false,
          printBackground: pdfOptions.printBackground !== false,
          margin: pdfOptions.margin || {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          scale: pdfOptions.scale || 1,
          displayHeaderFooter: pdfOptions.displayHeaderFooter || false,
          headerTemplate: pdfOptions.headerTemplate || '',
          footerTemplate: pdfOptions.footerTemplate || ''
        });

        await page.close();
        pdfPaths.push(pdfPath);
      }

      // Create index JSON listing all PDFs
      const indexPath = path.join(outputDir, 'pdf-index.json');
      await fs.writeFile(indexPath, JSON.stringify({
        exportedAt: new Date().toISOString(),
        sourceDirectory: sourceDir,
        totalPages: pdfPaths.length,
        files: pdfPaths.map(p => path.relative(outputDir, p))
      }, null, 2));

    } finally {
      await browser.close();
    }

    // If single file requested, merge PDFs
    if (options.outputPath.endsWith('.pdf') && pdfPaths.length > 0) {
      // Return the first PDF if only one, otherwise return directory
      if (pdfPaths.length === 1) {
        const singlePdfPath = options.outputPath;
        await fs.copyFile(pdfPaths[0], singlePdfPath);
        return singlePdfPath;
      }
    }

    return outputDir;
  }

  /**
   * Finds all HTML files in directory
   */
  private async findHTMLFiles(dir: string): Promise<string[]> {
    const htmlFiles: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip assets directory for PDF export
          if (entry.name !== 'assets') {
            const subFiles = await this.findHTMLFiles(fullPath);
            htmlFiles.push(...subFiles);
          }
        } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
          htmlFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return htmlFiles;
  }

  /**
   * Main export method
   */
  async export(
    sourceDir: string,
    options: ExportOptions
  ): Promise<string> {
    switch (options.format) {
      case 'zip':
        return await this.exportToZip(sourceDir, options);
      case 'tar':
        return await this.exportToTar(sourceDir, options);
      case 'mhtml':
        return await this.exportToMHTML(sourceDir, options);
      case 'static':
        return await this.exportToStatic(sourceDir, options);
      case 'pdf':
        return await this.exportToPDF(sourceDir, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }
}

