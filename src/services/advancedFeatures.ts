/**
 * Advanced Features Integration Module
 *
 * This module integrates all the new 120% upgrade services:
 * - Resume Manager (checkpoint/resume system)
 * - Multi-Browser Engine (Puppeteer + Playwright)
 * - Fingerprint Generator (Crawlee fingerprint-suite)
 * - Auth Cloner (authentication cloning)
 * - WACZ Exporter (web archive format)
 * - Clone API Service (REST API)
 * - Behavioral Simulation 2.0 (advanced anti-detection)
 *
 * These features make Merlin the #1 website cloner in the world.
 */

import { ResumeManager, createResumeManager, type CloneCheckpoint, type ResumeResult } from './resumeManager.js';
import { MultiBrowserEngine, createMultiBrowserEngine, type BrowserEngine, type MultiBrowserConfig } from './multiBrowserEngine.js';
import {
  generateFingerprint,
  getSessionFingerprint,
  injectFingerprintPuppeteer,
  generateFromProfile,
  FINGERPRINT_PROFILES,
  type FingerprintOptions,
  type GeneratedFingerprint
} from './fingerprintGenerator.js';
import { AuthCloner, createAuthCloner, type AuthConfig, type AuthSession } from './authCloner.js';
import { WACZExporter, createWACZExporter, exportCloneToWACZ, type WACZOptions } from './waczExporter.js';
import { CloneApiService, createCloneApiService, initializeCloneApi, type CloneJob, type CloneJobOptions } from './cloneApiService.js';
import {
  advancedMouseMove,
  momentumScroll,
  realisticTyping,
  simulateFocusBlur,
  getTimeOfDayConfig,
  createSessionPersona,
  type BehavioralConfig
} from './behavioralSimulation.js';
import type { Page, Browser } from 'puppeteer';
import type { BrowserContext } from 'playwright';

export interface AdvancedCloneOptions {
  // Resume options
  enableResume?: boolean;
  resumeFromCheckpoint?: boolean;

  // Browser options
  browserEngine?: BrowserEngine;
  rotateBrowsers?: boolean;
  autoFallbackOnDetection?: boolean;

  // Fingerprint options
  fingerprintProfile?: keyof typeof FINGERPRINT_PROFILES;
  customFingerprint?: FingerprintOptions;

  // Authentication options
  authentication?: AuthConfig;
  saveSession?: boolean;
  sessionPath?: string;

  // Export options
  exportToWACZ?: boolean;
  waczOptions?: WACZOptions;

  // Behavioral options
  advancedBehavior?: boolean;
  behaviorConfig?: Partial<BehavioralConfig>;
}

export interface AdvancedCloneResult {
  resumeCheckpoint?: CloneCheckpoint;
  browserEngineUsed?: BrowserEngine;
  fingerprintUsed?: GeneratedFingerprint;
  authSession?: AuthSession;
  waczExportPath?: string;
  behaviorStats?: {
    mouseMoves: number;
    scrollActions: number;
    typingActions: number;
    focusBlurEvents: number;
  };
}

/**
 * Advanced Features Manager
 * Orchestrates all the new 120% upgrade services
 */
export class AdvancedFeaturesManager {
  private resumeManager: ResumeManager | null = null;
  private multiBrowserEngine: MultiBrowserEngine | null = null;
  private authCloner: AuthCloner;
  private waczExporter: WACZExporter | null = null;
  private apiService: CloneApiService | null = null;
  private currentFingerprint: GeneratedFingerprint | null = null;
  private behaviorStats = {
    mouseMoves: 0,
    scrollActions: 0,
    typingActions: 0,
    focusBlurEvents: 0,
  };

  constructor() {
    this.authCloner = createAuthCloner();
  }

  /**
   * Initialize resume manager for a clone job
   */
  async initializeResume(outputDir: string): Promise<ResumeResult> {
    this.resumeManager = createResumeManager(outputDir);
    return this.resumeManager.checkForResume();
  }

  /**
   * Start a new checkpoint for fresh clone
   */
  async startNewCheckpoint(url: string, outputDir: string, options: any): Promise<void> {
    if (!this.resumeManager) {
      this.resumeManager = createResumeManager(outputDir);
    }
    await this.resumeManager.initializeCheckpoint(url, options);
  }

  /**
   * Restore checkpoint for resume
   */
  restoreCheckpoint(checkpoint: CloneCheckpoint): void {
    if (this.resumeManager) {
      this.resumeManager.restoreCheckpoint(checkpoint);
    }
  }

