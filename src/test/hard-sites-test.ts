/**
 * HARDCORE TEST - Most Difficult Sites to Clone
 */
import { WebsiteCloner } from '../services/websiteCloner.js';

const HARD_SITES = [
  'https://www.cloudflare.com',      // Cloudflare protected
  'https://www.amazon.com',          // Anti-bot
  'https://www.linkedin.com',        // Login walls
  'https://www.airbnb.com',          // React SPA
  'https://www.booking.com',         // Heavy anti-scrape
];

async function test() {
  const cloner = new WebsiteCloner();
  
  for (const url of HARD_SITES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 TESTING: ${url}`);
    console.log('='.repeat(60));
    
    const start = Date.now();
    try {
      const result = await cloner.clone({
        url,
        outputDir: `./hard-test/${new URL(url).hostname}`,
        maxPages: 2,
        timeout: 90000,
        javascript: true,
        waitForDynamic: true,
      });
      
      const time = ((Date.now() - start) / 1000).toFixed(1);
      
      if (result.success) {
        console.log(`✅ SUCCESS in ${time}s`);
        console.log(`   Pages: ${result.pagesCloned}`);
        console.log(`   Assets: ${result.assetsCaptured || 0}`);
      } else {
        console.log(`❌ FAILED in ${time}s`);
        console.log(`   Errors: ${result.errors?.slice(0,2).join(', ')}`);
      }
    } catch (err: any) {
      console.log(`💥 CRASH: ${err.message}`);
    }
  }
  
  console.log('\n✅ TEST COMPLETE\n');
  process.exit(0);
}

test();
