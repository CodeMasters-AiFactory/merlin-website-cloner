/**
 * Enhanced Clone API Routes
 * Adds world-class features to the clone API:
 * - Visual verification
 * - Disaster recovery testing
 * - CDN caching
 * - Enhanced progress tracking
 */

import express from 'express';
import { EnhancedCloneOrchestrator, type EnhancedCloneOptions, type EnhancedCloneResult } from '../services/enhancedCloneOrchestrator.js';
import { authenticateToken, type AuthRequest } from './auth.js';
import { cloneRateLimiter, validateCloneUrl } from './security.js';
import { db } from './database.js';
import { MonitoringService } from '../services/monitoring.js';
import fs from 'fs-extra';
import path from 'path';

const router = express.Router();

// Global enhanced orchestrator instance
let enhancedOrchestrator: EnhancedCloneOrchestrator | null = null;
let orchestratorInitializing = false;

// Active enhanced progress trackers (jobId -> SSE clients)
const enhancedProgressClients: Map<string, Set<express.Response>> = new Map();

/**
 * Initialize the enhanced orchestrator (call at server startup)
 */
export async function initializeEnhancedOrchestrator(): Promise<void> {
  if (enhancedOrchestrator || orchestratorInitializing) return;
  
  orchestratorInitializing = true;
  console.log('🚀 Initializing Enhanced Clone Orchestrator...');
  
  try {
    enhancedOrchestrator = new EnhancedCloneOrchestrator();
    
    // Pre-build CDN cache (this may take a few minutes first time)
    await enhancedOrchestrator.initializeCDNCache((progress) => {
      console.log(`  📦 Caching ${progress.library} (${progress.current}/${progress.total})`);
    });
    
    console.log('✅ Enhanced Clone Orchestrator ready!');
  } catch (error) {
    console.error('❌ Failed to initialize Enhanced Clone Orchestrator:', error);
    enhancedOrchestrator = null;
  } finally {
    orchestratorInitializing = false;
  }
}

/**
 * GET /api/enhanced/status
 * Check if enhanced features are available
 */
router.get('/status', (req, res) => {
  const cdnStats = enhancedOrchestrator?.getCDNStats();
  
  res.json({
    available: !!enhancedOrchestrator,
    initializing: orchestratorInitializing,
    features: {
      visualVerification: !!enhancedOrchestrator,
      disasterRecoveryTest: !!enhancedOrchestrator,
      cdnCache: !!enhancedOrchestrator,
      enhancedProgress: !!enhancedOrchestrator,
    },
    cdnCache: cdnStats ? {
      totalLibraries: cdnStats.totalLibraries,
      totalFiles: cdnStats.totalFiles,
      totalSizeMB: (cdnStats.totalSize / 1024 / 1024).toFixed(1),
      hitRate: `${cdnStats.hitRate.toFixed(1)}%`,
    } : null,
  });
});

/**
 * POST /api/enhanced/clone
 * Start an enhanced clone with visual verification and DR testing
 */
