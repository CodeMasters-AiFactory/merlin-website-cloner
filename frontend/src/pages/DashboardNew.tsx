import { useState, useEffect } from 'react'
import { Sidebar, Header, StatsGrid, QuickActions, ClonesTable, PreviewModal } from '../components/dashboard'
import { CloneWizard } from '../components/CloneWizard'
import api from '../utils/api'
import { X, FileText, CheckCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react'

interface CloneJob {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  pagesCloned: number
  assetsCaptured: number
  createdAt: string
  completedAt?: string
  outputDir?: string
  exportPath?: string
  errors?: string[]
  logs?: Array<{
    timestamp: string
    level: 'info' | 'warning' | 'error' | 'success'
    message: string
    details?: string
  }>
  verification?: {
    passed: boolean
    score: number
    summary: string
    timestamp: string
    checks?: Array<{
      name: string
      category: string
      passed: boolean
      message: string
    }>
  }
}

interface UserCredits {
  balance: number
  usedThisMonth: number
  includedMonthly: number
  purchased: number
}

export default function DashboardNew() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [jobs, setJobs] = useState<CloneJob[]>([])
  const [loading, setLoading] = useState(true)
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null)

  // Modals
  const [showCloneWizard, setShowCloneWizard] = useState(false)
  const [previewJob, setPreviewJob] = useState<CloneJob | null>(null)
  const [logsJob, setLogsJob] = useState<CloneJob | null>(null)
  const [deleteJob, setDeleteJob] = useState<CloneJob | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadJobs()
    loadUserCredits()

    // Poll for updates every 5 seconds if there are processing jobs
    const interval = setInterval(() => {
      if (jobs.some((j) => j.status === 'processing')) {
        loadJobs()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      const response = await api.get('/jobs')
      setJobs(response.data)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserCredits = async () => {
    try {
      const response = await api.get('/user/credits')
      setUserCredits(response.data)
    } catch (error) {
      console.error('Failed to load credits:', error)
    }
  }

  const handleDelete = async () => {
    if (!deleteJob) return

    setIsDeleting(true)
    try {
      await api.delete(`/jobs/${deleteJob.id}`)
      setJobs(jobs.filter((j) => j.id !== deleteJob.id))
      setDeleteJob(null)
    } catch (error) {
      console.error('Failed to delete job:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Calculate stats
  const stats = {
    totalClones: jobs.length,
    completedClones: jobs.filter((j) => j.status === 'completed').length,
    creditsRemaining: userCredits?.balance ?? 0,
    thisMonth: jobs.filter((j) => {
      const created = new Date(j.createdAt)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length,
    lastMonth: jobs.filter((j) => {
      const created = new Date(j.createdAt)
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return created.getMonth() === lastMonth.getMonth() && created.getFullYear() === lastMonth.getFullYear()
    }).length,
  }

  // Recent templates for quick actions
  const recentTemplates = jobs
    .filter((j) => j.status === 'completed')
    .slice(0, 3)
    .map((j) => ({
      id: j.id,
      hostname: new URL(j.url).hostname,
    }))

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-dark-950/80 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <div
        className={`
          min-h-screen transition-all duration-300
          ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}
        `}
      >
        {/* Header */}
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton={true}
        />

        {/* Main content */}
        <main className="p-4 lg:p-6 space-y-6">
          {/* Stats Grid */}
          <StatsGrid stats={stats} loading={loading} />

          {/* Main grid: Table + Quick Actions */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Clones Table (2/3 width) */}
            <div className="lg:col-span-2">
              <ClonesTable
                jobs={jobs}
                loading={loading}
                onPreview={(job) => setPreviewJob(job)}
                onViewLogs={(job) => setLogsJob(job)}
                onDelete={(job) => setDeleteJob(job)}
              />
            </div>

            {/* Quick Actions (1/3 width) */}
            <div className="lg:col-span-1">
              <QuickActions
                onNewClone={() => setShowCloneWizard(true)}
                recentTemplates={recentTemplates}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Clone Wizard Modal */}
      {showCloneWizard && (
        <CloneWizard
          onClose={() => {
            setShowCloneWizard(false)
            loadJobs()
          }}
        />
      )}

      {/* Preview Modal */}
      {previewJob && (
        <PreviewModal
          job={previewJob}
          onClose={() => setPreviewJob(null)}
        />
      )}

      {/* Logs Modal */}
      {logsJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark-950/90 backdrop-blur-md"
            onClick={() => setLogsJob(null)}
          />
          <div className="relative z-10 bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 w-full max-w-3xl max-h-[80vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-dark-100">Clone Logs</h3>
              </div>
              <button
                onClick={() => setLogsJob(null)}
                className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info */}
            <div className="p-4 border-b border-dark-700 bg-dark-800/50">
              <p className="text-sm text-dark-400">
                <span className="text-dark-300">URL:</span> {logsJob.url}
              </p>
              <p className="text-sm text-dark-400">
                <span className="text-dark-300">Created:</span>{' '}
                {new Date(logsJob.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Logs content */}
            <div className="flex-1 overflow-y-auto p-4">
              {logsJob.logs && logsJob.logs.length > 0 ? (
                <div className="space-y-2">
                  {logsJob.logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${
                        log.level === 'success'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : log.level === 'error'
                          ? 'bg-red-500/10 border border-red-500/20'
                          : log.level === 'warning'
                          ? 'bg-gold-500/10 border border-gold-500/20'
                          : 'bg-dark-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-dark-500 font-mono whitespace-nowrap">
                          {log.timestamp}
                        </span>
                        <span
                          className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                            log.level === 'success'
                              ? 'text-green-400'
                              : log.level === 'error'
                              ? 'text-red-400'
                              : log.level === 'warning'
                              ? 'text-gold-400'
                              : 'text-dark-400'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-sm text-dark-200">{log.message}</span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-dark-500 mt-1 ml-20 font-mono">{log.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : logsJob.errors && logsJob.errors.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-400 mb-2">Errors:</h4>
                  {logsJob.errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-dark-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No detailed logs available for this clone.</p>
                </div>
              )}
            </div>

            {/* Verification checks */}
            {logsJob.verification?.checks && logsJob.verification.checks.length > 0 && (
              <div className="p-4 border-t border-dark-700 bg-dark-800/50">
                <h4 className="text-sm font-semibold text-dark-300 mb-3">Verification Checks:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {logsJob.verification.checks.map((check, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        check.passed
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {check.passed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>{check.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark-950/90 backdrop-blur-md"
            onClick={() => setDeleteJob(null)}
          />
          <div className="relative z-10 bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 w-full max-w-md animate-slide-up">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dark-100">Delete Clone</h3>
                  <p className="text-sm text-dark-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-dark-300 mb-6">
                Are you sure you want to delete the clone of{' '}
                <strong className="text-dark-100">{new URL(deleteJob.url).hostname}</strong>?
                All files and data will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteJob(null)}
                  className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
