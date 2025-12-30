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
const PROXY_NODES_FILE = path.join(DATA_DIR, 'proxy_nodes.json');
const PROXY_STATS_FILE = path.join(DATA_DIR, 'proxy_stats.json');

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

// Per-page progress tracking for detailed clone monitoring
export interface PageProgress {
  url: string;
  status: 'pending' | 'downloading' | 'complete' | 'failed';
  startedAt?: string;
  completedAt?: string;
  assetsTotal?: number;
  assetsDownloaded?: number;
  error?: string;
}

// ==================== PROXY NODE TYPES ====================

export interface ProxyNodeDB {
  id: string;
  publicKey: string;
  host: string;
  port: number;
  userId: string;

  // Geographic data
  country: string;
  countryCode: string;
  continent: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;

  // Network data
  isp?: string;
  asn?: number; // Autonomous System Number - critical for bypass
  asnOrg?: string; // ASN Organization name
  connectionType?: 'residential' | 'mobile' | 'datacenter' | 'isp';

  // Performance metrics
  bandwidth: number; // Mbps
  uptime: number; // Percentage 0-100
  latencyAvg: number; // Average latency ms
  latencyP50: number; // 50th percentile
  latencyP90: number; // 90th percentile
  latencyP99: number; // 99th percentile
  latencyMin: number;
  latencyMax: number;
  latencySamples: number[]; // Last 100 samples for percentile calculation

  // Success tracking
  successRate: number; // 0-1
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  // Data tracking
  bytesServed: number;
  bytesReceived: number;

  // Credit system
  creditsEarned: number;
  creditsPerHour: number; // Rolling average

  // Status
  isOnline: boolean;
  lastSeen: string;
  lastHealthCheck: string;
  healthCheckFailures: number;
  consecutiveFailures: number;

  // Metadata
  registeredAt: string;
  version: string;
  type: 'residential' | 'mobile' | 'datacenter';

  // TLS fingerprint data for stealth
  tlsFingerprint?: string; // JA3 hash
  tlsFingerprintType?: string; // Browser type this matches

  // Score (pre-calculated for fast selection)
  score: number;
}

export interface ProxyNetworkStats {
  totalNodes: number;
  onlineNodes: number;
  totalBandwidthMbps: number;
  totalRequestsServed: number;
  totalBytesTransferred: number;
  averageLatency: number;
  averageSuccessRate: number;
  countryCoverage: number;
  continentCoverage: Record<string, number>;
  topCountries: Array<{ country: string; nodes: number }>;
  topASNs: Array<{ asn: number; org: string; nodes: number }>;
  nodesByType: Record<string, number>;
  lastUpdated: string;
}

// Continent mapping for geo-routing
export const CONTINENT_MAP: Record<string, string> = {
  // Europe
  'GB': 'EU', 'DE': 'EU', 'FR': 'EU', 'IT': 'EU', 'ES': 'EU', 'NL': 'EU', 'BE': 'EU', 'AT': 'EU',
  'CH': 'EU', 'PL': 'EU', 'SE': 'EU', 'NO': 'EU', 'DK': 'EU', 'FI': 'EU', 'IE': 'EU', 'PT': 'EU',
  'CZ': 'EU', 'RO': 'EU', 'HU': 'EU', 'GR': 'EU', 'SK': 'EU', 'BG': 'EU', 'HR': 'EU', 'SI': 'EU',
  'LT': 'EU', 'LV': 'EU', 'EE': 'EU', 'LU': 'EU', 'MT': 'EU', 'CY': 'EU', 'UA': 'EU', 'RU': 'EU',
  // North America
  'US': 'NA', 'CA': 'NA', 'MX': 'NA',
  // South America
  'BR': 'SA', 'AR': 'SA', 'CL': 'SA', 'CO': 'SA', 'PE': 'SA', 'VE': 'SA', 'EC': 'SA', 'UY': 'SA',
  // Asia
  'CN': 'AS', 'JP': 'AS', 'KR': 'AS', 'IN': 'AS', 'ID': 'AS', 'TH': 'AS', 'VN': 'AS', 'MY': 'AS',
  'SG': 'AS', 'PH': 'AS', 'TW': 'AS', 'HK': 'AS', 'AE': 'AS', 'SA': 'AS', 'IL': 'AS', 'TR': 'AS',
  // Oceania
  'AU': 'OC', 'NZ': 'OC',
  // Africa
  'ZA': 'AF', 'EG': 'AF', 'NG': 'AF', 'KE': 'AF', 'MA': 'AF', 'TN': 'AF', 'GH': 'AF',
};

