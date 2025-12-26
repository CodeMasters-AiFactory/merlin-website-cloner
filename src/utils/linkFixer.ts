/**
 * Comprehensive Link Fixing System
 * Rewrites all links, images, scripts, stylesheets for offline functionality
 */

import * as cheerio from 'cheerio';
import { rewriteUrl, type RewriteOptions, type RewriteResult } from './urlRewriter.js';

export interface LinkFixOptions extends RewriteOptions {
  outputDir?: string;
  replaceExternalLinks?: boolean;
  externalLinkReplacement?: string;
  fixForms?: boolean;
  fixIframes?: boolean;
  fixMetaTags?: boolean;
  fixInlineStyles?: boolean;
  fixCssUrls?: boolean;
}

export interface FixResult {
  fixedHtml: string;
  fixedCss: string;
  fixedJs: string;
  stats: {
    linksFixed: number;
    imagesFixed: number;
    scriptsFixed: number;
    stylesheetsFixed: number;
    formsFixed: number;
    iframesFixed: number;
    inlineStylesFixed: number;
    cssUrlsFixed: number;
    externalLinksReplaced: number;
  };
}

/**
 * Fixes all links in HTML content
 */
export function fixLinksInHtml(html: string, options: LinkFixOptions): FixResult {
  const $ = cheerio.load(html, {
    xml: false
  });

  const stats = {
    linksFixed: 0,
    imagesFixed: 0,
    scriptsFixed: 0,
    stylesheetsFixed: 0,
    formsFixed: 0,
    iframesFixed: 0,
    inlineStylesFixed: 0,
    cssUrlsFixed: 0,
    externalLinksReplaced: 0
  };

  // Fix <a> href attributes
  $('a[href]').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href');
    if (href) {
      const result = rewriteUrl(href, options);
      if (result.isExternal && options.replaceExternalLinks) {
        $el.attr('href', options.externalLinkReplacement || '#offline');
        stats.externalLinksReplaced++;
      } else if (!result.isExternal) {
        $el.attr('href', result.rewritten);
        stats.linksFixed++;
      }
    }
  });

  // Fix <img> src and srcset attributes
  $('img[src]').each((_, element) => {
    const $el = $(element);
    const src = $el.attr('src');
    if (src) {
      const result = rewriteUrl(src, options);
      if (!result.isExternal) {
        $el.attr('src', result.rewritten);
        stats.imagesFixed++;
      }
    }
    
    // Fix srcset
    const srcset = $el.attr('srcset');
    if (srcset) {
      const fixedSrcset = fixSrcset(srcset, options);
      if (fixedSrcset !== srcset) {
        $el.attr('srcset', fixedSrcset);
        stats.imagesFixed++;
      }
    }
  });

  // Fix <picture> source elements
  $('picture source[srcset]').each((_, element) => {
    const $el = $(element);
    const srcset = $el.attr('srcset');
    if (srcset) {
      const fixedSrcset = fixSrcset(srcset, options);
      if (fixedSrcset !== srcset) {
        $el.attr('srcset', fixedSrcset);
        stats.imagesFixed++;
      }
    }
  });

  // Fix <script> src attributes
  $('script[src]').each((_, element) => {
    const $el = $(element);
    const src = $el.attr('src');
    if (src) {
      const result = rewriteUrl(src, options);
      if (!result.isExternal) {
        $el.attr('src', result.rewritten);
        stats.scriptsFixed++;
      }
    }
  });

  // Fix <link> href attributes (stylesheets, icons, etc.)
  // Skip canonical links as they are metadata, not navigation
  $('link[href]').each((_, element) => {
    const $el = $(element);
    const rel = $el.attr('rel') || '';
    const href = $el.attr('href');

    // Skip canonical links - they shouldn't have /index.html added
    if (rel.toLowerCase() === 'canonical') {
      return;
    }

    if (href) {
      const result = rewriteUrl(href, options);
      if (!result.isExternal) {
        $el.attr('href', result.rewritten);
        stats.stylesheetsFixed++;
      }
    }
  });

  // Fix <form> action attributes
  if (options.fixForms) {
    $('form[action]').each((_, element) => {
      const $el = $(element);
      const action = $el.attr('action');
      if (action) {
        const result = rewriteUrl(action, options);
        if (!result.isExternal) {
          $el.attr('action', result.rewritten);
          stats.formsFixed++;
        }
      }
    });
  }

  // Fix <iframe> src attributes
  if (options.fixIframes) {
    $('iframe[src]').each((_, element) => {
      const $el = $(element);
      const src = $el.attr('src');
      if (src) {
        const result = rewriteUrl(src, options);
        if (!result.isExternal) {
          $el.attr('src', result.rewritten);
          stats.iframesFixed++;
        }
      }
    });
  }

  // Fix <base> tag
  $('base[href]').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href');
    if (href) {
      const result = rewriteUrl(href, options);
      if (!result.isExternal) {
        $el.attr('href', result.rewritten);
      }
    }
  });

  // Fix meta refresh tags
  if (options.fixMetaTags) {
    $('meta[http-equiv="refresh"]').each((_, element) => {
      const $el = $(element);
      const content = $el.attr('content');
      if (content) {
        const fixedContent = fixMetaRefresh(content, options);
        if (fixedContent !== content) {
          $el.attr('content', fixedContent);
        }
      }
    });
  }

  // Fix inline styles with URLs
  if (options.fixInlineStyles) {
    $('[style]').each((_, element) => {
      const $el = $(element);
      const style = $el.attr('style');
      if (style) {
        const fixedStyle = fixInlineStyle(style, options);
        if (fixedStyle !== style) {
          $el.attr('style', fixedStyle);
          stats.inlineStylesFixed++;
        }
      }
    });
  }

  const fixedHtml = $.html();
  
  return {
    fixedHtml,
    fixedCss: '',
    fixedJs: '',
    stats
  };
}

