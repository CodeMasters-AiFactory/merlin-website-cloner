/**
 * Prisma Database Service
 * COD-9-007, COD-9-008: PostgreSQL-backed user and job operations
 * 
 * This service provides the same interface as the file-based database
 * but uses PostgreSQL via Prisma for persistence.
 */

import { prisma } from './prismaClient.js';
import { 
  User, 
  CloneJob, 
  Transaction, 
  CreditTransaction,
  Consent,
  DMCARequest,
  Plan,
  JobStatus,
  SubscriptionStatus,
  CreditType,
  ConsentType,
  DMCAStatus,
  TransactionType,
  TransactionStatus,
  Prisma
} from '@prisma/client';

// Re-export types
export type { 
  User, 
  CloneJob, 
  Transaction, 
  CreditTransaction,
  Consent,
  DMCARequest 
};

export { 
  Plan, 
  JobStatus, 
  SubscriptionStatus, 
  CreditType, 
  ConsentType, 
  DMCAStatus,
  TransactionType,
  TransactionStatus
};

// ==================== USER OPERATIONS ====================

export async function createUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  plan?: Plan;
  pagesLimit?: number;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      plan: data.plan || Plan.STARTER,
      pagesLimit: data.pagesLimit || 10,
    },
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { stripeCustomerId } });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User | null> {
  try {
    return await prisma.user.update({ where: { id }, data });
  } catch {
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==================== JOB OPERATIONS ====================

export async function createJob(data: {
  userId: string;
  url: string;
  outputDir: string;
  status?: JobStatus;
}): Promise<CloneJob> {
  return prisma.cloneJob.create({
    data: {
      userId: data.userId,
      url: data.url,
      outputDir: data.outputDir,
      status: data.status || JobStatus.PENDING,
    },
  });
}

export async function getJobById(id: string): Promise<CloneJob | null> {
  return prisma.cloneJob.findUnique({ where: { id } });
}

export async function getJobsByUserId(userId: string): Promise<CloneJob[]> {
  return prisma.cloneJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllJobs(): Promise<CloneJob[]> {
  return prisma.cloneJob.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateJob(id: string, data: Prisma.CloneJobUpdateInput): Promise<CloneJob | null> {
  try {
    return await prisma.cloneJob.update({ where: { id }, data });
  } catch {
    return null;
  }
}

export async function deleteJob(id: string): Promise<boolean> {
  try {
    await prisma.cloneJob.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==================== CREDIT OPERATIONS ====================

export async function addCredits(
  userId: string,
  amount: number,
  type: CreditType,
  description: string,
  jobId?: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const newBalance = user.credits + amount;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          type,
          amount,
          balance: newBalance,
          description,
          jobId,
        },
      }),
    ]);

    return true;
  } catch {
    return false;
  }
}

export async function useCredits(
  userId: string,
  amount: number,
  description: string,
  jobId?: string
): Promise<{ success: boolean; newBalance: number }> {
  try {
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
          creditsUsedThisMonth: user.creditsUsedThisMonth + amount,
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          type: CreditType.USAGE,
          amount: -amount,
          balance: newBalance,
          description,
          jobId,
        },
      }),
    ]);

    return { success: true, newBalance };
  } catch {
    return { success: false, newBalance: 0 };
  }
}

export async function getCreditTransactions(
  userId: string,
  limit?: number
): Promise<CreditTransaction[]> {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ==================== CONSENT OPERATIONS ====================

export async function recordConsent(
  userId: string,
  type: ConsentType,
  version: string,
  ipHash: string,
  userAgent: string,
  metadata?: Prisma.InputJsonValue
): Promise<Consent> {
  return prisma.consent.create({
    data: {
      userId,
      type,
      version,
      ipHash,
      userAgent,
      metadata,
    },
  });
}

export async function hasValidConsent(
  userId: string,
  type: ConsentType,
  version: string
): Promise<boolean> {
  const consent = await prisma.consent.findFirst({
    where: {
      userId,
      type,
      version,
      accepted: true,
    },
  });
  return !!consent;
}

export async function getUserConsents(userId: string): Promise<Consent[]> {
  return prisma.consent.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'desc' },
  });
}

// ==================== DMCA OPERATIONS ====================

export async function createDMCARequest(data: {
  claimantName: string;
  claimantEmail: string;
  claimantCompany?: string;
  claimantAddress?: string;
  claimantPhone?: string;
  originalWorkUrl: string;
  originalWorkDescription?: string;
  infringingUrl: string;
  infringingJobId?: string;
  infringingUserId?: string;
  goodFaithStatement: boolean;
  accuracyStatement: boolean;
  ownershipStatement: boolean;
  signature: string;
}): Promise<DMCARequest> {
  return prisma.dMCARequest.create({ data });
}

export async function getDMCARequest(id: string): Promise<DMCARequest | null> {
  return prisma.dMCARequest.findUnique({ where: { id } });
}

export async function getDMCARequests(status?: DMCAStatus): Promise<DMCARequest[]> {
  return prisma.dMCARequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateDMCAStatus(
  id: string,
  status: DMCAStatus,
  reviewedBy: string,
  reviewNotes?: string,
  actionTaken?: string
): Promise<DMCARequest | null> {
  try {
    return await prisma.dMCARequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy,
        reviewNotes,
        actionTaken,
      },
    });
  } catch {
    return null;
  }
}

// ==================== TRANSACTION OPERATIONS ====================

export async function createTransaction(data: {
  userId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<Transaction> {
  return prisma.transaction.create({
    data: {
      ...data,
      currency: data.currency || 'USD',
    },
  });
}

export async function getTransactionsByUserId(userId: string): Promise<Transaction[]> {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus
): Promise<Transaction | null> {
  try {
    return await prisma.transaction.update({
      where: { id },
      data: {
        status,
        completedAt: status === TransactionStatus.COMPLETED ? new Date() : undefined,
      },
    });
  } catch {
    return null;
  }
}

// ==================== UTILITY ====================

export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { prisma };