export interface CloneJob {
  id: string;
  userId: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  pagesCloned: number;
  assetsCaptured: number;
  outputDir: string;
  exportPath?: string;
  createdAt: string;
  completedAt?: string;
  pausedAt?: string;
  currentUrl?: string;
  currentStatus?: string;
  message?: string;
  recentFiles?: Array<{ path: string; size: number; timestamp: string; type: string }>;
  estimatedTimeRemaining?: number;
  startTime?: string;
  errors: string[];
  // Per-page progress for detailed monitoring
  pagesProgress?: PageProgress[];

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
  private proxyNodes: Map<string, ProxyNodeDB> = new Map();
  private proxyStats: ProxyNetworkStats | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;

  // Indexes for fast proxy lookups
  private proxyByCountry: Map<string, Set<string>> = new Map();
  private proxyByContinent: Map<string, Set<string>> = new Map();
  private proxyByASN: Map<number, Set<string>> = new Map();
  private proxyByType: Map<string, Set<string>> = new Map();
  private proxyByUser: Map<string, Set<string>> = new Map();

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

      // Load proxy nodes
      if (fs.existsSync(PROXY_NODES_FILE)) {
        const proxyData = fs.readJsonSync(PROXY_NODES_FILE);
        this.proxyNodes = new Map(Object.entries(proxyData));
        // Rebuild indexes
        this.rebuildProxyIndexes();
        console.log(`[Database] Loaded ${this.proxyNodes.size} proxy nodes from disk`);
      }

