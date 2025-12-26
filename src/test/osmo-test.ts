// Test osmo.supply with learning system
import { WebsiteCloner } from '../services/websiteCloner.js';
import { getLearningAgent } from '../services/learningSystem.js';

async function testOsmo() {
  console.log('='.repeat(60));
  console.log('OSMO.SUPPLY TEST - Learning System Active');
  console.log('='.repeat(60));

  // Check pre-clone predictions
  const agent = await getLearningAgent('./merlin-learning.json');
  console.log('\n[Learning] Pre-clone analysis:');
  const analysis = await agent.preCloneAnalysis('https://www.osmo.supply');
  console.log('  Confidence:', analysis.confidence + '%');
  console.log('  Predicted issues:', analysis.predictedIssues.length);
  if (analysis.predictedIssues.length > 0) {
    analysis.predictedIssues.forEach(i => console.log('    -', i));
  }
  console.log('  Applicable rules:', analysis.applicableRules.length);
  if (Object.keys(analysis.recommendedSettings).length > 0) {
    console.log('  Recommended settings:', JSON.stringify(analysis.recommendedSettings));
  }

  const cloner = new WebsiteCloner();
  const startTime = Date.now();

  console.log('\nStarting clone...\n');

  const result = await cloner.clone({
    url: 'https://www.osmo.supply',
    outputDir: `./osmo-test-${Date.now()}`,
    maxPages: 10,
    maxDepth: 2,
    timeout: 120000,
    javascript: true,
    waitForDynamic: true,
    respectRobots: false,
    maxConcurrency: 3,
    verifyAfterClone: true,
    useCache: false,
    onProgress: (p) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] ${p.status}: ${p.message}`);
    }
  });

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('RESULT:');
  console.log('='.repeat(60));
  console.log(`  Score: ${result.verificationResult?.score}%`);
  console.log(`  Pages: ${result.pagesCloned}`);
  console.log(`  Assets: ${result.assetsCaptured}`);
  console.log(`  Duration: ${duration.toFixed(1)}s`);
  console.log(`  Errors: ${result.errors.length}`);

  // Check what learning system recorded
  const report = await cloner.getLearningReport();
  console.log('\n[Learning] After clone:');
  console.log(`  Total clones: ${report.stats.totalClones}`);
  console.log(`  Average score: ${report.stats.averageScore.toFixed(1)}%`);
  console.log(`  Successful (90%+): ${report.stats.successfulClones}`);
  console.log(`  Rules generated: ${report.stats.rulesGenerated}`);

  process.exit(0);
}

testOsmo().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
