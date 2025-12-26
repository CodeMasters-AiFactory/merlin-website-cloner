/**
 * Top 10 US Accounting Firms Test
 * Testing Merlin cloner against major accounting firm websites
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
  rank: number;
  name: string;
  url: string;
  success: boolean;
  pagesCloned: number;
  assetsCaptured: number;
  duration: number;
  errors: string[];
}

// Top 10 US Accounting Firms by revenue (2024)
const TOP_10_ACCOUNTING_FIRMS = [
  { rank: 1, name: 'Deloitte', url: 'https://www2.deloitte.com/us/en.html' },
  { rank: 2, name: 'PwC (PricewaterhouseCoopers)', url: 'https://www.pwc.com/us/en.html' },
  { rank: 3, name: 'Ernst & Young (EY)', url: 'https://www.ey.com/en_us' },
  { rank: 4, name: 'KPMG', url: 'https://kpmg.com/us/en.html' },
  { rank: 5, name: 'RSM US', url: 'https://rsmus.com' },
  { rank: 6, name: 'Grant Thornton', url: 'https://www.grantthornton.com' },
  { rank: 7, name: 'BDO USA', url: 'https://www.bdo.com/en-us' },
  { rank: 8, name: 'CLA (CliftonLarsonAllen)', url: 'https://www.claconnect.com' },
  { rank: 9, name: 'Baker Tilly', url: 'https://www.bakertilly.com' },
  { rank: 10, name: 'Crowe', url: 'https://www.crowe.com' },
];

async function runAccountingFirmsTest(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('🏢 TOP 10 US ACCOUNTING FIRMS - MERLIN CLONE TEST');
  console.log('═'.repeat(60));
  console.log(`\nStarting test at: ${new Date().toISOString()}\n`);

  const cloner = new WebsiteCloner();
  const results: TestResult[] = [];
  const outputBaseDir = `./accounting-firms-test-${Date.now()}`;
  const overallStartTime = Date.now();

  for (const firm of TOP_10_ACCOUNTING_FIRMS) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`#${firm.rank} | ${firm.name}`);
    console.log(`URL: ${firm.url}`);
    console.log('─'.repeat(50));

    const startTime = Date.now();
    const outputDir = path.join(outputBaseDir, `${firm.rank}-${firm.name.replace(/[^a-zA-Z0-9]/g, '_')}`);

    try {
      const result = await cloner.clone({
        url: firm.url,
        outputDir,
        maxPages: 5,  // Clone up to 5 pages per site
        timeout: 120000,  // 2 minute timeout
        javascript: true,
        waitForDynamic: true,
        respectRobots: false,
        maxConcurrency: 3,
      });

      const duration = (Date.now() - startTime) / 1000;

      results.push({
        rank: firm.rank,
        name: firm.name,
        url: firm.url,
        success: result.success,
        pagesCloned: result.pagesCloned,
        assetsCaptured: result.assetsCaptured || 0,
        duration,
        errors: result.errors || [],
      });

      if (result.success) {
        console.log(`✅ SUCCESS`);
        console.log(`   📄 Pages: ${result.pagesCloned}`);
        console.log(`   🎨 Assets: ${result.assetsCaptured || 0}`);
        console.log(`   ⏱️  Duration: ${duration.toFixed(1)}s`);
      } else {
        console.log(`❌ FAILED`);
        console.log(`   Errors: ${result.errors?.join(', ') || 'Unknown error'}`);
        console.log(`   ⏱️  Duration: ${duration.toFixed(1)}s`);
      }

    } catch (err) {
      const duration = (Date.now() - startTime) / 1000;
      const errorMsg = err instanceof Error ? err.message : String(err);

      results.push({
        rank: firm.rank,
        name: firm.name,
        url: firm.url,
        success: false,
        pagesCloned: 0,
        assetsCaptured: 0,
        duration,
        errors: [errorMsg],
      });

      console.log(`💥 CRASH: ${errorMsg}`);
      console.log(`   ⏱️  Duration: ${duration.toFixed(1)}s`);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const totalDuration = (Date.now() - overallStartTime) / 1000;

  // Generate report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalPages = results.reduce((sum, r) => sum + r.pagesCloned, 0);
  const totalAssets = results.reduce((sum, r) => sum + r.assetsCaptured, 0);
  const successRate = (successful.length / results.length) * 100;

  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Sites Tested: ${results.length}`);
  console.log(`   ✅ Successful: ${successful.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   📊 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`   📄 Total Pages Cloned: ${totalPages}`);
  console.log(`   🎨 Total Assets Captured: ${totalAssets}`);
  console.log(`   ⏱️  Total Duration: ${totalDuration.toFixed(1)}s`);

  console.log(`\n${'─'.repeat(60)}`);
  console.log('DETAILED BREAKDOWN:');
  console.log('─'.repeat(60));

  console.log('\n| Rank | Firm | Status | Pages | Assets | Time |');
  console.log('|------|------|--------|-------|--------|------|');
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`| ${r.rank} | ${r.name.substring(0, 25).padEnd(25)} | ${status} | ${r.pagesCloned.toString().padStart(5)} | ${r.assetsCaptured.toString().padStart(6)} | ${r.duration.toFixed(1)}s |`);
  }

  if (failed.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log('❌ FAILED SITES:');
    console.log('─'.repeat(60));
    for (const r of failed) {
      console.log(`\n#${r.rank} ${r.name}`);
      console.log(`   URL: ${r.url}`);
      console.log(`   Errors: ${r.errors.join('; ')}`);
    }
  }

  // Save results to file
  const reportPath = path.join(outputBaseDir, 'test-report.json');
  await fs.mkdir(outputBaseDir, { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({
    testDate: new Date().toISOString(),
    totalDuration,
    summary: {
      totalSites: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate,
      totalPages,
      totalAssets,
    },
    results,
  }, null, 2));

  console.log(`\n📁 Results saved to: ${reportPath}`);
  console.log('\n' + '═'.repeat(60));
  console.log(`🏁 TEST COMPLETE - ${successRate.toFixed(1)}% Success Rate`);
  console.log('═'.repeat(60));

  process.exit(0);
}

runAccountingFirmsTest().catch(err => {
  console.error('Test failed to run:', err);
  process.exit(1);
});
