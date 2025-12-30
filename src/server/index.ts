/**
 * Main Server Entry Point
 * Express server for website cloning API
 * Updated: Auto-verification enabled
 * Security: COD-11 hardening applied
 */

// Load environment variables from .env files
import dotenv from 'dotenv';
dotenv.config(); // Load .env
dotenv.config({ path: '.env.services' }); // Load .env.services (proxy + CAPTCHA keys)
dotenv.config({ path: '.env.proxy' }); // Load .env.proxy (proxy only)

import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebsiteCloner } from '../services/websiteCloner.js';
import { MonitoringService } from '../services/monitoring.js';
import { LoggingService } from '../services/logging.js';
import { 
  authenticateToken, 
  optionalAuth, 
  generateToken, 
  hashPassword, 
  verifyPassword, 
  isLegacyHash,
  validatePassword,
  type AuthRequest 
} from './auth.js';
import {
  corsMiddleware,
  helmetMiddleware,
  generalRateLimiter,
  authRateLimiter,
  cloneRateLimiter,
  signupRateLimiter,
  validateCloneUrl,
  sanitizeRequest,
  securityHeaders,
} from './security.js';
import { db, type User, type PageProgress } from './database.js';
import fs from 'fs-extra';

// Track active job controllers for pause/stop functionality
interface JobController {
  abortController: AbortController;
  pauseFlag: { paused: boolean };
}
const activeJobControllers = new Map<string, JobController>();
import { ConfigManager } from '../services/configManager.js';
import { PaymentService } from '../services/paymentService.js';
import { merlinProxyNetwork } from '../services/proxyNetwork.js';
import { enhancedProxyNetwork } from '../services/proxyNetworkEnhanced.js';
import Stripe from 'stripe';
import enhancedRoutes, { initializeEnhancedOrchestrator } from './enhancedRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middleware (ORDER MATTERS!)
app.use(helmetMiddleware);           // Security headers first
app.use(corsMiddleware);             // CORS handling
app.use(compression());
app.use(securityHeaders);            // Additional security headers
app.use(sanitizeRequest);            // Sanitize all inputs
app.use(generalRateLimiter);         // General rate limiting
app.use(express.json({ limit: '10mb' }));  // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend build (but NOT for /api routes)
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use((req, res, next) => {
    // Skip static serving for API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    express.static(frontendPath)(req, res, next);
  });
}

const cloner = new WebsiteCloner();
const monitoring = new MonitoringService();
const logger = new LoggingService('./logs');
logger.initialize().catch(() => {}); // Initialize async, don't block
const configManager = new ConfigManager('./configs', logger);
configManager.initialize().catch(() => {}); // Initialize async, don't block

// Initialize our own proxy network (NO third-party providers!)
merlinProxyNetwork.initialize().catch(() => {});
console.log('🌐 Merlin Proxy Network initialized - Our own P2P network!');

// Mount enhanced routes (world-class features)
app.use('/api/enhanced', enhancedRoutes);

// Initialize enhanced orchestrator in background
initializeEnhancedOrchestrator().catch((err) => {
  console.warn('Enhanced features initialization deferred:', err);
});

// Initialize payment service (only if Stripe key is provided)
let paymentService: PaymentService | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    paymentService = new PaymentService();
  }
} catch (error) {
  console.warn('Payment service not initialized:', error);
}

// Middleware to track requests
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Track response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const method = req.method;
    const endpoint = req.path || req.route?.path || 'unknown';
    const status = res.statusCode;
    
    monitoring.recordRequest(method, endpoint, status, duration);
  });
  
  next();
});

/**
 * Authentication Routes
 */

// POST /api/auth/signup
app.post('/api/auth/signup', signupRateLimiter, authRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.errors.join(', ') });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    if (db.getUserByEmail(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password with bcrypt (secure!)
    const passwordHash = await hashPassword(password);

    // Default to starter plan with free trial credits
    const pagesLimit = 10; // Starter gets 10 pages per month

    const user = db.createUser({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      plan: 'starter',
      pagesLimit
    });

    // Give starter users 100 free trial credits
    db.resetMonthlyCredits(user.id, 100);

    // Generate proper JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/auth/login - PASSWORD-LESS LOGIN (No password verification, NO RATE LIMIT)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;

    // DEBUG: Log what's being received
    console.log('[DEBUG LOGIN - PASSWORD-LESS] Email:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // PASSWORD REMOVED: No verification, instant login!
    console.log(`[Auth] Password-less login for user ${user.id}`);

    // Generate proper JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  const user = db.getUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    pagesUsed: user.pagesUsed,
    pagesLimit: user.pagesLimit
  });
});

/**
 * Clone Routes
 */

