/**
 * Directory Structure Optimization
 * Creates clean, portable directory structure for offline browsing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DirectoryStructureOptions {
  organizeByType?: boolean;
  preserveOriginal?: boolean;
  flatStructure?: boolean;
  assetSubdirectories?: {
    images?: string;
    css?: string;
    js?: string;
    fonts?: string;
    videos?: string;
    audio?: string;
    documents?: string;
    icons?: string;
  };
}

const DEFAULT_ASSET_DIRS = {
  images: 'assets/images',
  css: 'assets/css',
  js: 'assets/js',
  fonts: 'assets/fonts',
  videos: 'assets/videos',
  audio: 'assets/audio',
  documents: 'assets/documents',
  icons: 'assets/icons'
};

/**
 * Creates optimized directory structure
 */
export async function createDirectoryStructure(
  baseDir: string,
  options: DirectoryStructureOptions = {}
): Promise<string> {
  const {
    organizeByType = true,
    preserveOriginal = false,
    flatStructure = false,
    assetSubdirectories = {}
  } = options;

  const dirs = { ...DEFAULT_ASSET_DIRS, ...assetSubdirectories };

  // Create base directory
  await fs.mkdir(baseDir, { recursive: true });

  if (flatStructure) {
    // Flat structure - all files in root
    return baseDir;
  }

  if (organizeByType) {
    // Create organized structure
    const directories = [
      dirs.images,
      dirs.css,
      dirs.js,
      dirs.fonts,
      dirs.videos,
      dirs.audio,
      dirs.documents,
      dirs.icons
    ];

    for (const dir of directories) {
      const fullPath = path.join(baseDir, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  if (preserveOriginal) {
    // Create original structure preservation directory
    await fs.mkdir(path.join(baseDir, 'original'), { recursive: true });
  }

  return baseDir;
}

/**
 * Gets the appropriate directory for an asset type
 */
export function getAssetDirectory(
  assetType: string,
  options: DirectoryStructureOptions = {}
): string {
  const {
    organizeByType = true,
    flatStructure = false,
    assetSubdirectories = {}
  } = options;

  if (flatStructure) {
    return '';
  }

  if (!organizeByType) {
    return 'assets';
  }

  const dirs = { ...DEFAULT_ASSET_DIRS, ...assetSubdirectories };

  // Determine asset type
  const ext = assetType.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) {
    return dirs.images;
  }
  
  if (['css'].includes(ext)) {
    return dirs.css;
  }
  
  if (['js', 'mjs', 'cjs'].includes(ext)) {
    return dirs.js;
  }
  
  if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) {
    return dirs.fonts;
  }
  
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) {
    return dirs.videos;
  }
  
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) {
    return dirs.audio;
  }
  
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext)) {
    return dirs.documents;
  }
  
  if (['ico', 'png', 'svg'].includes(ext) && assetType.includes('icon')) {
    return dirs.icons;
  }
  
  return 'assets';
}

/**
 * Generates index.html for a directory
 */
export async function generateIndexFile(
  dirPath: string,
  title: string = 'Directory Listing',
  files: string[] = []
): Promise<string> {
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .file-icon {
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <ul>
    ${files.map(file => `
      <li>
        <a href="${file}">
          <span class="file-icon">📄</span>
          ${file}
        </a>
      </li>
    `).join('')}
  </ul>
</body>
</html>`;

  const indexPath = path.join(dirPath, 'index.html');
  await fs.writeFile(indexPath, indexHtml, 'utf-8');
  
  return indexPath;
}

/**
 * Creates a clean filename from URL
 */
export function createCleanFilename(url: string, defaultName: string = 'index'): string {
  try {
    const urlObj = new URL(url);
    let filename = urlObj.pathname;
    
    // Remove leading slash
    filename = filename.replace(/^\//, '');
    
    // Replace slashes with underscores or keep structure
    filename = filename.replace(/\//g, '_');
    
    // Remove query string and hash (handled separately)
    filename = filename.split('?')[0].split('#')[0];
    
    // If no extension, add .html
    if (!filename || filename === '' || !path.extname(filename)) {
      filename = filename || defaultName;
      if (!filename.endsWith('.html') && !filename.endsWith('.htm')) {
        filename += '.html';
      }
    }
    
    // Sanitize filename
    filename = filename
      .replace(/[<>:"|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Limit length
    if (filename.length > 200) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      filename = name.substring(0, 200 - ext.length) + ext;
    }
    
    return filename || `${defaultName}.html`;
  } catch (e) {
    // Invalid URL, use default
    return `${defaultName}.html`;
  }
}

/**
 * Creates directory structure preserving original path
 */
export async function createPathStructure(
  baseDir: string,
  urlPath: string
): Promise<string> {
  const cleanPath = urlPath
    .replace(/^https?:\/\//, '')
    .replace(/^\/+/, '')
    .split('?')[0]
    .split('#')[0];
  
  const pathParts = cleanPath.split('/').filter(p => p);
  
  if (pathParts.length === 0) {
    return baseDir;
  }
  
  // Remove filename if present
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart.includes('.')) {
    pathParts.pop();
  }
  
  if (pathParts.length === 0) {
    return baseDir;
  }
  
  const fullPath = path.join(baseDir, ...pathParts);
  await fs.mkdir(fullPath, { recursive: true });
  
  return fullPath;
}

/**
 * Generates .gitignore for cloned site
 */
export async function generateGitignore(outputDir: string): Promise<string> {
  const gitignore = `# Dependencies
node_modules/
package-lock.json

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.temp
`;

  const gitignorePath = path.join(outputDir, '.gitignore');
  await fs.writeFile(gitignorePath, gitignore, 'utf-8');
  
  return gitignorePath;
}

/**
 * Creates complete directory structure with all necessary files
 */
export async function createCompleteStructure(
  baseDir: string,
  siteName: string,
  options: DirectoryStructureOptions = {}
): Promise<{
  baseDir: string;
  assetDirs: Record<string, string>;
}> {
  await createDirectoryStructure(baseDir, options);
  
  const assetDirs: Record<string, string> = {};
  
  if (options.organizeByType && !options.flatStructure) {
    const dirs = { ...DEFAULT_ASSET_DIRS, ...(options.assetSubdirectories || {}) };
    for (const [key, dir] of Object.entries(dirs)) {
      assetDirs[key] = path.join(baseDir, dir);
    }
  }
  
  // Generate .gitignore
  await generateGitignore(baseDir);
  
  return {
    baseDir,
    assetDirs
  };
}

