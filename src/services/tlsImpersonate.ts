/**
 * TLS Impersonate Service
 * Integrates curl-impersonate for perfect TLS fingerprinting
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';

export interface TLSImpersonateOptions {
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge';
  version?: string;
  userAgent?: string;
}

/**
 * TLS Impersonate Service
 * Uses curl-impersonate to match exact browser TLS fingerprints
 */
export class TLSImpersonate {
  private curlImpersonatePath: string | null = null;
  private available: boolean = false;

  constructor() {
    this.detectCurlImpersonate().catch(() => {
      // curl-impersonate not available, will use fallback
    });
  }

  /**
   * Detects if curl-impersonate is available
   */
  private async detectCurlImpersonate(): Promise<void> {
    // Common paths for curl-impersonate
    const possiblePaths = [
      'curl-impersonate-chrome',
      'curl-impersonate-ff',
      'curl_impersonate',
      '/usr/local/bin/curl-impersonate-chrome',
      '/usr/bin/curl-impersonate-chrome',
      'C:\\curl-impersonate\\curl-impersonate-chrome.exe',
    ];

    for (const possiblePath of possiblePaths) {
      try {
        // Try to execute with --version to check if it exists
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        await execAsync(`${possiblePath} --version`, { timeout: 5000 });
        this.curlImpersonatePath = possiblePath;
        this.available = true;
        return;
      } catch (error) {
        // Not found, try next path
        continue;
      }
    }

    // curl-impersonate not found
    this.available = false;
  }

  /**
   * Checks if curl-impersonate is available
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Fetches a URL using curl-impersonate for perfect TLS fingerprinting
   */
  async fetchWithTLSImpersonate(
    url: string,
    options: TLSImpersonateOptions = {}
  ): Promise<{ body: Buffer; headers: Record<string, string>; status: number }> {
    if (!this.available || !this.curlImpersonatePath) {
      // Fallback to regular fetch
      const response = await fetch(url);
      const body = Buffer.from(await response.arrayBuffer());
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return {
        body,
        headers,
        status: response.status,
      };
    }

    // Determine which curl-impersonate binary to use
    const browser = options.browser || 'chrome';
    let binaryPath = this.curlImpersonatePath;
    
    if (browser === 'firefox') {
      binaryPath = this.curlImpersonatePath.replace('chrome', 'ff');
    }

    return new Promise((resolve, reject) => {
      const args: string[] = [
        url,
        '--compressed',
        '--location',
        '--silent',
        '--show-error',
      ];

      // Add user agent if provided
      if (options.userAgent) {
        args.push('--user-agent', options.userAgent);
      }

      const curl = spawn(binaryPath, args);
      const chunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      curl.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      curl.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      curl.on('close', (code) => {
        if (code !== 0) {
          const error = Buffer.concat(stderrChunks).toString();
          reject(new Error(`curl-impersonate failed: ${error}`));
          return;
        }

        const body = Buffer.concat(chunks);
        // Note: curl-impersonate doesn't provide headers in a parseable format
        // In a real implementation, we'd need to parse the output or use a different approach
        resolve({
          body,
          headers: {},
          status: 200, // Assume success if curl exits with 0
        });
      });

      curl.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Gets the appropriate curl-impersonate binary for a browser
   */
  getBinaryForBrowser(browser: string): string | null {
    if (!this.available || !this.curlImpersonatePath) {
      return null;
    }

    const browserLower = browser.toLowerCase();
    if (browserLower.includes('firefox')) {
      return this.curlImpersonatePath.replace('chrome', 'ff');
    }
    
    // Chrome, Edge, Safari all use chrome binary
    return this.curlImpersonatePath;
  }

  /**
   * Installs curl-impersonate (instructions for user)
   */
  static getInstallInstructions(): string {
    return `
curl-impersonate Installation Instructions:

Linux:
  wget https://github.com/lwthiker/curl-impersonate/releases/download/v0.6.2/curl-impersonate-v0.6.2.x86_64-linux-gnu.tar.gz
  tar -xzf curl-impersonate-v0.6.2.x86_64-linux-gnu.tar.gz
  sudo cp curl-impersonate-v0.6.2.x86_64-linux-gnu/curl-impersonate-chrome /usr/local/bin/
  sudo cp curl-impersonate-v0.6.2.x86_64-linux-gnu/curl-impersonate-ff /usr/local/bin/

macOS:
  brew install curl-impersonate

Windows:
  Download from: https://github.com/lwthiker/curl-impersonate/releases
  Extract and add to PATH

Note: curl-impersonate is optional. The system will work without it but with reduced TLS fingerprinting accuracy.
    `.trim();
  }
}

