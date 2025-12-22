/**
 * DMCA Takedown Service
 * COD-14-005: Handles DMCA takedown requests and compliance
 */

import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DMCA_FILE = path.join(DATA_DIR, 'dmca_requests.json');

export interface DMCARequest {
  id: string;
  status: 'pending' | 'reviewing' | 'valid' | 'invalid' | 'actioned' | 'counter_filed';
  
  // Claimant info
  claimantName: string;
  claimantEmail: string;
  claimantCompany?: string;
  claimantAddress?: string;
  claimantPhone?: string;
  
  // Infringement details
  originalWorkUrl: string;
  originalWorkDescription: string;
  infringingUrl: string;
  infringingJobId?: string;
  infringingUserId?: string;
  
  // Legal statements
  goodFaithStatement: boolean;
  accuracyStatement: boolean;
  ownershipStatement: boolean;
  signature: string;
  
  // Processing
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  actionTaken?: string;
  
  // Counter-notice
  counterNotice?: {
    filedAt: string;
    filedBy: string;
    statement: string;
    signature: string;
  };
}

export interface DMCAStats {
  total: number;
  pending: number;
  valid: number;
  invalid: number;
  actioned: number;
}

export class DMCAService {
  private requests: Map<string, DMCARequest> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      fs.ensureDirSync(DATA_DIR);
      if (fs.existsSync(DMCA_FILE)) {
        const data = fs.readJsonSync(DMCA_FILE);
        this.requests = new Map(Object.entries(data));
        console.log(`[DMCAService] Loaded ${this.requests.size} DMCA requests`);
      }
    } catch (error) {
      console.error('[DMCAService] Error loading:', error);
    }
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveNow(), 100);
  }

  private saveNow(): void {
    try {
      fs.ensureDirSync(DATA_DIR);
      const obj = Object.fromEntries(this.requests);
      fs.writeJsonSync(DMCA_FILE, obj, { spaces: 2 });
    } catch (error) {
      console.error('[DMCAService] Error saving:', error);
    }
  }

  /**
   * Submit a new DMCA takedown request
   */
  submitRequest(request: Omit<DMCARequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): DMCARequest {
    const id = `DMCA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const dmca: DMCARequest = {
      ...request,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.requests.set(id, dmca);
    this.save();

    // Notify admin
    this.notifyAdmin(dmca);

    console.log(`[DMCAService] New DMCA request: ${id}`);
    return dmca;
  }

  /**
   * Get a specific request
   */
  getRequest(id: string): DMCARequest | undefined {
    return this.requests.get(id);
  }

  /**
   * Get all requests with optional status filter
   */
  getRequests(status?: DMCARequest['status']): DMCARequest[] {
    const all = Array.from(this.requests.values());
    if (status) {
      return all.filter(r => r.status === status);
    }
    return all.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update request status (admin action)
   */
  updateStatus(
    id: string, 
    status: DMCARequest['status'], 
    reviewedBy: string,
    reviewNotes?: string,
    actionTaken?: string
  ): DMCARequest | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;

    request.status = status;
    request.updatedAt = new Date().toISOString();
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = reviewedBy;
    if (reviewNotes) request.reviewNotes = reviewNotes;
    if (actionTaken) request.actionTaken = actionTaken;

    this.requests.set(id, request);
    this.save();

    // If valid, take action
    if (status === 'valid' || status === 'actioned') {
      this.executeAction(request);
    }

    return request;
  }

  /**
   * File counter-notice
   */
  fileCounterNotice(
    id: string,
    filedBy: string,
    statement: string,
    signature: string
  ): DMCARequest | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;

    request.counterNotice = {
      filedAt: new Date().toISOString(),
      filedBy,
      statement,
      signature,
    };
    request.status = 'counter_filed';
    request.updatedAt = new Date().toISOString();

    this.requests.set(id, request);
    this.save();

    // Notify admin of counter-notice
    this.notifyAdminCounterNotice(request);

    return request;
  }

  /**
   * Get statistics
   */
  getStats(): DMCAStats {
    const all = Array.from(this.requests.values());
    return {
      total: all.length,
      pending: all.filter(r => r.status === 'pending' || r.status === 'reviewing').length,
      valid: all.filter(r => r.status === 'valid').length,
      invalid: all.filter(r => r.status === 'invalid').length,
      actioned: all.filter(r => r.status === 'actioned').length,
    };
  }

  /**
   * Check if a URL has been taken down
   */
  isUrlTakenDown(url: string): boolean {
    for (const request of this.requests.values()) {
      if (request.infringingUrl === url && 
          (request.status === 'valid' || request.status === 'actioned')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a job has been taken down
   */
  isJobTakenDown(jobId: string): boolean {
    for (const request of this.requests.values()) {
      if (request.infringingJobId === jobId && 
          (request.status === 'valid' || request.status === 'actioned')) {
        return true;
      }
    }
    return false;
  }

  private async executeAction(request: DMCARequest): Promise<void> {
    // In a real implementation, this would:
    // 1. Delete the infringing clone files
    // 2. Notify the user who created the clone
    // 3. Log the action for compliance
    console.log(`[DMCAService] Executing takedown for ${request.id}`);
    
    if (request.infringingJobId) {
      const jobPath = path.join(process.cwd(), 'clones', request.infringingUserId || 'unknown', request.infringingJobId);
      if (fs.existsSync(jobPath)) {
        // Move to quarantine instead of delete (for legal purposes)
        const quarantinePath = path.join(process.cwd(), 'quarantine', request.id);
        fs.ensureDirSync(path.dirname(quarantinePath));
        fs.moveSync(jobPath, quarantinePath, { overwrite: true });
        console.log(`[DMCAService] Moved ${jobPath} to quarantine`);
      }
    }
  }

  private notifyAdmin(request: DMCARequest): void {
    // TODO: Send email/Slack notification to admin
    console.log(`[DMCAService] ADMIN NOTIFICATION: New DMCA request ${request.id}`);
    console.log(`  Claimant: ${request.claimantName} <${request.claimantEmail}>`);
    console.log(`  Original: ${request.originalWorkUrl}`);
    console.log(`  Infringing: ${request.infringingUrl}`);
  }

  private notifyAdminCounterNotice(request: DMCARequest): void {
    console.log(`[DMCAService] ADMIN NOTIFICATION: Counter-notice filed for ${request.id}`);
  }
}

// Singleton
export const dmcaService = new DMCAService();
