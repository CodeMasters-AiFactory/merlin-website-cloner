/**
 * Test that learning is applied during pre-clone
 */

import { getLearningAgent } from '../services/learningSystem';

async function testLearningApplied() {
  console.log('=== TESTING IF LEARNING IS APPLIED ===\n');

  const agent = await getLearningAgent('./merlin-learning.json');

  // Test osmo.supply - should have learned settings
  console.log('Testing pre-clone analysis for osmo.supply:');
  const osmoAnalysis = await agent.preCloneAnalysis('https://www.osmo.supply');

  console.log('\n--- OSMO.SUPPLY ---');
  console.log('Confidence:', osmoAnalysis.confidence + '%');
  console.log('Applicable Rules:', osmoAnalysis.applicableRules.length);

  console.log('\nRecommended Settings:');
  console.log(JSON.stringify(osmoAnalysis.recommendedSettings, null, 2));

  console.log('\nPredictions:');
  for (const pred of osmoAnalysis.predictedIssues) {
    console.log('  -', pred);
  }

  // Test jeton.com
  console.log('\n--- JETON.COM ---');
  const jetonAnalysis = await agent.preCloneAnalysis('https://www.jeton.com');

  console.log('Confidence:', jetonAnalysis.confidence + '%');
  console.log('Applicable Rules:', jetonAnalysis.applicableRules.length);

  console.log('\nRecommended Settings:');
  console.log(JSON.stringify(jetonAnalysis.recommendedSettings, null, 2));

  console.log('\nPredictions:');
  for (const pred of jetonAnalysis.predictedIssues) {
    console.log('  -', pred);
  }

  // Test a NEW site - should have no specific rules but general learnings
  console.log('\n--- NEW SITE (google.com - no history) ---');
  const newAnalysis = await agent.preCloneAnalysis('https://www.google.com');

  console.log('Confidence:', newAnalysis.confidence + '%');
  console.log('Applicable Rules:', newAnalysis.applicableRules.length);
  console.log('Recommended Settings:', JSON.stringify(newAnalysis.recommendedSettings));

  await agent.shutdown();

  console.log('\n=== VERIFICATION ===');
  console.log(osmoAnalysis.recommendedSettings.maxPages === 31
    ? '✓ osmo.supply: maxPages correctly set to 31 (LEARNED!)'
    : '✗ osmo.supply: maxPages NOT applied correctly');

  console.log(osmoAnalysis.recommendedSettings.captureFonts === true
    ? '✓ osmo.supply: Font capture enabled (LEARNED!)'
    : '✗ osmo.supply: Font capture NOT enabled');

  console.log(jetonAnalysis.recommendedSettings.maxPages === 30
    ? '✓ jeton.com: maxPages correctly set to 30 (LEARNED!)'
    : '✗ jeton.com: maxPages NOT applied correctly');

  console.log(Object.keys(newAnalysis.recommendedSettings).length === 0
    ? '✓ google.com: No learned settings (as expected for new site)'
    : '○ google.com: Has some settings from pattern matching');
}

testLearningApplied().catch(console.error);
