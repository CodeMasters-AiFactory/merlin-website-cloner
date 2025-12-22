/**
 * Comprehensive URL Rewriting Engine
 * Converts absolute URLs to relative paths for offline functionality
 */

export interface RewriteOptions {
  baseUrl: string;
  targetPath: string;
  preserveQueryStrings?: boolean;
  preserveFragments?: boolean;
  handleDataUris?: boolean;
  handleBlobUrls?: boolean;
}

export interface RewriteResult {
  rewritten: string;
  isExternal: boolean;
  isDataUri: boolean;
  isBlobUrl: boolean;
  original: string;
}

/**
 * Rewrites a URL to a relative path for offline use
 */
export function rewriteUrl(url: string, options: RewriteOptions): RewriteResult {
  const original = url.trim();
  
  // Handle empty or invalid URLs
  if (!original || original === '#' || original === 'javascript:void(0)') {
    return {
      rewritten: original,
      isExternal: false,
      isDataUri: false,
      isBlobUrl: false,
      original
    };
  }

  // Handle data URIs
  if (original.startsWith('data:')) {
    if (options.handleDataUris) {
      // Extract data URI and convert to file reference
      // This will be handled by data URI extraction service
      return {
        rewritten: original, // Keep for now, will be processed separately
        isExternal: false,
        isDataUri: true,
        isBlobUrl: false,
        original
      };
    }
    return {
      rewritten: original,
      isExternal: false,
      isDataUri: true,
      isBlobUrl: false,
      original
    };
  }

  // Handle blob URLs
  if (original.startsWith('blob:')) {
    if (options.handleBlobUrls) {
      // Blob URLs need special handling - will be converted to file references
      return {
        rewritten: original, // Keep for now, will be processed separately
        isExternal: false,
        isDataUri: false,
        isBlobUrl: true,
        original
      };
    }
    return {
      rewritten: original,
      isExternal: false,
      isDataUri: false,
      isBlobUrl: true,
      original
    };
  }

  // Handle protocol-relative URLs (//example.com)
  if (original.startsWith('//')) {
    const baseProtocol = new URL(options.baseUrl).protocol;
    const fullUrl = `${baseProtocol}${original}`;
    return rewriteUrl(fullUrl, options);
  }

  // Handle relative URLs (already relative)
  if (original.startsWith('/') && !original.startsWith('//')) {
    // Absolute path on same domain
    return convertAbsolutePathToRelative(original, options);
  }

  if (!original.startsWith('http://') && !original.startsWith('https://')) {
    // Relative URL (./file, ../file, file)
    return {
      rewritten: original,
      isExternal: false,
      isDataUri: false,
      isBlobUrl: false,
      original
    };
  }

  // Parse absolute URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(original);
  } catch (e) {
    // Invalid URL, return as-is
    return {
      rewritten: original,
      isExternal: true,
      isDataUri: false,
      isBlobUrl: false,
      original
    };
  }

  const baseUrlObj = new URL(options.baseUrl);
  
  // Check if external domain
  const isExternal = parsedUrl.origin !== baseUrlObj.origin;
  
  if (isExternal) {
    // External URL - return as-is or replace with offline page
    return {
      rewritten: original,
      isExternal: true,
      isDataUri: false,
      isBlobUrl: false,
      original
    };
  }

  // Same domain - convert to relative path
  return convertAbsolutePathToRelative(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash, options);
}

/**
 * Converts an absolute path to a relative path
 */
function convertAbsolutePathToRelative(
  absolutePath: string,
  options: RewriteOptions
): RewriteResult {
  // Extract path, query, and fragment
  const [pathPart, queryAndFragment] = absolutePath.split('?');
  const [queryPart, fragment] = queryAndFragment ? queryAndFragment.split('#') : ['', ''];
  
  const baseUrlObj = new URL(options.baseUrl);
  const basePath = baseUrlObj.pathname.endsWith('/') 
    ? baseUrlObj.pathname.slice(0, -1)
    : baseUrlObj.pathname;
  
  // Normalize paths
  const targetDir = options.targetPath.replace(/\\/g, '/');
  const baseDir = basePath.replace(/\\/g, '/');
  const sourcePath = pathPart.replace(/\\/g, '/');
  
  // Calculate relative path
  const relativePath = calculateRelativePath(baseDir, sourcePath);
  
  // Reconstruct URL with query and fragment
  let rewritten = relativePath;
  
  if (options.preserveQueryStrings && queryPart) {
    rewritten += `?${queryPart}`;
  }
  
  if (options.preserveFragments && fragment) {
    rewritten += `#${fragment}`;
  }
  
  return {
    rewritten,
    isExternal: false,
    isDataUri: false,
    isBlobUrl: false,
    original: absolutePath
  };
}

/**
 * Calculates relative path between two absolute paths
 */
function calculateRelativePath(from: string, to: string): string {
  // Normalize paths
  const fromParts = from.split('/').filter(p => p && p !== '.');
  const toParts = to.split('/').filter(p => p && p !== '.');
  
  // Remove common prefix
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }
  
  // Calculate how many levels up we need to go
  const upLevels = fromParts.length - commonLength;
  
  // Build relative path
  const relativeParts: string[] = [];
  
  // Go up directories
  for (let i = 0; i < upLevels; i++) {
    relativeParts.push('..');
  }
  
  // Add remaining path
  relativeParts.push(...toParts.slice(commonLength));
  
  const result = relativeParts.length > 0 ? relativeParts.join('/') : './';
  
  // Ensure it starts with ./ for same directory
  if (!result.startsWith('.') && !result.startsWith('/')) {
    return './' + result;
  }
  
  return result || './';
}

/**
 * Rewrites multiple URLs in batch
 */
export function rewriteUrls(
  urls: string[],
  options: RewriteOptions
): RewriteResult[] {
  return urls.map(url => rewriteUrl(url, options));
}

/**
 * Extracts all URLs from a string (for CSS, JavaScript, etc.)
 */
export function extractUrlsFromText(text: string): string[] {
  const urls: string[] = [];
  
  // Match url() in CSS
  const cssUrlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let match;
  while ((match = cssUrlRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  
  // Match @import in CSS
  const importRegex = /@import\s+['"]([^'"]+)['"]/gi;
  while ((match = importRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  
  // Match src=, href=, action= in HTML/JS
  const attrRegex = /(?:src|href|action|data-src|data-href)\s*=\s*['"]([^'"]+)['"]/gi;
  while ((match = attrRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  
  return [...new Set(urls)]; // Remove duplicates
}

/**
 * Rewrites URLs within text content (CSS, JavaScript, etc.)
 */
export function rewriteUrlsInText(
  text: string,
  options: RewriteOptions,
  urlExtractor: (text: string) => string[] = extractUrlsFromText
): string {
  const urls = urlExtractor(text);
  let rewrittenText = text;
  
  for (const url of urls) {
    const result = rewriteUrl(url, options);
    if (result.rewritten !== result.original) {
      // Replace all occurrences of the original URL
      const escapedUrl = escapeRegex(url);
      const regex = new RegExp(escapedUrl, 'g');
      rewrittenText = rewrittenText.replace(regex, result.rewritten);
    }
  }
  
  return rewrittenText;
}

/**
 * Escapes special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

