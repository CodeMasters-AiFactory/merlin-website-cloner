import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Download, CheckCircle, XCircle, Clock, Globe, Zap, Eye, ExternalLink, X, Smartphone, Monitor, Tablet, Trash2, CreditCard, AlertTriangle, ShieldCheck, ShieldAlert, Shield, ArrowLeft, RefreshCw, ChevronUp, ChevronDown, FileText, Calendar, BarChart3 } from 'lucide-react'
import api from '../utils/api'
import { CloneWizard } from '../components/CloneWizard'

interface UserCredits {
  balance: number
  usedThisMonth: number
  includedMonthly: number
  purchased: number
  proxyCredits: number
  lastReset?: string
  plan?: string
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  details?: string
}

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
  logs?: LogEntry[]
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

type SortField = 'date' | 'status' | 'success' | 'pages' | 'assets'
type SortDirection = 'asc' | 'desc'

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

const viewportSizes: Record<ViewportSize, { width: string; label: string; icon: any }> = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone },
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<CloneJob[]>([])
  const [showCloneWizard, setShowCloneWizard] = useState(false)
  const [wizardJob, setWizardJob] = useState<CloneJob | null>(null) // For incremental backups
  const [previewJob, setPreviewJob] = useState<CloneJob | null>(null)
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [logsModalJob, setLogsModalJob] = useState<CloneJob | null>(null)

  useEffect(() => {
    loadJobs()
    loadUserCredits()
  }, [])

  const loadJobs = async () => {
    try {
      const response = await api.get('/jobs')
      setJobs(response.data)
    } catch (error) {
      console.error('Error loading jobs:', error)
    }
  }

  const loadUserCredits = async () => {
    try {
      const response = await api.get('/credits')
      setUserCredits(response.data)
    } catch (error) {
      console.error('Error loading credits:', error)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    setIsDeleting(true)
    try {
      await api.delete(`/jobs/${jobId}`)
      setJobs(jobs.filter(j => j.id !== jobId))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete clone. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getVerificationBadge = (verification?: CloneJob['verification']) => {
    if (!verification) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
          <Shield className="w-3.5 h-3.5" />
          <span>Not verified</span>
        </div>
      )
    }

    if (verification.passed) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700" title={verification.summary}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified {verification.score}%</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 rounded-full text-xs font-medium text-yellow-700" title={verification.summary}>
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Issues {verification.score}%</span>
      </div>
    )
  }

  const getSuccessRate = (job: CloneJob): number => {
    if (job.verification?.score !== undefined) {
      return job.verification.score
    }
    if (job.status === 'completed') {
      return 100
    }
    if (job.status === 'failed') {
      return 0
    }
    return job.progress
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortedJobs = (): CloneJob[] => {
    return [...jobs].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'status':
          const statusOrder = { completed: 3, processing: 2, pending: 1, failed: 0 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        case 'success':
          comparison = getSuccessRate(a) - getSuccessRate(b)
          break
        case 'pages':
          comparison = a.pagesCloned - b.pagesCloned
          break
        case 'assets':
          comparison = a.assetsCaptured - b.assetsCaptured
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-semibold text-gray-700 hover:text-gray-900 transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )
      ) : (
        <div className="w-4 h-4 opacity-30">
          <ChevronDown className="w-4 h-4" />
        </div>
      )}
    </button>
  )

  const getLogLevelColor = (level: string): string => {
    switch (level) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getLogLevelBg = (level: string): string => {
    switch (level) {
      case 'success': return 'bg-green-100'
      case 'error': return 'bg-red-100'
      case 'warning': return 'bg-yellow-100'
      default: return 'bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <button
              type="button"
              onClick={() => {
                setWizardJob(null)
                setShowCloneWizard(true)
              }}
              className="btn-primary flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Clone Website
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Credit Usage Banner */}
        {userCredits && (
          <div className="card mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <CreditCard className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {userCredits.plan ? userCredits.plan.charAt(0).toUpperCase() + userCredits.plan.slice(1) : 'Starter'} Plan
                  </h3>
                  <p className="text-sm text-gray-600">
                    {userCredits.balance} credits available
                  </p>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Monthly Usage</span>
                  <span className="font-medium text-gray-900">
                    {userCredits.usedThisMonth} / {userCredits.includedMonthly || 100} credits
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      userCredits.includedMonthly && userCredits.usedThisMonth >= userCredits.includedMonthly
                        ? 'bg-red-500'
                        : userCredits.includedMonthly && userCredits.usedThisMonth >= userCredits.includedMonthly * 0.8
                        ? 'bg-yellow-500'
                        : 'bg-primary-600'
                    }`}
                    style={{
                      width: `${userCredits.includedMonthly ? Math.min((userCredits.usedThisMonth / userCredits.includedMonthly) * 100, 100) : 0}%`
                    }}
                  />
                </div>
                {userCredits.includedMonthly && userCredits.usedThisMonth >= userCredits.includedMonthly * 0.8 && (
                  <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {userCredits.usedThisMonth >= userCredits.includedMonthly
                      ? 'Monthly limit reached. Purchase more credits to continue.'
                      : 'Approaching monthly limit'}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link to="/pricing" className="btn-secondary text-sm">
                  Upgrade Plan
                </Link>
                <Link to="/pricing#credits" className="btn-primary text-sm">
                  Buy Credits
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clones</p>
                <p className="text-3xl font-bold text-gray-900">{jobs.length}</p>
              </div>
              <Globe className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {jobs.filter(j => j.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-3xl font-bold text-gray-900">
                  {jobs.filter(j => j.status === 'processing').length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credits Left</p>
                <p className="text-3xl font-bold text-gray-900">
                  {userCredits?.balance ?? 0}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-primary-500" />
            </div>
          </div>
        </div>

        {/* Clone Wizard Modal */}
        {showCloneWizard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <CloneWizard
              existingJob={wizardJob || undefined}
              onClose={() => {
                setShowCloneWizard(false)
                setWizardJob(null)
              }}
              onComplete={() => {
                setShowCloneWizard(false)
                setWizardJob(null)
                loadJobs()
                loadUserCredits()
              }}
            />
          </div>
        )}

        {/* Preview Modal */}
        {previewJob && (
          <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
            {/* Preview Header */}
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Preview: {previewJob.url}</h3>
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                  {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => {
                    const { icon: Icon, label } = viewportSizes[size]
                    return (
                      <button
                        type="button"
                        key={size}
                        onClick={() => setViewport(size)}
                        className={`p-2 rounded transition-colors ${
                          viewport === size ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                        title={label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/preview/${previewJob.id}/index.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewJob(null)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 bg-gray-800 p-4 flex items-start justify-center overflow-auto">
              <div
                className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
                style={{
                  width: viewportSizes[viewport].width,
                  maxWidth: '100%',
                  height: 'calc(100vh - 120px)'
                }}
              >
                <iframe
                  src={`/preview/${previewJob.id}/index.html`}
                  className="w-full h-full border-0"
                  title={`Preview of ${previewJob.url}`}
                />
              </div>
            </div>

            {/* Preview Footer */}
            <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">
                  {previewJob.pagesCloned} pages | {previewJob.assetsCaptured} assets
                </span>
              </div>
              <div className="flex items-center gap-3">
                {previewJob.verification ? (
                  previewJob.verification.passed ? (
                    <span className="text-green-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      {previewJob.verification.summary}
                    </span>
                  ) : (
                    <span className="text-yellow-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      {previewJob.verification.summary}
                    </span>
                  )
                ) : (
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    Not verified
                  </span>
                )}
                {previewJob.exportPath && (
                  <a
                    href={`/api/download/${previewJob.id}`}
                    download
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Clone?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                This will permanently delete this clone and all its files. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteJob(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {logsModalJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Clone Logs</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLogsModalJob(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">URL:</span> {logsModalJob.url}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Created:</span> {formatDate(logsModalJob.createdAt)}
                  {logsModalJob.completedAt && (
                    <> | <span className="font-medium">Completed:</span> {formatDate(logsModalJob.completedAt)}</>
                  )}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {logsModalJob.logs && logsModalJob.logs.length > 0 ? (
                  <div className="space-y-2">
                    {logsModalJob.logs.map((log, index) => (
                      <div key={index} className={`p-3 rounded-lg ${getLogLevelBg(log.level)}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                            {log.timestamp}
                          </span>
                          <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${getLogLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                          <span className={`text-sm ${getLogLevelColor(log.level)}`}>
                            {log.message}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-xs text-gray-500 mt-1 ml-20 font-mono">{log.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : logsModalJob.errors && logsModalJob.errors.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-600 mb-2">Errors:</h4>
                    {logsModalJob.errors.map((error, index) => (
                      <div key={index} className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                        {error}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No detailed logs available for this clone.</p>
                    <p className="text-sm mt-1">Logs are generated during the cloning process.</p>
                  </div>
                )}
              </div>
              {logsModalJob.verification?.checks && logsModalJob.verification.checks.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Verification Checks:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {logsModalJob.verification.checks.map((check, index) => (
                      <div key={index} className={`flex items-center gap-2 text-sm p-2 rounded ${check.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {check.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span>{check.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jobs List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Clones</h2>
            {jobs.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Sort by:</span>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split('-') as [SortField, SortDirection]
                    setSortField(field)
                    setSortDirection(dir)
                  }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="success-desc">Highest Success</option>
                  <option value="success-asc">Lowest Success</option>
                  <option value="pages-desc">Most Pages</option>
                  <option value="assets-desc">Most Assets</option>
                </select>
              </div>
            )}
          </div>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No clones yet</p>
              <button
                type="button"
                onClick={() => {
                  setWizardJob(null)
                  setShowCloneWizard(true)
                }}
                className="btn-primary"
              >
                Clone Your First Website
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-t-lg border border-gray-200 text-sm">
                <div className="col-span-4">
                  <SortHeader field="date">
                    <Calendar className="w-4 h-4" />
                    URL & Date
                  </SortHeader>
                </div>
                <div className="col-span-1 text-center">
                  <SortHeader field="status">Status</SortHeader>
                </div>
                <div className="col-span-2 text-center">
                  <SortHeader field="success">
                    <BarChart3 className="w-4 h-4" />
                    Success
                  </SortHeader>
                </div>
                <div className="col-span-1 text-center">
                  <SortHeader field="pages">Pages</SortHeader>
                </div>
                <div className="col-span-1 text-center">
                  <SortHeader field="assets">Assets</SortHeader>
                </div>
                <div className="col-span-2 text-center font-semibold text-gray-700">Logs</div>
                <div className="col-span-1 text-center font-semibold text-gray-700">Actions</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-200 border-x border-b border-gray-200 rounded-b-lg">
                {getSortedJobs().map((job) => (
                  <div
                    key={job.id}
                    className="lg:grid lg:grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors items-center"
                  >
                    {/* URL & Date */}
                    <div className="col-span-4 mb-3 lg:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(job.status)}
                        {job.status === 'completed' ? (
                          <button
                            type="button"
                            onClick={() => setPreviewJob(job)}
                            className="font-medium text-primary-600 hover:text-primary-700 hover:underline truncate max-w-xs text-left"
                            title={`View template: ${job.url}`}
                          >
                            {new URL(job.url).hostname}
                          </button>
                        ) : (
                          <span
                            className="font-medium text-gray-900 truncate max-w-xs"
                            title={job.url}
                          >
                            {new URL(job.url).hostname}
                          </span>
                        )}
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                          title={`Visit original: ${job.url}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 ml-7">
                        <Calendar className="w-3 h-3" />
                        {formatDate(job.createdAt)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 text-center mb-2 lg:mb-0">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {/* Success Rate */}
                    <div className="col-span-2 text-center mb-2 lg:mb-0">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              getSuccessRate(job) >= 90 ? 'bg-green-500' :
                              getSuccessRate(job) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${getSuccessRate(job)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${
                          getSuccessRate(job) >= 90 ? 'text-green-600' :
                          getSuccessRate(job) >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {getSuccessRate(job)}%
                        </span>
                      </div>
                      {job.verification && (
                        <div className="mt-1">
                          {getVerificationBadge(job.verification)}
                        </div>
                      )}
                    </div>

                    {/* Pages */}
                    <div className="col-span-1 text-center mb-2 lg:mb-0">
                      <span className="text-lg font-bold text-gray-900">{job.pagesCloned}</span>
                      <span className="text-xs text-gray-500 lg:hidden ml-1">pages</span>
                    </div>

                    {/* Assets */}
                    <div className="col-span-1 text-center mb-2 lg:mb-0">
                      <span className="text-lg font-bold text-gray-900">{job.assetsCaptured}</span>
                      <span className="text-xs text-gray-500 lg:hidden ml-1">assets</span>
                    </div>

                    {/* Logs */}
                    <div className="col-span-2 text-center mb-3 lg:mb-0">
                      <button
                        type="button"
                        onClick={() => setLogsModalJob(job)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        View Logs
                        {job.errors && job.errors.length > 0 && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {job.errors.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      {job.status === 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setPreviewJob(job)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Preview Clone"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`/preview/${job.id}/index.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Open in New Tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {job.exportPath && (
                            <a
                              href={`/api/download/${job.id}`}
                              download
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(job.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Footer */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-6">
                    <span>
                      <strong className="text-gray-900">{jobs.length}</strong> total clones
                    </span>
                    <span className="text-green-600">
                      <strong>{jobs.filter(j => j.status === 'completed').length}</strong> completed
                    </span>
                    <span className="text-red-600">
                      <strong>{jobs.filter(j => j.status === 'failed').length}</strong> failed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Average Success Rate:</span>
                    <strong className="text-gray-900">
                      {jobs.length > 0
                        ? Math.round(jobs.reduce((acc, j) => acc + getSuccessRate(j), 0) / jobs.length)
                        : 0}%
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

