/**
 * Test the improved WebsiteCloner with animation capture
 */

import { WebsiteCloner } from './src/services/websiteCloner.js';
import * as fs from 'fs/promises';

async function main() {
  console.log('='.repeat(60));
  console.log('IMPROVED CLONER TEST - JETON.COM');
  console.log('='.repeat(60));

  // Clean output dir
  const outputDir = './test-improved-clone';
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
  } catch {}

  const cloner = new WebsiteCloner();
  const startTime = Date.now();

  try {
    const result = await cloner.clone({
      url: 'https://www.jeton.com',
      outputDir,
      maxPages: 5,
      maxDepth: 1,
      concurrency: 3, // Conservative concurrency
      verifyAfterClone: true,
      optimizeImages: false,
      captureScreenshots: true,
      onProgress: (progress) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] ${progress.status}: ${progress.message} (${progress.currentPage}/${progress.totalPages})`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('RESULT:');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Pages cloned: ${result.pagesCloned}`);
    console.log(`Assets captured: ${result.assetsCaptured}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }

    if (result.verificationResult) {
      console.log(`\n${'='.repeat(60)}`);
      console.log('VERIFICATION:');
      console.log('='.repeat(60));
      console.log(`Score: ${result.verificationResult.score}%`);
      console.log(`Summary: ${result.verificationResult.summary}`);
      console.log(`\nChecks:`);
      for (const check of result.verificationResult.checks) {
        const icon = check.passed ? '✓' : '✗';
        console.log(`  ${icon} [${check.category}] ${check.name}: ${check.message}`);
      }
    }

    console.log(`\nTime: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`\nOutput: ${outputDir}`);

  } catch (error) {
    console.error('FATAL ERROR:', error);
  }
}

main();