/**
 * Fixes URLs in CSS content
 */
export function fixLinksInCss(css: string, options: LinkFixOptions): string {
  // Fix url() references
  const urlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  
  return css.replace(urlRegex, (match, url) => {
    const result = rewriteUrl(url, options);
    if (!result.isExternal && result.rewritten !== result.original) {
      return match.replace(url, result.rewritten);
    }
    return match;
  });
}

/**
 * Fixes URLs in JavaScript content (enhanced for JavaScript-generated links)
 */
export function fixLinksInJs(js: string, options: LinkFixOptions): string {
  // Common patterns for URLs in JavaScript
  const patterns = [
    // String literals with http/https
    /(['"])(https?:\/\/[^'"]+)\1/g,
    // Template literals
    /`(https?:\/\/[^`]+)`/g,
    // Assignment patterns: src = "...", href = "..."
    /(src|href|action|url)\s*[=:]\s*['"]([^'"]+)['"]/gi,
    // fetch(), XMLHttpRequest, etc.
    /(fetch|XMLHttpRequest|open)\s*\(\s*['"]([^'"]+)['"]/gi,
    // window.location assignments
    /window\.location\s*[=.]\s*['"]([^'"]+)['"]/gi,
    // router.push, navigate, etc. (SPA routing)
    /(router|history|navigate)\.(push|replace|go)\s*\(\s*['"]([^'"]+)['"]/gi,
    // createElement with href/src
    /createElement\s*\(\s*['"](a|img|script|link|iframe)['"]\s*\)[^}]*\.(href|src)\s*=\s*['"]([^'"]+)['"]/gi,
    // setAttribute with href/src
    /setAttribute\s*\(\s*['"](href|src|action)['"]\s*,\s*['"]([^'"]+)['"]/gi,
    // URL constructor
    /new\s+URL\s*\(\s*['"]([^'"]+)['"]/gi,
    // Relative paths that should be fixed
    /(['"])(\/[^'"]+)\1/g,
  ];

  let fixedJs = js;
  
  for (const pattern of patterns) {
    fixedJs = fixedJs.replace(pattern, (match, ...args) => {
      // Extract URL from match
      const urlMatch = match.match(/(https?:\/\/[^\s'")`]+|\/[^\s'")`]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const result = rewriteUrl(url, options);
        if (!result.isExternal && result.rewritten !== result.original) {
          return match.replace(url, result.rewritten);
        }
      }
      return match;
    });
  }
  
  return fixedJs;
}

/**
 * Injects JavaScript to intercept and fix dynamically generated links
 */
