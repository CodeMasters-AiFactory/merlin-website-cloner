/**
 * Learning System Test
 * Demonstrates the self-improving learning agent
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import { getLearningAgent, shutdownLearningAgent } from '../services/learningSystem.js';

async function testLearningSystem() {
  console.log('='.repeat(60));
  console.log('MERLIN LEARNING SYSTEM TEST');
  console.log('='.repeat(60));
  console.log('');

  // First, let's see what the learning agent knows
  const agent = await getLearningAgent('./merlin-learning.json');

  console.log('CURRENT LEARNING STATE:');
  console.log(agent.getSummaryReport());
  console.log('');

  // Clone a site - this will trigger learning
  const cloner = new WebsiteCloner();
  const startTime = Date.now();

  console.log('Starting clone operation (learning enabled)...\n');

  const result = await cloner.clone({
    url: 'https://www.jeton.com',
    outputDir: `./learning-test-${Date.now()}`,
    maxPages: 5,
    maxDepth: 2,
    timeout: 120000,
    javascript: true,
    waitForDynamic: true,
    respectRobots: false,
    maxConcurrency: 2,
    verifyAfterClone: true,
    useCache: false,
    onProgress: (progress) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${elapsed}s] ${progress.status}: ${progress.message}`);
    }
  });

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('CLONE RESULT:');
  console.log('='.repeat(60));
  console.log(`Success: ${result.success}`);
  console.log(`Pages cloned: ${result.pagesCloned}`);
  console.log(`Assets captured: ${result.assetsCaptured || 0}`);
  console.log(`Duration: ${duration.toFixed(1)}s`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.verificationResult) {
    console.log(`Verification Score: ${result.verificationResult.score}%`);
  }

  // Now check what the learning agent learned
  console.log('\n' + '='.repeat(60));
  console.log('LEARNING RESULTS:');
  console.log('='.repeat(60));

  // Get fresh stats
  const learningReport = await cloner.getLearningReport();
  console.log(learningReport.report);

  // Show any rules that were generated
  if (learningReport.rules.length > 0) {
    console.log('\nGenerated Rules:');
    for (const rule of learningReport.rules) {
      console.log(`  - ${rule.name} (${rule.confidence}% confidence, ${rule.timesApplied} uses)`);
    }
  }

  // Shutdown learning agent to save data
  await shutdownLearningAgent();

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('The learning agent has analyzed this clone session and:');
  console.log('  1. Logged all issues encountered');
  console.log('  2. Generated rules based on patterns');
  console.log('  3. Saved learnings to ./merlin-learning.json');
  console.log('');
  console.log('On the next clone of the same or similar site,');
  console.log('the learning agent will:');
  console.log('  1. Predict issues before they happen');
  console.log('  2. Apply learned rules automatically');
  console.log('  3. Recommend optimal settings');
  console.log('');

  process.exit(0);
}

// Also test the learning system's prediction capabilities
async function testPredictions() {
  console.log('='.repeat(60));
  console.log('PREDICTION TEST');
  console.log('='.repeat(60));
  console.log('');

  const agent = await getLearningAgent('./merlin-learning.json');

  const testUrls = [
    'https://www.jeton.com',
    'https://www.cloudflare.com',
    'https://www.stripe.com',
    'https://www.example.com'
  ];

  for (const url of testUrls) {
    console.log(`\nPredictions for: ${url}`);
    const analysis = await agent.preCloneAnalysis(url);

    console.log(`  Confidence: ${analysis.confidence}%`);
    console.log(`  Applicable rules: ${analysis.applicableRules.length}`);

    if (analysis.predictedIssues.length > 0) {
      console.log('  Predicted issues:');
      for (const issue of analysis.predictedIssues) {
        console.log(`    - ${issue}`);
      }
    } else {
      console.log('  No predicted issues (not enough data)');
    }

    if (Object.keys(analysis.recommendedSettings).length > 0) {
      console.log('  Recommended settings:');
      console.log(`    ${JSON.stringify(analysis.recommendedSettings)}`);
    }
  }

  await shutdownLearningAgent();
  console.log('\n');
}

// Run tests
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--predictions')) {
    await testPredictions();
  } else {
    await testLearningSystem();
  }
}

main().catch(console.error);
