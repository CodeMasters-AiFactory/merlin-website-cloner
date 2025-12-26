// Test to validate URL rewriting and link fixing improvements
import { WebsiteCloner } from '../services/websiteCloner.js';
import { verifyClone } from '../services/cloneVerifier.js';
import fs from 'fs-extra';

async function validateFixes() {
  console.log('🔧 Validating Cloner Fixes\n');
  console.log('Testing URL rewriting and link verification improvements...\n');

  // Test site: A real site with internal links to test our fixes
  const testUrl = 'https://osmo.supply';
  const outputDir = `./validate-fixes-${Date.now()}`;

  const cloner = new WebsiteCloner();
  const startTime = Date.now();

  try {
    console.log(`📥 Cloning ${testUrl}...`);

    const result = await cloner.clone({
      url: testUrl,
      outputDir,
      maxPages: 3,
      timeout: 90000,
      javascript: true,
      waitForDynamic: true,
      respectRobots: false,
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log('\n📊 Clone Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Pages: ${result.pagesCloned}`);
    console.log(`   Duration: ${duration.toFixed(1)}s`);

    if (result.success) {
      console.log('\n🔍 Running verification...');
      const verification = await verifyClone(outputDir, testUrl);

      console.log('\n📋 Verification Result:');
      console.log(`   Score: ${verification.score}%`);
      console.log(`   Passed: ${verification.passed}`);
      console.log(`   Summary: ${verification.summary}`);

      if (verification.checks) {
        console.log('\n   Checks:');
        for (const check of verification.checks) {
          const icon = check.passed ? '✅' : '❌';
          console.log(`   ${icon} ${check.name}: ${check.message}`);
          if (check.details && check.details.length > 0) {
            for (const detail of check.details.slice(0, 5)) {
              console.log(`      ${detail}`);
            }
          }
        }
      }

      // Check for internal links specifically
      const linkCheck = verification.checks?.find(c => c.name === 'Internal Links');
      if (linkCheck) {
        console.log('\n🔗 Link Check Details:');
        console.log(`   ${linkCheck.message}`);
        if (linkCheck.passed) {
          console.log('   ✅ Link verification PASSED');
        } else {
          console.log('   ❌ Link verification FAILED');
        }
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await fs.remove(outputDir);
    console.log('   Done!');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Validation Complete');
    console.log('='.repeat(50));

  } catch (err) {
    console.log('💥 Error:', err);
    // Cleanup on error too
    try {
      await fs.remove(outputDir);
    } catch {}
  }

  process.exit(0);
}

validateFixes();
