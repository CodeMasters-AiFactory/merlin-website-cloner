/**
 * Improvement Dashboard Component
 *
 * Displays the autonomous improvement system's activity:
 * - Improvement cycles history
 * - Fix proposals and deployments
 * - System health status
 * - Email notification logs
 *
 * Created: 2025-12-29
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types matching backend services
interface ImprovementCycle {
  id: string;
  startTime: string;
  endTime?: string;
  trigger: 'scheduled' | 'manual' | 'error_detected' | 'low_score';
  phases: {
    testing?: {
      averageScore: number;
      successRate: number;
      sitesTestedCount: number;
      duration: number;
    };
    analysis?: {
      detectedIssues: Array<{
        type: string;
        severity: string;
        description: string;
      }>;
      recommendations: string[];
    };
    fixes?: Array<{
      proposedChange: string;
      file: string;
      success: boolean;
      rollbackRequired: boolean;
    }>;
  };
  outcome?: 'success' | 'partial' | 'failed' | 'rolled_back' | 'skipped';
  improvementsMade: string[];
  errors: string[];
}

interface DeploymentState {
  id: string;
  timestamp: string;
  branch: string;
  commitBefore: string;
  commitAfter?: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  error?: string;
  testResults?: {
    passed: boolean;
    score?: number;
    details: string;
  };
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface ServiceStatus {
  autoImprover: {
    isRunning: boolean;
    safeMode: boolean;
    consecutiveFailures: number;
    currentCycle: string | null;
  };
  fixGenerator: {
    hasApiKey: boolean;
    dryRunMode: boolean;
    totalProposals: number;
  };
  safeDeployer: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
  };
  emailNotifier: {
    provider: string;
    configured: boolean;
    totalSent: number;
  };
}

const ImprovementDashboard: React.FC = () => {
  const [cycles, setCycles] = useState<ImprovementCycle[]>([]);
  const [deployments, setDeployments] = useState<DeploymentState[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cycles' | 'deployments' | 'alerts' | 'status'>('cycles');

  const fetchData = useCallback(async () => {
    try {
      const [cyclesRes, deploymentsRes, alertsRes, statusRes] = await Promise.all([
        fetch('/api/autonomous/cycles').catch(() => null),
        fetch('/api/autonomous/deployments').catch(() => null),
        fetch('/api/autonomous/alerts').catch(() => null),
        fetch('/api/autonomous/status').catch(() => null),
      ]);

      if (cyclesRes?.ok) {
        const data = await cyclesRes.json();
        setCycles(data.cycles || []);
      }

      if (deploymentsRes?.ok) {
        const data = await deploymentsRes.json();
        setDeployments(data.deployments || []);
      }

      if (alertsRes?.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      if (statusRes?.ok) {
        const data = await statusRes.json();
        setStatus(data.status || null);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'success': return 'text-green-400';
      case 'partial': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      case 'rolled_back': return 'text-orange-400';
      case 'skipped': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-500';
      case 'failed': return 'bg-red-500';
      case 'rolled_back': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-900 border-red-500';
      case 'warning': return 'bg-yellow-900 border-yellow-500';
      case 'info': return 'bg-blue-900 border-blue-500';
      default: return 'bg-gray-900 border-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const _formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-3xl">🤖</span>
          Autonomous Improvement Dashboard
        </h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Status Summary */}
      {status && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">AutoImprover</div>
            <div className={`text-lg font-bold ${status.autoImprover.isRunning ? 'text-green-400' : 'text-red-400'}`}>
              {status.autoImprover.isRunning ? 'Running' : 'Stopped'}
            </div>
            {status.autoImprover.safeMode && (
              <div className="text-orange-400 text-xs mt-1">⚠️ Safe Mode Active</div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Fix Generator</div>
            <div className={`text-lg font-bold ${status.fixGenerator.hasApiKey ? 'text-green-400' : 'text-yellow-400'}`}>
              {status.fixGenerator.hasApiKey ? 'Connected' : 'No API Key'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {status.fixGenerator.totalProposals} proposals
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Safe Deployer</div>
            <div className="text-lg font-bold text-green-400">
              {status.safeDeployer.successfulDeployments} / {status.safeDeployer.totalDeployments}
            </div>
            <div className="text-gray-500 text-xs mt-1">successful deployments</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Email Notifier</div>
            <div className={`text-lg font-bold ${status.emailNotifier.configured ? 'text-green-400' : 'text-yellow-400'}`}>
              {status.emailNotifier.provider}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {status.emailNotifier.totalSent} sent
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        {(['cycles', 'deployments', 'alerts', 'status'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {alerts.filter(a => !a.acknowledged).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'cycles' && (
        <div className="space-y-4">
          {cycles.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No improvement cycles recorded yet
            </div>
          ) : (
            cycles.slice().reverse().map((cycle) => (
              <div key={cycle.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${getOutcomeColor(cycle.outcome)}`}>
                      {cycle.outcome?.toUpperCase() || 'PENDING'}
                    </span>
                    <span className="text-gray-400 text-sm">{cycle.id}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{formatDate(cycle.startTime)}</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  {cycle.phases.testing && (
                    <div>
                      <div className="text-gray-400">Testing</div>
                      <div className="text-white">
                        Score: {cycle.phases.testing.averageScore}%
                        <span className="text-gray-500 ml-2">
                          ({cycle.phases.testing.sitesTestedCount} sites)
                        </span>
                      </div>
                    </div>
                  )}

                  {cycle.phases.analysis && (
                    <div>
                      <div className="text-gray-400">Issues Found</div>
                      <div className="text-white">
                        {cycle.phases.analysis.detectedIssues.length}
                      </div>
                    </div>
                  )}

                  {cycle.phases.fixes && (
                    <div>
                      <div className="text-gray-400">Fixes Applied</div>
                      <div className="text-white">
                        {cycle.phases.fixes.filter(f => f.success).length} / {cycle.phases.fixes.length}
                      </div>
                    </div>
                  )}
                </div>

                {cycle.improvementsMade.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-green-400 text-sm">Improvements Made:</div>
                    <ul className="text-gray-300 text-sm list-disc list-inside">
                      {cycle.improvementsMade.map((imp, i) => (
                        <li key={i}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {cycle.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-red-400 text-sm">Errors:</div>
                    <ul className="text-gray-300 text-sm list-disc list-inside">
                      {cycle.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'deployments' && (
        <div className="space-y-4">
          {deployments.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No deployments recorded yet
            </div>
          ) : (
            deployments.slice().reverse().map((deployment) => (
              <div key={deployment.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(deployment.status)}`}></span>
                    <span className="text-white font-medium">{deployment.id}</span>
                    <span className="text-gray-500 text-sm">({deployment.branch})</span>
                  </div>
                  <span className="text-gray-500 text-sm">{formatDate(deployment.timestamp)}</span>
                </div>

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Before: </span>
                    <code className="text-yellow-400">{deployment.commitBefore}</code>
                  </div>
                  {deployment.commitAfter && (
                    <div>
                      <span className="text-gray-400">After: </span>
                      <code className="text-green-400">{deployment.commitAfter}</code>
                    </div>
                  )}
                </div>

                {deployment.testResults && (
                  <div className="mt-2 text-sm">
                    <span className={deployment.testResults.passed ? 'text-green-400' : 'text-red-400'}>
                      Tests: {deployment.testResults.passed ? 'PASSED' : 'FAILED'}
                    </span>
                    {deployment.testResults.score !== undefined && (
                      <span className="text-gray-400 ml-2">
                        Score: {deployment.testResults.score}%
                      </span>
                    )}
                  </div>
                )}

                {deployment.error && (
                  <div className="mt-2 text-red-400 text-sm">
                    Error: {deployment.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No alerts
            </div>
          ) : (
            alerts.slice().reverse().map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border-l-4 ${getAlertColor(alert.level)} ${
                  alert.acknowledged ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      alert.level === 'critical' ? 'text-red-400' :
                      alert.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      {alert.level.toUpperCase()}
                    </span>
                    {alert.acknowledged && (
                      <span className="text-gray-500 text-xs">(acknowledged)</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">{formatDate(alert.timestamp)}</span>
                </div>
                <div className="text-white mt-2">{alert.message}</div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'status' && status && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">AutoImprover</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={status.autoImprover.isRunning ? 'text-green-400' : 'text-red-400'}>
                  {status.autoImprover.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Safe Mode</span>
                <span className={status.autoImprover.safeMode ? 'text-orange-400' : 'text-gray-400'}>
                  {status.autoImprover.safeMode ? 'ACTIVE' : 'Off'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Consecutive Failures</span>
                <span className="text-white">{status.autoImprover.consecutiveFailures}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Cycle</span>
                <span className="text-white">{status.autoImprover.currentCycle || 'None'}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Fix Generator</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">API Connected</span>
                <span className={status.fixGenerator.hasApiKey ? 'text-green-400' : 'text-red-400'}>
                  {status.fixGenerator.hasApiKey ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dry Run Mode</span>
                <span className={status.fixGenerator.dryRunMode ? 'text-yellow-400' : 'text-gray-400'}>
                  {status.fixGenerator.dryRunMode ? 'ACTIVE' : 'Off'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Proposals</span>
                <span className="text-white">{status.fixGenerator.totalProposals}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Safe Deployer</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Deployments</span>
                <span className="text-white">{status.safeDeployer.totalDeployments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Successful</span>
                <span className="text-green-400">{status.safeDeployer.successfulDeployments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400">{status.safeDeployer.failedDeployments}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Email Notifier</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Provider</span>
                <span className="text-white">{status.emailNotifier.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Configured</span>
                <span className={status.emailNotifier.configured ? 'text-green-400' : 'text-yellow-400'}>
                  {status.emailNotifier.configured ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Emails Sent</span>
                <span className="text-white">{status.emailNotifier.totalSent}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImprovementDashboard;
