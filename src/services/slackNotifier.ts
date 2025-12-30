/**
 * Slack Notification Service
 * Send notifications to Slack channels/users
 */

// Simple console logger
const logger = {
  info: (msg: string) => console.log(`[Slack] ${msg}`),
  warn: (msg: string) => console.warn(`[Slack] ${msg}`),
  error: (msg: string) => console.error(`[Slack] ${msg}`),
};

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  iconUrl?: string;
}

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  mrkdwn?: boolean;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'plain_text' | 'mrkdwn';
    text: string;
  }>;
  accessory?: any;
  elements?: any[];
  image_url?: string;
  alt_text?: string;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export class SlackNotifier {
  private config: SlackConfig | null = null;

  /**
   * Configure Slack integration
   */
  configure(config: SlackConfig): void {
    this.config = config;
    logger.info('Slack notifier configured');
  }

  /**
   * Check if Slack is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.webhookUrl;
  }

  /**
   * Send a simple text message
   */
  async sendMessage(text: string): Promise<boolean> {
    return this.send({ text });
  }

  /**
   * Send a rich message with blocks
   */
  async send(message: SlackMessage): Promise<boolean> {
    if (!this.config) {
      logger.warn('Slack not configured, skipping notification');
      return false;
    }

    try {
      const payload: any = {
        ...message,
      };

      if (this.config.channel) {
        payload.channel = this.config.channel;
      }
      if (this.config.username) {
        payload.username = this.config.username;
      }
      if (this.config.iconEmoji) {
        payload.icon_emoji = this.config.iconEmoji;
      }
      if (this.config.iconUrl) {
        payload.icon_url = this.config.iconUrl;
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error(`Slack API error: ${error}`);
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error(`Slack notification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Notify clone started
   */
  async notifyCloneStarted(jobId: string, url: string, userId?: string): Promise<boolean> {
    return this.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 Clone Started',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Job ID:*\n\`${jobId}\`` },
            { type: 'mrkdwn', text: `*URL:*\n${url}` },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Started at ${new Date().toISOString()}${userId ? ` by user ${userId}` : ''}`,
            },
          ],
        },
      ],
    });
  }

  /**
   * Notify clone completed
   */
  async notifyCloneCompleted(
    jobId: string,
    url: string,
    stats: { pages: number; assets: number; duration: number; size?: number }
  ): Promise<boolean> {
    const durationStr = this.formatDuration(stats.duration);
    const sizeStr = stats.size ? this.formatBytes(stats.size) : 'N/A';

    return this.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Clone Completed',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Job ID:*\n\`${jobId}\`` },
            { type: 'mrkdwn', text: `*URL:*\n${url}` },
            { type: 'mrkdwn', text: `*Pages:*\n${stats.pages}` },
            { type: 'mrkdwn', text: `*Assets:*\n${stats.assets}` },
            { type: 'mrkdwn', text: `*Duration:*\n${durationStr}` },
            { type: 'mrkdwn', text: `*Size:*\n${sizeStr}` },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Completed at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
      attachments: [
        {
          color: '#36a64f',
          fallback: `Clone completed: ${url}`,
        },
      ],
    });
  }

  /**
   * Notify clone failed
   */
  async notifyCloneFailed(jobId: string, url: string, error: string): Promise<boolean> {
    return this.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ Clone Failed',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Job ID:*\n\`${jobId}\`` },
            { type: 'mrkdwn', text: `*URL:*\n${url}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:*\n\`\`\`${error}\`\`\``,
          },
        },
      ],
      attachments: [
        {
          color: '#ff0000',
          fallback: `Clone failed: ${url} - ${error}`,
        },
      ],
    });
  }

  /**
   * Notify disaster recovery alert
   */
  async notifyDRAlert(
    siteUrl: string,
    alertType: 'down' | 'content_change' | 'slow',
    details: string
  ): Promise<boolean> {
    const emoji = alertType === 'down' ? '🔴' : alertType === 'content_change' ? '🟡' : '🟠';
    const title = alertType === 'down' ? 'Site Down' : alertType === 'content_change' ? 'Content Changed' : 'Slow Response';

    return this.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} DR Alert: ${title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Site:*\n${siteUrl}` },
            { type: 'mrkdwn', text: `*Alert Type:*\n${alertType}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n${details}`,
          },
        },
      ],
      attachments: [
        {
          color: alertType === 'down' ? '#ff0000' : '#ffcc00',
          fallback: `DR Alert: ${title} - ${siteUrl}`,
        },
      ],
    });
  }

  /**
   * Notify failover triggered
   */
  async notifyFailover(siteUrl: string, backupUrl: string, reason: string): Promise<boolean> {
    return this.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔄 Failover Triggered',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Original Site:*\n${siteUrl}` },
            { type: 'mrkdwn', text: `*Backup URL:*\n${backupUrl}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:*\n${reason}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Failover activated at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
      attachments: [
        {
          color: '#ff9900',
          fallback: `Failover triggered for ${siteUrl}`,
        },
      ],
    });
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  /**
   * Format bytes in human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Singleton instance
export const slackNotifier = new SlackNotifier();
