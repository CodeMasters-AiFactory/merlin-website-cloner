/**
 * Fix Generator Service - LLM-Powered Code Fixes
 *
 * Uses Claude API to analyze issues and generate targeted code fixes.
 * Integrates with SafeDeployer for backup and rollback.
 *
 * Created: 2025-12-29
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
export interface DetectedIssue {
  type: 'low_score' | 'test_failure' | 'runtime_error' |
        'performance_degradation' | 'new_pattern' | 'dependency_outdated' |
        'code_smell' | 'security_issue';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  description: string;
  context?: string;
  suggestedFix?: string;
  autoFixable: boolean;
  confidence: number;
}

export interface FixProposal {
  id: string;
  issue: DetectedIssue;
  file: string;
  description: string;
  originalCode: string;
  proposedCode: string;
  explanation: string;
  confidence: number;
  testPlan: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface FixResult {
  proposalId: string;
  applied: boolean;
  success: boolean;
  error?: string;
  testResults?: {
    passed: boolean;
    details: string;
  };
  rollbackRequired: boolean;
}

interface FixGeneratorConfig {
  anthropicApiKey?: string;
  maxFixesPerCycle: number;
  minConfidence: number;
  allowedFilePatterns: string[];
  blockedFilePatterns: string[];
  requireTestPlan: boolean;
  dryRunMode: boolean;
}

const DEFAULT_CONFIG: FixGeneratorConfig = {
  maxFixesPerCycle: 5,
  minConfidence: 70,
  allowedFilePatterns: [
    'src/services/*.ts',
    'src/server/*.ts',
    'frontend/src/**/*.tsx',
    'frontend/src/**/*.ts',
  ],
  blockedFilePatterns: [
    '*.test.ts',
    '*.spec.ts',
    'node_modules/**',
    'dist/**',
    '.env*',
    'package*.json',
    'tsconfig.json',
  ],
  requireTestPlan: true,
  dryRunMode: false,
};

export class FixGenerator {
  private config: FixGeneratorConfig;
  private projectRoot: string;
  private historyFile: string;
  private anthropic: Anthropic | null = null;
  private proposalHistory: FixProposal[] = [];

  constructor(config: Partial<FixGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectRoot = path.resolve(__dirname, '../..');
    this.historyFile = path.join(this.projectRoot, 'data', 'fix-proposals.json');

    // Initialize Anthropic client
    const apiKey = this.config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }

