// Test the improved WebsiteCloner on jeton.com
import { WebsiteCloner } from '../services/websiteCloner.js';

async function testJeton() {
  console.log('='.repeat(60));
  console.log('JETON.COM TEST - Target: 95%+ Score');
  console.log('='.repeat(60));

  const cloner = new WebsiteCloner();
  const startTime = Date.now();
  const outputDir = `./jeton-test-${Date.now()}`;

  try {
    const result = await cloner.clone({
      url: 'https://www.jeton.com',
      outputDir,
      maxPages: 20,  // Clone more pages to reduce broken link percentage
      maxDepth: 3,
      timeout: 120000,
      javascript: true,
      waitForDynamic: true,
      respectRobots: false,
      maxConcurrency: 3,
      verifyAfterClone: true,
      useCache: false, // IMPORTANT: Disable cache to properly test link fixing
      onProgress: (progress) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] ${progress.status}: ${progress.message} (${progress.currentPage}/${progress.totalPages})`);
      }
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('RESULT:');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Pages cloned: ${result.pagesCloned}`);
    console.log(`Assets captured: ${result.assetsCaptured || 0}`);
    console.log(`Duration: ${duration.toFixed(1)}s`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\nFirst 5 errors:');
      result.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
    }

    if (result.verificationResult) {
      console.log('\n' + '='.repeat(60));
      console.log('VERIFICATION:');
      console.log('='.repeat(60));
      console.log(`Score: ${result.verificationResult.score}%`);
      console.log(`Summary: ${result.verificationResult.summary}`);
      console.log('\nChecks:');
      for (const check of result.verificationResult.checks) {
        const icon = check.passed ? '✓' : '✗';
        console.log(`  ${icon} [${check.category}] ${check.name}: ${check.message}`);
        if (check.details && check.details.length > 0) {
          check.details.slice(0, 3).forEach(d => console.log(`      ${d}`));
        }
      }
    }

    console.log(`\nOutput: ${outputDir}`);

  } catch (err) {
    console.log('FATAL ERROR:', err);
  }

  process.exit(0);
}

testJeton();
