/**
 * Hybrid Database Service
 * COD-9-007/008: Prisma ORM with JSON file fallback
 * 
 * Automatically uses PostgreSQL when DATABASE_URL is set,
 * otherwise falls back to JSON file storage.
 */

import { prisma, isDatabaseConnected, initDatabase } from './prismaClient.js';
import { db as jsonDb } from './database.js';
import type { User, CloneJob, CreditTransaction } from './database.js';
import type { Plan, SubscriptionStatus, JobStatus } from '@prisma/client';

let usePrisma = false;

// Initialize - check if Prisma is available
export async function initHybridDatabase(): Promise<void> {
  if (process.env.DATABASE_URL) {
    usePrisma = await initDatabase();
    if (usePrisma) {
      console.log('[HybridDB] Using PostgreSQL via Prisma');
    } else {
      console.log('[HybridDB] Prisma failed, falling back to JSON storage');
    }
  } else {
    console.log('[HybridDB] No DATABASE_URL - using JSON file storage');
  }
}

// Type converters
function toPrismaplan(plan: string): Plan {
  const map: Record<string, Plan> = {
    'starter': 'STARTER',
    'pro': 'PRO',
    'agency': 'AGENCY',
    'enterprise': 'ENTERPRISE',
  };
  return map[plan] || 'STARTER';
}

function fromPrismaPlan(plan: Plan): User['plan'] {
  return plan.toLowerCase() as User['plan'];
}

function toPrismaStatus(status: string): JobStatus {
  const map: Record<string, JobStatus> = {
    'pending': 'PENDING',
    'processing': 'PROCESSING',
    'completed': 'COMPLETED',
    'failed': 'FAILED',
    'cancelled': 'CANCELLED',
  };
  return map[status] || 'PENDING';
}

// ==================== USER OPERATIONS ====================

export async function createUser(userData: {
  email: string;
  name: string;
  passwordHash: string;
  plan?: User['plan'];
  pagesLimit?: number;
}): Promise<User> {
  if (usePrisma) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        passwordHash: userData.passwordHash,
        plan: toPrismaplan(userData.plan || 'starter'),
        pagesLimit: userData.pagesLimit || 10,
      },
    });
    return convertPrismaUser(user);
  } else {
    return jsonDb.createUser({
      email: userData.email,
      name: userData.name,
      passwordHash: userData.passwordHash,
      plan: userData.plan || 'starter',
      pagesLimit: userData.pagesLimit || 10,
    });
  }
}


export async function getUserById(id: string): Promise<User | null> {
  if (usePrisma) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? convertPrismaUser(user) : null;
  } else {
    return jsonDb.getUserById(id) || null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (usePrisma) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? convertPrismaUser(user) : null;
  } else {
    return jsonDb.getUserByEmail(email) || null;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  if (usePrisma) {
    const data: any = { ...updates };
    if (updates.plan) data.plan = toPrismaplan(updates.plan);
    delete data.id;
    delete data.createdAt;
    
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return convertPrismaUser(user);
  } else {
    return jsonDb.updateUser(id, updates) || null;
  }
}

// ==================== JOB OPERATIONS ====================

export async function createJob(jobData: {
  userId: string;
  url: string;
  outputDir: string;
}): Promise<CloneJob> {
  if (usePrisma) {
    const job = await prisma.cloneJob.create({
      data: {
        userId: jobData.userId,
        url: jobData.url,
        outputDir: jobData.outputDir,
        status: 'PENDING',
        progress: 0,
        pagesCloned: 0,
        assetsCaptured: 0,
        errors: [],
      },
    });
    return convertPrismaJob(job);
  } else {
    return jsonDb.createJob({
      userId: jobData.userId,
      url: jobData.url,
      status: 'pending',
      progress: 0,
      pagesCloned: 0,
      assetsCaptured: 0,
      outputDir: jobData.outputDir,
      errors: [],
    });
  }
}

export async function getJobById(id: string): Promise<CloneJob | null> {
  if (usePrisma) {
    const job = await prisma.cloneJob.findUnique({ where: { id } });
    return job ? convertPrismaJob(job) : null;
  } else {
    return jsonDb.getJobById(id) || null;
  }
}

