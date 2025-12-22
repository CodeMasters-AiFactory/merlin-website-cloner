#!/usr/bin/env node
/**
 * CLI Interface for Merlin Website Clone
 */

import { WebsiteCloner } from './services/websiteCloner.js';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Merlin Website Clone - Complete Offline Backup Solution

Usage:
  merlin-clone <url> [options]

Options:
  --output, -o <dir>        Output directory (default: ./clones/<hostname>)
  --max-pages, -p <num>      Maximum pages to clone (default: 100)
  --max-depth, -d <num>      Maximum crawl depth (default: 5)
  --concurrency, -c <num>    Concurrent requests (default: 10)
  --no-verify                Skip verification after clone
  --export <format>          Export format: zip, tar, mhtml, static (default: static)
  --help, -h                 Show this help message

Examples:
  merlin-clone https://example.com
  merlin-clone https://example.com --output ./my-backup --export zip
  merlin-clone https://example.com --max-pages 50 --max-depth 3
`);
    process.exit(0);
  }

  const url = args[0];
  const options: any = {
    url,
    outputDir: `./clones/${new URL(url).hostname}`,
    maxPages: 100,
    maxDepth: 5,
    concurrency: 10,
    verifyAfterClone: true,
    exportFormat: 'static'
  };

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--output':
      case '-o':
        if (next) {
          options.outputDir = path.resolve(next);
          i++;
        }
        break;
      case '--max-pages':
      case '-p':
        if (next) {
          options.maxPages = parseInt(next, 10);
          i++;
        }
        break;
      case '--max-depth':
      case '-d':
        if (next) {
          options.maxDepth = parseInt(next, 10);
          i++;
        }
        break;
      case '--concurrency':
      case '-c':
        if (next) {
          options.concurrency = parseInt(next, 10);
          i++;
        }
        break;
      case '--no-verify':
        options.verifyAfterClone = false;
        break;
      case '--export':
        if (next) {
          options.exportFormat = next;
          i++;
        }
        break;
    }
  }

  // Progress callback
  options.onProgress = (progress: any) => {
    const percentage = progress.totalPages > 0
      ? Math.round((progress.currentPage / progress.totalPages) * 100)
      : 0;
    
    console.log(`[${progress.status.toUpperCase()}] ${progress.message}`);
    if (progress.currentPage > 0) {
      console.log(`  Progress: ${progress.currentPage}/${progress.totalPages} (${percentage}%)`);
    }
    if (progress.currentUrl) {
      console.log(`  Current: ${progress.currentUrl}`);
    }
  };

  console.log('🚀 Starting website clone...');
  console.log(`📋 URL: ${url}`);
  console.log(`📁 Output: ${options.outputDir}`);
  console.log('');

  const cloner = new WebsiteCloner();
  
  try {
    const result = await cloner.clone(options);

    console.log('');
    console.log('✅ Clone completed!');
    console.log(`📄 Pages cloned: ${result.pagesCloned}`);
    console.log(`🎨 Assets captured: ${result.assetsCaptured}`);
    
    if (result.verificationResult) {
      console.log(`✓ Verification score: ${result.verificationResult.functionality.score.toFixed(1)}%`);
    }
    
    if (result.exportPath) {
      console.log(`📦 Export: ${result.exportPath}`);
    }
    
    console.log(`📂 Output directory: ${result.outputDir}`);
    console.log('');
    console.log('To serve the cloned site:');
    console.log(`  cd ${result.outputDir}`);
    console.log('  npm install && npm start');
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
  } catch (error) {
    console.error('❌ Clone failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);

