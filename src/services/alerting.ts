/**
 * Alerting Service
 * Real-time alerts for errors, performance issues, and failures
 */

import { LoggingService } from './logging.js';
import { MonitoringService } from './monitoring.js';

export type AlertChannel = 'email' | 'slack' | 'discord' | 'webhook';

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  cooldown: number; // Seconds
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: string;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Alerting Service
 * Provides real-time alerting for errors and performance issues
 */
export class AlertingService {
  private logging: LoggingService;
  private monitoring: MonitoringService;
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private channels: Map<AlertChannel, (alert: Alert) => Promise<void>> = new Map();

  constructor(logging: LoggingService, monitoring: MonitoringService) {
    this.logging = logging;
    this.monitoring = monitoring;
  }

  /**
   * Registers an alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Registers an alert channel
   */
  registerChannel(channel: AlertChannel, handler: (alert: Alert) => Promise<void>): void {
    this.channels.set(channel, handler);
  }

  /**
   * Checks alert rules and triggers alerts if needed
   */
  async checkAlerts(): Promise<void> {
    const metrics = await this.getCurrentMetrics();

    for (const rule of this.rules.values()) {
      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < rule.cooldown * 1000) {
          continue; // Still in cooldown
        }
      }

      // Check condition
      if (rule.condition(metrics)) {
        await this.triggerAlert(rule, metrics);
        rule.lastTriggered = new Date();
      }
    }
  }

  /**
   * Triggers an alert
   */
  private async triggerAlert(rule: AlertRule, metrics: any): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      severity: rule.severity,
      message: `${rule.name} - Condition met`,
      timestamp: new Date(),
      context: metrics,
    };

    this.alerts.push(alert);

    // Log alert
    await this.logging.warn(`Alert triggered: ${rule.name}`, {
      severity: rule.severity,
      ruleId: rule.id,
    });

    // Send to channels
    for (const channel of rule.channels) {
      const handler = this.channels.get(channel);
      if (handler) {
        try {
          await handler(alert);
        } catch (error) {
          await this.logging.error(`Failed to send alert to ${channel}`, error as Error);
        }
      }
    }
  }

  /**
   * Gets current metrics for alert evaluation
   */
  private async getCurrentMetrics(): Promise<any> {
    // This would get current metrics from monitoring service
    // For now, return empty object
    return {};
  }

  /**
   * Gets recent alerts
   */
  getRecentAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Gets alerts by severity
   */
  getAlertsBySeverity(severity: string): Alert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clears old alerts
   */
  clearOldAlerts(olderThan: Date): void {
    this.alerts = this.alerts.filter(alert => alert.timestamp > olderThan);
  }
}