export async function getJobsByUserId(userId: string): Promise<CloneJob[]> {
  if (usePrisma) {
    const jobs = await prisma.cloneJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map(convertPrismaJob);
  } else {
    return jsonDb.getJobsByUserId(userId);
  }
}

export async function updateJob(id: string, updates: Partial<CloneJob>): Promise<CloneJob | null> {
  if (usePrisma) {
    const data: any = { ...updates };
    if (updates.status) data.status = toPrismaStatus(updates.status);
    delete data.id;
    delete data.createdAt;
    
    const job = await prisma.cloneJob.update({
      where: { id },
      data,
    });
    return convertPrismaJob(job);
  } else {
    return jsonDb.updateJob(id, updates) || null;
  }
}

export async function deleteJob(id: string): Promise<boolean> {
  if (usePrisma) {
    await prisma.cloneJob.delete({ where: { id } });
    return true;
  } else {
    return jsonDb.deleteJob(id);
  }
}


// ==================== CREDIT OPERATIONS ====================

export async function addCredits(
  userId: string, 
  amount: number, 
  type: CreditTransaction['type'], 
  description: string
): Promise<boolean> {
  if (usePrisma) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          type: type.toUpperCase().replace(/_/g, '_') as any,
          amount,
          balance: user.credits + amount,
          description,
        },
      }),
    ]);
    return true;
  } else {
    return jsonDb.addCredits(userId, amount, type, description);
  }
}

export async function useCredits(
  userId: string, 
  amount: number, 
  description: string, 
  jobId?: string
): Promise<{ success: boolean; newBalance: number }> {
  if (usePrisma) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < amount) {
      return { success: false, newBalance: user?.credits || 0 };
    }
    
    const newBalance = user.credits - amount;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { 
          credits: newBalance,
          creditsUsedThisMonth: { increment: amount },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          type: 'USAGE',
          amount: -amount,
          balance: newBalance,
          description,
          jobId,
        },
      }),
    ]);
    return { success: true, newBalance };
  } else {
    return jsonDb.useCredits(userId, amount, description, jobId);
  }
}

// ==================== CONVERTERS ====================

function convertPrismaUser(user: any): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    plan: fromPrismaPlan(user.plan),
    createdAt: user.createdAt.toISOString(),
    pagesUsed: user.pagesUsed,
    pagesLimit: user.pagesLimit,
    stripeCustomerId: user.stripeCustomerId || undefined,
    stripeSubscriptionId: user.stripeSubscriptionId || undefined,
    subscriptionStatus: user.subscriptionStatus?.toLowerCase() as any,
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString(),
    subscriptionCancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
    credits: user.credits,
    creditsUsedThisMonth: user.creditsUsedThisMonth,
    creditsIncludedMonthly: user.creditsIncludedMonthly,
    creditsPurchased: user.creditsPurchased,
    lastCreditReset: user.lastCreditReset?.toISOString(),
    proxyCredits: user.proxyCredits,
    proxyNodesCount: user.proxyNodesCount,
    totalBandwidthContributed: Number(user.totalBandwidthContributed),
  };
}

function convertPrismaJob(job: any): CloneJob {
  return {
    id: job.id,
    userId: job.userId,
    url: job.url,
    status: job.status.toLowerCase() as CloneJob['status'],
    progress: job.progress,
    pagesCloned: job.pagesCloned,
    assetsCaptured: job.assetsCaptured,
    outputDir: job.outputDir,
    exportPath: job.exportPath || undefined,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    currentUrl: job.currentUrl || undefined,
    currentStatus: job.currentStatus || undefined,
    message: job.message || undefined,
    estimatedTimeRemaining: job.estimatedTimeRemaining || undefined,
    startTime: job.startTime?.toISOString(),
    errors: job.errors || [],
    verification: job.verificationPassed !== null ? {
      passed: job.verificationPassed,
      score: job.verificationScore || 0,
      summary: job.verificationSummary || '',
      timestamp: job.updatedAt.toISOString(),
      checks: job.verificationChecks as any,
    } : undefined,
  };
}

// Export for compatibility with existing code
export { usePrisma };