export function injectLinkInterceptor(options: LinkFixOptions): string {
  return `
(function() {
  const baseUrl = '${options.baseUrl || ''}';
  const outputDir = '${options.outputDir || ''}';
  
  // Intercept createElement for links
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    
    if (tagName.toLowerCase() === 'a' || tagName.toLowerCase() === 'img' || 
        tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if ((name === 'href' || name === 'src') && value) {
          try {
            const result = rewriteUrlForJs(value, baseUrl, outputDir);
            if (result && result !== value) {
              value = result;
            }
          } catch (e) {
            // Ignore errors
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  // Intercept innerHTML/innerText assignments
  const interceptProperty = function(obj, prop, baseUrl, outputDir) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop) || 
                      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), prop);
    if (!descriptor) return;
    
    const originalGetter = descriptor.get;
    const originalSetter = descriptor.set;
    
    Object.defineProperty(obj, prop, {
      get: originalGetter,
      set: function(value) {
        if (typeof value === 'string' && value.includes('href=') || value.includes('src=')) {
          try {
            value = value.replace(/(href|src)=["']([^"']+)["']/gi, (match, attr, url) => {
              const result = rewriteUrlForJs(url, baseUrl, outputDir);
              return result ? \`\${attr}="\${result}"\` : match;
            });
          } catch (e) {
            // Ignore errors
          }
        }
        if (originalSetter) {
          originalSetter.call(this, value);
        } else {
          obj[prop] = value;
        }
      },
      configurable: true,
      enumerable: descriptor.enumerable
    });
  };
  
  // Helper function to rewrite URLs in JavaScript context
  function rewriteUrlForJs(url, baseUrl, outputDir) {
    if (!url || !baseUrl) return url;
    try {
      const base = new URL(baseUrl);
      const urlObj = new URL(url, baseUrl);
      
      if (urlObj.hostname === base.hostname) {
        // Same domain, convert to relative path
        const path = urlObj.pathname + urlObj.search + urlObj.hash;
        return path.startsWith('/') ? path.substring(1) : path;
      }
      return url;
    } catch {
      return url;
    }
  }
  
  // Intercept common DOM manipulation methods
  ['innerHTML', 'outerHTML'].forEach(prop => {
    interceptProperty(Element.prototype, prop, baseUrl, outputDir);
  });
})();
  `.trim();
}

/**
 * Fixes srcset attribute
 */
function fixSrcset(srcset: string, options: LinkFixOptions): string {
  // srcset format: "image1.jpg 1x, image2.jpg 2x" or "image1.jpg 300w, image2.jpg 600w"
  const parts = srcset.split(',');
  
  return parts.map(part => {
    const trimmed = part.trim();
    const [url, descriptor] = trimmed.split(/\s+/);
    if (url) {
      const result = rewriteUrl(url, options);
      if (!result.isExternal && result.rewritten !== result.original) {
        return descriptor ? `${result.rewritten} ${descriptor}` : result.rewritten;
      }
    }
    return trimmed;
  }).join(', ');
}

/**
 * Fixes meta refresh content
 */
function fixMetaRefresh(content: string, options: LinkFixOptions): string {
  // Format: "5;url=http://example.com"
  const urlMatch = content.match(/url\s*=\s*([^\s;]+)/i);
  if (urlMatch) {
    const url = urlMatch[1];
    const result = rewriteUrl(url, options);
    if (!result.isExternal && result.rewritten !== result.original) {
      return content.replace(url, result.rewritten);
    }
  }
  return content;
}

/**
 * Fixes inline style attribute
 */
function fixInlineStyle(style: string, options: LinkFixOptions): string {
  // Fix background-image, background, etc.
  const urlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  
  return style.replace(urlRegex, (match, url) => {
    const result = rewriteUrl(url, options);
    if (!result.isExternal && result.rewritten !== result.original) {
      return match.replace(url, result.rewritten);
    }
    return match;
  });
}

/**
 * Comprehensive fix for HTML, CSS, and JS
 */
export function fixAllLinks(
  html: string,
  css: string,
  js: string,
  options: LinkFixOptions
): FixResult {
  const htmlResult = fixLinksInHtml(html, options);
  const fixedCss = options.fixCssUrls ? fixLinksInCss(css, options) : css;
  const fixedJs = fixLinksInJs(js, options);
  
  return {
    fixedHtml: htmlResult.fixedHtml,
    fixedCss,
    fixedJs,
    stats: htmlResult.stats
  };
}

