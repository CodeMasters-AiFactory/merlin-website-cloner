/**
 * Health Monitor
 * Health monitoring and automatic recovery
 */

export interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  critical: boolean;
}

export interface HealthStatus {
  healthy: boolean;
  checks: Record<string, {
    healthy: boolean;
    lastCheck: Date;
    lastError?: string;
    consecutiveFailures: number;
  }>;
  overall: {
    totalChecks: number;
    healthyChecks: number;
    unhealthyChecks: number;
  };
}

/**
 * Health Monitor
 * Monitors system health and triggers recovery
 */
export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private status: HealthStatus = {
    healthy: true,
    checks: {},
    overall: {
      totalChecks: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
    },
  };
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private recoveryHandlers: Map<string, () => Promise<void>> = new Map();

  /**
   * Registers a health check
   */
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    this.status.checks[check.name] = {
      healthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };
    this.startCheck(check);
  }

  /**
   * Starts a health check
   */
  private startCheck(check: HealthCheck): void {
    const runCheck = async () => {
      try {
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
        });

        const checkPromise = check.check();

        const result = await Promise.race([checkPromise, timeoutPromise]);

        if (result) {
          this.recordSuccess(check.name);
        } else {
          this.recordFailure(check.name, 'Check returned false');
        }
      } catch (error) {
        this.recordFailure(check.name, error instanceof Error ? error.message : String(error));
      }
    };

    // Run immediately
    runCheck();

    // Schedule periodic checks
    const interval = setInterval(runCheck, check.interval);
    this.intervals.set(check.name, interval);
  }

  /**
   * Records a successful check
   */
  private recordSuccess(checkName: string): void {
    const checkStatus = this.status.checks[checkName];
    if (checkStatus) {
      checkStatus.healthy = true;
      checkStatus.lastCheck = new Date();
      checkStatus.consecutiveFailures = 0;
      delete checkStatus.lastError;
    }

    this.updateOverallStatus();
  }

  /**
   * Records a failed check
   */
  private recordFailure(checkName: string, error: string): void {
    const checkStatus = this.status.checks[checkName];
    const check = this.checks.get(checkName);

    if (checkStatus && check) {
      checkStatus.healthy = false;
      checkStatus.lastCheck = new Date();
      checkStatus.lastError = error;
      checkStatus.consecutiveFailures++;

      // Trigger recovery if critical and consecutive failures exceed retries
      if (check.critical && checkStatus.consecutiveFailures >= check.retries) {
        this.triggerRecovery(checkName);
      }
    }

    this.updateOverallStatus();
  }

  /**
   * Triggers recovery for a check
   */
  private async triggerRecovery(checkName: string): Promise<void> {
    const handler = this.recoveryHandlers.get(checkName);
    if (handler) {
      try {
        await handler();
        console.log(`Recovery triggered for ${checkName}`);
      } catch (error) {
        console.error(`Recovery failed for ${checkName}:`, error);
      }
    }
  }

  /**
   * Registers a recovery handler
   */
  registerRecoveryHandler(checkName: string, handler: () => Promise<void>): void {
    this.recoveryHandlers.set(checkName, handler);
  }

  /**
   * Updates overall health status
   */
  private updateOverallStatus(): void {
    const checks = Object.values(this.status.checks);
    const healthyChecks = checks.filter(c => c.healthy).length;
    const unhealthyChecks = checks.length - healthyChecks;

    this.status.overall = {
      totalChecks: checks.length,
      healthyChecks,
      unhealthyChecks,
    };

    this.status.healthy = unhealthyChecks === 0;
  }

  /**
   * Gets current health status
   */
  getStatus(): HealthStatus {
    return { ...this.status };
  }

  /**
   * Checks if system is healthy
   */
  isHealthy(): boolean {
    return this.status.healthy;
  }

  /**
   * Stops all health checks
   */
  stop(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  /**
   * Runs all checks immediately
   */
  async runAllChecks(): Promise<void> {
    const promises = Array.from(this.checks.values()).map(check => {
      return (async () => {
        try {
          const result = await Promise.race([
            check.check(),
            new Promise<boolean>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), check.timeout);
            }),
          ]);

          if (result) {
            this.recordSuccess(check.name);
          } else {
            this.recordFailure(check.name, 'Check returned false');
          }
        } catch (error) {
          this.recordFailure(check.name, error instanceof Error ? error.message : String(error));
        }
      })();
    });

    await Promise.all(promises);
  }
}

