#!/usr/bin/env node
/**
 * Merlin P2P Proxy Node Runner
 *
 * Run this script to contribute your bandwidth to the Merlin network and earn credits!
 *
 * Usage:
 *   npx tsx src/sdk/run-proxy-node.ts --token YOUR_AUTH_TOKEN
 *
 * Options:
 *   --server     Server URL (default: http://localhost:3000)
 *   --token      Your authentication token (required)
 *   --port       Local proxy port (default: random)
 *   --bandwidth  Max bandwidth to share in Mbps (default: 10)
 */

import { startContributorNode } from './merlin-proxy-sdk.js';

// Parse command line arguments
function parseArgs(): { server: string; token: string; port: number; bandwidth: number } {
  const args = process.argv.slice(2);
  const config = {
    server: 'http://localhost:3000',
    token: '',
    port: 0,
    bandwidth: 10,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--server':
        config.server = args[++i];
        break;
      case '--token':
        config.token = args[++i];
        break;
      case '--port':
        config.port = parseInt(args[++i]);
        break;
      case '--bandwidth':
        config.bandwidth = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
Merlin P2P Proxy Node

Contribute your bandwidth and earn credits!

Usage:
  npx tsx src/sdk/run-proxy-node.ts --token YOUR_AUTH_TOKEN

Options:
  --server     Server URL (default: http://localhost:3000)
  --token      Your authentication token (required)
  --port       Local proxy port (default: random)
  --bandwidth  Max bandwidth in Mbps (default: 10)
  --help       Show this help message

Example:
  npx tsx src/sdk/run-proxy-node.ts --server https://api.merlin.io --token abc123 --bandwidth 20
        `);
        process.exit(0);
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();

  if (!config.token) {
    console.error('❌ Error: --token is required');
    console.error('');
    console.error('Get your token by:');
    console.error('1. Log in to Merlin at http://localhost:5000');
    console.error('2. Go to Settings > API Tokens');
    console.error('3. Generate a new token');
    console.error('');
    console.error('Usage: npx tsx src/sdk/run-proxy-node.ts --token YOUR_TOKEN');
    process.exit(1);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    MERLIN P2P PROXY NETWORK              ║');
  console.log('║    Contributing bandwidth = Earning $$$  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Connecting to ${config.server}...`);
  console.log(`📊 Max bandwidth: ${config.bandwidth} Mbps`);
  console.log('');

  try {
    const sdk = await startContributorNode({
      serverUrl: config.server,
      authToken: config.token,
      port: config.port,
      maxBandwidth: config.bandwidth,
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('');
      console.log('🛑 Shutting down...');
      await sdk.stop();
      console.log('👋 Goodbye! Thanks for contributing!');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await sdk.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
