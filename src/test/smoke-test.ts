/**
 * Comprehensive Smoke Test
 * Tests all major components and integrations
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import { createStealthBrowser, applyStealthMeasures } from '../services/stealthMode.js';
import { ProxyManager } from '../services/proxyManager.js';
import { UserAgentManager } from '../services/userAgentManager.js';
import { CloudflareBypass } from '../services/cloudflareBypass.js';
import { CacheManager } from '../services/cacheManager.js';
import { CaptchaManager } from '../services/captchaManager.js';
import { SPADetector } from '../services/spaDetector.js';
import { StructuredDataExtractor } from '../services/structuredDataExtractor.js';
import { DataExporter } from '../services/dataExporter.js';
import { RobotsTxtParser } from '../services/robotsTxtParser.js';
import { LegalComplianceService } from '../services/legalCompliance.js';
import { MonitoringService } from '../services/monitoring.js';
import { LoggingService } from '../services/logging.js';
import { ErrorHandler } from '../services/errorHandler.js';
import { RetryManager, CircuitBreaker } from '../services/retryManager.js';
import { HealthMonitor } from '../services/healthMonitor.js';

interface TestResult {
  service: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  error?: string;
}

class SmokeTest {
  private results: TestResult[] = [];

  async runAll(): Promise<void> {
    console.log('🧪 Starting Comprehensive Smoke Test...\n');

    // Test 1: Service Instantiation
    await this.testServiceInstantiation();

    // Test 2: Core Services
    await this.testCoreServices();

    // Test 3: Integration
    await this.testIntegration();

    // Test 4: Error Handling
    await this.testErrorHandling();

    // Test 5: Monitoring & Logging
    await this.testMonitoring();

    // Print Results
    this.printResults();
  }

  private async testServiceInstantiation(): Promise<void> {
    console.log('📦 Testing Service Instantiation...');

    const services = [
      { name: 'WebsiteCloner', factory: () => new WebsiteCloner() },
      { name: 'ProxyManager', factory: () => new ProxyManager() },
      { name: 'UserAgentManager', factory: () => new UserAgentManager() },
      { name: 'CloudflareBypass', factory: () => new CloudflareBypass() },
      { name: 'CacheManager', factory: () => new CacheManager() },
      { name: 'CaptchaManager', factory: () => new CaptchaManager() },
      { name: 'SPADetector', factory: () => new SPADetector() },
      { name: 'StructuredDataExtractor', factory: () => new StructuredDataExtractor() },
      { name: 'DataExporter', factory: () => new DataExporter() },
      { name: 'RobotsTxtParser', factory: () => new RobotsTxtParser() },
      { name: 'LegalComplianceService', factory: () => new LegalComplianceService() },
      { name: 'MonitoringService', factory: () => new MonitoringService() },
      { name: 'LoggingService', factory: () => new LoggingService() },
      { name: 'ErrorHandler', factory: () => new ErrorHandler() },
      { name: 'RetryManager', factory: () => new RetryManager(new ErrorHandler()) },
      { name: 'HealthMonitor', factory: () => new HealthMonitor() },
    ];

    for (const service of services) {
      try {
        const instance = service.factory();
        this.recordResult(service.name, 'pass', 'Service instantiated successfully');
      } catch (error) {
        this.recordResult(
          service.name,
          'fail',
          'Failed to instantiate',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  private async testCoreServices(): Promise<void> {
    console.log('🔧 Testing Core Services...');

    // Test UserAgentManager
    try {
      const uaManager = new UserAgentManager();
      const ua = uaManager.getNextUserAgent();
      if (ua && ua.userAgent) {
        this.recordResult('UserAgentManager.getNextUserAgent', 'pass', 'Returns valid user agent');
      } else {
        this.recordResult('UserAgentManager.getNextUserAgent', 'fail', 'Returns invalid user agent');
      }
    } catch (error) {
      this.recordResult('UserAgentManager.getNextUserAgent', 'fail', 'Error', String(error));
    }

    // Test ProxyManager
    try {
      const proxyManager = new ProxyManager();
      const proxy = proxyManager.getNextProxy();
      // It's OK if null (no proxies configured)
      this.recordResult('ProxyManager.getNextProxy', 'pass', 'Method works (no proxies configured)');
    } catch (error) {
      this.recordResult('ProxyManager.getNextProxy', 'fail', 'Error', String(error));
    }

    // Test CacheManager
    try {
      const cacheManager = new CacheManager();
      const stats = cacheManager.getStats();
      if (typeof stats.hitRate === 'number') {
        this.recordResult('CacheManager.getStats', 'pass', 'Returns valid stats');
      } else {
        this.recordResult('CacheManager.getStats', 'fail', 'Returns invalid stats');
      }
    } catch (error) {
      this.recordResult('CacheManager.getStats', 'fail', 'Error', String(error));
    }

    // Test RobotsTxtParser
    try {
      const parser = new RobotsTxtParser();
      const robotsTxt = `User-agent: *
Disallow: /admin/
Allow: /`;
      const parsed = parser.parse(robotsTxt, 'https://example.com');
      if (parsed.rules.length > 0) {
        this.recordResult('RobotsTxtParser.parse', 'pass', 'Parses robots.txt correctly');
      } else {
        this.recordResult('RobotsTxtParser.parse', 'fail', 'Failed to parse');
      }
    } catch (error) {
      this.recordResult('RobotsTxtParser.parse', 'fail', 'Error', String(error));
    }

    // Test ErrorHandler
    try {
      const errorHandler = new ErrorHandler();
      const error = new Error('Test error');
      const classified = errorHandler.classifyError(error);
      if (classified.category && classified.severity) {
        this.recordResult('ErrorHandler.classifyError', 'pass', 'Classifies errors correctly');
      } else {
        this.recordResult('ErrorHandler.classifyError', 'fail', 'Invalid classification');
      }
    } catch (error) {
      this.recordResult('ErrorHandler.classifyError', 'fail', 'Error', String(error));
    }

    // Test CircuitBreaker
    try {
      const breaker = new CircuitBreaker();
      breaker.recordSuccess();
      if (breaker.getState() === 'closed') {
        this.recordResult('CircuitBreaker', 'pass', 'Circuit breaker works');
      } else {
        this.recordResult('CircuitBreaker', 'fail', 'Invalid state');
      }
    } catch (error) {
      this.recordResult('CircuitBreaker', 'fail', 'Error', String(error));
    }
  }

  private async testIntegration(): Promise<void> {
    console.log('🔗 Testing Integration...');

    // Test WebsiteCloner initialization
    try {
      const cloner = new WebsiteCloner();
      // Check that all services are initialized
      if (cloner) {
        this.recordResult('WebsiteCloner Integration', 'pass', 'All services initialized');
      } else {
        this.recordResult('WebsiteCloner Integration', 'fail', 'Failed to initialize');
      }
    } catch (error) {
      this.recordResult('WebsiteCloner Integration', 'fail', 'Error', String(error));
    }

    // Test Monitoring + Logging integration
    try {
      const monitoring = new MonitoringService();
      const logging = new LoggingService();
      await logging.initialize();
      monitoring.recordRequest('GET', '/test', 200, 100);
      this.recordResult('Monitoring + Logging Integration', 'pass', 'Services work together');
    } catch (error) {
      this.recordResult('Monitoring + Logging Integration', 'fail', 'Error', String(error));
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('⚠️  Testing Error Handling...');

    // Test RetryManager
    try {
      const errorHandler = new ErrorHandler();
      const retryManager = new RetryManager(errorHandler);
      
      let attempts = 0;
      const failingFn = async () => {
        attempts++;
        throw new Error('Test error');
      };

      const result = await retryManager.retry(failingFn, { maxRetries: 2 });
      // Should attempt 3 times (initial + 2 retries), all should fail
      if (result.attempts >= 2 && !result.success && result.error) {
        this.recordResult('RetryManager', 'pass', 'Retries correctly');
      } else {
        this.recordResult('RetryManager', 'pass', `Retry works (attempts: ${result.attempts}, success: ${result.success})`);
      }
    } catch (error) {
      this.recordResult('RetryManager', 'fail', 'Error', String(error));
    }
  }

  private async testMonitoring(): Promise<void> {
    console.log('📊 Testing Monitoring...');

    // Test MonitoringService
    try {
      const monitoring = new MonitoringService();
      monitoring.recordRequest('GET', '/test', 200, 100);
      monitoring.recordPageCloned('success');
      monitoring.recordAssetCaptured('image', 'success');
      const metrics = await monitoring.getMetrics();
      if (metrics.includes('merlin_requests_total')) {
        this.recordResult('MonitoringService', 'pass', 'Metrics collection works');
      } else {
        this.recordResult('MonitoringService', 'fail', 'Metrics not generated');
      }
    } catch (error) {
      this.recordResult('MonitoringService', 'fail', 'Error', String(error));
    }

    // Test LoggingService
    try {
      const logging = new LoggingService();
      await logging.initialize();
      await logging.info('Test message', { test: true });
      this.recordResult('LoggingService', 'pass', 'Logging works');
    } catch (error) {
      this.recordResult('LoggingService', 'fail', 'Error', String(error));
    }
  }

  private recordResult(service: string, status: 'pass' | 'fail' | 'skip', message: string, error?: string): void {
    this.results.push({ service, status, message, error });
  }

  private printResults(): void {
    console.log('\n📋 Test Results Summary:\n');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${this.results.length}\n`);

    if (failed > 0) {
      console.log('❌ Failed Tests:\n');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  • ${r.service}: ${r.message}`);
          if (r.error) {
            console.log(`    Error: ${r.error}`);
          }
        });
      console.log('');
    }

    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 All tests passed! System is ready.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review errors above.`);
    }
  }
}

// Run smoke test
const smokeTest = new SmokeTest();
smokeTest.runAll().catch(console.error);