// POST /api/clone
app.post('/api/clone', cloneRateLimiter, authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { url, options } = req.body;
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

    // Create job
    const job = db.createJob({
      userId,
      url,
      status: 'processing',
      progress: 0,
      pagesCloned: 0,
      assetsCaptured: 0,
      outputDir,
      errors: []
    });

    // Update active jobs metric
    const activeJobs = db.getJobsByUserId(userId).filter(j => j.status === 'processing').length;
    monitoring.setActiveJobs('clone', activeJobs);

    // Create abort controller and pause flag for this job
    const abortController = new AbortController();
    const pauseFlag = { paused: false };
    activeJobControllers.set(job.id, { abortController, pauseFlag });

    // Initialize pages progress tracking
    const pagesProgress: PageProgress[] = [];

    // Create a fresh cloner instance for this job to prevent asset map cross-contamination
    // when multiple clones run concurrently (critical fix for parallel clones)
    const jobCloner = new WebsiteCloner();

    // Start cloning in background with progress tracking
    jobCloner.clone({
      url,
      outputDir,
      ...options,
      abortSignal: abortController.signal,
      pauseFlag,
      onProgress: (progress) => {
        // Check if job was stopped
        if (abortController.signal.aborted) {
          return;
        }
        // Update job with progress
        const currentJob = db.getJobById(job.id);
        const recentFiles = progress.recentFiles || [];
        const existingFiles = currentJob?.recentFiles || [];

        // Merge recent files (keep last 20)
        const allFiles = [...existingFiles, ...recentFiles]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);

        // Update or add page progress entry
        if (progress.currentUrl) {
          const existingPageIndex = pagesProgress.findIndex(p => p.url === progress.currentUrl);
          if (existingPageIndex >= 0) {
            pagesProgress[existingPageIndex] = {
              ...pagesProgress[existingPageIndex],
              status: progress.status === 'complete' ? 'complete' : 'downloading',
              assetsDownloaded: progress.assetsCaptured,
            };
          } else {
            pagesProgress.push({
              url: progress.currentUrl,
              status: 'downloading',
              startedAt: new Date().toISOString(),
              assetsTotal: 10, // Estimate
              assetsDownloaded: 0,
            });
          }
        }

        db.updateJob(job.id, {
          progress: progress.totalPages > 0
            ? Math.round((progress.currentPage / progress.totalPages) * 100)
            : 0,
          currentUrl: progress.currentUrl,
          currentStatus: progress.status,
          message: progress.message,
          pagesCloned: progress.currentPage,
          assetsCaptured: progress.assetsCaptured || currentJob?.assetsCaptured || 0,
          recentFiles: allFiles,
          pagesProgress: pagesProgress.slice(-50), // Keep last 50 pages
        });
      }
    }).then(async (result) => {
      // Clean up controller
      activeJobControllers.delete(job.id);

      // Record metrics
      if (result.pagesCloned > 0) {
        monitoring.recordPageCloned('success');
      }
      if (result.errors.length > 0) {
        monitoring.recordError('clone', 'medium');
      }

      // Update active jobs metric
      const activeJobs = db.getJobsByUserId(userId).filter(j => j.status === 'processing').length;
      monitoring.setActiveJobs('clone', activeJobs);
      
      // Update job with verification result
      db.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        pagesCloned: result.pagesCloned || 0,
        assetsCaptured: result.assetsCaptured || 0,
        exportPath: result.exportPath,
        completedAt: new Date().toISOString(),
        verification: result.verificationResult ? {
          passed: result.verificationResult.passed,
          score: result.verificationResult.score,
          summary: result.verificationResult.summary,
          timestamp: result.verificationResult.timestamp,
          checks: result.verificationResult.checks?.slice(0, 10) // Limit stored checks
        } : undefined
      });

      // Track usage
      if (result.pagesCloned > 0) {
        const updatedUser = db.getUserById(userId);
        if (updatedUser) {
          db.updateUser(userId, {
            pagesUsed: updatedUser.pagesUsed + result.pagesCloned
          });

          // Track in payment service if available
          if (paymentService) {
            paymentService.trackUsage(userId, result.pagesCloned).catch(err => {
              logger.error('Failed to track usage', err as Error, { userId });
            });
          }
        }
      }

    }).catch((error) => {
      // Clean up controller
      activeJobControllers.delete(job.id);

      console.error('Clone error:', error);

      // Record error metric
      monitoring.recordError('clone', 'high');
      monitoring.recordPageCloned('failed');

      // Update active jobs metric
      const activeJobs = db.getJobsByUserId(userId).filter(j => j.status === 'processing').length;
      monitoring.setActiveJobs('clone', activeJobs);

      // Check if it was an abort (user stopped)
      const wasAborted = abortController.signal.aborted;

      db.updateJob(job.id, {
        status: 'failed',
        errors: [wasAborted ? 'Clone stopped by user' : (error.message || String(error))],
        completedAt: new Date().toISOString()
      });
    });

    res.json({
      id: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/jobs - Admins see ALL jobs, regular users see only their own
app.get('/api/jobs', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;

  // Get user to check admin status
  const user = db.getUserById(userId);

  // If user is admin, show ALL jobs from ALL users
  if (user && (user.isAdmin || user.role === 'admin')) {
    console.log(`[Admin Access] ${user.email} viewing ALL jobs`);
    const allJobs = db.getAllJobs();
    return res.json(allJobs);
  }

  // Regular users see only their own jobs
  const jobs = db.getJobsByUserId(userId);
  res.json(jobs);
});

// GET /api/jobs/:id - Admins can view any job, users can only view their own
app.get('/api/jobs/:id', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const job = db.getJobById(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Get user to check admin status
  const user = db.getUserById(userId);
  const isAdmin = user && (user.isAdmin || user.role === 'admin');

  // Admins can view any job, regular users only their own
  if (job.userId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(job);
});

// DELETE /api/jobs/:id - Delete a clone job
app.delete('/api/jobs/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the clone files if they exist
    if (job.outputDir) {
      const absPath = path.resolve(process.cwd(), job.outputDir);
      if (fs.existsSync(absPath)) {
        await fs.remove(absPath);
      }
    }

    // Delete the export file if it exists
    if (job.exportPath) {
      const absPath = path.resolve(process.cwd(), job.exportPath);
      if (fs.existsSync(absPath)) {
        await fs.remove(absPath);
      }
    }

    // Delete from database
    db.deleteJob(req.params.id);

    res.json({ success: true, message: 'Clone deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/jobs/:id/progress - Real-time progress with SSE
app.get('/api/jobs/:id/progress', authenticateToken, (req: AuthRequest, res) => {
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

  // Send initial progress
  const sendProgress = () => {
    const currentJob = db.getJobById(req.params.id);
    if (!currentJob) {
      res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
      res.end();
      return;
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (currentJob.startTime && currentJob.progress > 0 && currentJob.status === 'processing') {
      const elapsed = (Date.now() - new Date(currentJob.startTime).getTime()) / 1000; // seconds
      const rate = currentJob.progress / elapsed; // % per second
      if (rate > 0) {
        estimatedTimeRemaining = Math.round((100 - currentJob.progress) / rate);
      }
    }

    const progressData = {
      currentPage: currentJob.pagesCloned,
      totalPages: currentJob.pagesCloned + (currentJob.status === 'processing' ? 10 : 0), // Estimate
      currentUrl: currentJob.currentUrl || currentJob.url,
      status: currentJob.status === 'processing' ? 'crawling' : currentJob.status,
      message: currentJob.message || `Cloning ${currentJob.url}...`,
      assetsCaptured: currentJob.assetsCaptured,
      pagesCloned: currentJob.pagesCloned,
      progress: currentJob.progress,
      recentFiles: currentJob.recentFiles || [],
      estimatedTimeRemaining,
      errors: currentJob.errors || []
    };

    res.write(`data: ${JSON.stringify(progressData)}\n\n`);

    // If completed or failed, close connection
    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      res.end();
      return;
    }
  };

  // Send progress every second
  const interval = setInterval(sendProgress, 1000);
  sendProgress(); // Send immediately

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// POST /api/jobs/:id/stop - Stop a running clone job
app.post('/api/jobs/:id/stop', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId!;

    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check access (admins can stop any job)
    const user = db.getUserById(userId);
    const isAdmin = user && ((user as any).isAdmin || (user as any).role === 'admin');
    if (job.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== 'processing' && job.status !== 'paused') {
      return res.status(400).json({ error: 'Job is not running or paused' });
    }

    // Signal abort to the running job
    const controller = activeJobControllers.get(jobId);
    if (controller) {
      controller.abortController.abort();
      activeJobControllers.delete(jobId);
    }

    // Update job status
    db.updateJob(jobId, {
      status: 'failed',
      message: 'Stopped by user',
      errors: [...(job.errors || []), 'Clone stopped by user'],
      completedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Job stopped' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/jobs/:id/pause - Pause a running clone job
app.post('/api/jobs/:id/pause', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId!;

    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check access
    const user = db.getUserById(userId);
    const isAdmin = user && ((user as any).isAdmin || (user as any).role === 'admin');
    if (job.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== 'processing') {
      return res.status(400).json({ error: 'Job is not running' });
    }

    // Set pause flag
    const controller = activeJobControllers.get(jobId);
    if (controller) {
      controller.pauseFlag.paused = true;
    }

    // Update job status
    db.updateJob(jobId, {
      status: 'paused',
      pausedAt: new Date().toISOString(),
      message: 'Paused by user'
    });

    res.json({ success: true, message: 'Job paused' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/jobs/:id/resume - Resume a paused clone job
app.post('/api/jobs/:id/resume', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId!;

    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check access
    const user = db.getUserById(userId);
    const isAdmin = user && ((user as any).isAdmin || (user as any).role === 'admin');
    if (job.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== 'paused') {
      return res.status(400).json({ error: 'Job is not paused' });
    }

    // Clear pause flag if controller exists
    const controller = activeJobControllers.get(jobId);
    if (controller) {
      controller.pauseFlag.paused = false;
    }

    // Update job status
    db.updateJob(jobId, {
      status: 'processing',
      pausedAt: undefined,
      message: 'Resumed'
    });

    res.json({ success: true, message: 'Job resumed' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/jobs/:id/pages - Get per-page progress for a job
app.get('/api/jobs/:id/pages', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const job = db.getJobById(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Check access
  const user = db.getUserById(userId);
  const isAdmin = user && ((user as any).isAdmin || (user as any).role === 'admin');
  if (job.userId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    totalPages: job.pagesCloned + (job.pagesProgress?.filter(p => p.status === 'pending').length || 0),
    pagesCloned: job.pagesCloned,
    pagesProgress: job.pagesProgress || [],
    currentUrl: job.currentUrl,
    message: job.message
  });
});

// GET /api/download/:id
app.get('/api/download/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== 'completed' || !job.exportPath) {
      return res.status(400).json({ error: 'Job not completed or export not available' });
    }

    if (!fs.existsSync(job.exportPath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    res.download(job.exportPath);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/preview/:id - Preview cloned website (serve static files)
app.get('/api/preview/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!job.outputDir || !fs.existsSync(job.outputDir)) {
      return res.status(404).json({ error: 'Clone output not found' });
    }

    // Return preview info
    res.json({
      id: job.id,
      url: job.url,
      outputDir: job.outputDir,
      previewUrl: `/preview/${job.id}/`,
      status: job.status,
      pagesCloned: job.pagesCloned,
      assetsCaptured: job.assetsCaptured,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to find index.html recursively
function findIndexHtml(dir: string, depth = 0): string | null {
  if (depth > 3) return null; // Don't go too deep

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // First check if index.html exists in current dir
    if (entries.some(e => e.isFile() && e.name === 'index.html')) {
      return path.join(dir, 'index.html');
    }

    // Check for any .html file
    const htmlFile = entries.find(e => e.isFile() && e.name.endsWith('.html'));
    if (htmlFile) {
      return path.join(dir, htmlFile.name);
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const found = findIndexHtml(path.join(dir, entry.name), depth + 1);
        if (found) return found;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

// Helper to get all files recursively
function getAllFiles(dir: string, baseDir: string = dir): Array<{path: string; relativePath: string; isDir: boolean}> {
  const results: Array<{path: string; relativePath: string; isDir: boolean}> = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        results.push({ path: fullPath, relativePath, isDir: true });
        results.push(...getAllFiles(fullPath, baseDir));
      } else {
        results.push({ path: fullPath, relativePath, isDir: false });
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return results;
}

// Serve cloned website files for preview (using optional auth for static files)
app.use('/preview/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const jobId = req.params.id;
    let outputDir: string | null = null;
    let staticExportDir: string | null = null;

    // First try to get from database
    const job = db.getJobById(jobId);
    if (job?.outputDir) {
      // Make path absolute
      const absOutputDir = path.resolve(process.cwd(), job.outputDir);
      if (fs.existsSync(absOutputDir)) {
        outputDir = absOutputDir;
        // Check for static export in parent directory
        const parentDir = path.dirname(absOutputDir);
        const staticPath = path.join(parentDir, 'clone-export.static');
        if (fs.existsSync(staticPath)) {
          staticExportDir = staticPath;
        }
      }
    }

    // Fallback: try to find in clones directory by job ID
    if (!outputDir) {
      const clonesDir = path.join(process.cwd(), 'clones');
      if (fs.existsSync(clonesDir)) {
        // Search for directory containing jobId
        const userDirs = fs.readdirSync(clonesDir);
        for (const userDir of userDirs) {
          const userPath = path.join(clonesDir, userDir);
          if (fs.statSync(userPath).isDirectory()) {
            // Check if this is the jobId directly
            if (userDir === jobId) {
              outputDir = userPath;
              // Check for static export
              const staticPath = path.join(userPath, 'clone-export.static');
              if (fs.existsSync(staticPath)) {
                staticExportDir = staticPath;
              }
              break;
            }
            // Check subdirectories
            const jobDirs = fs.readdirSync(userPath);
            for (const jobDir of jobDirs) {
              if (jobDir === jobId) {
                outputDir = path.join(userPath, jobDir);
                // Check for static export in parent (userPath)
                const staticPath = path.join(userPath, 'clone-export.static');
                if (fs.existsSync(staticPath)) {
                  staticExportDir = staticPath;
                }
                break;
              }
            }
          }
          if (outputDir) break;
        }
      }
    }

    if (!outputDir) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Preview Not Found</h1>
          <p>Clone ID: ${jobId}</p>
          <p>This cloned website is no longer available or hasn't been created yet.</p>
          <a href="/dashboard">Back to Dashboard</a>
        </body></html>
      `);
    }

    // Prefer static export directory if available (has the processed HTML)
    const previewDir = staticExportDir || outputDir;

    // Get the requested file path
    const requestPath = req.url.replace(/^\//, '').replace(`${jobId}/`, '').replace(`${jobId}`, '') || '';

    // Try to find the file
    let targetPath = path.join(previewDir, requestPath);

    // Helper function to serve HTML with fixes for offline viewing
    const serveHtmlWithFixes = (filePath: string) => {
      try {
        let html = fs.readFileSync(filePath, 'utf-8');

        // Remove Content-Security-Policy meta tag that might block local resources
        html = html.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, '');

        // Fix Nuxt/Vue BASE_URL configuration that causes redirects to original domain
        html = html.replace(/BASE_URL:"https?:\/\/[^"]+"/g, `BASE_URL:""`);
        html = html.replace(/baseURL:"https?:\/\/[^"]+"/g, `baseURL:"/preview/${jobId}/"`);

        // Remove canonical URLs that point to original domain
        html = html.replace(/<link[^>]*rel="canonical"[^>]*href="https?:\/\/[^"]*"[^>]*>/gi, '');

        // Remove og:url meta tags pointing to original domain
        html = html.replace(/<meta[^>]*property="og:url"[^>]*content="https?:\/\/[^"]*"[^>]*>/gi, '');

        // Add base tag to ensure relative URLs work correctly
        const baseUrl = `/preview/${jobId}/`;
        if (!html.includes('<base')) {
          html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}">`);
        }

        // Disable service worker registration that might interfere
        html = html.replace(/navigator\.serviceWorker\.register/g, '(function(){})');

        // Add early intercept script that runs before any other JS
        const earlyInterceptScript = `
          <script>
            (function() {
              // Block history API redirects to external domains
              var origPushState = history.pushState;
              var origReplaceState = history.replaceState;
              history.pushState = function(s, t, url) {
                if (url && String(url).match(/^https?:\\/\\//i) && !String(url).includes(location.host)) {
                  console.log('[Clone] Blocked pushState to:', url);
                  return;
                }
                return origPushState.apply(history, arguments);
              };
              history.replaceState = function(s, t, url) {
                if (url && String(url).match(/^https?:\\/\\//i) && !String(url).includes(location.host)) {
                  console.log('[Clone] Blocked replaceState to:', url);
                  return;
                }
                return origReplaceState.apply(history, arguments);
              };
              // Block external fetch calls
              var origFetch = window.fetch;
              window.fetch = function(url) {
                if (typeof url === 'string' && url.match(/^https?:\\/\\//i) && !url.includes(location.host) && !url.includes('localhost')) {
                  console.log('[Clone] Blocked fetch to:', url);
                  return Promise.resolve(new Response('{}', {status: 200}));
                }
                return origFetch.apply(window, arguments);
              };
            })();
          </script>
        `;
        html = html.replace(/<head([^>]*)>/i, `<head$1>${earlyInterceptScript}`);

        // Add click/form intercept script
        const interceptScript = `
          <script>
            document.addEventListener('click', function(e) {
              var link = e.target.closest('a');
              if (link && link.href) {
                try {
                  var url = new URL(link.href, location.origin);
                  if (url.hostname !== location.hostname && url.hostname !== 'localhost') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Clone] Blocked click to:', link.href);
                    var local = link.getAttribute('href');
                    if (local && !local.match(/^(https?:)?\\/\\//)) {
                      location.href = local;
                    }
                    return false;
                  }
                } catch(err) {}
              }
            }, true);
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form && form.action) {
                try {
                  var url = new URL(form.action, location.origin);
                  if (url.hostname !== location.hostname && url.hostname !== 'localhost') {
                    e.preventDefault();
                    console.log('[Clone] Blocked form to:', form.action);
                    return false;
                  }
                } catch(err) {}
              }
            }, true);
          </script>
        `;
        html = html.replace('</body>', interceptScript + '</body>');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      } catch (err) {
        return res.sendFile(filePath);
      }
    };

    // If requesting root or index.html, find it
    if (!requestPath || requestPath === 'index.html' || requestPath === '/') {
      const indexFile = findIndexHtml(previewDir);
      if (indexFile) {
        return serveHtmlWithFixes(indexFile);
      }
    }

    // Check if file exists directly
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      // Serve HTML files with fixes
      if (targetPath.endsWith('.html') || targetPath.endsWith('.htm')) {
        return serveHtmlWithFixes(targetPath);
      }
      return res.sendFile(targetPath);
    }

    // Try adding index.html for directory requests
    const indexInDir = path.join(targetPath, 'index.html');
    if (fs.existsSync(indexInDir)) {
      return serveHtmlWithFixes(indexInDir);
    }

    // List all available files for debugging
    const allFiles = getAllFiles(previewDir);
    const htmlFiles = allFiles.filter(f => !f.isDir && f.relativePath.endsWith('.html'));
    const otherFiles = allFiles.filter(f => !f.isDir && !f.relativePath.endsWith('.html')).slice(0, 20);

    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Clone Preview - File Browser</title></head>
      <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1>Clone File Browser</h1>
        <p>Clone ID: ${jobId}</p>
        <p>Preview Directory: ${previewDir}</p>
        ${staticExportDir ? '<p style="color: green;">✓ Using static export (processed HTML)</p>' : ''}
        ${requestPath ? `<p>Requested: ${requestPath} (not found)</p>` : ''}

        <h3>HTML Files:</h3>
        <ul>
          ${htmlFiles.length > 0
            ? htmlFiles.map(f => `<li><a href="/preview/${jobId}/${f.relativePath}">${f.relativePath}</a></li>`).join('')
            : '<li>No HTML files found</li>'
          }
        </ul>

        <h3>Other Files (first 20):</h3>
        <ul>
          ${otherFiles.map(f => `<li><a href="/preview/${jobId}/${f.relativePath}">${f.relativePath}</a></li>`).join('')}
        </ul>

        <p><a href="/dashboard">Back to Dashboard</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>Preview Error</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <a href="/dashboard">Back to Dashboard</a>
      </body></html>
    `);
  }
});

/**
 * Metrics Endpoint (Prometheus)
 */
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoring.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Payment Routes
 */

// GET /api/payments/plans - Get all subscription plans
app.get('/api/payments/plans', (req, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const plans = paymentService.getPlans();
    res.json(plans);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/checkout - Create checkout session
app.post('/api/payments/checkout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const { planId } = req.body;
    const userId = req.user!.id;
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!planId || !['starter', 'pro', 'enterprise'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await paymentService.createCustomer(user.email, user.name, userId);
      customerId = customer.id;
      db.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const successUrl = `${req.protocol}://${req.get('host')}/dashboard?checkout=success`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/pricing?checkout=canceled`;
    const session = await paymentService.createCheckoutSession(customerId, planId, successUrl, cancelUrl);

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/billing-portal - Create billing portal session
app.post('/api/payments/billing-portal', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const userId = req.user!.id;
    const user = db.getUserById(userId);

    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const returnUrl = `${req.protocol}://${req.get('host')}/dashboard`;
    const session = await paymentService.createBillingPortalSession(user.stripeCustomerId, returnUrl);

    res.json({
      url: session.url,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/webhook - Stripe webhook handler
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const stripe = (paymentService as any).stripe as Stripe;
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err}` });
    }

    // Handle the event
    await paymentService.handleWebhook(event);

    // Update database based on event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;

      if (userId && planId) {
        const plan = paymentService.getPlan(planId);
        if (plan) {
          db.updateUser(userId, {
            plan: planId as 'starter' | 'pro' | 'enterprise',
            pagesLimit: plan.pagesLimit,
            subscriptionStatus: 'active',
          });
        }
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const planId = subscription.items.data[0]?.price.metadata?.planId || 'starter';
        const plan = paymentService.getPlan(planId);
        
        const subscriptionData = subscription as Stripe.Subscription & { current_period_end?: number };
        db.updateUser(userId, {
          subscriptionStatus: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing',
          subscriptionCurrentPeriodEnd: subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end * 1000).toISOString() : undefined,
          subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
          stripeSubscriptionId: subscription.id,
        });

        if (plan) {
          db.updateUser(userId, {
            plan: planId as 'starter' | 'pro' | 'enterprise',
            pagesLimit: plan.pagesLimit,
          });
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Downgrade to starter plan when subscription is canceled
        const starterPlan = paymentService.getPlan('starter');
        if (starterPlan) {
          db.updateUser(userId, {
            plan: 'starter',
            pagesLimit: 0, // No access until they resubscribe
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: undefined,
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/payments/usage - Get usage statistics
app.get('/api/payments/usage', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      pagesUsed: user.pagesUsed,
      pagesLimit: user.pagesLimit,
      pagesRemaining: user.pagesLimit === Infinity ? Infinity : Math.max(0, user.pagesLimit - user.pagesUsed),
      usagePercentage: user.pagesLimit === Infinity ? 0 : (user.pagesUsed / user.pagesLimit) * 100,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Credits API Routes
 */

// GET /api/credits - Get user's credit balance and info
app.get('/api/credits', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      balance: user.credits,
      usedThisMonth: user.creditsUsedThisMonth,
      includedMonthly: user.creditsIncludedMonthly || 100, // Default 100 credits for starter
      purchased: user.creditsPurchased,
      proxyCredits: user.proxyCredits || 0,
      lastReset: user.lastCreditReset,
      plan: user.plan,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/credits/packs - Get available credit packs
app.get('/api/credits/packs', (req, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }
    const packs = paymentService.getCreditPacks();
    res.json(packs);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/credits/purchase - Purchase credits
app.post('/api/credits/purchase', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const { packId } = req.body;
    const userId = req.user!.id;
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pack = paymentService.getCreditPack(packId);
    if (!pack) {
      return res.status(400).json({ error: 'Invalid pack ID' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await paymentService.createCustomer(user.email, user.name, userId);
      customerId = customer.id;
      db.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create checkout session for credit purchase
    const successUrl = `${req.protocol}://${req.get('host')}/dashboard?credits=success&pack=${packId}`;
    const cancelUrl = `${req.protocol}://${req.get('host')}/pricing?credits=canceled`;
    const session = await paymentService.createCreditCheckoutSession(
      customerId,
      packId,
      successUrl,
      cancelUrl,
      userId
    );

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/credits/history - Get credit transaction history
app.get('/api/credits/history', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = db.getCreditTransactions(userId, limit);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/credits/convert-proxy - Convert proxy credits to clone credits
app.post('/api/credits/convert-proxy', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { proxyCredits } = req.body;
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!proxyCredits || proxyCredits <= 0) {
      return res.status(400).json({ error: 'Invalid proxy credits amount' });
    }

    if (!user.proxyCredits || user.proxyCredits < proxyCredits) {
      return res.status(400).json({
        error: 'Insufficient proxy credits',
        available: user.proxyCredits || 0,
      });
    }

    // Convert at 10:1 ratio (10 clone credits per 1 proxy credit)
    const conversionRate = 10;
    const success = db.convertProxyCredits(userId, proxyCredits, conversionRate);

    if (!success) {
      return res.status(500).json({ error: 'Conversion failed' });
    }

    const updatedUser = db.getUserById(userId);
    res.json({
      success: true,
      cloneCreditsAdded: proxyCredits * conversionRate,
      newBalance: updatedUser?.credits,
      remainingProxyCredits: updatedUser?.proxyCredits,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/credits/estimate - Estimate credits needed for a clone job
app.post('/api/credits/estimate', authenticateToken, (req: AuthRequest, res) => {
  try {
    if (!paymentService) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const { pagesCount, assetsSizeMB, useDistributed, usePriorityQueue } = req.body;

    const creditsNeeded = paymentService.calculateCreditsNeeded({
      pagesCount: pagesCount || 1,
      assetsSizeMB,
      useDistributed,
      usePriorityQueue,
    });

    const userId = req.userId!;
    const user = db.getUserById(userId);
    const currentBalance = user?.credits || 0;

    res.json({
      creditsNeeded,
      currentBalance,
      sufficient: currentBalance >= creditsNeeded,
      shortfall: Math.max(0, creditsNeeded - currentBalance),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health Check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Autonomous Improvement System Routes
 * Dashboard API for viewing improvement cycles, deployments, alerts, and status
 */

// GET /api/autonomous/cycles - Get improvement cycle history
app.get('/api/autonomous/cycles', (req, res) => {
  try {
    const historyFile = path.join(__dirname, '../../data/improvement-history.json');
    if (fs.existsSync(historyFile)) {
      const cycles = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      res.json({ cycles: cycles.slice(-50) }); // Last 50 cycles
    } else {
      res.json({ cycles: [] });
    }
  } catch (error) {
    res.json({ cycles: [], error: 'Failed to load cycles' });
  }
});

// GET /api/autonomous/deployments - Get deployment history
app.get('/api/autonomous/deployments', (req, res) => {
  try {
    const historyFile = path.join(__dirname, '../../data/deployment-history.json');
    if (fs.existsSync(historyFile)) {
      const deployments = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      res.json({ deployments: deployments.slice(-50) }); // Last 50 deployments
    } else {
      res.json({ deployments: [] });
    }
  } catch (error) {
    res.json({ deployments: [], error: 'Failed to load deployments' });
  }
});

// GET /api/autonomous/alerts - Get watchdog alerts
app.get('/api/autonomous/alerts', (req, res) => {
  try {
    const alertsFile = path.join(__dirname, '../../data/watchdog-alerts.json');
    if (fs.existsSync(alertsFile)) {
      const alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf-8'));
      res.json({ alerts: alerts.slice(-100) }); // Last 100 alerts
    } else {
      res.json({ alerts: [] });
    }
  } catch (error) {
    res.json({ alerts: [], error: 'Failed to load alerts' });
  }
});

// GET /api/autonomous/status - Get autonomous system status
app.get('/api/autonomous/status', (req, res) => {
  try {
    // Read various status files
    const dataDir = path.join(__dirname, '../../data');

    const status = {
      autoImprover: {
        isRunning: fs.existsSync(path.join(dataDir, 'autoimprover-running.lock')),
        safeMode: false,
        consecutiveFailures: 0,
        currentCycle: null,
      },
      fixGenerator: {
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        dryRunMode: false,
        totalProposals: 0,
      },
      safeDeployer: {
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
      },
      emailNotifier: {
        provider: process.env.SENDGRID_API_KEY ? 'sendgrid' :
                  process.env.SMTP_HOST ? 'smtp' : 'console',
        configured: !!(process.env.EMAIL_TO || process.env.SENDGRID_API_KEY),
        totalSent: 0,
      },
    };

    // Try to load more detailed status from files
    try {
      const proposalsFile = path.join(dataDir, 'fix-proposals.json');
      if (fs.existsSync(proposalsFile)) {
        const proposals = JSON.parse(fs.readFileSync(proposalsFile, 'utf-8'));
        status.fixGenerator.totalProposals = proposals.length;
      }
    } catch {}

    try {
      const deploymentsFile = path.join(dataDir, 'deployment-history.json');
      if (fs.existsSync(deploymentsFile)) {
        const deployments = JSON.parse(fs.readFileSync(deploymentsFile, 'utf-8'));
        status.safeDeployer.totalDeployments = deployments.length;
        status.safeDeployer.successfulDeployments = deployments.filter((d: any) => d.status === 'success').length;
        status.safeDeployer.failedDeployments = deployments.filter((d: any) => d.status === 'failed' || d.status === 'rolled_back').length;
      }
    } catch {}

    try {
      const emailLogFile = path.join(dataDir, 'email-log.json');
      if (fs.existsSync(emailLogFile)) {
        const emailLogs = JSON.parse(fs.readFileSync(emailLogFile, 'utf-8'));
        status.emailNotifier.totalSent = emailLogs.filter((e: any) => e.status === 'sent').length;
      }
    } catch {}

    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// GET /api/autonomous/daily-report - Get today's daily report
app.get('/api/autonomous/daily-report', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const reportFile = path.join(__dirname, `../../data/daily-report-${today}.txt`);
    if (fs.existsSync(reportFile)) {
      const report = fs.readFileSync(reportFile, 'utf-8');
      res.json({ date: today, report });
    } else {
      res.json({ date: today, report: null, message: 'No report for today' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load report' });
  }
});

/**
 * Admin Routes (for development/testing)
 */

// POST /api/admin/upgrade - Upgrade user to admin with unlimited access
app.post('/api/admin/upgrade', async (req, res) => {
  try {
    const { email, adminSecret } = req.body;

    // Simple admin secret check (set via env or use default for dev)
    const validSecret = process.env.ADMIN_SECRET || 'merlin-admin-2024';
    if (adminSecret !== validSecret) {
      return res.status(403).json({ error: 'Invalid admin secret' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upgrade to enterprise with unlimited pages and credits
    db.updateUser(user.id, {
      plan: 'enterprise',
      pagesLimit: 999999,
      credits: 999999,
      creditsIncludedMonthly: 999999,
      subscriptionStatus: 'active',
    });

    const updatedUser = db.getUserById(user.id);
    res.json({
      success: true,
      message: `User ${email} upgraded to admin/enterprise`,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        plan: updatedUser?.plan,
        pagesLimit: updatedUser?.pagesLimit,
        credits: updatedUser?.credits,
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Merlin Proxy Network Routes - Our Own P2P Network
 * NO third-party providers - users contribute and earn credits
 */

// POST /api/proxy-network/register - Register a new proxy node
app.post('/api/proxy-network/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { host, port, country, city, isp, bandwidth, type, version } = req.body;

    if (!host || !port || !country) {
      return res.status(400).json({ error: 'host, port, and country are required' });
    }

    // Use enhanced proxy network with auto geo-enrichment
    const result = await enhancedProxyNetwork.registerNode({
      host,
      port: parseInt(port),
      userId,
      bandwidth: bandwidth || 10,
      type: type || 'residential',
      version: version || '1.0.0',
    });

    // Add proxy credits to user (incentive for contributing)
    const user = db.getUserById(userId);
    if (user) {
      db.updateUser(userId, {
        proxyCredits: (user.proxyCredits || 0) + 10, // Bonus for registering
      });
    }

    res.json({
      nodeId: result.nodeId,
      publicKey: result.publicKey,
      authToken: result.authToken,
      geoData: result.geoData, // Include geo-enriched data
      message: 'Node registered successfully! You are now earning credits.',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/proxy-network/heartbeat - Node heartbeat
app.post('/api/proxy-network/heartbeat', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { nodeId, isOnline, latency, bandwidth, currentLoad } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    await enhancedProxyNetwork.heartbeat(nodeId, {
      isOnline: isOnline ?? true,
      latency: latency || 0,
      bandwidth: bandwidth || 10,
      currentLoad: currentLoad || 0,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/proxy-network/report - Report request completion
app.post('/api/proxy-network/report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { nodeId, success, bytesTransferred, responseTime, errorMessage } = req.body;

    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    await enhancedProxyNetwork.recordRequest(nodeId, {
      success: success ?? true,
      bytesTransferred: bytesTransferred || 0,
      responseTime: responseTime || 100,
      errorMessage,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/stats - Get network statistics (enhanced with ASN/continent data)
app.get('/api/proxy-network/stats', (req, res) => {
  try {
    const stats = enhancedProxyNetwork.getNetworkStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/my-nodes - Get user's registered nodes (with enhanced geo data)
app.get('/api/proxy-network/my-nodes', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { totalCredits, nodes, totalBytesServed, totalRequests } = enhancedProxyNetwork.getUserCredits(userId);

    res.json({
      totalCredits,
      totalBytesServed,
      totalRequests,
      nodes: nodes.map(node => ({
        id: node.id,
        host: node.host,
        port: node.port,
        country: node.country,
        countryCode: node.countryCode,
        continent: node.continent,
        asn: node.asn,
        asnOrg: node.asnOrg,
        type: node.type,
        isOnline: node.isOnline,
        successRate: node.successRate,
        latencyAvg: node.latencyAvg,
        latencyP50: node.latencyP50,
        latencyP90: node.latencyP90,
        totalRequests: node.totalRequests,
        bytesServed: node.bytesServed,
        creditsEarned: node.creditsEarned,
        score: node.score,
        registeredAt: node.registeredAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/leaderboard - Get top contributors (with enhanced stats)
app.get('/api/proxy-network/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = enhancedProxyNetwork.getLeaderboard(limit);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/proxy-network/get-proxy - Get a proxy for cloning (with advanced filtering)
app.post('/api/proxy-network/get-proxy', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { targetUrl, country, continent, asn, type, minSuccessRate, maxLatency, preferResidential, preferMobile } = req.body;

    const proxy = await enhancedProxyNetwork.getProxy({
      targetUrl,
      country,
      continent,
      asn,
      type,
      minSuccessRate: minSuccessRate || 0.8,
      maxLatency,
      preferResidential,
      preferMobile,
    });

    if (!proxy) {
      return res.status(503).json({
        error: 'No proxies available. Contribute your bandwidth to help grow the network!',
        network: enhancedProxyNetwork.getNetworkStats(),
      });
    }

    res.json({
      host: proxy.host,
      port: proxy.port,
      country: proxy.country,
      countryCode: proxy.countryCode,
      continent: proxy.continent,
      asn: proxy.asn,
      asnOrg: proxy.asnOrg,
      type: proxy.type,
      successRate: proxy.successRate,
      latencyAvg: proxy.latencyAvg,
      score: proxy.score,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/proxy-network/node/:nodeId - Unregister a node
app.delete('/api/proxy-network/node/:nodeId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { nodeId } = req.params;
    const success = await enhancedProxyNetwork.unregisterNode(nodeId);
    res.json({ success, message: success ? 'Node unregistered' : 'Node not found' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/available-countries - Get all countries with proxies
app.get('/api/proxy-network/available-countries', (req, res) => {
  try {
    const countries = enhancedProxyNetwork.getAvailableCountries();
    res.json(countries);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/available-asns - Get all ASNs in the network
app.get('/api/proxy-network/available-asns', (req, res) => {
  try {
    const asns = enhancedProxyNetwork.getAvailableASNs();
    res.json(asns);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/by-continent/:continent - Get proxies by continent
app.get('/api/proxy-network/by-continent/:continent', (req, res) => {
  try {
    const { continent } = req.params;
    const proxies = enhancedProxyNetwork.getProxiesByContinent(continent.toUpperCase());
    res.json({
      continent,
      count: proxies.length,
      proxies: proxies.map(p => ({
        id: p.id,
        country: p.country,
        countryCode: p.countryCode,
        asn: p.asn,
        asnOrg: p.asnOrg,
        type: p.type,
        isOnline: p.isOnline,
        score: p.score,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/by-asn/:asn - Get proxies by ASN
app.get('/api/proxy-network/by-asn/:asn', (req, res) => {
  try {
    const asn = parseInt(req.params.asn);
    const proxies = enhancedProxyNetwork.getProxiesByASN(asn);
    res.json({
      asn,
      count: proxies.length,
      proxies: proxies.map(p => ({
        id: p.id,
        country: p.country,
        countryCode: p.countryCode,
        asnOrg: p.asnOrg,
        type: p.type,
        isOnline: p.isOnline,
        score: p.score,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/proxy-network/get-multiple - Get multiple proxies with diversity
app.post('/api/proxy-network/get-multiple', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { count, countries, continent, types, minSuccessRate, maxLatency, diverseASNs, diverseCountries } = req.body;

    const proxies = await enhancedProxyNetwork.getProxies(count || 5, {
      countries,
      continent,
      types,
      minSuccessRate,
      maxLatency,
      diverseASNs: diverseASNs ?? true,
      diverseCountries: diverseCountries ?? true,
    });

    res.json({
      count: proxies.length,
      proxies: proxies.map(p => ({
        host: p.host,
        port: p.port,
        country: p.country,
        countryCode: p.countryCode,
        continent: p.continent,
        asn: p.asn,
        asnOrg: p.asnOrg,
        type: p.type,
        score: p.score,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Config Management Routes
 */

// GET /api/configs - List all configs
app.get('/api/configs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const configs = await configManager.listConfigs();
    res.json(configs);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/configs/default - Get default config template
app.get('/api/configs/default', authenticateToken, (req: AuthRequest, res) => {
  try {
    const defaultConfig = configManager.getDefaultConfig();
    res.json(defaultConfig);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/configs/:name - Get a specific config
app.get('/api/configs/:name', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const configs = await configManager.listConfigs();
    const config = configs.find(c => c.name === name);
    
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    const configData = await configManager.loadConfig(config.path);
    res.json(configData);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/configs - Create or update a config
app.post('/api/configs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, config, format } = req.body;

    if (!name || !config) {
      return res.status(400).json({ error: 'Name and config are required' });
    }

    // Validate config
    const validation = configManager.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Config validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    const filePath = path.join(process.cwd(), 'configs', `${name}.${format || 'yaml'}`);
    await configManager.saveConfig(config, filePath, format || 'yaml');

    res.json({
      success: true,
      name,
      path: filePath,
      format: format || 'yaml',
      warnings: validation.warnings
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/configs/:name - Update a config
app.put('/api/configs/:name', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const { config, format } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }

    // Validate config
    const validation = configManager.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Config validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    const configs = await configManager.listConfigs();
    const existing = configs.find(c => c.name === name);
    
    if (!existing) {
      return res.status(404).json({ error: 'Config not found' });
    }

    await configManager.saveConfig(config, existing.path, format || existing.format);

    res.json({
      success: true,
      name,
      path: existing.path,
      format: format || existing.format,
      warnings: validation.warnings
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/configs/:name - Delete a config
app.delete('/api/configs/:name', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const configs = await configManager.listConfigs();
    const config = configs.find(c => c.name === name);
    
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    await configManager.deleteConfig(config.path);
    res.json({ success: true, name });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/configs/validate - Validate a config
app.post('/api/configs/validate', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }

    const validation = configManager.validateConfig(config);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/configs/:name/clone - Clone using a config
app.post('/api/configs/:name/clone', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const userId = req.user!.id;
    
    const configs = await configManager.listConfigs();
    const config = configs.find(c => c.name === name);
    
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    const configData = await configManager.loadConfig(config.path);
    const cloneOptions = configManager.configToCloneOptions(configData);

    // Create job
    const outputDir = path.join(process.cwd(), 'clones', userId, Date.now().toString());
    await fs.ensureDir(outputDir);
    const job = db.createJob({
      userId,
      url: configData.url,
      status: 'pending' as const,
      progress: 0,
      pagesCloned: 0,
      assetsCaptured: 0,
      outputDir,
      errors: [],
    });
    
    // Create a fresh cloner instance for this job to prevent asset map cross-contamination
    const configJobCloner = new WebsiteCloner();

    // Start cloning in background
    configJobCloner.clone(cloneOptions).then((result) => {
      db.updateJob(job.id, {
        status: result.success ? 'completed' : 'failed',
        pagesCloned: result.pagesCloned,
        assetsCaptured: result.assetsCaptured,
        errors: result.errors,
        completedAt: new Date().toISOString()
      });
    }).catch((error) => {
      db.updateJob(job.id, {
        status: 'failed',
        errors: [error.message || String(error)],
        completedAt: new Date().toISOString()
      });
    });

    res.json({
      id: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      config: name
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===========================================
// DMCA & CONSENT ROUTES (COD-14)
// ===========================================

import { dmcaService } from '../services/dmcaService.js';
import { consentService } from '../services/consentService.js';

// POST /api/dmca - Submit DMCA takedown request
app.post('/api/dmca', generalRateLimiter, (req, res) => {
  try {
    const {
      claimantName, claimantEmail, claimantCompany, claimantAddress, claimantPhone,
      originalWorkUrl, originalWorkDescription, infringingUrl,
      goodFaithStatement, accuracyStatement, ownershipStatement, signature
    } = req.body;

    // Validate required fields
    if (!claimantName || !claimantEmail || !originalWorkUrl || !infringingUrl || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!goodFaithStatement || !accuracyStatement || !ownershipStatement) {
      return res.status(400).json({ error: 'All legal statements must be acknowledged' });
    }

    const request = dmcaService.submitRequest({
      claimantName, claimantEmail, claimantCompany, claimantAddress, claimantPhone,
      originalWorkUrl, originalWorkDescription, infringingUrl,
      goodFaithStatement, accuracyStatement, ownershipStatement, signature
    });

    res.json({ 
      success: true, 
      requestId: request.id,
      message: 'DMCA request received. We will review within 24-48 hours.'
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/dmca/:id - Check DMCA request status
app.get('/api/dmca/:id', (req, res) => {
  const request = dmcaService.getRequest(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  res.json({ 
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  });
});

// POST /api/consent - Record user consent
app.post('/api/consent', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { types } = req.body; // Array of consent types to record
    const userId = req.user!.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!types || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: 'Consent types required' });
    }

    const consents = types.map((type: string) => 
      consentService.recordConsent(userId, type as any, ip, userAgent)
    );

    res.json({ success: true, consents });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/consent/check - Check if user has all required consents
app.get('/api/consent/check', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { allowed, missing } = consentService.canClone(userId);
  res.json({ allowed, missing });
});

// GET /api/consent - Get user's consent records
app.get('/api/consent', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const consents = consentService.getUserConsents(userId);
  res.json({ consents });
});

// ============================================================
// DISASTER RECOVERY ROUTES
// ============================================================
import { disasterRecovery } from '../services/disasterRecovery.js';

// POST /api/dr/sites - Register a site for disaster recovery
app.post('/api/dr/sites', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { url, checkInterval, failoverEnabled, failoverUrl, dnsProvider, dnsConfig } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const site = await disasterRecovery.registerSite({
      url,
      userId: req.user!.id,
      checkInterval,
      failoverEnabled,
      failoverUrl,
      dnsProvider,
      dnsConfig,
    });

    res.json({ success: true, site });
  } catch (error) {
    console.error('[DR] Error registering site:', error);
    res.status(500).json({ error: 'Failed to register site' });
  }
});

// GET /api/dr/sites - Get all user's monitored sites
app.get('/api/dr/sites', authenticateToken, (req: AuthRequest, res) => {
  const sites = disasterRecovery.getSitesByUser(req.user!.id);
  res.json({ sites });
});

// GET /api/dr/sites/:siteId - Get specific site details
app.get('/api/dr/sites/:siteId', authenticateToken, (req: AuthRequest, res) => {
  const site = disasterRecovery.getSite(req.params.siteId);

  if (!site) {
    return res.status(404).json({ error: 'Site not found' });
  }

  // Verify ownership
  if (site.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ site });
});

// DELETE /api/dr/sites/:siteId - Unregister a site
app.delete('/api/dr/sites/:siteId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const site = disasterRecovery.getSite(req.params.siteId);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const success = await disasterRecovery.unregisterSite(req.params.siteId);
    res.json({ success });
  } catch (error) {
    console.error('[DR] Error unregistering site:', error);
    res.status(500).json({ error: 'Failed to unregister site' });
  }
});

// POST /api/dr/sites/:siteId/check - Manually trigger a health check
app.post('/api/dr/sites/:siteId/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const site = disasterRecovery.getSite(req.params.siteId);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await disasterRecovery.checkSite(req.params.siteId);
    res.json({ result });
  } catch (error) {
    console.error('[DR] Error checking site:', error);
    res.status(500).json({ error: 'Failed to check site' });
  }
});

// POST /api/dr/sites/:siteId/sync - Manually trigger a sync
app.post('/api/dr/sites/:siteId/sync', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const site = disasterRecovery.getSite(req.params.siteId);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await disasterRecovery.syncSite(req.params.siteId);
    res.json({ result });
  } catch (error) {
    console.error('[DR] Error syncing site:', error);
    res.status(500).json({ error: 'Failed to sync site' });
  }
});

// GET /api/dr/sites/:siteId/versions - Get backup versions
app.get('/api/dr/sites/:siteId/versions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const site = disasterRecovery.getSite(req.params.siteId);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const versions = await disasterRecovery.getVersions(req.params.siteId);
    res.json({ versions });
  } catch (error) {
    console.error('[DR] Error getting versions:', error);
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

// POST /api/dr/sites/:siteId/restore/:version - Restore a specific version
app.post('/api/dr/sites/:siteId/restore/:version', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const site = disasterRecovery.getSite(req.params.siteId);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (site.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const version = parseInt(req.params.version, 10);
    const restorePath = await disasterRecovery.restoreVersion(req.params.siteId, version);
    res.json({ success: true, restorePath });
  } catch (error) {
    console.error('[DR] Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// GET /api/dr/stats - Get overall DR statistics
app.get('/api/dr/stats', authenticateToken, (req: AuthRequest, res) => {
  const userSites = disasterRecovery.getSitesByUser(req.user!.id);

  const stats = {
    totalSites: userSites.length,
    onlineSites: userSites.filter(s => s.status === 'online').length,
    offlineSites: userSites.filter(s => s.status === 'offline').length,
    degradedSites: userSites.filter(s => s.status === 'degraded').length,
    totalBackupVersions: userSites.reduce((sum, s) => sum + s.backupVersions, 0),
    totalBackupSize: userSites.reduce((sum, s) => sum + s.lastBackupSize, 0),
    avgUptime: userSites.length > 0
      ? userSites.reduce((sum, s) => sum + s.uptimePercent, 0) / userSites.length
      : 100,
    avgLatency: userSites.length > 0
      ? userSites.reduce((sum, s) => sum + s.avgLatency, 0) / userSites.length
      : 0,
  };

  res.json({ stats });
});

// GET /api/dr/events - Get DR events history (failovers, restorations, etc.)
app.get('/api/dr/events', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userSites = disasterRecovery.getSitesByUser(req.user!.id);

    // Get events from all user's sites
    const events: Array<{
      id: string;
      siteId: string;
      siteName: string;
      timestamp: string;
      type: 'triggered' | 'resolved' | 'manual' | 'backup' | 'sync';
      reason: string;
      duration?: number;
    }> = [];

    for (const site of userSites) {
      // Add synthetic events based on site history
      const siteName = new URL(site.url).hostname;

      if (site.lastSyncTime) {
        events.push({
          id: `sync-${site.id}-${Date.now()}`,
          siteId: site.id,
          siteName,
          timestamp: site.lastSyncTime,
          type: 'sync',
          reason: 'Backup sync completed',
        });
      }

      if (site.status === 'offline') {
        events.push({
          id: `offline-${site.id}`,
          siteId: site.id,
          siteName,
          timestamp: site.lastCheck,
          type: 'triggered',
          reason: 'Site went offline - failover may be needed',
        });
      }

      if (site.status === 'degraded') {
        events.push({
          id: `degraded-${site.id}`,
          siteId: site.id,
          siteName,
          timestamp: site.lastCheck,
          type: 'triggered',
          reason: `Site degraded - latency ${site.avgLatency}ms`,
        });
      }
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(events.slice(0, 50)); // Return last 50 events
  } catch (error) {
    console.error('[DR] Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch DR events' });
  }
});

// ============================================================
// ARCHIVE BROWSER ROUTES (aliases for frontend compatibility)
// ============================================================

// GET /api/archives - List all archives (alias for /api/archive/list)
app.get('/api/archives', authenticateToken, (req: AuthRequest, res) => {
  try {
    const archives = warcPlayback.getArchives();

    // Transform to frontend expected format
    const formattedArchives = archives.map((a: any) => ({
      id: a.id || a.name,
      url: a.baseUrl || '',
      domain: a.baseUrl ? new URL(a.baseUrl).hostname : 'unknown',
      captureDate: a.createdAt || new Date().toISOString(),
      size: a.size || 0,
      pageCount: a.pageCount || 0,
      assetCount: a.resourceCount || 0,
      warcFile: a.warcPath || '',
      status: 'complete',
      format: a.warcPath?.endsWith('.gz') ? 'warc.gz' : 'warc',
      cdxIndexed: true,
    }));

    res.json(formattedArchives);
  } catch (error) {
    console.error('[Archive] Error listing archives:', error);
    res.json([]); // Return empty array on error
  }
});

// GET /api/archives/timeline - Get capture timeline
app.get('/api/archives/timeline', authenticateToken, (req: AuthRequest, res) => {
  try {
    const archives = warcPlayback.getArchives();

    // Group by date
    const timelineMap = new Map<string, { count: number; urls: string[] }>();

    for (const archive of archives) {
      const date = new Date(archive.createdAt || Date.now()).toISOString().split('T')[0];
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { count: 0, urls: [] });
      }
      const entry = timelineMap.get(date)!;
      entry.count++;
      // Use archive name as URL placeholder since ArchiveInfo doesn't have baseUrl
      if (archive.name && !entry.urls.includes(archive.name)) {
        entry.urls.push(archive.name);
      }
    }

    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      urls: data.urls,
    }));

    res.json(timeline);
  } catch (error) {
    console.error('[Archive] Error getting timeline:', error);
    res.json([]);
  }
});

// GET /api/archives/:archiveId/snapshots - Get version snapshots for an archive
app.get('/api/archives/:archiveId/snapshots', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { archiveId } = req.params;
    const archives = warcPlayback.getArchives();
    const archive = archives.find((a) => a.id === archiveId || a.name === archiveId);

    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    // Create a single snapshot from the archive info
    const snapshots = [{
      id: `${archiveId}-0`,
      url: archive.name,
      timestamp: archive.createdAt?.toISOString() || new Date().toISOString(),
      title: archive.name,
      size: archive.totalSize || 0,
    }];

    res.json(snapshots);
  } catch (error) {
    console.error('[Archive] Error getting snapshots:', error);
    res.status(500).json({ error: 'Failed to get snapshots' });
  }
});

// ============================================================
// PRE-SCAN ROUTE (for Clone Wizard)
// ============================================================
import { WebsitePreScanner } from '../services/websitePreScanner.js';
import puppeteer from 'puppeteer';

// POST /api/scan - Pre-scan a website before cloning
app.post('/api/scan', authenticateToken, async (req: AuthRequest, res) => {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Launch browser for scanning
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const scanner = new WebsitePreScanner();
    const scanResult = await scanner.scan(browser, url);

    // Transform to frontend expected format
    res.json({
      url: scanResult.url,
      accessible: true,
      title: scanResult.domain || '',
      description: `Framework: ${scanResult.framework || 'Unknown'}`,
      pageCount: 1,
      assetCount: scanResult.scriptCount + scanResult.styleCount + scanResult.imageCount,
      hasDynamicContent: scanResult.isSPA,
      hasProtection: false, // Will be detected during clone
      protectionType: null,
      estimatedSize: scanResult.pageSize,
      recommendations: [
        `Complexity: ${scanResult.complexity}`,
        `Recommended concurrency: ${scanResult.recommendedSettings.concurrency}`,
        `Timeout: ${scanResult.recommendedSettings.timeout}ms`,
      ],
      warnings: scanResult.warnings || [],
      // Include original scan data
      complexity: scanResult.complexity,
      complexityScore: scanResult.complexityScore,
      techStack: scanResult.techStack,
      isSPA: scanResult.isSPA,
      framework: scanResult.framework,
    });
  } catch (error) {
    console.error('[Scan] Error scanning website:', error);
    res.status(500).json({
      error: 'Failed to scan website',
      accessible: false,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// ============================================================
// FULL APP CLONING ROUTES
// ============================================================
import { apiRecorder } from '../services/apiRecorder.js';
import { EnhancedAPIMockServer } from '../services/apiMockServer.js';
import { statePreserver } from '../services/statePreserver.js';

// Active mock servers
const activeMockServers = new Map<string, EnhancedAPIMockServer>();

// POST /api/app-clone/record/start - Start API recording session
app.post('/api/app-clone/record/start', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { targetUrl } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl is required' });
    }

    const session = await apiRecorder.startSession(targetUrl);
    res.json({ success: true, session });
  } catch (error) {
    console.error('[AppClone] Error starting recording:', error);
    res.status(500).json({ error: 'Failed to start recording' });
  }
});

// POST /api/app-clone/record/stop - Stop API recording session
app.post('/api/app-clone/record/stop', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await apiRecorder.stopSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('[AppClone] Error stopping recording:', error);
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

// POST /api/app-clone/record/interaction - Record an API interaction
app.post('/api/app-clone/record/interaction', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId, request, response } = req.body;

    if (!sessionId || !request || !response) {
      return res.status(400).json({ error: 'sessionId, request, and response are required' });
    }

    const interaction = await apiRecorder.recordInteraction(sessionId, request, response);
    res.json({ success: true, interaction });
  } catch (error) {
    console.error('[AppClone] Error recording interaction:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

// GET /api/app-clone/sessions - Get all recording sessions
app.get('/api/app-clone/sessions', authenticateToken, (req: AuthRequest, res) => {
  const sessions = apiRecorder.getAllSessions();
  res.json({ sessions });
});

// GET /api/app-clone/sessions/:sessionId - Get session details
app.get('/api/app-clone/sessions/:sessionId', authenticateToken, (req: AuthRequest, res) => {
  const session = apiRecorder.getSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ session });
});

// GET /api/app-clone/sessions/:sessionId/har - Export session as HAR
app.get('/api/app-clone/sessions/:sessionId/har', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const har = await apiRecorder.exportAsHAR(req.params.sessionId);

    if (!har) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.sessionId}.har"`);
    res.json(har);
  } catch (error) {
    console.error('[AppClone] Error exporting HAR:', error);
    res.status(500).json({ error: 'Failed to export HAR' });
  }
});

// GET /api/app-clone/sessions/:sessionId/mock-config - Export for mocking
app.get('/api/app-clone/sessions/:sessionId/mock-config', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const config = await apiRecorder.exportForMocking(req.params.sessionId);

    if (!config) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('[AppClone] Error exporting mock config:', error);
    res.status(500).json({ error: 'Failed to export mock config' });
  }
});

// POST /api/app-clone/mock/start - Start a mock server
app.post('/api/app-clone/mock/start', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId, port } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = apiRecorder.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const mockPort = port || 4000 + Math.floor(Math.random() * 1000);
    const mockServer = new EnhancedAPIMockServer({
      port: mockPort,
      recording: session,
    });

    await mockServer.start();
    activeMockServers.set(sessionId, mockServer);

    res.json({
      success: true,
      mockServerUrl: `http://localhost:${mockPort}`,
      port: mockPort,
    });
  } catch (error) {
    console.error('[AppClone] Error starting mock server:', error);
    res.status(500).json({ error: 'Failed to start mock server' });
  }
});

// POST /api/app-clone/mock/stop - Stop a mock server
app.post('/api/app-clone/mock/stop', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;

    const mockServer = activeMockServers.get(sessionId);
    if (!mockServer) {
      return res.status(404).json({ error: 'Mock server not found' });
    }

    await mockServer.stop();
    activeMockServers.delete(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('[AppClone] Error stopping mock server:', error);
    res.status(500).json({ error: 'Failed to stop mock server' });
  }
});

// GET /api/app-clone/mock/:sessionId/stats - Get mock server stats
app.get('/api/app-clone/mock/:sessionId/stats', authenticateToken, (req: AuthRequest, res) => {
  const mockServer = activeMockServers.get(req.params.sessionId);

  if (!mockServer) {
    return res.status(404).json({ error: 'Mock server not found' });
  }

  res.json({ stats: mockServer.getStats() });
});

// POST /api/app-clone/state/capture - Process captured state
app.post('/api/app-clone/state/capture', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId, state } = req.body;

    if (!sessionId || !state) {
      return res.status(400).json({ error: 'sessionId and state are required' });
    }

    const snapshot = await statePreserver.processCapture(state, sessionId);
    res.json({ success: true, snapshot });
  } catch (error) {
    console.error('[AppClone] Error processing state:', error);
    res.status(500).json({ error: 'Failed to process state' });
  }
});

// GET /api/app-clone/state/:sessionId - Get state snapshots
app.get('/api/app-clone/state/:sessionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const snapshots = await statePreserver.getSessionSnapshots(req.params.sessionId);
    res.json({ snapshots });
  } catch (error) {
    console.error('[AppClone] Error getting snapshots:', error);
    res.status(500).json({ error: 'Failed to get snapshots' });
  }
});

// GET /api/app-clone/state/:sessionId/:snapshotId/bundle - Get restoration bundle
app.get('/api/app-clone/state/:sessionId/:snapshotId/bundle', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const snapshot = await statePreserver.loadSnapshot(
      req.params.sessionId,
      req.params.snapshotId
    );

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const bundle = statePreserver.generateStateBundle(snapshot);
    res.setHeader('Content-Type', 'text/html');
    res.send(bundle);
  } catch (error) {
    console.error('[AppClone] Error generating bundle:', error);
    res.status(500).json({ error: 'Failed to generate bundle' });
  }
});

// GET /api/app-clone/capture-script - Get browser capture script
app.get('/api/app-clone/capture-script', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(statePreserver.getCaptureScript());
});

// ============================================================
// ARCHIVAL PLATFORM ROUTES (WARC)
// ============================================================
import { EnhancedWARCGenerator, createWARCFromDirectory } from '../services/warcGeneratorEnhanced.js';
import { warcPlayback } from '../services/warcPlayback.js';

// Initialize WARC playback
warcPlayback.initialize().catch((err) => {
  console.warn('[Archive] Playback initialization deferred:', err.message);
});

// Active WARC generators
const activeWarcGenerators = new Map<string, EnhancedWARCGenerator>();

// POST /api/archive/create - Create WARC from cloned site
app.post('/api/archive/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { cloneDir, baseUrl, name } = req.body;

    if (!cloneDir || !baseUrl) {
      return res.status(400).json({ error: 'cloneDir and baseUrl are required' });
    }

    const outputDir = './data/warc';
    const result = await createWARCFromDirectory(cloneDir, outputDir, baseUrl, {
      filename: name || `archive-${Date.now()}`,
      operator: req.user!.email,
    });

    res.json({
      success: true,
      warcPath: result.warcPath,
      cdxPath: result.cdxPath,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[Archive] Error creating WARC:', error);
    res.status(500).json({ error: 'Failed to create WARC archive' });
  }
});

// POST /api/archive/generator/start - Start streaming WARC generator
app.post('/api/archive/generator/start', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    const generator = new EnhancedWARCGenerator({
      outputDir: './data/warc',
      filename: name || `stream-archive-${Date.now()}`,
      description: description || 'Streaming archive',
      operator: req.user!.email,
    });

    const warcPath = await generator.start();
    const generatorId = `gen_${Date.now()}`;
    activeWarcGenerators.set(generatorId, generator);

    res.json({
      success: true,
      generatorId,
      warcPath,
    });
  } catch (error) {
    console.error('[Archive] Error starting generator:', error);
    res.status(500).json({ error: 'Failed to start WARC generator' });
  }
});

// POST /api/archive/generator/:id/write - Write to streaming generator
app.post('/api/archive/generator/:id/write', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const generator = activeWarcGenerators.get(req.params.id);
    if (!generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    const { type, url, contentType, content, request, response } = req.body;

    if (type === 'resource') {
      await generator.writeResource(
        url,
        contentType,
        Buffer.from(content, 'base64')
      );
    } else if (type === 'request-response') {
      await generator.writeRequestResponse(
        url,
        {
          method: request.method,
          headers: request.headers,
          body: request.body ? Buffer.from(request.body, 'base64') : undefined,
        },
        {
          statusCode: response.statusCode,
          statusMessage: response.statusMessage || 'OK',
          headers: response.headers,
          body: Buffer.from(response.body, 'base64'),
        }
      );
    } else if (type === 'metadata') {
      await generator.writeMetadata(url, content);
    }

    res.json({ success: true, stats: generator.getStats() });
  } catch (error) {
    console.error('[Archive] Error writing to generator:', error);
    res.status(500).json({ error: 'Failed to write to WARC' });
  }
});

// POST /api/archive/generator/:id/finish - Finish streaming generator
app.post('/api/archive/generator/:id/finish', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const generator = activeWarcGenerators.get(req.params.id);
    if (!generator) {
      return res.status(404).json({ error: 'Generator not found' });
    }

    const result = await generator.finish();
    activeWarcGenerators.delete(req.params.id);

    // Reload archives
    await warcPlayback.loadArchives();

    res.json({
      success: true,
      warcPath: result.warcPath,
      cdxPath: result.cdxPath,
      stats: result.stats,
    });
  } catch (error) {
    console.error('[Archive] Error finishing generator:', error);
    res.status(500).json({ error: 'Failed to finish WARC' });
  }
});

// GET /api/archive/list - List all archives
app.get('/api/archive/list', authenticateToken, (req: AuthRequest, res) => {
  const archives = warcPlayback.getArchives();
  res.json({ archives });
});

// GET /api/archive/search - Search archives
app.get('/api/archive/search', authenticateToken, (req: AuthRequest, res) => {
  const query = (req.query.q as string) || '';
  const results = warcPlayback.searchArchives(query);
  res.json({ results });
});

// GET /api/archive/timestamps - Get timestamps for URL
app.get('/api/archive/timestamps', authenticateToken, (req: AuthRequest, res) => {
  const url = (req.query.url as string) || '';
  const timestamps = warcPlayback.getTimestampsForUrl(url);
  res.json({ timestamps });
});

// GET /api/archive/content - Get archived content
app.get('/api/archive/content', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const url = (req.query.url as string) || '';
    const timestamp = req.query.timestamp as string | undefined;

    const content = await warcPlayback.getContent({
      originalUrl: url,
      timestamp,
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found in archives' });
    }

    res.json({
      content: content.content.toString('base64'),
      contentType: content.contentType,
      statusCode: content.statusCode,
      headers: content.headers,
      timestamp: content.timestamp,
    });
  } catch (error) {
    console.error('[Archive] Error getting content:', error);
    res.status(500).json({ error: 'Failed to retrieve archived content' });
  }
});

// GET /api/archive/urls/:domain - Get URLs for domain
app.get('/api/archive/urls/:domain', authenticateToken, (req: AuthRequest, res) => {
  const urls = warcPlayback.getUrlsForDomain(req.params.domain);
  res.json({ urls });
});

// POST /api/archive/playback/start - Start playback server
app.post('/api/archive/playback/start', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { port } = req.body;

    // Configure playback
    const playback = new (await import('../services/warcPlayback.js')).WARCPlayback({
      archivesDir: './data/warc',
      port: port || 8080,
    });

    await playback.startServer();

    res.json({
      success: true,
      playbackUrl: `http://localhost:${port || 8080}`,
    });
  } catch (error) {
    console.error('[Archive] Error starting playback:', error);
    res.status(500).json({ error: 'Failed to start playback server' });
  }
});

/**
 * Serve cloned templates as static files
 */
app.use('/clones', express.static(path.join(__dirname, '../..')));

// ============================================
// NEW FEATURE ROUTES (v2.0)
// ============================================

// Import new services
import { webhookService } from '../services/webhookService.js';
import { slackNotifier } from '../services/slackNotifier.js';
import { s3Exporter } from '../services/s3Exporter.js';
import { teamService } from '../services/teamService.js';
import { setupOpenApiRoutes } from './openapi.js';
import { ExportFormats } from '../services/exportFormats.js';

// Setup OpenAPI documentation routes
setupOpenApiRoutes(app);

// --- Webhook Routes ---
app.get('/api/webhooks', authenticateToken, (req: AuthRequest, res) => {
  const webhooks = webhookService.getWebhooks();
  res.json(webhooks);
});

app.post('/api/webhooks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { url, events, secret } = req.body;
    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'url and events are required' });
    }
    const webhook = await webhookService.registerWebhook({
      url,
      events,
      secret,
      enabled: true,
    });
    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/webhooks/:id', authenticateToken, async (req: AuthRequest, res) => {
  const deleted = await webhookService.unregisterWebhook(req.params.id);
  if (deleted) {
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Webhook not found' });
  }
});

app.post('/api/webhooks/:id/test', authenticateToken, async (req: AuthRequest, res) => {
  const result = await webhookService.testWebhook(req.params.id);
  res.json(result);
});

// --- Slack Integration Routes ---
app.post('/api/integrations/slack/configure', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { webhookUrl, channel, username, iconEmoji } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }
    slackNotifier.configure({ webhookUrl, channel, username, iconEmoji });
    res.json({ success: true, message: 'Slack configured successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/integrations/slack/test', authenticateToken, async (req: AuthRequest, res) => {
  if (!slackNotifier.isConfigured()) {
    return res.status(400).json({ error: 'Slack not configured' });
  }
  const success = await slackNotifier.sendMessage('Test message from Merlin Website Cloner');
  res.json({ success });
});

// --- S3 Export Routes ---
app.post('/api/integrations/s3/configure', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { accessKeyId, secretAccessKey, region, bucket, endpoint, prefix } = req.body;
    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      return res.status(400).json({ error: 'accessKeyId, secretAccessKey, region, and bucket are required' });
    }
    await s3Exporter.configure({ accessKeyId, secretAccessKey, region, bucket, endpoint, prefix });
    res.json({ success: true, message: 'S3 configured successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs/:id/export/s3', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!s3Exporter.isConfigured()) {
      return res.status(400).json({ error: 'S3 not configured' });
    }
    const result = await s3Exporter.exportClone(job.outputDir, job.id, req.body.options || {});
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- PDF Export Route ---
app.get('/api/jobs/:id/export/pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const job = db.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const exporter = new ExportFormats();
    const outputPath = path.join(job.outputDir, 'pdf-export');
    const result = await exporter.export(job.outputDir, {
      format: 'pdf',
      outputPath,
      pdfOptions: req.query as any,
    });
    res.json({ success: true, path: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Team/Organization Routes ---
app.post('/api/teams', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { name, plan } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    const team = await teamService.createTeam(name, userId, plan || 'team');
    res.status(201).json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const teams = teamService.getUserTeams(userId);
  res.json(teams);
});

app.get('/api/teams/:id', authenticateToken, (req: AuthRequest, res) => {
  const team = teamService.getTeam(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  const userId = req.userId!;
  if (!teamService.hasPermission(req.params.id, userId, 'team.read')) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const members = teamService.getMembers(req.params.id);
  res.json({ ...team, members });
});

app.post('/api/teams/:id/members', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    if (!teamService.hasPermission(req.params.id, userId, 'members.invite')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { email, role } = req.body;
    const invite = await teamService.createInvite(req.params.id, email, role || 'member', userId);
    res.status(201).json(invite);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/teams/:teamId/members/:memberId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    if (!teamService.hasPermission(req.params.teamId, userId, 'members.remove')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await teamService.removeMember(req.params.teamId, req.params.memberId, userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teams/:id/audit', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  if (!teamService.hasPermission(req.params.id, userId, 'audit.read')) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const logs = teamService.getAuditLogs(req.params.id, parseInt(req.query.limit as string) || 100);
  res.json(logs);
});

/**
 * Serve frontend for all other routes
 */
app.get('*', (req, res) => {
  if (fs.existsSync(frontendPath)) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.json({ message: 'Frontend not built. Run "npm run build" in frontend directory.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Merlin Website Clone server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

