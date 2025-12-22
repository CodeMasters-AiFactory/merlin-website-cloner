import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Download, CheckCircle, XCircle, Clock, Globe, Zap, Eye, ExternalLink, X, Smartphone, Monitor, Tablet, Trash2, CreditCard, AlertTriangle, ShieldCheck, ShieldAlert, Shield, ArrowLeft, RefreshCw } from 'lucide-react'
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
                <a href="/pricing" className="btn-secondary text-sm">
                  Upgrade Plan
                </a>
                <button type="button" className="btn-primary text-sm">
                  Buy Credits
                </button>
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

        {/* Jobs List */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Clones</h2>
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
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(job.status)}
                        <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">{job.url}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        {job.status === 'completed' && getVerificationBadge(job.verification)}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Pages Cloned</p>
                          <p className="text-xl font-bold text-gray-900">{job.pagesCloned}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Assets Captured</p>
                          <p className="text-xl font-bold text-gray-900">{job.assetsCaptured}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Progress</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{job.progress}%</span>
                          </div>
                        </div>
                      </div>
                      {job.status === 'completed' && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {job.outputDir && (
                            <button
                              type="button"
                              onClick={() => setPreviewJob(job)}
                              className="btn-primary inline-flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview Clone
                            </button>
                          )}
                          <a
                            href={`/preview/${job.id}/index.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary inline-flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open in New Tab
                          </a>
                          {job.exportPath && (
                            <a
                              href={`/api/download/${job.id}`}
                              download
                              className="btn-secondary inline-flex items-center"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Clone
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setWizardJob(job)
                              setShowCloneWizard(true)
                            }}
                            className="btn-secondary inline-flex items-center text-primary-600 border-primary-300 hover:bg-primary-50"
                            title="Run incremental backup to save changes"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(job.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete clone"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

