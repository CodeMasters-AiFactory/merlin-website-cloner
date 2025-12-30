/**
 * Webhook Service
 * Integrations with Zapier, Make (Integromat), and custom webhooks
 */

// Simple console logger (LoggingService is async, use console for simplicity)
const logger = {
  info: (msg: string) => console.log(`[Webhook] ${msg}`),
  warn: (msg: string) => console.warn(`[Webhook] ${msg}`),
  error: (msg: string) => console.error(`[Webhook] ${msg}`),
};

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  enabled: boolean;
  retryCount?: number;
  headers?: Record<string, string>;
  createdAt: Date;
  lastTriggeredAt?: Date;
}

export type WebhookEvent =
  | 'clone.started'
  | 'clone.progress'
  | 'clone.completed'
  | 'clone.failed'
  | 'job.created'
  | 'job.updated'
  | 'job.deleted'
  | 'export.completed'
  | 'dr.alert'
  | 'dr.failover';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    jobId?: string;
    userId?: string;
    url?: string;
  };
}

export class WebhookService {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private retryQueue: Map<string, { payload: WebhookPayload; attempts: number }> = new Map();

  /**
   * Register a new webhook
   */
  async registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): Promise<WebhookConfig> {
    const id = this.generateId();
    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: new Date(),
      retryCount: config.retryCount ?? 3,
    };

    this.webhooks.set(id, webhook);
    logger.info(`Webhook registered: ${id} for events: ${config.events.join(', ')}`);

    return webhook;
  }

  /**
   * Unregister a webhook
   */
  async unregisterWebhook(id: string): Promise<boolean> {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      logger.info(`Webhook unregistered: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all registered webhooks
   */
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get webhook by ID
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(event: WebhookEvent, data: Record<string, any>, metadata?: WebhookPayload['metadata']): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(w => w.enabled && w.events.includes(event));

    logger.info(`Triggering ${matchingWebhooks.length} webhooks for event: ${event}`);

    await Promise.allSettled(
      matchingWebhooks.map(webhook => this.sendWebhook(webhook, payload))
    );
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(webhook: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Merlin-Webhook/1.0',
      'X-Webhook-Id': webhook.id,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      ...webhook.headers,
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Update last triggered time
      webhook.lastTriggeredAt = new Date();
      logger.info(`Webhook ${webhook.id} triggered successfully for ${payload.event}`);

    } catch (error: any) {
      logger.error(`Webhook ${webhook.id} failed: ${error.message}`);

      // Queue for retry if retries are enabled
      if (webhook.retryCount && webhook.retryCount > 0) {
        const key = `${webhook.id}:${payload.timestamp}`;
        const existing = this.retryQueue.get(key);
        const attempts = existing ? existing.attempts + 1 : 1;

        if (attempts < (webhook.retryCount || 3)) {
          this.retryQueue.set(key, { payload, attempts });
          // Schedule retry with exponential backoff
          setTimeout(() => this.retryWebhook(webhook, key), Math.pow(2, attempts) * 1000);
        } else {
          logger.error(`Webhook ${webhook.id} exhausted retries for ${payload.event}`);
          this.retryQueue.delete(key);
        }
      }
    }
  }

  /**
   * Retry a failed webhook
   */
  private async retryWebhook(webhook: WebhookConfig, key: string): Promise<void> {
    const queued = this.retryQueue.get(key);
    if (!queued) return;

    logger.info(`Retrying webhook ${webhook.id} (attempt ${queued.attempts + 1})`);
    await this.sendWebhook(webhook, queued.payload);
  }

  /**
   * Generate unique webhook ID
   */
  private generateId(): string {
    return `wh_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Create Zapier-compatible webhook
   */
  async createZapierWebhook(zapUrl: string, events: WebhookEvent[]): Promise<WebhookConfig> {
    return this.registerWebhook({
      url: zapUrl,
      events,
      enabled: true,
      headers: {
        'X-Integration': 'zapier',
      },
    });
  }

  /**
   * Create Make (Integromat) compatible webhook
   */
  async createMakeWebhook(makeUrl: string, events: WebhookEvent[]): Promise<WebhookConfig> {
    return this.registerWebhook({
      url: makeUrl,
      events,
      enabled: true,
      headers: {
        'X-Integration': 'make',
      },
    });
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(id: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return { success: false, message: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      event: 'clone.started',
      timestamp: new Date().toISOString(),
      data: { test: true, message: 'Webhook connectivity test' },
    };

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true',
        },
        body: JSON.stringify(testPayload),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: `Webhook responded with ${response.status}`,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `Webhook returned ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }
}

// Singleton instance
export const webhookService = new WebhookService();
