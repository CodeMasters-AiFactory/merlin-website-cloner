// Quick single site test
import { WebsiteCloner } from '../services/websiteCloner.js';

async function quickTest() {
  console.log('🎯 Quick Test: Cloudflare.com (EXTREME difficulty)');
  
  const cloner = new WebsiteCloner();
  const startTime = Date.now();
  
  try {
    const result = await cloner.clone({
      url: 'https://www.cloudflare.com',
      outputDir: `./quick-test-${Date.now()}`,
      maxPages: 3,
      timeout: 120000,
      javascript: true,
      waitForDynamic: true,
      respectRobots: false,
      maxConcurrency: 2,
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log(`   Pages: ${result.pagesCloned}`);
      console.log(`   Assets: ${result.assetsCaptured || 0}`);
      console.log(`   Duration: ${duration.toFixed(1)}s`);
      console.log(`   Errors: ${result.errors.length}`);
    } else {
      console.log('❌ FAILED');
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
    console.log('='.repeat(50));
    
  } catch (err) {
    console.log('💥 CRASH:', err);
  }
  
  process.exit(0);
}

quickTest();