  /**
   * Mark URL as completed
   */
  async markUrlCompleted(url: string): Promise<void> {
    if (this.resumeManager) {
      await this.resumeManager.markUrlCompleted(url);
    }
  }

  /**
   * Mark URL as failed
   */
  async markUrlFailed(url: string, error: string): Promise<void> {
    if (this.resumeManager) {
      await this.resumeManager.markUrlFailed(url, error);
    }
  }

  /**
   * Get pending URLs for resume
   */
  getPendingUrls(): string[] {
    return this.resumeManager?.getPendingUrls() || [];
  }

  /**
   * Save checkpoint
   */
  async saveCheckpoint(): Promise<void> {
    if (this.resumeManager) {
      await this.resumeManager.saveCheckpoint();
    }
  }

  /**
   * Mark clone as completed
   */
  async markCloneCompleted(): Promise<void> {
    if (this.resumeManager) {
      await this.resumeManager.markCompleted();
    }
  }

  /**
   * Get resume progress
   */
  getResumeProgress(): { pages: number; total: number; assets: number; bytes: number } {
    return this.resumeManager?.getProgress() || { pages: 0, total: 0, assets: 0, bytes: 0 };
  }

  /**
   * Initialize multi-browser engine
   */
  initializeMultiBrowser(config?: Partial<MultiBrowserConfig>): MultiBrowserEngine {
    this.multiBrowserEngine = createMultiBrowserEngine(config);
    return this.multiBrowserEngine;
  }

  /**
   * Get multi-browser engine
   */
  getMultiBrowserEngine(): MultiBrowserEngine | null {
    return this.multiBrowserEngine;
  }

  /**
   * Launch browser with best engine
   */
  async launchBestBrowser(options?: {
    headless?: boolean;
    proxy?: { server: string; username?: string; password?: string };
  }): Promise<{ browser: any; engine: BrowserEngine; id: string }> {
    if (!this.multiBrowserEngine) {
      this.multiBrowserEngine = createMultiBrowserEngine();
    }

    const bestEngine = this.multiBrowserEngine.getBestEngine();
    return this.multiBrowserEngine.launch({
      engine: bestEngine,
      headless: options?.headless ?? true,
      proxy: options?.proxy,
    });
  }

  /**
   * Generate fingerprint for session
   */
  async generateFingerprint(
    sessionId: string,
    profile?: keyof typeof FINGERPRINT_PROFILES
  ): Promise<GeneratedFingerprint> {
    if (profile) {
      this.currentFingerprint = await generateFromProfile(profile);
    } else {
      this.currentFingerprint = await getSessionFingerprint(sessionId);
    }
    return this.currentFingerprint;
  }

  /**
   * Apply fingerprint to Puppeteer page
   */
  async applyFingerprintToPuppeteer(page: Page): Promise<void> {
    if (this.currentFingerprint) {
      await injectFingerprintPuppeteer(page, this.currentFingerprint);
    }
  }

  /**
   * Get current fingerprint
   */
  getCurrentFingerprint(): GeneratedFingerprint | null {
    return this.currentFingerprint;
  }

  /**
   * Apply authentication to page
   */
  async applyAuthentication(page: Page, config: AuthConfig): Promise<void> {
    await this.authCloner.applyAuth(page, config);
  }

  /**
   * Perform automated login
   */
  async performLogin(page: Page, config: AuthConfig): Promise<boolean> {
    return this.authCloner.performLogin(page, config);
  }

  /**
   * Save authentication session
   */
  async saveAuthSession(page: Page, sessionPath?: string): Promise<AuthSession> {
    return this.authCloner.saveSession(page, sessionPath);
  }

  /**
   * Load authentication session
   */
  async loadAuthSession(sessionPath: string): Promise<AuthSession | null> {
    return this.authCloner.loadSession(sessionPath);
  }

  /**
   * Apply saved session to page
   */
  async applyAuthSession(page: Page, session: AuthSession): Promise<void> {
    await this.authCloner.applySavedSession(page, session);
  }

  /**
   * Check if we have valid session for domain
   */
  hasValidAuthSession(domain: string): boolean {
    return this.authCloner.hasValidSession(domain);
  }

  /**
   * Initialize WACZ exporter
   */
  initializeWACZExporter(options?: WACZOptions): WACZExporter {
    this.waczExporter = createWACZExporter(options);
    return this.waczExporter;
  }