      // Load proxy stats
      if (fs.existsSync(PROXY_STATS_FILE)) {
        this.proxyStats = fs.readJsonSync(PROXY_STATS_FILE);
        console.log(`[Database] Loaded proxy network stats from disk`);
      }
    } catch (error) {
      console.error('[Database] Error loading data:', error);
    }
  }

  /**
   * Rebuild proxy indexes for fast lookups
   */
  private rebuildProxyIndexes(): void {
    this.proxyByCountry.clear();
    this.proxyByContinent.clear();
    this.proxyByASN.clear();
    this.proxyByType.clear();
    this.proxyByUser.clear();

    for (const [id, node] of this.proxyNodes) {
      this.indexProxyNode(node);
    }
  }

  /**
   * Index a proxy node for fast lookups
   */
  private indexProxyNode(node: ProxyNodeDB): void {
    // Index by country
    if (!this.proxyByCountry.has(node.countryCode)) {
      this.proxyByCountry.set(node.countryCode, new Set());
    }
    this.proxyByCountry.get(node.countryCode)!.add(node.id);

    // Index by continent
    if (!this.proxyByContinent.has(node.continent)) {
      this.proxyByContinent.set(node.continent, new Set());
    }
    this.proxyByContinent.get(node.continent)!.add(node.id);

    // Index by ASN
    if (node.asn) {
      if (!this.proxyByASN.has(node.asn)) {
        this.proxyByASN.set(node.asn, new Set());
      }
      this.proxyByASN.get(node.asn)!.add(node.id);
    }

    // Index by type
    if (!this.proxyByType.has(node.type)) {
      this.proxyByType.set(node.type, new Set());
    }
    this.proxyByType.get(node.type)!.add(node.id);

    // Index by user
    if (!this.proxyByUser.has(node.userId)) {
      this.proxyByUser.set(node.userId, new Set());
    }
    this.proxyByUser.get(node.userId)!.add(node.id);
  }

  /**
   * Remove proxy node from indexes
   */
  private unindexProxyNode(node: ProxyNodeDB): void {
    this.proxyByCountry.get(node.countryCode)?.delete(node.id);
    this.proxyByContinent.get(node.continent)?.delete(node.id);
    if (node.asn) {
      this.proxyByASN.get(node.asn)?.delete(node.id);
    }
    this.proxyByType.get(node.type)?.delete(node.id);
    this.proxyByUser.get(node.userId)?.delete(node.id);
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

      // Save proxy nodes
      const proxyObj = Object.fromEntries(this.proxyNodes);
      fs.writeJsonSync(PROXY_NODES_FILE, proxyObj, { spaces: 2 });

      // Save proxy stats
      if (this.proxyStats) {
        fs.writeJsonSync(PROXY_STATS_FILE, this.proxyStats, { spaces: 2 });
      }
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

  // ==================== PROXY NODE OPERATIONS ====================

  /**
   * Create or update a proxy node
   */
  upsertProxyNode(node: ProxyNodeDB): ProxyNodeDB {
    const existing = this.proxyNodes.get(node.id);
    if (existing) {
      this.unindexProxyNode(existing);
    }

    this.proxyNodes.set(node.id, node);
    this.indexProxyNode(node);
    this.save();
    return node;
  }

  /**
   * Get a proxy node by ID
   */
  getProxyNodeById(id: string): ProxyNodeDB | undefined {
    return this.proxyNodes.get(id);
  }

  /**
   * Get all proxy nodes for a user
   */
  getProxyNodesByUser(userId: string): ProxyNodeDB[] {
    const nodeIds = this.proxyByUser.get(userId);
    if (!nodeIds) return [];
    return Array.from(nodeIds).map(id => this.proxyNodes.get(id)!).filter(Boolean);
  }

  /**
   * Get proxy nodes by country
   */
  getProxyNodesByCountry(countryCode: string): ProxyNodeDB[] {
    const nodeIds = this.proxyByCountry.get(countryCode);
    if (!nodeIds) return [];
    return Array.from(nodeIds).map(id => this.proxyNodes.get(id)!).filter(Boolean);
  }

  /**
   * Get proxy nodes by continent
   */
  getProxyNodesByContinent(continent: string): ProxyNodeDB[] {
    const nodeIds = this.proxyByContinent.get(continent);
    if (!nodeIds) return [];
    return Array.from(nodeIds).map(id => this.proxyNodes.get(id)!).filter(Boolean);
  }

  /**
   * Get proxy nodes by ASN
   */
  getProxyNodesByASN(asn: number): ProxyNodeDB[] {
    const nodeIds = this.proxyByASN.get(asn);
    if (!nodeIds) return [];
    return Array.from(nodeIds).map(id => this.proxyNodes.get(id)!).filter(Boolean);
  }

  /**
   * Get proxy nodes by type
   */
  getProxyNodesByType(type: string): ProxyNodeDB[] {
    const nodeIds = this.proxyByType.get(type);
    if (!nodeIds) return [];
    return Array.from(nodeIds).map(id => this.proxyNodes.get(id)!).filter(Boolean);
  }

  /**
   * Get all online proxy nodes
   */
  getOnlineProxyNodes(): ProxyNodeDB[] {
    return Array.from(this.proxyNodes.values()).filter(node => node.isOnline);
  }

  /**
   * Get all proxy nodes
   */
  getAllProxyNodes(): ProxyNodeDB[] {
    return Array.from(this.proxyNodes.values());
  }

  /**
   * Delete a proxy node
   */
  deleteProxyNode(id: string): boolean {
    const node = this.proxyNodes.get(id);
    if (!node) return false;

    this.unindexProxyNode(node);
    this.proxyNodes.delete(id);
    this.save();
    return true;
  }

  /**
   * Update proxy node status
   */
  updateProxyNodeStatus(id: string, isOnline: boolean): void {
    const node = this.proxyNodes.get(id);
    if (!node) return;

    node.isOnline = isOnline;
    node.lastSeen = new Date().toISOString();
    this.proxyNodes.set(id, node);
    this.save();
  }

  /**
   * Record a request result for a proxy node
   * Updates latency percentiles and success rate
   */
  recordProxyRequest(id: string, result: {
    success: boolean;
    latencyMs: number;
    bytesTransferred: number;
  }): void {
    const node = this.proxyNodes.get(id);
    if (!node) return;

    // Update request counts
    node.totalRequests++;
    if (result.success) {
      node.successfulRequests++;
      node.consecutiveFailures = 0;
    } else {
      node.failedRequests++;
      node.consecutiveFailures++;
    }
    node.successRate = node.successfulRequests / node.totalRequests;

    // Update bytes
    node.bytesServed += result.bytesTransferred;

    // Update latency samples and percentiles
    node.latencySamples = node.latencySamples || [];
    node.latencySamples.push(result.latencyMs);

    // Keep last 100 samples
    if (node.latencySamples.length > 100) {
      node.latencySamples = node.latencySamples.slice(-100);
    }

    // Calculate percentiles
    const sorted = [...node.latencySamples].sort((a, b) => a - b);
    const len = sorted.length;

    node.latencyMin = sorted[0];
    node.latencyMax = sorted[len - 1];
    node.latencyAvg = sorted.reduce((a, b) => a + b, 0) / len;
    node.latencyP50 = sorted[Math.floor(len * 0.5)];
    node.latencyP90 = sorted[Math.floor(len * 0.9)];
    node.latencyP99 = sorted[Math.floor(len * 0.99)] || sorted[len - 1];

    // Calculate credits earned
    const CREDIT_RATES = {
      PER_REQUEST: 0.001,
      PER_MB: 0.01,
      QUALITY_MULTIPLIER: 1.5,
    };

    let credits = CREDIT_RATES.PER_REQUEST;
    credits += (result.bytesTransferred / 1024 / 1024) * CREDIT_RATES.PER_MB;
    if (node.successRate > 0.95) {
      credits *= CREDIT_RATES.QUALITY_MULTIPLIER;
    }
    node.creditsEarned += credits;

    // Recalculate score
    node.score = this.calculateProxyScore(node);

    node.lastSeen = new Date().toISOString();
    this.proxyNodes.set(id, node);
    this.save();
  }

  /**
   * Calculate proxy node score for selection
   * Higher score = better proxy
   */
  calculateProxyScore(node: ProxyNodeDB): number {
    let score = 0;

    // Success rate (0-40 points)
    score += node.successRate * 40;

    // Latency P50 (0-30 points, lower is better)
    if (node.latencyP50 < 100) score += 30;
    else if (node.latencyP50 < 200) score += 25;
    else if (node.latencyP50 < 500) score += 15;
    else if (node.latencyP50 < 1000) score += 5;

    // Bandwidth (0-15 points)
    if (node.bandwidth >= 100) score += 15;
    else if (node.bandwidth >= 50) score += 12;
    else if (node.bandwidth >= 20) score += 8;
    else if (node.bandwidth >= 5) score += 4;

    // Uptime (0-10 points)
    score += (node.uptime / 100) * 10;

    // Type bonus (0-5 points)
    if (node.type === 'residential') score += 5;
    else if (node.type === 'mobile') score += 4;
    else if (node.type === 'datacenter') score += 2;

    // ASN diversity bonus (having ASN data is valuable)
    if (node.asn) score += 2;

    // TLS fingerprint bonus (having fingerprint is valuable for stealth)
    if (node.tlsFingerprint) score += 3;

    return Math.round(score * 100) / 100;
  }

  /**
   * Get best proxy nodes for a request
   */
  getBestProxies(options: {
    count?: number;
    country?: string;
    continent?: string;
    asn?: number;
    type?: 'residential' | 'mobile' | 'datacenter';
    minSuccessRate?: number;
    maxLatency?: number;
    excludeASNs?: number[];
    diverseASNs?: boolean;
    diverseCountries?: boolean;
  } = {}): ProxyNodeDB[] {
    let candidates = this.getOnlineProxyNodes();

    // Apply filters
    if (options.country) {
      candidates = candidates.filter(n => n.countryCode === options.country);
    }
    if (options.continent) {
      candidates = candidates.filter(n => n.continent === options.continent);
    }
    if (options.asn) {
      candidates = candidates.filter(n => n.asn === options.asn);
    }
    if (options.type) {
      candidates = candidates.filter(n => n.type === options.type);
    }
    if (options.minSuccessRate) {
      candidates = candidates.filter(n => n.successRate >= options.minSuccessRate!);
    }
    if (options.maxLatency) {
      candidates = candidates.filter(n => n.latencyP50 <= options.maxLatency!);
    }
    if (options.excludeASNs && options.excludeASNs.length > 0) {
      const excludeSet = new Set(options.excludeASNs);
      candidates = candidates.filter(n => !n.asn || !excludeSet.has(n.asn));
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Apply diversity if requested
    const count = options.count || 10;

    if (options.diverseASNs || options.diverseCountries) {
      const result: ProxyNodeDB[] = [];
      const usedASNs = new Set<number>();
      const usedCountries = new Set<string>();

      for (const node of candidates) {
        if (result.length >= count) break;

        let shouldInclude = true;

        if (options.diverseASNs && node.asn && usedASNs.has(node.asn)) {
          // Allow some duplicates after we have diversity
          shouldInclude = result.length >= count / 2;
        }
        if (options.diverseCountries && usedCountries.has(node.countryCode)) {
          shouldInclude = result.length >= count / 2;
        }

        if (shouldInclude) {
          result.push(node);
          if (node.asn) usedASNs.add(node.asn);
          usedCountries.add(node.countryCode);
        }
      }

      return result;
    }

    return candidates.slice(0, count);
  }

  /**
   * Update network statistics
   */
  updateProxyNetworkStats(): ProxyNetworkStats {
    const nodes = Array.from(this.proxyNodes.values());
    const onlineNodes = nodes.filter(n => n.isOnline);

    // Count by country
    const countryCount = new Map<string, number>();
    for (const node of onlineNodes) {
      countryCount.set(node.countryCode, (countryCount.get(node.countryCode) || 0) + 1);
    }

    // Count by ASN
    const asnCount = new Map<number, { org: string; count: number }>();
    for (const node of onlineNodes) {
      if (node.asn) {
        const existing = asnCount.get(node.asn) || { org: node.asnOrg || 'Unknown', count: 0 };
        existing.count++;
        asnCount.set(node.asn, existing);
      }
    }

    // Count by continent
    const continentCount: Record<string, number> = {};
    for (const node of onlineNodes) {
      continentCount[node.continent] = (continentCount[node.continent] || 0) + 1;
    }

    // Count by type
    const typeCount: Record<string, number> = {};
    for (const node of onlineNodes) {
      typeCount[node.type] = (typeCount[node.type] || 0) + 1;
    }

    const stats: ProxyNetworkStats = {
      totalNodes: nodes.length,
      onlineNodes: onlineNodes.length,
      totalBandwidthMbps: onlineNodes.reduce((sum, n) => sum + n.bandwidth, 0),
      totalRequestsServed: nodes.reduce((sum, n) => sum + n.totalRequests, 0),
      totalBytesTransferred: nodes.reduce((sum, n) => sum + n.bytesServed, 0),
      averageLatency: onlineNodes.length > 0
        ? onlineNodes.reduce((sum, n) => sum + n.latencyAvg, 0) / onlineNodes.length
        : 0,
      averageSuccessRate: onlineNodes.length > 0
        ? onlineNodes.reduce((sum, n) => sum + n.successRate, 0) / onlineNodes.length
        : 0,
      countryCoverage: countryCount.size,
      continentCoverage: continentCount,
      topCountries: Array.from(countryCount.entries())
        .map(([country, nodes]) => ({ country, nodes }))
        .sort((a, b) => b.nodes - a.nodes)
        .slice(0, 20),
      topASNs: Array.from(asnCount.entries())
        .map(([asn, data]) => ({ asn, org: data.org, nodes: data.count }))
        .sort((a, b) => b.nodes - a.nodes)
        .slice(0, 20),
      nodesByType: typeCount,
      lastUpdated: new Date().toISOString(),
    };

    this.proxyStats = stats;
    this.save();
    return stats;
  }

  /**
   * Get cached network statistics
   */
  getProxyNetworkStats(): ProxyNetworkStats | null {
    return this.proxyStats;
  }

  /**
   * Get leaderboard of top proxy contributors
   */
  getProxyLeaderboard(limit: number = 20): Array<{
    userId: string;
    totalCredits: number;
    totalNodes: number;
    totalBytesServed: number;
    totalRequests: number;
    avgSuccessRate: number;
  }> {
    const userStats = new Map<string, {
      userId: string;
      totalCredits: number;
      totalNodes: number;
      totalBytesServed: number;
      totalRequests: number;
      successRates: number[];
    }>();

    for (const node of this.proxyNodes.values()) {
      const existing = userStats.get(node.userId) || {
        userId: node.userId,
        totalCredits: 0,
        totalNodes: 0,
        totalBytesServed: 0,
        totalRequests: 0,
        successRates: [],
      };

      existing.totalCredits += node.creditsEarned;
      existing.totalNodes++;
      existing.totalBytesServed += node.bytesServed;
      existing.totalRequests += node.totalRequests;
      if (node.totalRequests > 0) {
        existing.successRates.push(node.successRate);
      }

      userStats.set(node.userId, existing);
    }

    return Array.from(userStats.values())
      .map(stats => ({
        userId: stats.userId,
        totalCredits: Math.round(stats.totalCredits * 100) / 100,
        totalNodes: stats.totalNodes,
        totalBytesServed: stats.totalBytesServed,
        totalRequests: stats.totalRequests,
        avgSuccessRate: stats.successRates.length > 0
          ? stats.successRates.reduce((a, b) => a + b, 0) / stats.successRates.length
          : 0,
      }))
      .sort((a, b) => b.totalCredits - a.totalCredits)
      .slice(0, limit);
  }
}

export const db = new Database();
