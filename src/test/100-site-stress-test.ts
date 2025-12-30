/**
 * 100-Site Stress Test
 * Tests cloning across diverse websites to identify errors and areas for improvement
 * Excludes: government sites, security sites, sites requiring authentication
 */

import { WebsiteCloner } from '../services/websiteCloner.js';

interface TestResult {
  url: string;
  category: string;
  status: 'success' | 'failed' | 'timeout';
  score?: number;
  pagesCloned?: number;
  duration?: number;
  error?: string;
  errorType?: string;
}

// 100 diverse websites across categories (no .gov, .mil, security sites)
const TEST_SITES = [
  // Simple/Static Sites (10)
  { url: 'https://example.com', category: 'simple' },
  { url: 'https://neverssl.com', category: 'simple' },
  { url: 'http://info.cern.ch', category: 'simple' },
  { url: 'https://motherfuckingwebsite.com', category: 'simple' },
  { url: 'https://thebestmotherfucking.website', category: 'simple' },
  { url: 'https://txti.es', category: 'simple' },
  { url: 'https://lite.cnn.com', category: 'simple' },
  { url: 'https://text.npr.org', category: 'simple' },
  { url: 'https://legiblenews.com', category: 'simple' },
  { url: 'https://68k.news', category: 'simple' },

  // News Sites (10)
  { url: 'https://news.ycombinator.com', category: 'news' },
  { url: 'https://lobste.rs', category: 'news' },
  { url: 'https://slashdot.org', category: 'news' },
  { url: 'https://arstechnica.com', category: 'news' },
  { url: 'https://theverge.com', category: 'news' },
  { url: 'https://wired.com', category: 'news' },
  { url: 'https://techcrunch.com', category: 'news' },
  { url: 'https://engadget.com', category: 'news' },
  { url: 'https://mashable.com', category: 'news' },
  { url: 'https://gizmodo.com', category: 'news' },

  // Blogs/Personal (10)
  { url: 'https://paulgraham.com', category: 'blog' },
  { url: 'https://daringfireball.net', category: 'blog' },
  { url: 'https://kottke.org', category: 'blog' },
  { url: 'https://waitbutwhy.com', category: 'blog' },
  { url: 'https://xkcd.com', category: 'blog' },
  { url: 'https://theoatmeal.com', category: 'blog' },
  { url: 'https://dilbert.com', category: 'blog' },
  { url: 'https://explosm.net', category: 'blog' },
  { url: 'https://smbc-comics.com', category: 'blog' },
  { url: 'https://penny-arcade.com', category: 'blog' },

  // Documentation/Reference (10)
  { url: 'https://devdocs.io', category: 'docs' },
  { url: 'https://developer.mozilla.org', category: 'docs' },
  { url: 'https://css-tricks.com', category: 'docs' },
  { url: 'https://w3schools.com', category: 'docs' },
  { url: 'https://stackoverflow.com/questions', category: 'docs' },
  { url: 'https://caniuse.com', category: 'docs' },
  { url: 'https://npmjs.com', category: 'docs' },
  { url: 'https://pypi.org', category: 'docs' },
  { url: 'https://rubygems.org', category: 'docs' },
  { url: 'https://pkg.go.dev', category: 'docs' },

  // E-commerce/Business (10)
  { url: 'https://shopify.com', category: 'ecommerce' },
  { url: 'https://stripe.com', category: 'ecommerce' },
  { url: 'https://square.com', category: 'ecommerce' },
  { url: 'https://etsy.com', category: 'ecommerce' },
  { url: 'https://ebay.com', category: 'ecommerce' },
  { url: 'https://craigslist.org', category: 'ecommerce' },
  { url: 'https://aliexpress.com', category: 'ecommerce' },
  { url: 'https://wish.com', category: 'ecommerce' },
  { url: 'https://zappos.com', category: 'ecommerce' },
  { url: 'https://overstock.com', category: 'ecommerce' },

  // Social/Community (10)
  { url: 'https://reddit.com', category: 'social' },
  { url: 'https://pinterest.com', category: 'social' },
  { url: 'https://tumblr.com', category: 'social' },
  { url: 'https://medium.com', category: 'social' },
  { url: 'https://dev.to', category: 'social' },
  { url: 'https://hashnode.com', category: 'social' },
  { url: 'https://producthunt.com', category: 'social' },
  { url: 'https://dribbble.com', category: 'social' },
  { url: 'https://behance.net', category: 'social' },
  { url: 'https://flickr.com', category: 'social' },

  // Media/Entertainment (10)
  { url: 'https://imdb.com', category: 'media' },
  { url: 'https://rottentomatoes.com', category: 'media' },
  { url: 'https://metacritic.com', category: 'media' },
  { url: 'https://ign.com', category: 'media' },
  { url: 'https://gamespot.com', category: 'media' },
  { url: 'https://polygon.com', category: 'media' },
  { url: 'https://kotaku.com', category: 'media' },
  { url: 'https://pitchfork.com', category: 'media' },
  { url: 'https://rollingstone.com', category: 'media' },
  { url: 'https://billboard.com', category: 'media' },

  // Tools/Utilities (10)
  { url: 'https://json-generator.com', category: 'tools' },
  { url: 'https://jsonformatter.org', category: 'tools' },
  { url: 'https://regex101.com', category: 'tools' },
  { url: 'https://crontab.guru', category: 'tools' },
  { url: 'https://explainshell.com', category: 'tools' },
  { url: 'https://carbon.now.sh', category: 'tools' },
  { url: 'https://readme.so', category: 'tools' },
  { url: 'https://tableconvert.com', category: 'tools' },
  { url: 'https://smalldev.tools', category: 'tools' },
  { url: 'https://transform.tools', category: 'tools' },

  // Education/Learning (10)
  { url: 'https://khanacademy.org', category: 'education' },
  { url: 'https://coursera.org', category: 'education' },
  { url: 'https://edx.org', category: 'education' },
  { url: 'https://udemy.com', category: 'education' },
  { url: 'https://codecademy.com', category: 'education' },
  { url: 'https://freecodecamp.org', category: 'education' },
  { url: 'https://brilliant.org', category: 'education' },
  { url: 'https://duolingo.com', category: 'education' },
  { url: 'https://memrise.com', category: 'education' },
  { url: 'https://quizlet.com', category: 'education' },

  // Miscellaneous (10)
  { url: 'https://wikipedia.org', category: 'misc' },
  { url: 'https://archive.org', category: 'misc' },
  { url: 'https://gutenberg.org', category: 'misc' },
  { url: 'https://openlibrary.org', category: 'misc' },
  { url: 'https://wolframalpha.com', category: 'misc' },
  { url: 'https://weatherunderground.com', category: 'misc' },
  { url: 'https://timeanddate.com', category: 'misc' },
  { url: 'https://isitdownrightnow.com', category: 'misc' },
  { url: 'https://speedtest.net', category: 'misc' },
  { url: 'https://fast.com', category: 'misc' },
];

