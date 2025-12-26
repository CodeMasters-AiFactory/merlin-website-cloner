/**
 * ULTIMATE STRESS TEST - The World's Hardest Websites to Clone
 * If we can clone these, we can clone ANYTHING
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import fs from 'fs-extra';
import path from 'path';

interface TestResult {
  url: string;
  difficulty: string;
  success: boolean;
  pagesCloned: number;
  assetsCapured: number;
  errors: string[];
  duration: number;
  verificationScore?: number;
}

// THE HARDEST WEBSITES TO CLONE - Ordered by difficulty
const STRESS_TEST_SITES = [
  // LEVEL 1: Cloudflare Protected (You said we did this!)
  { url: 'https://www.cloudflare.com', difficulty: 'EXTREME - Cloudflare Protected', maxPages: 3 },
  
  // LEVEL 2: Heavy JavaScript SPAs
  { url: 'https://www.airbnb.com', difficulty: 'EXTREME - React SPA + Anti-bot', maxPages: 2 },
  { url: 'https://www.netflix.com', difficulty: 'EXTREME - Heavy JS + Auth walls', maxPages: 2 },
  
  // LEVEL 3: Anti-Bot Protection
  { url: 'https://www.amazon.com', difficulty: 'HARD - Anti-bot + Dynamic content', maxPages: 2 },
  { url: 'https://www.linkedin.com', difficulty: 'HARD - Login walls + Anti-scrape', maxPages: 2 },
  
  // LEVEL 4: Complex Dynamic Sites
  { url: 'https://www.nytimes.com', difficulty: 'MEDIUM - Paywall + Dynamic', maxPages: 3 },
  { url: 'https://www.github.com', difficulty: 'MEDIUM - Dynamic + API-heavy', maxPages: 3 },
  
  // LEVEL 5: Asset-Heavy Sites
  { url: 'https://www.apple.com', difficulty: 'MEDIUM - Asset heavy + Animations', maxPages: 3 },
  { url: 'https://www.dribbble.com', difficulty: 'MEDIUM - Image heavy', maxPages: 3 },
  
  // LEVEL 6: Standard but Complex
  { url: 'https://www.wikipedia.org', difficulty: 'STANDARD - Large content', maxPages: 5 },
];

async function runStressTest(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔥 ULTIMATE STRESS TEST - WORLD\'S HARDEST WEBSITES 🔥');
  console.log('='.repeat(80) + '\n');
  
  const cloner = new WebsiteCloner();
  const results: TestResult[] = [];
  const testDir = `./stress-test-results/${Date.now()}`;
  await fs.ensureDir(testDir);
  
  for (const site of STRESS_TEST_SITES) {
    console.log('\n' + '-'.repeat(60));
    console.log(`🎯 Testing: ${site.url}`);
    console.log(`   Difficulty: ${site.difficulty}`);
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    const outputDir = path.join(testDir, new URL(site.url).hostname);
    
    try {
      const result = await cloner.clone({
        url: site.url,
        outputDir,
        maxPages: site.maxPages,
        timeout: 60000, // 60 second timeout per site
        javascript: true,
        waitForDynamic: true,
        respectRobots: false, // For testing purposes
        maxConcurrency: 2,
      });
      
      const duration = (Date.now() - startTime) / 1000;
      
      const testResult: TestResult = {
        url: site.url,
        difficulty: site.difficulty,
        success: result.success,
        pagesCloned: result.pagesCloned,
        assetsCapured: result.assetsCaptured || 0,
        errors: result.errors,
        duration,
        verificationScore: result.verificationResult?.score,
      };
      
      results.push(testResult);
      
      // Print result
      if (result.success) {
        console.log(`✅ SUCCESS!`);
        console.log(`   Pages: ${result.pagesCloned} | Assets: ${result.assetsCaptured || 0}`);
        console.log(`   Duration: ${duration.toFixed(1)}s`);
        if (result.verificationResult) {
          console.log(`   Verification Score: ${result.verificationResult.score}%`);
        }
      } else {
        console.log(`❌ FAILED`);
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`💥 CRASHED: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      results.push({
        url: site.url,
        difficulty: site.difficulty,
        success: false,
        pagesCloned: 0,
        assetsCapured: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration,
      });
    }
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Generate Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 STRESS TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalPages = results.reduce((sum, r) => sum + r.pagesCloned, 0);
  const totalAssets = results.reduce((sum, r) => sum + r.assetsCapured, 0);
  
  console.log(`\n✅ PASSED: ${passed}/${results.length}`);
  console.log(`❌ FAILED: ${failed}/${results.length}`);
  console.log(`📄 Total Pages Cloned: ${totalPages}`);
  console.log(`🎨 Total Assets Captured: ${totalAssets}`);
  console.log(`\n${'─'.repeat(80)}`);
  
  // Detailed results table
  console.log('\n| Site | Difficulty | Result | Pages | Assets | Time |');
  console.log('|------|------------|--------|-------|--------|------|');
  
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    const domain = new URL(r.url).hostname.replace('www.', '');
    console.log(`| ${domain.padEnd(15)} | ${r.difficulty.substring(0, 20).padEnd(20)} | ${status} | ${r.pagesCloned.toString().padStart(3)} | ${r.assetsCapured.toString().padStart(4)} | ${r.duration.toFixed(1)}s |`);
  }
  
  // Save results to file
  const reportPath = path.join(testDir, 'STRESS_TEST_REPORT.json');
  await fs.writeJson(reportPath, {
    timestamp: new Date().toISOString(),
    summary: { passed, failed, totalPages, totalAssets },
    results,
  }, { spaces: 2 });
  
  console.log(`\n📁 Full report saved to: ${reportPath}`);
  
  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (passed === results.length) {
    console.log('🏆 PERFECT SCORE! ALL SITES CLONED SUCCESSFULLY!');
    console.log('🌍 MERLIN IS READY FOR WORLD DOMINATION!');
  } else if (passed >= results.length * 0.7) {
    console.log(`🎯 GOOD: ${passed}/${results.length} sites cloned`);
    console.log('📝 Some edge cases need work');
  } else {
    console.log(`⚠️  NEEDS WORK: Only ${passed}/${results.length} sites cloned`);
    console.log('🔧 Focus on failed sites');
  }
  console.log('='.repeat(80) + '\n');
}

// Run the test
runStressTest().catch(console.error);
