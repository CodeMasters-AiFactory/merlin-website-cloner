/**
 * Email Notifier Service
 *
 * Sends email notifications for critical alerts, daily reports, and system events.
 * Supports multiple providers: SMTP, SendGrid, Mailgun, or console fallback.
 *
 * Created: 2025-12-29
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'console';
  from: string;
  to: string[];

  // SMTP settings
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };

  // SendGrid settings
  sendgrid?: {
    apiKey: string;
  };

  // Mailgun settings
  mailgun?: {
    apiKey: string;
    domain: string;
  };
}

export interface EmailMessage {
  to?: string[];
  subject: string;
  text: string;
  html?: string;
  priority?: 'high' | 'normal' | 'low';
}

interface EmailLog {
  id: string;
  timestamp: Date;
  to: string[];
  subject: string;
  status: 'sent' | 'failed' | 'logged';
  error?: string;
}

// Default configuration
const DEFAULT_CONFIG: EmailConfig = {
  provider: 'console',
  from: 'merlin@localhost',
  to: [],
};

export class EmailNotifier {
  private config: EmailConfig;
  private projectRoot: string;
  private logFile: string;
  private logs: EmailLog[] = [];

  constructor(config: Partial<EmailConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectRoot = path.resolve(__dirname, '../..');
    this.logFile = path.join(this.projectRoot, 'data', 'email-log.json');

    this.ensureDataDirectory();
    this.loadLogs();

    // Load config from environment if not provided
    this.loadFromEnvironment();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.join(this.projectRoot, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadFromEnvironment(): void {
    // SendGrid
    if (process.env.SENDGRID_API_KEY) {
      this.config.provider = 'sendgrid';
      this.config.sendgrid = {
        apiKey: process.env.SENDGRID_API_KEY,
      };
    }

    // Mailgun
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      this.config.provider = 'mailgun';
      this.config.mailgun = {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
      };
    }

    // SMTP
    if (process.env.SMTP_HOST) {
      this.config.provider = 'smtp';
      this.config.smtp = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      };
    }

    // Email addresses
    if (process.env.EMAIL_FROM) {
      this.config.from = process.env.EMAIL_FROM;
    }
    if (process.env.EMAIL_TO) {
      this.config.to = process.env.EMAIL_TO.split(',').map(e => e.trim());
    }
  }

  /**
   * Send an email notification
   */
  async send(message: EmailMessage): Promise<boolean> {
    const recipients = message.to || this.config.to;

    if (recipients.length === 0) {
      console.log('[EmailNotifier] No recipients configured, logging only');
      return this.logOnly(message);
    }

    const log: EmailLog = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      to: recipients,
      subject: message.subject,
      status: 'sent',
    };

    try {
      switch (this.config.provider) {
        case 'sendgrid':
          await this.sendViaSendGrid(message, recipients);
          break;
        case 'mailgun':
          await this.sendViaMailgun(message, recipients);
          break;
        case 'smtp':
          await this.sendViaSMTP(message, recipients);
          break;
        case 'console':
        default:
          return this.logOnly(message);
      }

      this.logs.push(log);
      this.saveLogs();
      console.log(`[EmailNotifier] Email sent: ${message.subject}`);
      return true;

    } catch (error) {
      log.status = 'failed';
      log.error = String(error);
      this.logs.push(log);
      this.saveLogs();
      console.error(`[EmailNotifier] Failed to send email: ${error}`);
      return false;
    }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(message: EmailMessage, recipients: string[]): Promise<void> {
    if (!this.config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.sendgrid.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients.map(email => ({ email })) }],
        from: { email: this.config.from },
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid error: ${response.status} ${error}`);
    }
  }

  /**
   * Send via Mailgun
   */
  private async sendViaMailgun(message: EmailMessage, recipients: string[]): Promise<void> {
    if (!this.config.mailgun?.apiKey || !this.config.mailgun?.domain) {
      throw new Error('Mailgun configuration incomplete');
    }

    const formData = new URLSearchParams();
    formData.append('from', this.config.from);
    formData.append('to', recipients.join(','));
    formData.append('subject', message.subject);
    formData.append('text', message.text);
    if (message.html) {
      formData.append('html', message.html);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${this.config.mailgun.domain}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.mailgun.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun error: ${response.status} ${error}`);
    }
  }

  /**
   * Send via SMTP (using nodemailer if available)
   */
  private async sendViaSMTP(message: EmailMessage, recipients: string[]): Promise<void> {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration incomplete');
    }

    // Dynamic import for nodemailer
    try {
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: {
          user: this.config.smtp.user,
          pass: this.config.smtp.pass,
        },
      });

      await transporter.sendMail({
        from: this.config.from,
        to: recipients.join(','),
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

    } catch (error) {
      if (String(error).includes('Cannot find module')) {
        console.log('[EmailNotifier] nodemailer not installed, falling back to console');
        this.logOnly(message);
      } else {
        throw error;
      }
    }
  }

  /**
   * Log message to console and file (fallback)
   */
  private logOnly(message: EmailMessage): boolean {
    const log: EmailLog = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      to: message.to || this.config.to,
      subject: message.subject,
      status: 'logged',
    };

    console.log('\n' + '═'.repeat(60));
    console.log('EMAIL NOTIFICATION (Console Mode)');
    console.log('═'.repeat(60));
    console.log(`To: ${log.to.join(', ') || '(none configured)'}`);
    console.log(`Subject: ${message.subject}`);
    console.log('─'.repeat(60));
    console.log(message.text);
    console.log('═'.repeat(60) + '\n');

    this.logs.push(log);
    this.saveLogs();
    return true;
  }

  /**
   * Send a critical alert
   */
  async sendCriticalAlert(title: string, details: string): Promise<boolean> {
    return this.send({
      subject: `🚨 CRITICAL: ${title}`,
      text: `CRITICAL ALERT\n\n${title}\n\n${details}\n\nTime: ${new Date().toISOString()}\nSystem: Merlin Website Cloner`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #fee; border: 2px solid #f00; border-radius: 8px;">
          <h1 style="color: #c00; margin: 0 0 10px 0;">🚨 CRITICAL ALERT</h1>
          <h2 style="margin: 0 0 20px 0;">${title}</h2>
          <pre style="background: #fff; padding: 15px; border-radius: 4px; overflow-x: auto;">${details}</pre>
          <p style="color: #666; margin: 20px 0 0 0; font-size: 12px;">
            Time: ${new Date().toISOString()}<br>
            System: Merlin Website Cloner
          </p>
        </div>
      `,
      priority: 'high',
    });
  }

  /**
   * Send a warning alert
   */
  async sendWarningAlert(title: string, details: string): Promise<boolean> {
    return this.send({
      subject: `⚠️ Warning: ${title}`,
      text: `WARNING\n\n${title}\n\n${details}\n\nTime: ${new Date().toISOString()}\nSystem: Merlin Website Cloner`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #fff8e6; border: 2px solid #f90; border-radius: 8px;">
          <h1 style="color: #960; margin: 0 0 10px 0;">⚠️ WARNING</h1>
          <h2 style="margin: 0 0 20px 0;">${title}</h2>
          <pre style="background: #fff; padding: 15px; border-radius: 4px; overflow-x: auto;">${details}</pre>
          <p style="color: #666; margin: 20px 0 0 0; font-size: 12px;">
            Time: ${new Date().toISOString()}<br>
            System: Merlin Website Cloner
          </p>
        </div>
      `,
      priority: 'normal',
    });
  }

  /**
   * Send daily report
   */
  async sendDailyReport(report: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    return this.send({
      subject: `📊 Merlin Daily Report - ${today}`,
      text: report,
      html: `
        <div style="font-family: monospace; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <h1 style="color: #333; margin: 0 0 20px 0;">📊 Daily Improvement Report</h1>
          <pre style="background: #1a1a2e; color: #0f0; padding: 20px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${report}</pre>
          <p style="color: #666; margin: 20px 0 0 0; font-size: 12px;">
            Generated: ${new Date().toISOString()}<br>
            System: Merlin Website Cloner
          </p>
        </div>
      `,
      priority: 'low',
    });
  }

  /**
   * Send improvement notification
   */
  async sendImprovementNotification(improvements: string[]): Promise<boolean> {
    const count = improvements.length;

    return this.send({
      subject: `✨ Merlin Applied ${count} Improvement${count !== 1 ? 's' : ''}`,
      text: `Merlin Auto-Improver Applied ${count} Change${count !== 1 ? 's' : ''}\n\nImprovements:\n${improvements.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nTime: ${new Date().toISOString()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #e8f5e9; border: 2px solid #4caf50; border-radius: 8px;">
          <h1 style="color: #2e7d32; margin: 0 0 10px 0;">✨ Auto-Improvement Applied</h1>
          <p style="margin: 0 0 20px 0;">Merlin applied ${count} improvement${count !== 1 ? 's' : ''}:</p>
          <ul style="background: #fff; padding: 15px 15px 15px 35px; border-radius: 4px; margin: 0;">
            ${improvements.map(i => `<li style="margin: 5px 0;">${i}</li>`).join('')}
          </ul>
          <p style="color: #666; margin: 20px 0 0 0; font-size: 12px;">
            Time: ${new Date().toISOString()}<br>
            System: Merlin Website Cloner
          </p>
        </div>
      `,
      priority: 'normal',
    });
  }

  /**
   * Load email logs
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        this.logs = JSON.parse(fs.readFileSync(this.logFile, 'utf-8'));
      }
    } catch {}
  }

  /**
   * Save email logs
   */
  private saveLogs(): void {
    try {
      // Keep only last 500 logs
      if (this.logs.length > 500) {
        this.logs = this.logs.slice(-500);
      }
      fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error('[EmailNotifier] Failed to save logs:', error);
    }
  }

  /**
   * Get email logs
   */
  getLogs(limit: number = 50): EmailLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get configuration status
   */
  getStatus(): object {
    return {
      provider: this.config.provider,
      configured: this.config.provider !== 'console' || this.config.to.length > 0,
      recipients: this.config.to.length,
      totalSent: this.logs.filter(l => l.status === 'sent').length,
      totalFailed: this.logs.filter(l => l.status === 'failed').length,
    };
  }

  /**
   * Test email sending
   */
  async sendTestEmail(): Promise<boolean> {
    return this.send({
      subject: '🧪 Merlin Email Test',
      text: 'This is a test email from Merlin Website Cloner.\n\nIf you received this, email notifications are working correctly!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px;">
          <h1 style="color: #1976d2; margin: 0 0 10px 0;">🧪 Email Test</h1>
          <p>This is a test email from Merlin Website Cloner.</p>
          <p>If you received this, email notifications are working correctly!</p>
          <p style="color: #666; margin: 20px 0 0 0; font-size: 12px;">
            Time: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });
  }
}

// Singleton instance
let instance: EmailNotifier | null = null;

export function getEmailNotifier(): EmailNotifier {
  if (!instance) {
    instance = new EmailNotifier();
  }
  return instance;
}

export default EmailNotifier;
