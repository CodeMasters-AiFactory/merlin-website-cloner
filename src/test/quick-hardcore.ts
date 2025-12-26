/**
 * QUICK HARDCORE TEST - Test top 5 hardest sites
 */
import { WebsiteCloner } from '../services/websiteCloner.js';

const SITES = [
  { url: 'https://www.cloudflare.com', name: 'Cloudflare (Anti-Bot King)' },
  { url: 'https://www.amazon.com', name: 'Amazon (Heavy Protection)' },
  { url: 'https://www.booking.com', name: 'Booking.com (Anti-Scrape)' },
  { url: 'https://www.airbnb.com', name: 'Airbnb (React SPA)' },
  { url: 'https://www.netflix.com', name: 'Netflix (Heavy JS)' },
];

async function quickTest() {
  console.log('\n🔥🔥🔥 MERLIN HARDCORE TEST 🔥🔥🔥\n');
  
  const cloner = new WebsiteCloner();
  const results: any[] = [];
  
  for (const site of SITES) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🎯 ${site.name}`);
    console.log(`   ${site.url}`);
    console.log('─'.repeat(50));
    
    const start = Date.now();
    try {
      const result = await cloner.clone({
        url: site.url,
        outputDir: `./hardcore-test/${new URL(site.url).hostname}`,
        maxPages: 1, // Just 1 page for quick test
        timeout: 60000,
        javascript: true,
        waitForDynamic: true,
      });
      
      const secs = ((Date.now() - start) / 1000).toFixed(1);
      const status = result.success ? '✅ CLONED' : '❌ FAILED';
      
      console.log(`\n   ${status} in ${secs}s`);
      console.log(`   Pages: ${result.pagesCloned} | Assets: ${result.assetsCaptured || 0}`);
      if (result.errors?.length) console.log(`   Errors: ${result.errors.slice(0,2).join(', ')}`);
      
      results.push({ site: site.name, success: result.success, time: secs, pages: result.pagesCloned, assets: result.assetsCaptured });
    } catch (err: any) {
      console.log(`\n   💥 CRASH: ${err.message?.slice(0,80)}`);
      results.push({ site: site.name, success: false, error: err.message?.slice(0,50) });
    }
  }
  
  // SUMMARY
  console.log('\n' + '═'.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  console.log(`\n✅ PASSED: ${passed}/${results.length}`);
  console.log(`❌ FAILED: ${results.length - passed}/${results.length}\n`);
  
  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.site}`);
  }
  
  if (passed === results.length) {
    console.log('\n🏆 PERFECT! MERLIN CAN CLONE ANYTHING! 🏆\n');
  } else if (passed >= 3) {
    console.log('\n🎯 GOOD - Most hard sites cloned!\n');
  } else {
    console.log('\n⚠️  Needs improvement\n');
  }
  
  process.exit(0);
}

quickTest();
