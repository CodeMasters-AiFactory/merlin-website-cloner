/**
 * Database Models and Operations
 * File-based persistent database using JSON files
 */

import fs from 'fs-extra';
import path from 'path';

// Data directory for persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: 'starter' | 'pro' | 'agency' | 'enterprise';
  createdAt: string;
  pagesUsed: number;
  pagesLimit: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAtPeriodEnd?: boolean;

  // Credit System - subscription includes credits, can buy more
  credits: number; // Current credit balance
  creditsUsedThisMonth: number; // Credits used in current billing period
  creditsIncludedMonthly: number; // Credits included with subscription
  creditsPurchased: number; // Total credits ever purchased
  lastCreditReset?: string; // When credits were last reset (monthly)

  // Proxy Network Credits - earned by contributing bandwidth
  proxyCredits?: number;
  proxyNodesCount?: number;
  totalBandwidthContributed?: number;
}

// Credit transaction for history tracking
export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'subscription_grant' | 'purchase' | 'usage' | 'proxy_earned' | 'refund' | 'expired';
  amount: number; // positive = added, negative = used
  balance: number; // balance after transaction
  description: string;
  jobId?: string; // Related clone job if usage
  createdAt: string;
}

export interface CloneJob {
  id: string;
  userId: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  pagesCloned: number;
  assetsCaptured: number;
  outputDir: string;
  exportPath?: string;
  createdAt: string;
  completedAt?: string;
  currentUrl?: string;
  currentStatus?: string;
  message?: string;
  recentFiles?: Array<{ path: string; size: number; timestamp: string; type: string }>;
  estimatedTimeRemaining?: number;
  startTime?: string;
  errors: string[];

  // Verification status
  verification?: {
    passed: boolean;
    score: number;
    summary: string;
    timestamp: string;
    checks?: Array<{
      name: string;
      category: string;
      passed: boolean;
      message: string;
    }>;
  };
}

