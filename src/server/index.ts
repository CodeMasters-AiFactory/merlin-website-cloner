/**
 * Main Server Entry Point
 * Express server for website cloning API
 * Updated: Auto-verification enabled
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebsiteCloner } from '../services/websiteCloner.js';
import { MonitoringService } from '../services/monitoring.js';
import { LoggingService } from '../services/logging.js';
import { authenticateToken, optionalAuth, type AuthRequest } from './auth.js';
import { db, type User } from './database.js';
import crypto from 'crypto';
import fs from 'fs-extra';
import { ConfigManager } from '../services/configManager.js';
import { PaymentService } from '../services/paymentService.js';
import { merlinProxyNetwork } from '../services/proxyNetwork.js';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    if (db.getUserByEmail(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password (simple hash, use bcrypt in production)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Default to starter plan with free trial credits
    const pagesLimit = 10; // Starter gets 10 pages per month

    const user = db.createUser({
      email,
      name,
      passwordHash,
      plan: 'starter',
      pagesLimit
    });

    // Give starter users 100 free trial credits
    db.resetMonthlyCredits(user.id, 100);

    // Generate token (simple base64, use JWT in production)
    const token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name
    })).toString('base64');

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

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name
    })).toString('base64');

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
app.post('/api/clone', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { url, options } = req.body;
    const userId = req.userId!;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
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

    // Start cloning in background with progress tracking
    cloner.clone({
      url,
      outputDir,
      ...options,
      onProgress: (progress) => {
        // Update job with progress
        const currentJob = db.getJobById(job.id);
        const recentFiles = progress.recentFiles || [];
        const existingFiles = currentJob?.recentFiles || [];
        
        // Merge recent files (keep last 20)
        const allFiles = [...existingFiles, ...recentFiles]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);

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
        });
      }
    }).then(async (result) => {
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
      console.error('Clone error:', error);
      
      // Record error metric
      monitoring.recordError('clone', 'high');
      monitoring.recordPageCloned('failed');
      
      // Update active jobs metric
      const activeJobs = db.getJobsByUserId(userId).filter(j => j.status === 'processing').length;
      monitoring.setActiveJobs('clone', activeJobs);
      
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
      progress: job.progress
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/jobs
app.get('/api/jobs', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobs = db.getJobsByUserId(userId);
  res.json(jobs);
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const job = db.getJobById(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.userId !== userId) {
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

    // If requesting root or index.html, find it
    if (!requestPath || requestPath === 'index.html' || requestPath === '/') {
      const indexFile = findIndexHtml(previewDir);
      if (indexFile) {
        return res.sendFile(indexFile);
      }
    }

    // Check if file exists directly
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      return res.sendFile(targetPath);
    }

    // Try adding index.html for directory requests
    const indexInDir = path.join(targetPath, 'index.html');
    if (fs.existsSync(indexInDir)) {
      return res.sendFile(indexInDir);
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

    const result = await merlinProxyNetwork.registerNode({
      host,
      port: parseInt(port),
      userId,
      country,
      city,
      isp,
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

    await merlinProxyNetwork.heartbeat(nodeId, {
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

    await merlinProxyNetwork.recordRequest(nodeId, {
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

// GET /api/proxy-network/stats - Get network statistics
app.get('/api/proxy-network/stats', (req, res) => {
  try {
    const stats = merlinProxyNetwork.getNetworkStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/my-nodes - Get user's registered nodes
app.get('/api/proxy-network/my-nodes', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { totalCredits, nodes } = merlinProxyNetwork.getUserCredits(userId);

    res.json({
      totalCredits,
      nodes: nodes.map(node => ({
        id: node.id,
        host: node.host,
        port: node.port,
        country: node.country,
        isOnline: node.isOnline,
        successRate: node.successRate,
        totalRequests: node.totalRequests,
        bytesServed: node.bytesServed,
        creditsEarned: node.creditsEarned,
        registeredAt: node.registeredAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/proxy-network/leaderboard - Get top contributors
app.get('/api/proxy-network/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = merlinProxyNetwork.getLeaderboard(limit);

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/proxy-network/get-proxy - Get a proxy for cloning (internal use)
app.post('/api/proxy-network/get-proxy', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { targetUrl, country, minBandwidth, requireResidential } = req.body;

    const proxy = await merlinProxyNetwork.getProxy({
      targetUrl,
      country,
      minBandwidth,
      requireResidential,
    });

    if (!proxy) {
      return res.status(503).json({
        error: 'No proxies available. Contribute your bandwidth to help grow the network!',
      });
    }

    res.json({
      host: proxy.host,
      port: proxy.port,
      country: proxy.country,
      type: proxy.type,
      successRate: proxy.successRate,
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
    await merlinProxyNetwork.unregisterNode(nodeId);
    res.json({ success: true, message: 'Node unregistered' });
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
    
    // Start cloning in background
    cloner.clone(cloneOptions).then((result) => {
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
});