    this.ensureDataDirectory();
    this.loadHistory();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.join(this.projectRoot, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Generate fixes for detected issues
   */
  async generateFixes(issues: DetectedIssue[]): Promise<FixProposal[]> {
    if (!this.anthropic) {
      console.log('[FixGenerator] No Anthropic API key configured');
      return [];
    }

    const proposals: FixProposal[] = [];
    const prioritizedIssues = this.prioritizeIssues(issues);

    // Process up to maxFixesPerCycle issues
    const toProcess = prioritizedIssues.slice(0, this.config.maxFixesPerCycle);

    for (const issue of toProcess) {
      console.log(`[FixGenerator] Analyzing: ${issue.type} - ${issue.description}`);

      try {
        const proposal = await this.generateFixForIssue(issue);

        if (proposal && proposal.confidence >= this.config.minConfidence) {
          proposals.push(proposal);
          this.proposalHistory.push(proposal);
          console.log(`[FixGenerator] Generated fix for ${issue.source} (confidence: ${proposal.confidence}%)`);
        } else if (proposal) {
          console.log(`[FixGenerator] Fix confidence too low: ${proposal.confidence}%`);
        }
      } catch (error) {
        console.error(`[FixGenerator] Error generating fix: ${error}`);
      }
    }

    this.saveHistory();
    return proposals;
  }

  /**
   * Prioritize issues by severity and auto-fixability
   */
  private prioritizeIssues(issues: DetectedIssue[]): DetectedIssue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return [...issues].sort((a, b) => {
      // Prioritize auto-fixable issues
      if (a.autoFixable && !b.autoFixable) return -1;
      if (!a.autoFixable && b.autoFixable) return 1;

      // Then by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate a fix for a single issue
   */
  private async generateFixForIssue(issue: DetectedIssue): Promise<FixProposal | null> {
    if (!this.anthropic) return null;

    // Gather context
    const relevantFiles = await this.findRelevantFiles(issue);
    const fileContents = await this.readFiles(relevantFiles.slice(0, 3));
    const historicalFixes = this.getHistoricalFixes(issue.type);

    // Build prompt
    const prompt = this.buildPrompt(issue, fileContents, historicalFixes);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') return null;

      return this.parseResponse(content.text, issue);

    } catch (error) {
      console.error(`[FixGenerator] API error: ${error}`);
      return null;
    }
  }

  /**
   * Find relevant files for the issue
   */
  private async findRelevantFiles(issue: DetectedIssue): Promise<string[]> {
    const files: string[] = [];

    // If source is a file path, include it
    if (issue.source && issue.source.includes('/')) {
      const fullPath = path.join(this.projectRoot, issue.source);
      if (fs.existsSync(fullPath)) {
        files.push(issue.source);
      }
    }

    // Search for related files based on issue type
    const searchPatterns: Record<string, string[]> = {
      'low_score': ['src/services/websiteCloner.ts', 'src/services/assetCapture.ts', 'src/services/cloneVerifier.ts'],
      'test_failure': ['src/test/*.ts'],
      'runtime_error': ['src/server/index.ts', 'src/services/*.ts'],
      'performance_degradation': ['src/services/*.ts'],
      'dependency_outdated': ['package.json'],
      'security_issue': ['src/server/security.ts', 'src/server/index.ts'],
    };

    const patterns = searchPatterns[issue.type] || [];
    for (const pattern of patterns) {
      const expanded = this.expandPattern(pattern);
      files.push(...expanded.slice(0, 2));
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Expand a glob-like pattern to file paths
   */
  private expandPattern(pattern: string): string[] {
    const files: string[] = [];
    const dir = path.dirname(pattern);
    const filePattern = path.basename(pattern);

    const fullDir = path.join(this.projectRoot, dir);
    if (!fs.existsSync(fullDir)) return files;

    const entries = fs.readdirSync(fullDir);
    for (const entry of entries) {
      if (filePattern.includes('*')) {
        const regex = new RegExp('^' + filePattern.replace('*', '.*') + '$');
        if (regex.test(entry)) {
          files.push(path.join(dir, entry));
        }
      } else if (entry === filePattern) {
        files.push(path.join(dir, entry));
      }
    }

    return files;
  }

  /**
   * Read file contents
   */
  private async readFiles(files: string[]): Promise<Map<string, string>> {
    const contents = new Map<string, string>();

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      try {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Limit content size
          contents.set(file, content.slice(0, 15000));
        }
      } catch (error) {
        console.warn(`[FixGenerator] Could not read ${file}: ${error}`);
      }
    }

    return contents;
  }

  /**
   * Get historical fixes for similar issues
   */
  private getHistoricalFixes(issueType: string): FixProposal[] {
    return this.proposalHistory
      .filter(p => p.issue.type === issueType)
      .slice(-5);
  }

  /**
   * Build the Claude prompt
   */
  private buildPrompt(
    issue: DetectedIssue,
    fileContents: Map<string, string>,
    historicalFixes: FixProposal[]
  ): string {
    let prompt = `You are the AutoImprover for Merlin Website Cloner. Analyze this issue and generate a targeted code fix.

## Issue Details
- Type: ${issue.type}
- Severity: ${issue.severity}
- Source: ${issue.source}
- Description: ${issue.description}
${issue.context ? `- Context: ${issue.context}` : ''}
${issue.suggestedFix ? `- Suggested approach: ${issue.suggestedFix}` : ''}

## Relevant Files
`;

    for (const [file, content] of fileContents) {
      prompt += `\n### ${file}\n\`\`\`typescript\n${content}\n\`\`\`\n`;
    }

    if (historicalFixes.length > 0) {
      prompt += `\n## Historical Fixes for Similar Issues\n`;
      for (const fix of historicalFixes) {
        prompt += `- ${fix.description} (${fix.confidence}% confidence)\n`;
      }
    }

    prompt += `
## Your Task
Generate a targeted, minimal code fix. Respond with JSON in this exact format:

\`\`\`json
{
  "file": "path/to/file.ts",
  "description": "Brief description of the fix",
  "originalCode": "The exact code to replace (include enough context to be unique)",
  "proposedCode": "The new code to insert",
  "explanation": "Detailed explanation of why this fix works",
  "confidence": 85,
  "testPlan": ["Step 1 to verify fix", "Step 2 to verify fix"],
  "riskLevel": "low",
  "estimatedImpact": "Expected improvement description"
}
\`\`\`

## Guidelines
1. Only propose changes you're confident will work
2. Keep changes minimal and targeted
3. Don't break existing functionality
4. Include enough context in originalCode to make it unique
5. Set confidence between 0-100 based on certainty
6. riskLevel should be "low", "medium", or "high"
7. If you cannot generate a safe fix, return: { "noFix": true, "reason": "explanation" }

Respond ONLY with the JSON block, no other text.`;

    return prompt;
  }

  /**
   * Parse Claude's response into a FixProposal
   */
  private parseResponse(response: string, issue: DetectedIssue): FixProposal | null {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;

      const parsed = JSON.parse(jsonStr.trim());

      if (parsed.noFix) {
        console.log(`[FixGenerator] No fix generated: ${parsed.reason}`);
        return null;
      }

      // Validate required fields
      if (!parsed.file || !parsed.originalCode || !parsed.proposedCode) {
        console.warn('[FixGenerator] Invalid response format');
        return null;
      }

      // Check if file is in allowed patterns
      if (!this.isFileAllowed(parsed.file)) {
        console.warn(`[FixGenerator] File not in allowed patterns: ${parsed.file}`);
        return null;
      }

      return {
        id: `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        issue,
        file: parsed.file,
        description: parsed.description || 'Auto-generated fix',
        originalCode: parsed.originalCode,
        proposedCode: parsed.proposedCode,
        explanation: parsed.explanation || '',
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        testPlan: parsed.testPlan || [],
        riskLevel: parsed.riskLevel || 'medium',
        estimatedImpact: parsed.estimatedImpact || 'Unknown',
      };

    } catch (error) {
      console.error(`[FixGenerator] Failed to parse response: ${error}`);
      return null;
    }
  }

  /**
   * Check if a file is in allowed patterns
   */
  private isFileAllowed(file: string): boolean {
    // Check blocked patterns first
    for (const pattern of this.config.blockedFilePatterns) {
      if (this.matchPattern(file, pattern)) {
        return false;
      }
    }

    // Check allowed patterns
    for (const pattern of this.config.allowedFilePatterns) {
      if (this.matchPattern(file, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching
   */
  private matchPattern(file: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*') + '$'
    );
    return regex.test(file);
  }

  /**
   * Apply a fix proposal to the codebase
   */
  async applyFix(proposal: FixProposal): Promise<FixResult> {
    const result: FixResult = {
      proposalId: proposal.id,
      applied: false,
      success: false,
      rollbackRequired: false,
    };

    if (this.config.dryRunMode) {
      console.log(`[FixGenerator] DRY RUN: Would apply fix to ${proposal.file}`);
      console.log(`[FixGenerator] Original:\n${proposal.originalCode}`);
      console.log(`[FixGenerator] Proposed:\n${proposal.proposedCode}`);
      result.applied = true;
      result.success = true;
      return result;
    }

    const fullPath = path.join(this.projectRoot, proposal.file);

    try {
      // Read current file
      if (!fs.existsSync(fullPath)) {
        result.error = `File not found: ${proposal.file}`;
        return result;
      }

      const currentContent = fs.readFileSync(fullPath, 'utf-8');

      // Verify original code exists
      if (!currentContent.includes(proposal.originalCode)) {
        result.error = 'Original code not found in file (may have changed)';
        return result;
      }

      // Apply fix
      const newContent = currentContent.replace(proposal.originalCode, proposal.proposedCode);

      // Write new content
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      result.applied = true;

      // Verify TypeScript compiles (basic check)
      const compileResult = await this.verifyCompilation(proposal.file);
      if (!compileResult.success) {
        // Rollback
        fs.writeFileSync(fullPath, currentContent, 'utf-8');
        result.error = `Compilation failed: ${compileResult.error}`;
        result.rollbackRequired = true;
        return result;
      }

      result.success = true;
      result.testResults = {
        passed: true,
        details: 'Compilation successful',
      };

      console.log(`[FixGenerator] Applied fix to ${proposal.file}`);

    } catch (error) {
      result.error = String(error);
      result.rollbackRequired = result.applied;
    }

    return result;
  }

  /**
   * Verify TypeScript compilation
   */
  private async verifyCompilation(file: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');

      exec(`npx tsc --noEmit ${file}`, { cwd: this.projectRoot }, (error: Error | null, _stdout: string, stderr: string) => {
        if (error) {
          resolve({ success: false, error: stderr || error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Load proposal history
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        this.proposalHistory = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
      }
    } catch {}
  }

  /**
   * Save proposal history
   */
  private saveHistory(): void {
    try {
      // Keep only last 200 proposals
      if (this.proposalHistory.length > 200) {
        this.proposalHistory = this.proposalHistory.slice(-200);
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.proposalHistory, null, 2));
    } catch (error) {
      console.error('[FixGenerator] Failed to save history:', error);
    }
  }

  /**
   * Get proposal history
   */
  getHistory(limit: number = 50): FixProposal[] {
    return this.proposalHistory.slice(-limit);
  }

  /**
   * Get status
   */
  getStatus(): object {
    return {
      hasApiKey: !!this.anthropic,
      dryRunMode: this.config.dryRunMode,
      minConfidence: this.config.minConfidence,
      totalProposals: this.proposalHistory.length,
      recentProposals: this.proposalHistory.slice(-5).map(p => ({
        id: p.id,
        file: p.file,
        confidence: p.confidence,
        description: p.description,
      })),
    };
  }
}

export default FixGenerator;