class Database {
  private users: Map<string, User> = new Map();
  private jobs: Map<string, CloneJob> = new Map();
  private creditTransactions: Map<string, CreditTransaction[]> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
    // Disabled: Stop recovering orphan jobs from disk
    // this.scanExistingClones();
  }

  // ==================== PERSISTENCE ====================

  private load(): void {
    try {
      // Ensure data directory exists
      fs.ensureDirSync(DATA_DIR);

      // Load users
      if (fs.existsSync(USERS_FILE)) {
        const usersData = fs.readJsonSync(USERS_FILE);
        this.users = new Map(Object.entries(usersData));
        console.log(`[Database] Loaded ${this.users.size} users from disk`);
      }

      // Load jobs
      if (fs.existsSync(JOBS_FILE)) {
        const jobsData = fs.readJsonSync(JOBS_FILE);
        this.jobs = new Map(Object.entries(jobsData));
        console.log(`[Database] Loaded ${this.jobs.size} jobs from disk`);
      }

      // Load transactions
      if (fs.existsSync(TRANSACTIONS_FILE)) {
        const transData = fs.readJsonSync(TRANSACTIONS_FILE);
        this.creditTransactions = new Map(Object.entries(transData));
        console.log(`[Database] Loaded transactions for ${this.creditTransactions.size} users from disk`);
      }
    } catch (error) {
      console.error('[Database] Error loading data:', error);
    }
  }

  private save(): void {
    // Debounce saves to avoid excessive disk writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveNow();
    }, 100);
  }

  private saveNow(): void {
    try {
      fs.ensureDirSync(DATA_DIR);

      // Save users
      const usersObj = Object.fromEntries(this.users);
      fs.writeJsonSync(USERS_FILE, usersObj, { spaces: 2 });

      // Save jobs
      const jobsObj = Object.fromEntries(this.jobs);
      fs.writeJsonSync(JOBS_FILE, jobsObj, { spaces: 2 });

      // Save transactions
      const transObj = Object.fromEntries(this.creditTransactions);
      fs.writeJsonSync(TRANSACTIONS_FILE, transObj, { spaces: 2 });
    } catch (error) {
      console.error('[Database] Error saving data:', error);
    }
  }

  // Scan existing clone directories and create job records for orphans
  private scanExistingClones(): void {
    try {
      const clonesDir = path.join(process.cwd(), 'clones');
      if (!fs.existsSync(clonesDir)) return;

      const userDirs = fs.readdirSync(clonesDir);
      let orphansFound = 0;

      for (const userDir of userDirs) {
        const userPath = path.join(clonesDir, userDir);
        if (!fs.statSync(userPath).isDirectory()) continue;

        const jobDirs = fs.readdirSync(userPath);
        for (const jobDir of jobDirs) {
          const jobPath = path.join(userPath, jobDir);
          if (!fs.statSync(jobPath).isDirectory()) continue;

          // Check if job exists in database
          if (!this.jobs.has(jobDir)) {
            // Count HTML files
            const htmlFiles = this.countHtmlFiles(jobPath);

            // Create orphan job record
            const job: CloneJob = {
              id: jobDir,
              userId: userDir, // Use the parent directory as userId
              url: 'Unknown (recovered from disk)',
              status: 'completed',
              progress: 100,
              pagesCloned: htmlFiles,
              assetsCaptured: 0,
              outputDir: `./clones/${userDir}/${jobDir}`,
              createdAt: new Date(parseInt(jobDir) || Date.now()).toISOString(),
              completedAt: new Date().toISOString(),
              errors: [],
            };

            // Try to extract URL from index.html
            const indexPath = path.join(jobPath, 'index.html');
            if (fs.existsSync(indexPath)) {
              try {
                const html = fs.readFileSync(indexPath, 'utf-8');
                const match = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i) ||
                              html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i);
                if (match) {
                  job.url = match[1];
                }
              } catch (e) {
                // Ignore
              }
            }

            this.jobs.set(jobDir, job);
            orphansFound++;
          }
        }
      }

      if (orphansFound > 0) {
        console.log(`[Database] Recovered ${orphansFound} orphan clone jobs from disk`);
        this.saveNow();
      }
    } catch (error) {
      console.error('[Database] Error scanning clones:', error);
    }
  }

  private countHtmlFiles(dir: string): number {
    let count = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
          count++;
        } else if (entry.isDirectory()) {
          count += this.countHtmlFiles(path.join(dir, entry.name));
        }
      }
    } catch (e) {
      // Ignore
    }
    return count;
  }

  // ==================== USERS ====================

  createUser(user: Omit<User, 'id' | 'createdAt' | 'pagesUsed' | 'credits' | 'creditsUsedThisMonth' | 'creditsIncludedMonthly' | 'creditsPurchased'>): User {
    const id = Date.now().toString();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
      pagesUsed: 0,
      credits: 0,
      creditsUsedThisMonth: 0,
      creditsIncludedMonthly: 0,
      creditsPurchased: 0,
    };
    this.users.set(id, newUser);
    this.creditTransactions.set(id, []);
    this.save();
    return newUser;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    this.save();
    return updated;
  }

  // ==================== JOBS ====================

  createJob(job: Omit<CloneJob, 'id' | 'createdAt'>): CloneJob {
    const id = Date.now().toString();
    const newJob: CloneJob = {
      ...job,
      id,
      createdAt: new Date().toISOString()
    };
    this.jobs.set(id, newJob);
    this.save();
    return newJob;
  }

  getJobById(id: string): CloneJob | undefined {
    return this.jobs.get(id);
  }

  getJobsByUserId(userId: string): CloneJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  getAllJobs(): CloneJob[] {
    return Array.from(this.jobs.values());
  }

  updateJob(id: string, updates: Partial<CloneJob>): CloneJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const updated = { ...job, ...updates };
    this.jobs.set(id, updated);
    this.save();
    return updated;
  }

  deleteJob(id: string): boolean {
    const result = this.jobs.delete(id);
    if (result) this.save();
    return result;
  }

  // ==================== CREDIT TRANSACTIONS ====================

  addCreditTransaction(userId: string, transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): CreditTransaction {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTransaction: CreditTransaction = {
      ...transaction,
      id,
      createdAt: new Date().toISOString(),
    };

    const userTransactions = this.creditTransactions.get(userId) || [];
    userTransactions.push(newTransaction);
    this.creditTransactions.set(userId, userTransactions);
    this.save();

    return newTransaction;
  }

  getCreditTransactions(userId: string, limit?: number): CreditTransaction[] {
    const transactions = this.creditTransactions.get(userId) || [];
    // Sort by newest first
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // ==================== CREDIT OPERATIONS ====================

  addCredits(userId: string, amount: number, type: CreditTransaction['type'], description: string, jobId?: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const newBalance = user.credits + amount;
    this.updateUser(userId, { credits: newBalance });

    this.addCreditTransaction(userId, {
      userId,
      type,
      amount,
      balance: newBalance,
      description,
      jobId,
    });

    return true;
  }

  useCredits(userId: string, amount: number, description: string, jobId?: string): { success: boolean; newBalance: number } {
    const user = this.users.get(userId);
    if (!user) return { success: false, newBalance: 0 };

    if (user.credits < amount) {
      return { success: false, newBalance: user.credits };
    }

    const newBalance = user.credits - amount;
    this.updateUser(userId, {
      credits: newBalance,
      creditsUsedThisMonth: user.creditsUsedThisMonth + amount,
    });

    this.addCreditTransaction(userId, {
      userId,
      type: 'usage',
      amount: -amount,
      balance: newBalance,
      description,
      jobId,
    });

    return { success: true, newBalance };
  }

  resetMonthlyCredits(userId: string, creditsIncluded: number): void {
    const user = this.users.get(userId);
    if (!user) return;

    // Add monthly credits (don't remove purchased credits)
    const newBalance = user.credits + creditsIncluded;

    this.updateUser(userId, {
      credits: newBalance,
      creditsUsedThisMonth: 0,
      creditsIncludedMonthly: creditsIncluded,
      lastCreditReset: new Date().toISOString(),
    });

    this.addCreditTransaction(userId, {
      userId,
      type: 'subscription_grant',
      amount: creditsIncluded,
      balance: newBalance,
      description: `Monthly subscription credits (${creditsIncluded} credits)`,
    });
  }

  purchaseCredits(userId: string, amount: number, packName: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const newBalance = user.credits + amount;
    this.updateUser(userId, {
      credits: newBalance,
      creditsPurchased: user.creditsPurchased + amount,
    });

    this.addCreditTransaction(userId, {
      userId,
      type: 'purchase',
      amount,
      balance: newBalance,
      description: `Purchased ${packName} (${amount} credits)`,
    });

    return true;
  }

  convertProxyCredits(userId: string, proxyCredits: number, conversionRate: number): boolean {
    const user = this.users.get(userId);
    if (!user || !user.proxyCredits || user.proxyCredits < proxyCredits) return false;

    const cloneCredits = Math.floor(proxyCredits * conversionRate);
    const newBalance = user.credits + cloneCredits;

    this.updateUser(userId, {
      credits: newBalance,
      proxyCredits: user.proxyCredits - proxyCredits,
    });

    this.addCreditTransaction(userId, {
      userId,
      type: 'proxy_earned',
      amount: cloneCredits,
      balance: newBalance,
      description: `Converted ${proxyCredits} proxy credits to ${cloneCredits} clone credits`,
    });

    return true;
  }
}

export const db = new Database();
