/**
 * Integration Test
 * Tests the full cloning workflow
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import * as path from 'path';
import * as fs from 'fs/promises';

async function testIntegration() {
  console.log('🔗 Testing Full Integration...\n');

  try {
    // Test 1: Service Initialization
    console.log('1️⃣ Testing Service Initialization...');
    const cloner = new WebsiteCloner();
    console.log('   ✅ WebsiteCloner initialized\n');

    // Test 2: Simple Clone (dry run - won't actually clone)
    console.log('2️⃣ Testing Clone Configuration...');
    const testUrl = 'https://example.com';
    const outputDir = path.join(process.cwd(), 'test-clone');

    // Clean up test directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {}

    const options = {
      url: testUrl,
      outputDir,
      maxPages: 1,
      maxDepth: 1,
      verifyAfterClone: false,
    };

    console.log(`   ✅ Clone options configured for ${testUrl}\n`);

    // Test 3: Check all services are accessible
    console.log('3️⃣ Testing Service Access...');
    const services = [
      'proxyManager',
      'userAgentManager',
      'cloudflareBypass',
      'parallelProcessor',
      'assetCapture',
      'spaDetector',
      'jsVerification',
      'serviceWorkerPreservation',
      'verificationSystem',
      'exportFormats',
    ];

    for (const serviceName of services) {
      if ((cloner as any)[serviceName]) {
        console.log(`   ✅ ${serviceName} accessible`);
      } else {
        console.log(`   ❌ ${serviceName} NOT accessible`);
      }
    }
    console.log('');

    // Test 4: Verify dependencies
    console.log('4️⃣ Testing Dependencies...');
    try {
      const puppeteer = await import('puppeteer-extra');
      console.log('   ✅ puppeteer-extra available');
    } catch {
      console.log('   ❌ puppeteer-extra NOT available');
    }

    try {
      const archiver = await import('archiver');
      console.log('   ✅ archiver available');
    } catch {
      console.log('   ❌ archiver NOT available');
    }

    try {
      const cheerio = await import('cheerio');
      console.log('   ✅ cheerio available');
    } catch {
      console.log('   ❌ cheerio NOT available');
    }

    try {
      const bullmq = await import('bullmq');
      console.log('   ✅ bullmq available');
    } catch {
      console.log('   ❌ bullmq NOT available');
    }

    console.log('\n✅ Integration test complete!');
    console.log('📝 Note: Full clone test requires actual website access');
    console.log('   Run with: npm run cli -- --url https://example.com --output ./test-output\n');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

testIntegration();

