/**
 * IssueDetector Service - Pattern Recognition for Autonomous Improvement
 *
 * Detects issues in the website cloning system through:
 * - Test result analysis
 * - Runtime error monitoring
 * - Performance tracking
 * - Dependency checking
 * - Pattern recognition from historical data
 *
 * Created: 2025-12-29
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
export interface DetectedIssue {
  id: string;
  type: IssueType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  description: string;
  suggestedFix?: string;
  autoFixable: boolean;
  confidence: number;
  detectedAt: Date;
  context?: unknown;
}

export type IssueType =
  | 'low_score'
  | 'test_failure'
  | 'runtime_error'
  | 'performance_degradation'
  | 'new_pattern'
  | 'dependency_outdated'
  | 'memory_leak'
  | 'timeout'
  | 'asset_failure'
  | 'verification_failure';

export interface IssuePattern {
  id: string;
  name: string;
  type: IssueType;
  indicators: string[];
  frequency: number;
  lastSeen: Date;
  suggestedFix?: string;
}

export interface TestBatchResult {
  averageScore: number;
  successRate: number;
  failedSites: Array<{
    url: string;
    score: number;
    issues: string[];
    errorMessage?: string;
  }>;
  duration: number;
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  diskSpace: number;
  apiResponseTime: number;
  activeJobs: number;
}

export class IssueDetector {
  private projectRoot: string;
  private patternsFile: string;
  private patterns: Map<string, IssuePattern> = new Map();
  private recentIssues: DetectedIssue[] = [];
  private baselineMetrics: SystemMetrics | null = null;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.patternsFile = path.join(this.projectRoot, 'data', 'issue-patterns.json');
    this.loadPatterns();
  }

  /**
   * Load known issue patterns from disk
   */
  private loadPatterns(): void {
    try {
      if (fs.existsSync(this.patternsFile)) {
        const data = JSON.parse(fs.readFileSync(this.patternsFile, 'utf-8'));
        for (const pattern of data) {
          this.patterns.set(pattern.id, pattern);
        }
        console.log(`[IssueDetector] Loaded ${this.patterns.size} issue patterns`);
      }
    } catch (error) {
      console.warn('[IssueDetector] Could not load patterns:', error);
    }
  }

  /**
   * Save patterns to disk
   */
  private savePatterns(): void {
    try {
      const dataDir = path.dirname(this.patternsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const patterns = Array.from(this.patterns.values());
      fs.writeFileSync(this.patternsFile, JSON.stringify(patterns, null, 2));
    } catch (error) {
      console.warn('[IssueDetector] Could not save patterns:', error);
    }
  }

  /**
   * Analyze test batch results for issues
   */
  analyzeTestResults(results: TestBatchResult, targetScore: number = 95): DetectedIssue[] {
    const issues: DetectedIssue[] = [];

    // Check overall score
    if (results.averageScore < targetScore) {
      const severity = results.averageScore < 70 ? 'critical'
        : results.averageScore < 80 ? 'high'
        : results.averageScore < 90 ? 'medium'
        : 'low';

      issues.push(this.createIssue({
        type: 'low_score',
        severity,
        source: 'test_batch',
        description: `Average score ${results.averageScore}% is below target ${targetScore}%`,
        confidence: 100,
        autoFixable: false,
        context: {
          actualScore: results.averageScore,
          targetScore,
          gap: targetScore - results.averageScore,
        },
      }));
    }

    // Analyze failed sites
    for (const site of results.failedSites) {
      if (site.score < 60) {
        issues.push(this.createIssue({
          type: 'low_score',
          severity: 'high',
          source: site.url,
          description: `Clone of ${site.url} scored only ${site.score}%`,
          confidence: 95,
          autoFixable: false,
          context: {
            url: site.url,
            score: site.score,
            issues: site.issues,
          },
        }));
      }

      // Check for specific error patterns
      if (site.errorMessage) {
        const errorIssue = this.classifyError(site.errorMessage, site.url);
        if (errorIssue) {
          issues.push(errorIssue);
        }
      }
    }

    // Check for timeout issues
    if (results.duration > 300) { // 5 minutes
      issues.push(this.createIssue({
        type: 'timeout',
        severity: 'medium',
        source: 'test_batch',
        description: `Test batch took ${results.duration}s (expected <300s)`,
        confidence: 80,
        autoFixable: true,
        suggestedFix: 'Increase timeout thresholds or optimize slow operations',
        context: { duration: results.duration },
      }));
    }

    // Check success rate
    if (results.successRate < 90) {
      issues.push(this.createIssue({
        type: 'test_failure',
        severity: results.successRate < 70 ? 'critical' : 'high',
        source: 'test_batch',
        description: `Success rate ${results.successRate}% is below acceptable threshold`,
        confidence: 95,
        autoFixable: false,
        context: { successRate: results.successRate },
      }));
    }

    // Record and learn from issues
    for (const issue of issues) {
      this.recordIssue(issue);
    }

    return issues;
  }

  /**
   * Classify an error message into an issue
   */
  private classifyError(errorMessage: string, source: string): DetectedIssue | null {
    const errorPatterns: Array<{
      pattern: RegExp;
      type: IssueType;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      autoFixable: boolean;
      suggestedFix?: string;
    }> = [
      {
        pattern: /timeout|ETIMEDOUT|TimeoutError/i,
        type: 'timeout',
        severity: 'medium',
        description: 'Operation timed out',
        autoFixable: true,
        suggestedFix: 'Increase timeout or add retry logic',
      },
      {
        pattern: /ECONNREFUSED|ENOTFOUND|ECONNRESET/i,
        type: 'runtime_error',
        severity: 'high',
        description: 'Network connection failed',
        autoFixable: false,
      },
      {
        pattern: /out of memory|ENOMEM|heap/i,
        type: 'memory_leak',
        severity: 'critical',
        description: 'Memory exhaustion detected',
        autoFixable: false,
      },
      {
        pattern: /failed to download|asset.*failed|404/i,
        type: 'asset_failure',
        severity: 'medium',
        description: 'Asset download failed',
        autoFixable: true,
        suggestedFix: 'Add retry logic for asset downloads',
      },
      {
        pattern: /verification.*failed|score.*below/i,
        type: 'verification_failure',
        severity: 'medium',
        description: 'Clone verification failed',
        autoFixable: false,
      },
    ];

    for (const { pattern, type, severity, description, autoFixable, suggestedFix } of errorPatterns) {
      if (pattern.test(errorMessage)) {
        return this.createIssue({
          type,
          severity,
          source,
          description: `${description}: ${errorMessage.slice(0, 100)}`,
          autoFixable,
          suggestedFix,
          confidence: 85,
          context: { errorMessage },
        });
      }
    }

    // Unknown error
    return this.createIssue({
      type: 'runtime_error',
      severity: 'medium',
      source,
      description: `Unknown error: ${errorMessage.slice(0, 100)}`,
      autoFixable: false,
      confidence: 50,
      context: { errorMessage },
    });
  }

  /**
   * Check system metrics for issues
   */
  async checkSystemHealth(): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];
    const metrics = await this.getSystemMetrics();

    // Check memory usage
    if (metrics.memoryUsage > 90) {
      issues.push(this.createIssue({
        type: 'memory_leak',
        severity: 'critical',
        source: 'system',
        description: `Memory usage at ${metrics.memoryUsage}%`,
        autoFixable: false,
        confidence: 95,
        context: metrics,
      }));
    } else if (metrics.memoryUsage > 75) {
      issues.push(this.createIssue({
        type: 'memory_leak',
        severity: 'medium',
        source: 'system',
        description: `Memory usage elevated at ${metrics.memoryUsage}%`,
        autoFixable: false,
        confidence: 80,
        context: metrics,
      }));
    }

    // Check disk space
    if (metrics.diskSpace < 10) {
      issues.push(this.createIssue({
        type: 'runtime_error',
        severity: 'critical',
        source: 'system',
        description: `Disk space critically low: ${metrics.diskSpace}% free`,
        autoFixable: true,
        suggestedFix: 'Clean up old clones and logs',
        confidence: 100,
        context: metrics,
      }));
    }

    // Check API response time (compare to baseline)
    if (this.baselineMetrics && metrics.apiResponseTime > this.baselineMetrics.apiResponseTime * 2) {
      issues.push(this.createIssue({
        type: 'performance_degradation',
        severity: 'medium',
        source: 'api',
        description: `API response time degraded: ${metrics.apiResponseTime}ms (baseline: ${this.baselineMetrics.apiResponseTime}ms)`,
        autoFixable: false,
        confidence: 75,
        context: { current: metrics.apiResponseTime, baseline: this.baselineMetrics.apiResponseTime },
      }));
    }

    // Update baseline if this is first check
    if (!this.baselineMetrics) {
      this.baselineMetrics = metrics;
    }

    return issues;
  }

  /**
   * Get current system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    return new Promise((resolve) => {
      // Get memory usage
      const memUsed = process.memoryUsage();
      const totalMem = os.totalmem();
      const memoryUsage = Math.round((memUsed.heapUsed / totalMem) * 100);

      // Get disk space (Windows)
      exec('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:value', (error, stdout) => {
        let diskSpace = 50; // Default

        if (!error) {
          const freeMatch = stdout.match(/FreeSpace=(\d+)/);
          const sizeMatch = stdout.match(/Size=(\d+)/);
          if (freeMatch && sizeMatch) {
            const free = parseInt(freeMatch[1]);
            const size = parseInt(sizeMatch[1]);
            diskSpace = Math.round((free / size) * 100);
          }
        }

        resolve({
          memoryUsage,
          cpuUsage: 0, // TODO: Implement CPU monitoring
          diskSpace,
          apiResponseTime: 100, // TODO: Measure actual API response time
          activeJobs: 0,
        });
      });
    });
  }

  /**
   * Check for outdated dependencies
   */
  async checkDependencies(): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    return new Promise((resolve) => {
      exec('npm outdated --json', { cwd: this.projectRoot }, (error, stdout) => {
        if (stdout) {
          try {
            const outdated = JSON.parse(stdout);
            const packages = Object.keys(outdated);

            if (packages.length > 0) {
              // Check for major version bumps
              for (const pkg of packages) {
                const info = outdated[pkg];
                const currentMajor = parseInt(info.current?.split('.')[0] || '0');
                const latestMajor = parseInt(info.latest?.split('.')[0] || '0');

                if (latestMajor > currentMajor) {
                  issues.push(this.createIssue({
                    type: 'dependency_outdated',
                    severity: 'medium',
                    source: pkg,
                    description: `${pkg} has major update: ${info.current} → ${info.latest}`,
                    autoFixable: true,
                    suggestedFix: `npm update ${pkg}`,
                    confidence: 90,
                    context: info,
                  }));
                }
              }

              // General outdated packages warning
              if (packages.length > 10) {
                issues.push(this.createIssue({
                  type: 'dependency_outdated',
                  severity: 'low',
                  source: 'package.json',
                  description: `${packages.length} packages have updates available`,
                  autoFixable: true,
                  suggestedFix: 'npm update',
                  confidence: 100,
                  context: { count: packages.length },
                }));
              }
            }
          } catch {
            // JSON parse error - no outdated packages or npm error
          }
        }

        resolve(issues);
      });
    });
  }

  /**
   * Analyze improvement log for trends
   */
  analyzeTrends(): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    const logFile = path.join(this.projectRoot, 'improvement-log.json');

    try {
      if (!fs.existsSync(logFile)) return issues;

      const log = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      if (log.length < 5) return issues;

      const recent = log.slice(-10);
      const scores = recent.map((entry: { averageScore: number }) => entry.averageScore);

      // Calculate trend
      const firstHalf = scores.slice(0, 5);
      const secondHalf = scores.slice(-5);
      const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;

      // Declining trend
      if (secondAvg < firstAvg - 5) {
        issues.push(this.createIssue({
          type: 'performance_degradation',
          severity: 'medium',
          source: 'trend_analysis',
          description: `Performance declining: ${Math.round(firstAvg)}% → ${Math.round(secondAvg)}%`,
          autoFixable: false,
          confidence: 70,
          context: { firstAvg, secondAvg, trend: 'declining' },
        }));
      }

      // High variance
      const variance = this.calculateVariance(scores);
      if (variance > 100) {
        issues.push(this.createIssue({
          type: 'new_pattern',
          severity: 'low',
          source: 'trend_analysis',
          description: `High score variance detected (σ²=${Math.round(variance)})`,
          autoFixable: false,
          confidence: 60,
          context: { variance, scores },
        }));
      }

    } catch (error) {
      console.warn('[IssueDetector] Could not analyze trends:', error);
    }

    return issues;
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  /**
   * Create an issue object
   */
  private createIssue(params: Omit<DetectedIssue, 'id' | 'detectedAt'>): DetectedIssue {
    return {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      detectedAt: new Date(),
      ...params,
    };
  }

  /**
   * Record an issue and update patterns
   */
  private recordIssue(issue: DetectedIssue): void {
    this.recentIssues.push(issue);

    // Keep only last 100 issues
    if (this.recentIssues.length > 100) {
      this.recentIssues = this.recentIssues.slice(-100);
    }

    // Update pattern database
    const patternKey = `${issue.type}-${issue.source}`;
    const existingPattern = this.patterns.get(patternKey);

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = new Date();
      if (issue.suggestedFix && !existingPattern.suggestedFix) {
        existingPattern.suggestedFix = issue.suggestedFix;
      }
    } else {
      this.patterns.set(patternKey, {
        id: patternKey,
        name: issue.description.slice(0, 50),
        type: issue.type,
        indicators: [issue.description],
        frequency: 1,
        lastSeen: new Date(),
        suggestedFix: issue.suggestedFix,
      });
    }

    this.savePatterns();
  }

  /**
   * Get recent issues
   */
  getRecentIssues(limit: number = 10): DetectedIssue[] {
    return this.recentIssues.slice(-limit);
  }

  /**
   * Get known patterns
   */
  getPatterns(): IssuePattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Run full detection cycle
   */
  async runFullDetection(testResults?: TestBatchResult): Promise<DetectedIssue[]> {
    console.log('[IssueDetector] Running full detection cycle...');

    const allIssues: DetectedIssue[] = [];

    // 1. Analyze test results if provided
    if (testResults) {
      const testIssues = this.analyzeTestResults(testResults);
      allIssues.push(...testIssues);
      console.log(`  Test analysis: ${testIssues.length} issues`);
    }

    // 2. Check system health
    const healthIssues = await this.checkSystemHealth();
    allIssues.push(...healthIssues);
    console.log(`  System health: ${healthIssues.length} issues`);

    // 3. Analyze trends
    const trendIssues = this.analyzeTrends();
    allIssues.push(...trendIssues);
    console.log(`  Trend analysis: ${trendIssues.length} issues`);

    // 4. Check dependencies (less frequently)
    if (Math.random() < 0.1) { // 10% chance per cycle
      const depIssues = await this.checkDependencies();
      allIssues.push(...depIssues);
      console.log(`  Dependencies: ${depIssues.length} issues`);
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    console.log(`[IssueDetector] Total: ${allIssues.length} issues detected`);

    return allIssues;
  }
}

export default IssueDetector;
