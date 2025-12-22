# Technical Details: Current Implementation

## Architecture Overview

The current scraper is built on:
- **Puppeteer** for headless browser automation
- **Cheerio** for HTML parsing
- **node-fetch** for HTTP requests
- **PostgreSQL** for storage (via Drizzle ORM)

## Key Functions

### `scrapeWebsiteFull(url, companyName, maxRetries, retryDelay, onProgress)`
- Main scraping function
- Uses Puppeteer to load page
- Extracts HTML, CSS, JavaScript, images
- Returns `ScrapedWebsiteData` object

**Current Issues:**
- No proxy support
- Single user-agent
- Sequential execution
- Basic error handling

### `crawlWebsiteMultiPage(startUrl, templateId, maxPages, maxDepth, onProgress)`
- Multi-page crawler
- Recursively follows internal links
- Stores pages in `template_pages` table
- Sequential (one page at a time)

**Current Issues:**
- Sequential (too slow)
- No parallel processing
- Gets blocked after few pages
- No caching

### `extractCSS(page, baseUrl)`
- Extracts inline styles and external stylesheets
- **Recently fixed** - was returning 0 bytes
- Now fetches CSS from Node.js side (not browser)

**Status:** ✅ Working

### `extractAllImages(page, fullUrl, options)`
- Extracts all images from page
- Downloads images
- Handles lazy loading
- Returns image metadata

**Status:** ✅ Working

## Database Schema

### `template_pages` table
- Stores individual scraped pages
- Fields: `id`, `template_id`, `url`, `path`, `html_content`, `css_content`, `js_content`, `images`, `title`, `is_home_page`

**Status:** ✅ Working

## Current Limitations

1. **No Proxy Support**
   - All requests from single IP
   - Gets banned quickly

2. **No User-Agent Rotation**
   - Uses same user-agent for all requests
   - Easy to detect

3. **Sequential Scraping**
   - One page at a time
   - 7+ minutes for 50 pages

4. **No Cloudflare Bypass**
   - Can't handle Cloudflare-protected sites
   - No CAPTCHA solving

5. **Basic Error Handling**
   - Single retry
   - Fails silently often

6. **No Caching**
   - Re-scrapes unchanged pages
   - Wastes time and resources

## File Structure

```
server/
├── services/
│   ├── websiteScraper.ts      # Main scraper logic
│   ├── proxyManager.ts        # Basic proxy (needs enhancement)
│   ├── imageExtractor.ts      # Image extraction
│   └── templateDependencyInjector.ts  # Dependency injection
├── api/
│   └── websiteScraper.ts      # API endpoints
└── db.ts                       # Database connection

shared/
└── schema.ts                   # Database schema (Drizzle)
```

## Dependencies

```json
{
  "puppeteer": "^21.0.0",
  "cheerio": "^1.0.0",
  "node-fetch": "^2.6.7",
  "drizzle-orm": "^0.29.0",
  "pg": "^8.11.0"
}
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
```

---

**Next Steps:** See `PLAN.md` for implementation roadmap.

