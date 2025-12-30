/**
 * Test the simple cloner
 */

import { SimpleCloner } from './src/services/simpleCloner.js';

async function main() {
  console.log('='.repeat(60));
  console.log('SIMPLE CLONER TEST');
  console.log('='.repeat(60));

  const cloner = new SimpleCloner();

  const startTime = Date.now();

  const result = await cloner.clone({
    url: 'https://www.jeton.com',
    outputDir: './test-simple-clone',
    maxPages: 5,
    maxDepth: 1,
    onProgress: (msg) => console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] ${msg}`),
  });

  console.log('\n' + '='.repeat(60));
  console.log('RESULT:');
  console.log('='.repeat(60));
  console.log(`Success: ${result.success}`);
  console.log(`Pages cloned: ${result.pagesCloned}`);
  console.log(`Assets downloaded: ${result.assetsDownloaded}`);
  console.log(`Errors: ${result.errors.length}`);
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log(`\nTime: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('\nOpen ./test-simple-clone/index.html to view the result');
}

main().catch(console.error);
