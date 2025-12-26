/**
 * PROVE LEARNING WORKS
 * Clone osmo.supply again - should use learned maxPages: 31 and get higher score
 */

import { WebsiteCloner } from '../services/websiteCloner';
import * as fs from 'fs/promises';
import * as path from 'path';

async function proveLeraningWorks() {
  console.log('='.repeat(60));
  console.log('PROVING THE LEARNING SYSTEM WORKS');
  console.log('='.repeat(60));
  console.log('\nPrevious osmo.supply scores: 90%, 90% (with maxPages: 10)');
  console.log('Expected: Higher score with learned maxPages: 31\n');

  const outputDir = `./osmo-learning-test-${Date.now()}`;

  const cloner = new WebsiteCloner();

  console.log('Starting clone with LEARNING ENABLED...\n');

  const result = await cloner.clone({
    url: 'https://www.osmo.supply',
    outputDir,
    maxPages: 10,  // Default - should be OVERRIDDEN by learning to 31
    maxAssets: 2000,
    timeout: 120000,
    respectRobots: false,
    deduplicateAssets: true,
    onProgress: (progress) => {
      if (progress.message) {
        // Only show important messages
        if (progress.message.includes('Learning') ||
            progress.message.includes('maxPages') ||
            progress.message.includes('Score') ||
            progress.message.includes('Complete')) {
          console.log(`[${progress.status}] ${progress.message}`);
        }
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  console.log(`\nScore: ${result.score}%`);
  console.log(`Pages cloned: ${result.pagesCloned}`);
  console.log(`Assets: ${result.assetsDownloaded}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);

  // Read the learning database to see what happened
  const dbPath = './merlin-learning.json';
  const dbData = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
  const latestSession = dbData.sessions[dbData.sessions.length - 1];

  console.log('\n--- LEARNING ANALYSIS ---');
  console.log(`Total sessions now: ${dbData.sessions.length}`);
  console.log(`Average score: ${dbData.stats.averageScore.toFixed(1)}%`);
  console.log(`Rules in database: ${dbData.rules.length}`);

  // Check if maxPages was applied
  if (result.pagesCloned > 13) {
    console.log(`\n✓ SUCCESS: Cloned ${result.pagesCloned} pages (was 13 before)`);
    console.log('  Learning system correctly increased maxPages!');
  } else {
    console.log(`\n⚠ Pages cloned: ${result.pagesCloned}`);
  }

  // Compare to previous
  const previousScores = dbData.sessions
    .filter((s: any) => s.domain === 'www.osmo.supply')
    .slice(0, -1)  // Exclude this one
    .map((s: any) => s.finalScore);

  const avgPrevious = previousScores.reduce((a: number, b: number) => a + b, 0) / previousScores.length;

  console.log(`\nPrevious average: ${avgPrevious.toFixed(1)}%`);
  console.log(`This clone: ${result.score}%`);
  console.log(`Improvement: ${result.score > avgPrevious ? '+' : ''}${(result.score - avgPrevious).toFixed(1)}%`);

  if (result.score > avgPrevious) {
    console.log('\n✓✓✓ LEARNING SYSTEM IS WORKING! ✓✓✓');
  }

  // Show verification results
  if (result.verification) {
    console.log('\n--- VERIFICATION BREAKDOWN ---');
    console.log(`Links: ${result.verification.links?.working || 0}/${result.verification.links?.total || 0} working`);
    console.log(`Assets: ${result.verification.assets?.working || 0}/${result.verification.assets?.total || 0} working`);
  }

  await cloner.cleanup();
}

proveLeraningWorks().catch(console.error);