async function runTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('100-SITE STRESS TEST');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log(`Testing ${TEST_SITES.length} sites across ${new Set(TEST_SITES.map(s => s.category)).size} categories\n`);

  const results: TestResult[] = [];
  const errors: Map<string, string[]> = new Map(); // errorType -> urls
  const startTime = Date.now();

  // Process in batches of 5 concurrent clones
  const BATCH_SIZE = 5;
  const TIMEOUT_MS = 120000; // 2 minutes per site

  for (let i = 0; i < TEST_SITES.length; i += BATCH_SIZE) {
    const batch = TEST_SITES.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(TEST_SITES.length / BATCH_SIZE);

    console.log(`\n--- Batch ${batchNum}/${totalBatches} ---`);

    const batchPromises = batch.map(async (site) => {
      const cloner = new WebsiteCloner();
      const siteStart = Date.now();

      try {
        console.log(`[START] ${site.url} (${site.category})`);

        const result = await Promise.race([
          cloner.clone({
            url: site.url,
            maxPages: 3,
            maxDepth: 2,
            captureAssets: true,
            timeout: TIMEOUT_MS - 5000,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
          )
        ]);

        const duration = Date.now() - siteStart;
        const testResult: TestResult = {
          url: site.url,
          category: site.category,
          status: result.success ? 'success' : 'failed',
          score: result.verification?.score,
          pagesCloned: result.pagesCaptured,
          duration,
          error: result.success ? undefined : (result.error || 'Unknown error'),
        };

        if (!result.success && result.error) {
          testResult.errorType = categorizeError(result.error);
          addError(errors, testResult.errorType, site.url);
        }

        const statusIcon = result.success ? '✓' : '✗';
        const scoreStr = result.verification?.score ? `${result.verification.score}%` : 'N/A';
        console.log(`[${statusIcon}] ${site.url} - Score: ${scoreStr}, Pages: ${result.pagesCaptured}, Time: ${(duration/1000).toFixed(1)}s`);

        return testResult;
      } catch (error: any) {
        const duration = Date.now() - siteStart;
        const errorMsg = error.message || String(error);
        const errorType = categorizeError(errorMsg);
        addError(errors, errorType, site.url);

        console.log(`[✗] ${site.url} - ERROR: ${errorMsg.substring(0, 50)}...`);

        return {
          url: site.url,
          category: site.category,
          status: errorMsg === 'TIMEOUT' ? 'timeout' : 'failed',
          duration,
          error: errorMsg,
          errorType,
        } as TestResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress summary
    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    console.log(`\nProgress: ${results.length}/${TEST_SITES.length} | ✓${successCount} ✗${failCount} ⏱${timeoutCount}`);
  }

  // Generate final report
  const totalDuration = Date.now() - startTime;
  await generateReport(results, errors, totalDuration);
}

function categorizeError(error: string): string {
  const lowerError = error.toLowerCase();

  if (lowerError.includes('timeout')) return 'TIMEOUT';
  if (lowerError.includes('enotfound') || lowerError.includes('dns')) return 'DNS_ERROR';
  if (lowerError.includes('econnrefused')) return 'CONNECTION_REFUSED';
  if (lowerError.includes('econnreset')) return 'CONNECTION_RESET';
  if (lowerError.includes('ssl') || lowerError.includes('cert')) return 'SSL_ERROR';
  if (lowerError.includes('403')) return 'FORBIDDEN_403';
  if (lowerError.includes('404')) return 'NOT_FOUND_404';
  if (lowerError.includes('429')) return 'RATE_LIMITED_429';
  if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503')) return 'SERVER_ERROR_5XX';
  if (lowerError.includes('bot') || lowerError.includes('captcha') || lowerError.includes('blocked')) return 'BOT_BLOCKED';
  if (lowerError.includes('javascript') || lowerError.includes('spa')) return 'JS_REQUIRED';
  if (lowerError.includes('login') || lowerError.includes('auth')) return 'AUTH_REQUIRED';
  if (lowerError.includes('memory') || lowerError.includes('heap')) return 'MEMORY_ERROR';
  if (lowerError.includes('navigation')) return 'NAVIGATION_ERROR';

  return 'OTHER';
}

function addError(errors: Map<string, string[]>, errorType: string, url: string): void {
  if (!errors.has(errorType)) {
    errors.set(errorType, []);
  }
  errors.get(errorType)!.push(url);
}

async function generateReport(results: TestResult[], errors: Map<string, string[]>, totalDuration: number): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('FINAL REPORT');
  console.log('='.repeat(80));

  // Overall stats
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  const timeoutCount = results.filter(r => r.status === 'timeout').length;
  const avgScore = results.filter(r => r.score).reduce((sum, r) => sum + r.score!, 0) /
                   results.filter(r => r.score).length || 0;
  const avgPages = results.filter(r => r.pagesCloned).reduce((sum, r) => sum + r.pagesCloned!, 0) /
                   results.filter(r => r.pagesCloned).length || 0;

  console.log(`\n📊 OVERALL STATISTICS:`);
  console.log(`   Total sites tested: ${results.length}`);
  console.log(`   Successful:         ${successCount} (${(successCount/results.length*100).toFixed(1)}%)`);
  console.log(`   Failed:             ${failCount} (${(failCount/results.length*100).toFixed(1)}%)`);
  console.log(`   Timeout:            ${timeoutCount} (${(timeoutCount/results.length*100).toFixed(1)}%)`);
  console.log(`   Average Score:      ${avgScore.toFixed(1)}%`);
  console.log(`   Average Pages:      ${avgPages.toFixed(1)}`);
  console.log(`   Total Duration:     ${(totalDuration/1000/60).toFixed(1)} minutes`);

  // By category
  console.log(`\n📁 BY CATEGORY:`);
  const categories = [...new Set(results.map(r => r.category))];
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catSuccess = catResults.filter(r => r.status === 'success').length;
    const catAvgScore = catResults.filter(r => r.score).reduce((sum, r) => sum + r.score!, 0) /
                        catResults.filter(r => r.score).length || 0;
    console.log(`   ${cat.padEnd(12)}: ${catSuccess}/${catResults.length} success, avg score: ${catAvgScore.toFixed(0)}%`);
  }

  // Error breakdown
  console.log(`\n🐛 ERROR BREAKDOWN:`);
  const sortedErrors = [...errors.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [errorType, urls] of sortedErrors) {
    console.log(`\n   ${errorType} (${urls.length} sites):`);
    urls.slice(0, 5).forEach(url => console.log(`      - ${url}`));
    if (urls.length > 5) {
      console.log(`      ... and ${urls.length - 5} more`);
    }
  }

  // Top performers (highest scores)
  console.log(`\n🏆 TOP 10 PERFORMERS:`);
  const topPerformers = results
    .filter(r => r.status === 'success' && r.score !== undefined)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);
  topPerformers.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.url} - ${r.score}% (${r.pagesCloned} pages)`);
  });

  // Worst performers (lowest scores but still success)
  console.log(`\n📉 NEEDS IMPROVEMENT (lowest successful scores):`);
  const worstPerformers = results
    .filter(r => r.status === 'success' && r.score !== undefined && r.score < 80)
    .sort((a, b) => (a.score || 100) - (b.score || 100))
    .slice(0, 10);
  if (worstPerformers.length > 0) {
    worstPerformers.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.url} - ${r.score}% (${r.pagesCloned} pages)`);
    });
  } else {
    console.log(`   All successful clones scored 80% or higher! 🎉`);
  }

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS FOR IMPROVEMENT:`);
  if (errors.has('TIMEOUT')) {
    console.log(`   - TIMEOUT issues: Consider increasing timeout or optimizing slow operations`);
  }
  if (errors.has('BOT_BLOCKED')) {
    console.log(`   - BOT_BLOCKED: Need better fingerprinting/evasion for blocked sites`);
  }
  if (errors.has('JS_REQUIRED')) {
    console.log(`   - JS_REQUIRED: Ensure Puppeteer is handling SPA sites correctly`);
  }
  if (errors.has('RATE_LIMITED_429')) {
    console.log(`   - RATE_LIMITED: Add request throttling/delays between requests`);
  }
  if (errors.has('SSL_ERROR')) {
    console.log(`   - SSL_ERROR: Review certificate handling and validation`);
  }
  if (errors.has('NAVIGATION_ERROR')) {
    console.log(`   - NAVIGATION_ERROR: Check page load detection and wait strategies`);
  }

  // Save detailed results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    summary: {
      total: results.length,
      success: successCount,
      failed: failCount,
      timeout: timeoutCount,
      avgScore,
      avgPages,
    },
    byCategory: categories.map(cat => ({
      category: cat,
      results: results.filter(r => r.category === cat),
    })),
    errors: Object.fromEntries(errors),
    allResults: results,
  };

  const fs = await import('fs');
  const reportPath = `./100-site-test-results-${Date.now()}.json`;
  await fs.promises.writeFile(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Full results saved to: ${reportPath}`);
  console.log('='.repeat(80));
}

// Run the test
runTest().catch(console.error);
