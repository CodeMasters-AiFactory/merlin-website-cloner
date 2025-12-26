/**
 * Clone test for formless.xyz
 */

import { WebsiteCloner } from '../services/websiteCloner';

async function cloneTemplate2() {
  console.log('='.repeat(60));
  console.log('CLONING: https://formless.xyz/');
  console.log('='.repeat(60));

  const outputDir = `./formless-test-${Date.now()}`;

  const cloner = new WebsiteCloner();

  // Let the pre-scanner auto-detect optimal settings
  const result = await cloner.clone({
    url: 'https://formless.xyz/',
    outputDir,
    maxPages: 20,
    maxAssets: 2000,
    respectRobots: false,
    deduplicateAssets: true,
    // No manual overrides - let pre-scan detect:
    // - concurrency (will auto-reduce for heavy JS sites)
    // - timeout (will auto-increase for slow sites)
    // - delayBetweenPages (will auto-add for complex sites)
    onProgress: (progress) => {
      if (progress.message) {
        console.log(`[${progress.status}] ${progress.message}`);
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  console.log(`\nScore: ${result.score}%`);
  console.log(`Pages cloned: ${result.pagesCloned}`);
  console.log(`Assets: ${result.assetsDownloaded}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Output: ${outputDir}`);

  if (result.verification) {
    console.log('\n--- VERIFICATION ---');
    console.log(`Links: ${result.verification.links?.working || 0}/${result.verification.links?.total || 0} working`);
    console.log(`Assets: ${result.verification.assets?.working || 0}/${result.verification.assets?.total || 0} working`);
  }
}

cloneTemplate2().catch(console.error);