router.post('/clone', cloneRateLimiter, authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Check if orchestrator is ready
    if (!enhancedOrchestrator) {
      return res.status(503).json({ 
        error: 'Enhanced cloning not available',
        message: orchestratorInitializing 
          ? 'System is initializing, please try again in a moment'
          : 'Enhanced features failed to initialize'
      });
    }

    const { url, options = {} } = req.body;
    const userId = req.userId!;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL (SSRF protection)
    const urlValidation = validateCloneUrl(url);
    if (!urlValidation.valid) {
      return res.status(400).json({ error: urlValidation.error });
    }

    // Check user limits
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const maxPages = options?.maxPages || 100;
    if (user.pagesUsed + maxPages > user.pagesLimit) {
      return res.status(403).json({
        error: 'Page limit exceeded',
        pagesUsed: user.pagesUsed,
        pagesLimit: user.pagesLimit
      });
    }

    const outputDir = `./clones/${userId}/${Date.now()}`;
    await fs.ensureDir(outputDir);

    // Create job with enhanced fields
    const job = db.createJob({
      userId,
      url,
      status: 'processing',
      progress: 0,
      pagesCloned: 0,
      assetsCaptured: 0,
      outputDir,
      errors: [],
      enhanced: true, // Mark as enhanced job
    });

    // Initialize SSE clients for this job
    enhancedProgressClients.set(job.id, new Set());

    // Build enhanced options
    const enhancedOptions: EnhancedCloneOptions = {
      url,
      outputDir,
      maxPages: options.maxPages || 100,
      maxDepth: options.maxDepth || 5,
      verifyAfterClone: options.verifyAfterClone !== false,
      exportFormat: options.exportFormat || 'zip',
      
      // Enhanced features
      enableVisualVerification: options.enableVisualVerification !== false,
      visualThreshold: options.visualThreshold || 0.05,
      enableDisasterRecoveryTest: options.enableDisasterRecoveryTest !== false,
      enableCDNCache: options.enableCDNCache !== false,
      generateCertificate: options.generateCertificate !== false,
      
      // Progress callbacks
      onEnhancedProgress: (state) => {
        // Update database
        db.updateJob(job.id, {
          progress: Math.round(state.overallProgress),
          currentUrl: state.message,
          pagesCloned: state.pagesCompleted,
          assetsCaptured: state.assetsDownloaded,
          enhancedProgress: {
            phases: state.phases,
            pagesTotal: state.totalPages,
            pagesCompleted: state.pagesCompleted,
            estimatedTimeRemaining: state.estimatedTimeRemaining,
          },
          recentFiles: state.recentActivity.slice(0, 20).map(a => ({
            path: a.url || '',
            size: 0,
            timestamp: new Date(a.timestamp).toISOString(),
            type: a.type,
          })),
        });

        // Broadcast to SSE clients
        const clients = enhancedProgressClients.get(job.id);
        if (clients) {
          const progressData = JSON.stringify({
            ...state,
            pages: Array.from(state.pages.entries()).slice(-10), // Last 10 pages
          });
          clients.forEach(client => {
            client.write(`data: ${progressData}\n\n`);
          });
        }
      },
      
      onProgress: (progress) => {
        // Standard progress update
        db.updateJob(job.id, {
          progress: progress.totalPages > 0 
            ? Math.round((progress.currentPage / progress.totalPages) * 100)
            : 0,
          message: progress.message,
        });
      },
    };

    // Start enhanced cloning in background
    enhancedOrchestrator.clone(enhancedOptions).then(async (result) => {
      // Update job with full result
      db.updateJob(job.id, {
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        pagesCloned: result.pagesCloned,
        assetsCaptured: result.assetsCaptured,
        exportPath: result.exportPath,
        completedAt: new Date().toISOString(),
        errors: result.errors,
        
        // Enhanced results
        verification: result.verificationResult ? {
          passed: result.verificationResult.passed,
          score: result.verificationResult.score,
          summary: result.verificationResult.summary,
          timestamp: result.verificationResult.timestamp,
        } : undefined,
        
        visualVerification: result.visualVerification ? {
          overallScore: result.visualVerification.overallScore,
          certified: result.visualVerification.certified,
          pagesPassed: result.visualVerification.pagesPassed,
          pagesFailed: result.visualVerification.pagesFailed,
          certificateHash: result.visualVerification.certificateHash,
        } : undefined,
        
        disasterRecoveryTest: result.disasterRecoveryTest ? {
          overallScore: result.disasterRecoveryTest.overallScore,
          certified: result.disasterRecoveryTest.certified,
          tests: {
            homepage: result.disasterRecoveryTest.tests.homepage.passed,
            allPages: result.disasterRecoveryTest.tests.allPages.passed,
            navigation: result.disasterRecoveryTest.tests.navigation.passed,
            assets: result.disasterRecoveryTest.tests.assets.passed,
            responsiveness: result.disasterRecoveryTest.tests.responsiveness.passed,
          },
        } : undefined,
        
        certified: result.certified,
        certificateHash: result.certificateHash,
        certificatePath: result.certificatePath,
        
        enhancedStats: result.enhancedStats,
      });

      // Track usage
      if (result.pagesCloned > 0) {
        const updatedUser = db.getUserById(userId);
        if (updatedUser) {
          db.updateUser(userId, {
            pagesUsed: updatedUser.pagesUsed + result.pagesCloned
          });
        }
      }

      // Notify SSE clients of completion
      const clients = enhancedProgressClients.get(job.id);
      if (clients) {
        const completionData = JSON.stringify({
          status: 'complete',
          success: result.success,
          certified: result.certified,
        });
        clients.forEach(client => {
          client.write(`data: ${completionData}\n\n`);
          client.end();
        });
        enhancedProgressClients.delete(job.id);
      }

    }).catch((error) => {
      console.error('Enhanced clone error:', error);
      
      db.updateJob(job.id, {
        status: 'failed',
        errors: [error.message || String(error)],
        completedAt: new Date().toISOString()
      });

      // Notify SSE clients of failure
      const clients = enhancedProgressClients.get(job.id);
      if (clients) {
        const errorData = JSON.stringify({
          status: 'failed',
          error: error.message || String(error),
        });
        clients.forEach(client => {
          client.write(`data: ${errorData}\n\n`);
          client.end();
        });
        enhancedProgressClients.delete(job.id);
      }
    });

    // Return immediately with job ID
    res.json({
      id: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      enhanced: true,
      features: {
        visualVerification: enhancedOptions.enableVisualVerification,
        disasterRecoveryTest: enhancedOptions.enableDisasterRecoveryTest,
        cdnCache: enhancedOptions.enableCDNCache,
        certificate: enhancedOptions.generateCertificate,
      },
    });

  } catch (error) {
    console.error('Enhanced clone API error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/enhanced/jobs/:id/progress
 * Real-time enhanced progress with SSE
 */
router.get('/jobs/:id/progress', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const job = db.getJobById(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Add to clients list
  let clients = enhancedProgressClients.get(req.params.id);
  if (!clients) {
    clients = new Set();
    enhancedProgressClients.set(req.params.id, clients);
  }
  clients.add(res);

  // Send initial state
  const initialData = JSON.stringify({
    status: job.status,
    progress: job.progress,
    pagesCloned: job.pagesCloned,
    assetsCaptured: job.assetsCaptured,
    enhancedProgress: (job as any).enhancedProgress,
  });
  res.write(`data: ${initialData}\n\n`);

  // Clean up on client disconnect
  req.on('close', () => {
    clients?.delete(res);
    if (clients?.size === 0) {
      enhancedProgressClients.delete(req.params.id);
    }
  });
});

/**
 * GET /api/enhanced/jobs/:id/certificate
 * Download the certification document
 */
router.get('/jobs/:id/certificate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id) as any;

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!job.certified || !job.certificatePath) {
      return res.status(400).json({ error: 'This backup is not certified' });
    }

    const certPath = path.resolve(process.cwd(), job.certificatePath);
    if (!fs.existsSync(certPath)) {
      return res.status(404).json({ error: 'Certificate file not found' });
    }

    res.download(certPath, `certificate-${job.id}.json`);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/enhanced/jobs/:id/visual-report
 * Get visual verification report
 */
router.get('/jobs/:id/visual-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id) as any;

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!job.visualVerification) {
      return res.status(400).json({ error: 'Visual verification not available for this job' });
    }

    // Find the HTML report
    const reportDir = path.join(job.outputDir, 'verification', 'screenshots', 'reports');
    const reportFiles = await fs.readdir(reportDir).catch(() => []);
    const htmlReport = reportFiles.find(f => f.endsWith('.html'));

    if (!htmlReport) {
      return res.json(job.visualVerification);
    }

    res.sendFile(path.join(reportDir, htmlReport));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/enhanced/jobs/:id/dr-report
 * Get disaster recovery test report
 */
router.get('/jobs/:id/dr-report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id) as any;

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!job.disasterRecoveryTest) {
      return res.status(400).json({ error: 'Disaster recovery test not available for this job' });
    }

    // Find the HTML report
    const reportDir = path.join(job.outputDir, 'verification', 'disaster-recovery');
    const reportFiles = await fs.readdir(reportDir).catch(() => []);
    const htmlReport = reportFiles.find(f => f.endsWith('.html'));

    if (!htmlReport) {
      return res.json(job.disasterRecoveryTest);
    }

    res.sendFile(path.join(reportDir, htmlReport));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