  /**
   * Export clone to WACZ format
   */
  async exportToWACZ(
    cloneDir: string,
    baseUrl: string,
    outputPath: string,
    options?: WACZOptions
  ): Promise<{ path: string; size: number; resourceCount: number }> {
    return exportCloneToWACZ(cloneDir, baseUrl, outputPath, options);
  }

  /**
   * Initialize REST API service
   */
  initializeApiService(): CloneApiService {
    this.apiService = createCloneApiService();
    return this.apiService;
  }

  /**
   * Get API service
   */
  getApiService(): CloneApiService | null {
    return this.apiService;
  }

  /**
   * Apply advanced behavioral simulation
   */
  async applyAdvancedBehavior(
    page: Page,
    config?: Partial<BehavioralConfig>
  ): Promise<void> {
    const persona = createSessionPersona();
    const timeConfig = getTimeOfDayConfig();
    const finalConfig = { ...persona, ...timeConfig, ...config };

    // Simulate realistic initial behavior
    const viewport = page.viewport();
    const width = viewport?.width || 1920;
    const height = viewport?.height || 1080;

    // Random initial mouse movement
    const startX = Math.random() * width * 0.3;
    const startY = Math.random() * height * 0.3;
    const endX = width * 0.5 + Math.random() * width * 0.3;
    const endY = height * 0.5 + Math.random() * height * 0.3;

    await advancedMouseMove(page, endX, endY, finalConfig);
    this.behaviorStats.mouseMoves++;

    // Initial scroll
    const scrollDistance = 200 + Math.random() * 300;
    await momentumScroll(page, scrollDistance, 'down');
    this.behaviorStats.scrollActions++;

    // Random focus blur event
    if (Math.random() < 0.3) {
      await simulateFocusBlur(page, 500 + Math.random() * 2000);
      this.behaviorStats.focusBlurEvents++;
    }
  }

  /**
   * Simulate realistic typing
   */
  async simulateTyping(
    page: Page,
    text: string,
    config?: Partial<BehavioralConfig>
  ): Promise<void> {
    const finalConfig = config || createSessionPersona();
    await realisticTyping(page, text, finalConfig);
    this.behaviorStats.typingActions++;
  }

  /**
   * Get behavior stats
   */
  getBehaviorStats(): typeof this.behaviorStats {
    return { ...this.behaviorStats };
  }

  /**
   * Reset behavior stats
   */
  resetBehaviorStats(): void {
    this.behaviorStats = {
      mouseMoves: 0,
      scrollActions: 0,
      typingActions: 0,
      focusBlurEvents: 0,
    };
  }

  /**
   * Get complete advanced clone result
   */
  getAdvancedResult(): AdvancedCloneResult {
    return {
      resumeCheckpoint: this.resumeManager?.['checkpoint'] || undefined,
      browserEngineUsed: this.multiBrowserEngine?.getBestEngine(),
      fingerprintUsed: this.currentFingerprint || undefined,
      behaviorStats: this.getBehaviorStats(),
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    if (this.multiBrowserEngine) {
      await this.multiBrowserEngine.closeAll();
    }
    this.authCloner.clearSessions();
    this.waczExporter?.clear();
    this.resetBehaviorStats();
  }
}

/**
 * Factory function to create advanced features manager
 */
export function createAdvancedFeaturesManager(): AdvancedFeaturesManager {
  return new AdvancedFeaturesManager();
}

// Re-export all types and functions for convenience
export {
  ResumeManager,
  createResumeManager,
  MultiBrowserEngine,
  createMultiBrowserEngine,
  generateFingerprint,
  getSessionFingerprint,
  injectFingerprintPuppeteer,
  generateFromProfile,
  FINGERPRINT_PROFILES,
  AuthCloner,
  createAuthCloner,
  WACZExporter,
  createWACZExporter,
  exportCloneToWACZ,
  CloneApiService,
  createCloneApiService,
  initializeCloneApi,
  advancedMouseMove,
  momentumScroll,
  realisticTyping,
  simulateFocusBlur,
  getTimeOfDayConfig,
  createSessionPersona,
};

export type {
  CloneCheckpoint,
  ResumeResult,
  BrowserEngine,
  MultiBrowserConfig,
  FingerprintOptions,
  GeneratedFingerprint,
  AuthConfig,
  AuthSession,
  WACZOptions,
  CloneJob,
  CloneJobOptions,
  BehavioralConfig,
};
