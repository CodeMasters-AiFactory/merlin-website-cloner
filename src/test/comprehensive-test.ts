/**
 * Comprehensive Testing Suite
 * Tests on 100+ diverse websites and benchmarks performance
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
  url: string;
  category: string;
  success: boolean;
  pagesCloned: number;
  assetsCaptured: number;
  duration: number;
  errors: string[];
  verificationScore?: number;
  performance: {
    pagesPerSecond: number;
    assetsPerSecond: number;
    averagePageTime: number;
  };
}

interface TestCategory {
  name: string;
  websites: string[];
  expectedSuccessRate: number;
}

const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'Simple Static Sites',
    websites: [
      'https://example.com',
      'https://www.w3.org',
      'https://www.iana.org',
      'https://www.icann.org',
      'https://www.rfc-editor.org',
      'https://www.ietf.org',
      'https://www.w3schools.com',
      'https://www.html5rocks.com',
      'https://www.css-tricks.com',
      'https://www.smashingmagazine.com',
    ],
    expectedSuccessRate: 0.95,
  },
  {
    name: 'E-commerce Sites',
    websites: [
      'https://www.amazon.com',
      'https://www.ebay.com',
      'https://www.etsy.com',
      'https://www.shopify.com',
      'https://www.bigcommerce.com',
      'https://www.woocommerce.com',
      'https://www.magento.com',
      'https://www.prestashop.com',
      'https://www.opencart.com',
      'https://www.squarespace.com',
    ],
    expectedSuccessRate: 0.80,
  },
  {
    name: 'News & Media',
    websites: [
      'https://www.bbc.com',
      'https://www.cnn.com',
      'https://www.reuters.com',
      'https://www.theguardian.com',
      'https://www.nytimes.com',
      'https://www.washingtonpost.com',
      'https://www.wsj.com',
      'https://www.forbes.com',
      'https://www.bloomberg.com',
      'https://www.techcrunch.com',
    ],
    expectedSuccessRate: 0.85,
  },
  {
    name: 'Social Media',
    websites: [
      'https://www.twitter.com',
      'https://www.facebook.com',
      'https://www.linkedin.com',
      'https://www.reddit.com',
      'https://www.instagram.com',
      'https://www.pinterest.com',
      'https://www.tumblr.com',
      'https://www.discord.com',
      'https://www.slack.com',
      'https://www.telegram.org',
    ],
    expectedSuccessRate: 0.70,
  },
  {
    name: 'SPA Frameworks',
    websites: [
      'https://react.dev',
      'https://vuejs.org',
      'https://angular.io',
      'https://nextjs.org',
      'https://nuxt.com',
      'https://svelte.dev',
      'https://www.gatsbyjs.com',
      'https://remix.run',
      'https://www.astro.build',
      'https://www.solidjs.com',
    ],
    expectedSuccessRate: 0.90,
  },
  {
    name: 'Documentation Sites',
    websites: [
      'https://docs.python.org',
      'https://developer.mozilla.org',
      'https://docs.microsoft.com',
      'https://docs.github.com',
      'https://docs.docker.com',
      'https://kubernetes.io/docs',
      'https://www.postgresql.org/docs',
      'https://www.mongodb.com/docs',
      'https://redis.io/docs',
      'https://nodejs.org/docs',
    ],
    expectedSuccessRate: 0.95,
  },
  {
    name: 'Blog Platforms',
    websites: [
      'https://www.wordpress.com',
      'https://www.medium.com',
      'https://www.dev.to',
      'https://www.hashnode.com',
      'https://www.ghost.org',
      'https://www.jekyllrb.com',
      'https://www.hugo.io',
      'https://www.gohugo.io',
      'https://www.11ty.dev',
      'https://www.docusaurus.io',
    ],
    expectedSuccessRate: 0.85,
  },
  {
    name: 'Cloudflare Protected',
    websites: [
      'https://www.cloudflare.com',
      'https://www.discord.com',
      'https://www.npmjs.com',
      'https://www.github.com',
      'https://www.gitlab.com',
      'https://www.bitbucket.org',
      'https://www.digitalocean.com',
      'https://www.linode.com',
      'https://www.vultr.com',
      'https://www.hetzner.com',
    ],
    expectedSuccessRate: 0.75,
  },
  {
    name: 'Government Sites',
    websites: [
      'https://www.gov.uk',
      'https://www.usa.gov',
      'https://www.canada.ca',
      'https://www.gov.au',
      'https://www.gov.ie',
      'https://www.govt.nz',
      'https://www.europa.eu',
      'https://www.un.org',
      'https://www.who.int',
      'https://www.unesco.org',
    ],
    expectedSuccessRate: 0.90,
  },
  {
    name: 'Educational',
    websites: [
      'https://www.khanacademy.org',
      'https://www.coursera.org',
      'https://www.edx.org',
      'https://www.udemy.com',
      'https://www.pluralsight.com',
      'https://www.codecademy.com',
      'https://www.freecodecamp.org',
      'https://www.theodinproject.com',
      'https://www.scrimba.com',
      'https://www.sololearn.com',
    ],
    expectedSuccessRate: 0.85,
  },
  {
    name: 'Portfolio Sites',
    websites: [
      'https://www.behance.net',
      'https://www.dribbble.com',
      'https://www.artstation.com',
      'https://www.deviantart.com',
      'https://www.flickr.com',
      'https://www.500px.com',
      'https://www.unsplash.com',
      'https://www.pexels.com',
      'https://www.pixabay.com',
      'https://www.shutterstock.com',
    ],
    expectedSuccessRate: 0.80,
  },
];

export class ComprehensiveTester {
  private cloner: WebsiteCloner;
  private results: TestResult[] = [];
  private outputDir: string;

  constructor(outputDir: string = './test-results') {
    this.cloner = new WebsiteCloner();
    this.outputDir = outputDir;
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Testing Suite...\n');
    console.log(`Testing ${TEST_CATEGORIES.reduce((sum, cat) => sum + cat.websites.length, 0)} websites across ${TEST_CATEGORIES.length} categories\n`);

    const startTime = Date.now();

    for (const category of TEST_CATEGORIES) {
      console.log(`\n📁 Testing Category: ${category.name}`);
      console.log(`   Expected Success Rate: ${(category.expectedSuccessRate * 100).toFixed(0)}%`);
      console.log(`   Websites: ${category.websites.length}\n`);

      for (const url of category.websites) {
        await this.testWebsite(url, category.name);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const totalDuration = Date.now() - startTime;
    await this.generateReport(totalDuration);
  }

  private async testWebsite(url: string, category: string): Promise<void> {
    const startTime = Date.now();
    const testOutputDir = path.join(this.outputDir, 'clones', this.sanitizeUrl(url));

    console.log(`  Testing: ${url}`);

    try {
      const result = await this.cloner.clone({
        url,
        outputDir: testOutputDir,
        maxPages: 10, // Limit for testing
        maxDepth: 2,
        concurrency: 3,
        verifyAfterClone: true,
        useCache: false, // Don't use cache for testing
      });

      const duration = Date.now() - startTime;
      const pagesPerSecond = result.pagesCloned / (duration / 1000);
      const assetsPerSecond = result.assetsCaptured / (duration / 1000);
      const averagePageTime = result.pagesCloned > 0 ? duration / result.pagesCloned : 0;

      const testResult: TestResult = {
        url,
        category,
        success: result.success,
        pagesCloned: result.pagesCloned,
        assetsCaptured: result.assetsCaptured,
        duration,
        errors: result.errors,
        verificationScore: result.verificationResult?.functionality?.score,
        performance: {
          pagesPerSecond,
          assetsPerSecond,
          averagePageTime,
        },
      };

      this.results.push(testResult);

      const status = result.success ? '✅' : '❌';
      console.log(`    ${status} Pages: ${result.pagesCloned}, Assets: ${result.assetsCaptured}, Time: ${(duration / 1000).toFixed(1)}s`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        url,
        category,
        success: false,
        pagesCloned: 0,
        assetsCaptured: 0,
        duration,
        errors: [error instanceof Error ? error.message : String(error)],
        performance: {
          pagesPerSecond: 0,
          assetsPerSecond: 0,
          averagePageTime: 0,
        },
      };

      this.results.push(testResult);
      console.log(`    ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateReport(totalDuration: number): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const reportPath = path.join(this.outputDir, 'comprehensive-test-report.md');
    const jsonPath = path.join(this.outputDir, 'comprehensive-test-results.json');

    // Calculate statistics
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const successRate = (successfulTests / totalTests) * 100;

    const totalPages = this.results.reduce((sum, r) => sum + r.pagesCloned, 0);
    const totalAssets = this.results.reduce((sum, r) => sum + r.assetsCaptured, 0);
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);

    const avgPagesPerTest = totalPages / totalTests;
    const avgAssetsPerTest = totalAssets / totalTests;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    // Category statistics
    const categoryStats = TEST_CATEGORIES.map(cat => {
      const catResults = this.results.filter(r => r.category === cat.name);
      const catSuccess = catResults.filter(r => r.success).length;
      const catSuccessRate = (catSuccess / catResults.length) * 100;
      const catPages = catResults.reduce((sum, r) => sum + r.pagesCloned, 0);
      const catAssets = catResults.reduce((sum, r) => sum + r.assetsCaptured, 0);

      return {
        category: cat.name,
        total: catResults.length,
        successful: catSuccess,
        successRate: catSuccessRate,
        expectedSuccessRate: cat.expectedSuccessRate * 100,
        pagesCloned: catPages,
        assetsCaptured: catAssets,
      };
    });

    // Performance metrics
    const performanceStats = {
      averagePagesPerSecond: this.results.reduce((sum, r) => sum + r.performance.pagesPerSecond, 0) / totalTests,
      averageAssetsPerSecond: this.results.reduce((sum, r) => sum + r.performance.assetsPerSecond, 0) / totalTests,
      averagePageTime: this.results.reduce((sum, r) => sum + r.performance.averagePageTime, 0) / totalTests,
      fastestTest: Math.min(...this.results.map(r => r.duration)),
      slowestTest: Math.max(...this.results.map(r => r.duration)),
    };

    // Generate markdown report
    const report = `# Comprehensive Test Report

**Generated:** ${new Date().toISOString()}
**Total Duration:** ${(totalDuration / 1000 / 60).toFixed(2)} minutes

## Summary

- **Total Tests:** ${totalTests}
- **Successful:** ${successfulTests} (${successRate.toFixed(2)}%)
- **Failed:** ${totalTests - successfulTests}
- **Total Pages Cloned:** ${totalPages}
- **Total Assets Captured:** ${totalAssets}
- **Total Errors:** ${totalErrors}

## Performance Metrics

- **Average Pages per Test:** ${avgPagesPerTest.toFixed(2)}
- **Average Assets per Test:** ${avgAssetsPerTest.toFixed(2)}
- **Average Test Duration:** ${(avgDuration / 1000).toFixed(2)}s
- **Average Pages per Second:** ${performanceStats.averagePagesPerSecond.toFixed(2)}
- **Average Assets per Second:** ${performanceStats.averageAssetsPerSecond.toFixed(2)}
- **Average Page Time:** ${performanceStats.averagePageTime.toFixed(0)}ms
- **Fastest Test:** ${(performanceStats.fastestTest / 1000).toFixed(2)}s
- **Slowest Test:** ${(performanceStats.slowestTest / 1000).toFixed(2)}s

## Category Breakdown

${categoryStats.map(stat => `
### ${stat.category}

- **Tests:** ${stat.total}
- **Successful:** ${stat.successful} (${stat.successRate.toFixed(2)}%)
- **Expected Success Rate:** ${stat.expectedSuccessRate.toFixed(0)}%
- **Performance vs Expected:** ${stat.successRate >= stat.expectedSuccessRate ? '✅' : '❌'} ${stat.successRate >= stat.expectedSuccessRate ? 'Met' : 'Below'} expectations
- **Pages Cloned:** ${stat.pagesCloned}
- **Assets Captured:** ${stat.assetsCaptured}
`).join('\n')}

## Detailed Results

${this.results.map((result, index) => `
### ${index + 1}. ${result.url}

- **Category:** ${result.category}
- **Status:** ${result.success ? '✅ Success' : '❌ Failed'}
- **Pages Cloned:** ${result.pagesCloned}
- **Assets Captured:** ${result.assetsCaptured}
- **Duration:** ${(result.duration / 1000).toFixed(2)}s
- **Verification Score:** ${result.verificationScore ? `${result.verificationScore.toFixed(2)}%` : 'N/A'}
- **Performance:**
  - Pages/Second: ${result.performance.pagesPerSecond.toFixed(2)}
  - Assets/Second: ${result.performance.assetsPerSecond.toFixed(2)}
  - Avg Page Time: ${result.performance.averagePageTime.toFixed(0)}ms
${result.errors.length > 0 ? `- **Errors:**\n${result.errors.map(e => `  - ${e}`).join('\n')}` : ''}
`).join('\n')}

## Recommendations

${this.generateRecommendations(categoryStats, performanceStats)}

## Conclusion

${successRate >= 90 ? '✅ Excellent performance! The cloner is working exceptionally well.' : successRate >= 75 ? '✅ Good performance. Some improvements needed.' : '⚠️ Performance needs improvement. Review failed tests and optimize.'}
`;

    await fs.writeFile(reportPath, report, 'utf-8');
    await fs.writeFile(jsonPath, JSON.stringify({
      summary: {
        totalTests,
        successfulTests,
        successRate,
        totalPages,
        totalAssets,
        totalErrors,
        totalDuration,
      },
      performance: performanceStats,
      categoryStats,
      results: this.results,
    }, null, 2), 'utf-8');

    console.log(`\n📊 Test Report Generated:`);
    console.log(`   Markdown: ${reportPath}`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`\n✅ Comprehensive Testing Complete!`);
    console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`   Total Pages: ${totalPages}`);
    console.log(`   Total Assets: ${totalAssets}`);
  }

  private generateRecommendations(categoryStats: any[], performanceStats: any): string {
    const recommendations: string[] = [];

    // Check categories below expected
    const belowExpected = categoryStats.filter(s => s.successRate < s.expectedSuccessRate);
    if (belowExpected.length > 0) {
      recommendations.push(`- **Categories needing improvement:** ${belowExpected.map(s => s.category).join(', ')}`);
    }

    // Performance recommendations
    if (performanceStats.averagePagesPerSecond < 1) {
      recommendations.push('- **Performance:** Consider increasing concurrency or optimizing page processing');
    }

    // Error recommendations
    const highErrorCategories = categoryStats.filter(s => s.successRate < 70);
    if (highErrorCategories.length > 0) {
      recommendations.push(`- **High error categories:** Review ${highErrorCategories.map(s => s.category).join(', ')} for common issues`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- All categories performing well!';
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensiveTester();
  tester.runAllTests().catch(console.error);
}

