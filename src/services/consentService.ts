/**
 * Consent Recording Service
 * COD-14-003: Records user acceptance of Terms of Service
 * Stores timestamp, IP, version, and user agent for legal compliance
 */

import fs from 'fs-extra';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONSENTS_FILE = path.join(DATA_DIR, 'consents.json');

export interface ConsentRecord {
  id: string;
  userId: string;
  type: 'terms_of_service' | 'privacy_policy' | 'clone_disclaimer' | 'dmca_acknowledgment';
  version: string;
  accepted: boolean;
  acceptedAt: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export interface ConsentRequirement {
  type: ConsentRecord['type'];
  version: string;
  required: boolean;
  description: string;
}

// Current consent versions - update when ToS changes
export const CONSENT_VERSIONS = {
  terms_of_service: '1.0.0',
  privacy_policy: '1.0.0',
  clone_disclaimer: '1.0.0',
  dmca_acknowledgment: '1.0.0',
} as const;

export class ConsentService {
  private consents: Map<string, ConsentRecord[]> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      fs.ensureDirSync(DATA_DIR);
      if (fs.existsSync(CONSENTS_FILE)) {
        const data = fs.readJsonSync(CONSENTS_FILE);
        this.consents = new Map(Object.entries(data));
        console.log(`[ConsentService] Loaded consents for ${this.consents.size} users`);
      }
    } catch (error) {
      console.error('[ConsentService] Error loading consents:', error);
    }
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveNow(), 100);
  }

  private saveNow(): void {
    try {
      fs.ensureDirSync(DATA_DIR);
      const obj = Object.fromEntries(this.consents);
      fs.writeJsonSync(CONSENTS_FILE, obj, { spaces: 2 });
    } catch (error) {
      console.error('[ConsentService] Error saving consents:', error);
    }
  }

  /**
   * Record user consent for a specific type
   */
  recordConsent(
    userId: string,
    type: ConsentRecord['type'],
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): ConsentRecord {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const consent: ConsentRecord = {
      id,
      userId,
      type,
      version: CONSENT_VERSIONS[type],
      accepted: true,
      acceptedAt: new Date().toISOString(),
      ipAddress: this.hashIp(ipAddress), // Store hashed for privacy
      userAgent,
      metadata,
    };

    const userConsents = this.consents.get(userId) || [];
    userConsents.push(consent);
    this.consents.set(userId, userConsents);
    this.save();

    console.log(`[ConsentService] Recorded ${type} consent for user ${userId}`);
    return consent;
  }

  /**
   * Check if user has valid consent for a type
   */
  hasValidConsent(userId: string, type: ConsentRecord['type']): boolean {
    const userConsents = this.consents.get(userId) || [];
    const currentVersion = CONSENT_VERSIONS[type];

    return userConsents.some(
      c => c.type === type && c.version === currentVersion && c.accepted
    );
  }

  /**
   * Get all consents for a user
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consents.get(userId) || [];
  }

  /**
   * Get missing consents for a user
   */
  getMissingConsents(userId: string): ConsentRequirement[] {
    const missing: ConsentRequirement[] = [];
    const types: ConsentRecord['type'][] = [
      'terms_of_service',
      'privacy_policy',
      'clone_disclaimer',
    ];

    for (const type of types) {
      if (!this.hasValidConsent(userId, type)) {
        missing.push({
          type,
          version: CONSENT_VERSIONS[type],
          required: true,
          description: this.getConsentDescription(type),
        });
      }
    }

    return missing;
  }

  /**
   * Require consent before clone operation
   */
  canClone(userId: string): { allowed: boolean; missing: ConsentRequirement[] } {
    const missing = this.getMissingConsents(userId);
    const requiredMissing = missing.filter(m => m.required);

    return {
      allowed: requiredMissing.length === 0,
      missing: requiredMissing,
    };
  }

  /**
   * Record all required consents at once (for registration)
   */
  recordAllConsents(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): ConsentRecord[] {
    const types: ConsentRecord['type'][] = [
      'terms_of_service',
      'privacy_policy',
      'clone_disclaimer',
    ];

    return types.map(type => 
      this.recordConsent(userId, type, ipAddress, userAgent)
    );
  }

  /**
   * Get consent audit trail for a user (for legal requests)
   */
  getAuditTrail(userId: string): ConsentRecord[] {
    return (this.consents.get(userId) || []).sort(
      (a, b) => new Date(a.acceptedAt).getTime() - new Date(b.acceptedAt).getTime()
    );
  }

  /**
   * Export consent data for GDPR requests
   */
  exportUserData(userId: string): { consents: ConsentRecord[] } {
    return {
      consents: this.getUserConsents(userId),
    };
  }

  /**
   * Delete user consent data (GDPR right to erasure)
   */
  deleteUserData(userId: string): boolean {
    const existed = this.consents.has(userId);
    this.consents.delete(userId);
    this.save();
    return existed;
  }

  private hashIp(ip: string): string {
    // Simple hash to anonymize IP while still being useful for fraud detection
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + 'merlin-salt').digest('hex').substring(0, 16);
  }

  private getConsentDescription(type: ConsentRecord['type']): string {
    const descriptions: Record<ConsentRecord['type'], string> = {
      terms_of_service: 'Accept Terms of Service',
      privacy_policy: 'Accept Privacy Policy',
      clone_disclaimer: 'Acknowledge that cloning is for backup purposes only',
      dmca_acknowledgment: 'Acknowledge DMCA compliance requirements',
    };
    return descriptions[type];
  }
}

// Singleton instance
export const consentService = new ConsentService();
