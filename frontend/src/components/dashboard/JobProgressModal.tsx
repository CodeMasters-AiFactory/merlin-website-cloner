import { useState, useEffect } from 'react'
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  FileText,
  Activity,
} from 'lucide-react'

interface PageProgress {
  url: string
  status: 'pending' | 'downloading' | 'complete' | 'failed'
  startedAt?: string
  completedAt?: string
  assetsTotal?: number
  assetsDownloaded?: number
  error?: string
}

interface CloneJob {
  id: string
  url: string
  status: string
  progress?: number
  currentUrl?: string
  message?: string
}

interface JobProgressModalProps {
  job: CloneJob
  onClose: () => void
}

export function JobProgressModal({ job, onClose }: JobProgressModalProps) {
  const [pages, setPages] = useState<PageProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUrl, setCurrentUrl] = useState('')
  const [progress, setProgress] = useState(job.progress || 0)
  const [message, setMessage] = useState(job.message || '')

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/jobs/${job.id}/pages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setPages(data.pagesProgress || [])
          setCurrentUrl(data.currentUrl || '')
          setProgress(data.progress || 0)
          setMessage(data.message || '')
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()

    // Poll every 2 seconds if job is processing or paused
    const shouldPoll = job.status === 'processing' || job.status === 'paused'
    const interval = shouldPoll ? setInterval(fetchProgress, 2000) : null

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [job.id, job.status])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'downloading':
        return <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-dark-500" />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500/10 border-green-500/20'
      case 'downloading':
        return 'bg-primary-500/10 border-primary-500/30'
      case 'failed':
        return 'bg-red-500/10 border-red-500/20'
      default:
        return 'bg-dark-700/50 border-dark-600'
    }
  }

  const hostname = (() => {
    try {
      return new URL(job.url).hostname
    } catch {
      return job.url
    }
  })()

  const completedCount = pages.filter(p => p.status === 'complete').length
  const downloadingCount = pages.filter(p => p.status === 'downloading').length
  const pendingCount = pages.filter(p => p.status === 'pending').length
  const failedCount = pages.filter(p => p.status === 'failed').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 w-full max-w-3xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark-100">Clone Progress</h3>
              <p className="text-sm text-dark-400">{hostname}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3 border-b border-dark-700 bg-dark-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-300">{message || 'Cloning...'}</span>
            <span className="text-sm font-medium text-primary-400">{progress}%</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current URL Banner */}
        {currentUrl && job.status === 'processing' && (
          <div className="px-4 py-3 bg-primary-500/10 border-b border-dark-700">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin flex-shrink-0" />
              <span className="text-sm text-primary-400">Currently cloning:</span>
              <span className="text-sm text-dark-200 truncate">{currentUrl}</span>
            </div>
          </div>
        )}

        {/* Paused Banner */}
        {job.status === 'paused' && (
          <div className="px-4 py-3 bg-gold-500/10 border-b border-dark-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-400" />
              <span className="text-sm text-gold-400">Clone is paused. Click Resume to continue.</span>
            </div>
          </div>
        )}

        {/* Pages List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-8 text-dark-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pages discovered yet</p>
              <p className="text-sm mt-1">Pages will appear here as they are cloned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((page, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all ${getStatusClass(page.status)}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(page.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-200 truncate">{page.url}</p>
                      {page.assetsTotal !== undefined && page.assetsTotal > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-dark-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 transition-all"
                              style={{
                                width: `${Math.min(100, ((page.assetsDownloaded || 0) / page.assetsTotal) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-xs text-dark-500 flex-shrink-0">
                            {page.assetsDownloaded || 0}/{page.assetsTotal} assets
                          </span>
                        </div>
                      )}
                      {page.error && (
                        <p className="text-xs text-red-400 mt-1">{page.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="px-4 py-3 border-t border-dark-700 bg-dark-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-dark-500">
                <span className="text-green-400 font-medium">{completedCount}</span> completed
              </span>
              <span className="text-dark-500">
                <span className="text-primary-400 font-medium">{downloadingCount}</span> downloading
              </span>
              <span className="text-dark-500">
                <span className="text-dark-400 font-medium">{pendingCount}</span> pending
              </span>
              {failedCount > 0 && (
                <span className="text-dark-500">
                  <span className="text-red-400 font-medium">{failedCount}</span> failed
                </span>
              )}
            </div>
            <span className="text-dark-500">
              {pages.length} total pages
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobProgressModal
