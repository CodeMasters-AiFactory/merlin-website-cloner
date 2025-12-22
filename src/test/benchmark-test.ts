/**
 * Benchmark Testing
 * Performance benchmarks and comparisons
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface BenchmarkResult {
  testName: string;
  url: string;
  iterations: number;
  results: Array<{
    pagesCloned: number;
    assetsCaptured: number;
    duration: number;
    memoryUsage: number;
  }>;
  averages: {
    pagesCloned: number;
    assetsCaptured: number;
    duration: number;
    memoryUsage: number;
    pagesPerSecond: number;
    assetsPerSecond: number;
  };
  min: {
    duration: number;
    memoryUsage: number;
  };
  max: {
    duration: number;
    memoryUsage: number;
  };
}

export class BenchmarkTester {
  private cloner: WebsiteCloner;
  private results: BenchmarkResult[] = [];
  private outputDir: string;

  constructor(outputDir: string = './benchmark-results') {
    this.cloner = new WebsiteCloner();
    this.outputDir = outputDir;
  }

  async runBenchmarks(): Promise<void> {
    console.log('🏃 Starting Benchmark Tests...\n');

    const benchmarks = [
      {
        name: 'Small Site (10 pages)',
        url: 'https://example.com',
        iterations: 5,
        maxPages: 10,
      },
      {
        name: 'Medium Site (50 pages)',
        url: 'https://www.w3.org',
        iterations: 3,
        maxPages: 50,
      },
      {
        name: 'Large Site (100 pages)',
        url: 'https://developer.mozilla.org',
        iterations: 2,
        maxPages: 100,
      },
    ];

    for (const benchmark of benchmarks) {
      await this.runBenchmark(benchmark.name, benchmark.url, benchmark.iterations, benchmark.maxPages);
    }

    await this.generateReport();
  }

  private async runBenchmark(
    testName: string,
    url: string,
    iterations: number,
    maxPages: number
  ): Promise<void> {
    console.log(`\n📊 Benchmark: ${testName}`);
    console.log(`   URL: ${url}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Max Pages: ${maxPages}\n`);

    const iterationResults: BenchmarkResult['results'] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`  Iteration ${i + 1}/${iterations}...`);

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const testOutputDir = path.join(this.outputDir, 'clones', `${this.sanitizeUrl(url)}-${i}`);

      try {
        const result = await this.cloner.clone({
          url,
          outputDir: testOutputDir,
          maxPages,
          maxDepth: 3,
          concurrency: 5,
          useCache: false, // Don't use cache for fair benchmarking
        });

        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        const duration = endTime - startTime;
        const memoryUsage = endMemory - startMemory;

        iterationResults.push({
          pagesCloned: result.pagesCloned,
          assetsCaptured: result.assetsCaptured,
          duration,
          memoryUsage: memoryUsage / 1024 / 1024, // MB
        });

        console.log(`    ✅ Pages: ${result.pagesCloned}, Assets: ${result.assetsCaptured}, Time: ${(duration / 1000).toFixed(2)}s, Memory: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);

      } catch (error) {
        console.log(`    ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Cleanup and delay between iterations
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Calculate statistics
    const totalPages = iterationResults.reduce((sum, r) => sum + r.pagesCloned, 0);
    const totalAssets = iterationResults.reduce((sum, r) => sum + r.assetsCaptured, 0);
    const totalDuration = iterationResults.reduce((sum, r) => sum + r.duration, 0);
    const totalMemory = iterationResults.reduce((sum, r) => sum + r.memoryUsage, 0);

    const avgPages = totalPages / iterationResults.length;
    const avgAssets = totalAssets / iterationResults.length;
    const avgDuration = totalDuration / iterationResults.length;
    const avgMemory = totalMemory / iterationResults.length;

    const pagesPerSecond = (avgPages / avgDuration) * 1000;
    const assetsPerSecond = (avgAssets / avgDuration) * 1000;

    const minDuration = Math.min(...iterationResults.map(r => r.duration));
    const maxDuration = Math.max(...iterationResults.map(r => r.duration));
    const minMemory = Math.min(...iterationResults.map(r => r.memoryUsage));
    const maxMemory = Math.max(...iterationResults.map(r => r.memoryUsage));

    const benchmarkResult: BenchmarkResult = {
      testName,
      url,
      iterations,
      results: iterationResults,
      averages: {
        pagesCloned: avgPages,
        assetsCaptured: avgAssets,
        duration: avgDuration,
        memoryUsage: avgMemory,
        pagesPerSecond,
        assetsPerSecond,
      },
      min: {
        duration: minDuration,
        memoryUsage: minMemory,
      },
      max: {
        duration: maxDuration,
        memoryUsage: maxMemory,
      },
    };

    this.results.push(benchmarkResult);
  }

  private async generateReport(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const reportPath = path.join(this.outputDir, 'benchmark-report.md');
    const jsonPath = path.join(this.outputDir, 'benchmark-results.json');

    const report = `# Benchmark Test Report

**Generated:** ${new Date().toISOString()}

## Summary

${this.results.map(result => `
### ${result.testName}

- **URL:** ${result.url}
- **Iterations:** ${result.iterations}
- **Average Pages Cloned:** ${result.averages.pagesCloned.toFixed(2)}
- **Average Assets Captured:** ${result.averages.assetsCaptured.toFixed(2)}
- **Average Duration:** ${(result.averages.duration / 1000).toFixed(2)}s
- **Average Memory Usage:** ${result.averages.memoryUsage.toFixed(2)}MB
- **Pages per Second:** ${result.averages.pagesPerSecond.toFixed(2)}
- **Assets per Second:** ${result.averages.assetsPerSecond.toFixed(2)}
- **Duration Range:** ${(result.min.duration / 1000).toFixed(2)}s - ${(result.max.duration / 1000).toFixed(2)}s
- **Memory Range:** ${result.min.memoryUsage.toFixed(2)}MB - ${result.max.memoryUsage.toFixed(2)}MB

#### Iteration Details

${result.results.map((r, i) => `
**Iteration ${i + 1}:**
- Pages: ${r.pagesCloned}
- Assets: ${r.assetsCaptured}
- Duration: ${(r.duration / 1000).toFixed(2)}s
- Memory: ${r.memoryUsage.toFixed(2)}MB
`).join('\n')}
`).join('\n')}

## Performance Comparison

${this.generateComparison()}

## Recommendations

${this.generateRecommendations()}
`;

    await fs.writeFile(reportPath, report, 'utf-8');
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2), 'utf-8');

    console.log(`\n📊 Benchmark Report Generated:`);
    console.log(`   Markdown: ${reportPath}`);
    console.log(`   JSON: ${jsonPath}`);
  }

  private generateComparison(): string {
    if (this.results.length < 2) {
      return 'Not enough benchmarks for comparison.';
    }

    const comparisons: string[] = [];

    for (let i = 0; i < this.results.length - 1; i++) {
      const current = this.results[i];
      const next = this.results[i + 1];

      const speedDiff = ((next.averages.pagesPerSecond - current.averages.pagesPerSecond) / current.averages.pagesPerSecond) * 100;
      const memoryDiff = ((next.averages.memoryUsage - current.averages.memoryUsage) / current.averages.memoryUsage) * 100;

      comparisons.push(`
**${current.testName} vs ${next.testName}:**
- Speed: ${speedDiff > 0 ? '+' : ''}${speedDiff.toFixed(2)}% ${speedDiff > 0 ? 'faster' : 'slower'}
- Memory: ${memoryDiff > 0 ? '+' : ''}${memoryDiff.toFixed(2)}% ${memoryDiff > 0 ? 'more' : 'less'}
`);
    }

    return comparisons.join('\n');
  }

  private generateRecommendations(): string {
    const recommendations: string[] = [];

    const avgPagesPerSecond = this.results.reduce((sum, r) => sum + r.averages.pagesPerSecond, 0) / this.results.length;
    const avgMemory = this.results.reduce((sum, r) => sum + r.averages.memoryUsage, 0) / this.results.length;

    if (avgPagesPerSecond < 1) {
      recommendations.push('- Consider increasing concurrency for better throughput');
    }

    if (avgMemory > 500) {
      recommendations.push('- Memory usage is high, consider using distributed scraping or reducing concurrency');
    }

    const variance = this.results.map(r => {
      const durations = r.results.map(i => i.duration);
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
      return Math.sqrt(variance) / avg; // Coefficient of variation
    });

    const highVariance = variance.some(v => v > 0.2);
    if (highVariance) {
      recommendations.push('- High variance in performance, investigate bottlenecks');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- Performance is optimal!';
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new BenchmarkTester();
  tester.runBenchmarks().catch(console.error);
}

