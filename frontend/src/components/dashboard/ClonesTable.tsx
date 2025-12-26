import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  ExternalLink,
  Download,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react'

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
  verification?: {
    passed: boolean
    score: number
    summary: string
  }
}

type SortField = 'date' | 'status' | 'success' | 'pages' | 'assets'
type SortDirection = 'asc' | 'desc'

interface ClonesTableProps {
  jobs: CloneJob[]
  loading?: boolean
  onPreview: (job: CloneJob) => void
  onViewLogs: (job: CloneJob) => void
  onDelete: (job: CloneJob) => void
}

function getStatusBadge(status: CloneJob['status']) {
  const configs = {
    completed: { icon: CheckCircle, class: 'badge-success', label: 'Completed' },
    failed: { icon: XCircle, class: 'badge-error', label: 'Failed' },
    processing: { icon: Loader2, class: 'badge-info', label: 'Processing' },
    pending: { icon: Clock, class: 'badge-pending', label: 'Pending' },
  }

  const config = configs[status]
  const Icon = config.icon

  return (
    <span className={config.class}>
      <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  )
}

function getSuccessRate(job: CloneJob): number {
  if (job.verification?.score !== undefined) return job.verification.score
  if (job.status === 'completed') return 100
  if (job.status === 'failed') return 0
  return job.progress
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const colorClass = value >= 90 ? 'bg-green-500' : value >= 70 ? 'bg-gold-500' : 'bg-red-500'

  return (
    <div className={`progress-bar ${className}`}>
      <div
        className={`progress-bar-fill ${colorClass}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function ClonesTable({
  jobs,
  loading = false,
  onPreview,
  onViewLogs,
  onDelete,
}: ClonesTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortedAndFilteredJobs = (): CloneJob[] => {
    let filtered = [...jobs]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((job) =>
        job.url.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter)
    }

    // Apply sorting
    return filtered.sort((a, b) => {
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

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-dark-400 hover:text-dark-200 uppercase tracking-wide transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5 text-primary-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-primary-400" />
        )
      ) : (
        <ChevronDown className="w-3.5 h-3.5 opacity-30" />
      )}
    </button>
  )

  if (loading) {
    return (
      <div className="card-glass">
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton-shimmer w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-shimmer w-48 h-4 rounded" />
                <div className="skeleton-shimmer w-24 h-3 rounded" />
              </div>
              <div className="skeleton-shimmer w-20 h-6 rounded-full" />
              <div className="skeleton-shimmer w-16 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const sortedJobs = getSortedAndFilteredJobs()

  return (
    <div className="card-glass overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 border-b border-dark-700 flex flex-col sm:flex-row sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-dark-100">Recent Clones</h3>

        <div className="flex-1 flex items-center gap-3 sm:justify-end">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Search clones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search w-full py-2 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 pr-8 text-sm text-dark-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      {sortedJobs.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
            <FileText className="w-8 h-8 text-dark-600" />
          </div>
          <p className="text-dark-400 mb-2">No clones found</p>
          <p className="text-sm text-dark-600">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by creating your first clone'}
          </p>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-dark-800/30 border-b border-dark-700 text-xs">
            <div className="col-span-4">
              <SortButton field="date">Website</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="status">Status</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="success">Success</SortButton>
            </div>
            <div className="col-span-1 text-center">
              <SortButton field="pages">Pages</SortButton>
            </div>
            <div className="col-span-1 text-center">
              <SortButton field="assets">Assets</SortButton>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Actions</span>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-dark-800">
            {sortedJobs.map((job, index) => {
              const hostname = new URL(job.url).hostname
              const successRate = getSuccessRate(job)

              return (
                <div
                  key={job.id}
                  className="lg:grid lg:grid-cols-12 gap-4 p-4 lg:px-6 hover:bg-dark-800/30 transition-colors duration-150 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Website */}
                  <div className="col-span-4 flex items-center gap-3 mb-3 lg:mb-0">
                    <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-400">
                        {hostname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      {job.status === 'completed' ? (
                        <button
                          onClick={() => onPreview(job)}
                          className="text-sm font-medium text-primary-400 hover:text-primary-300 hover:underline truncate block max-w-full text-left"
                        >
                          {hostname}
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-dark-200 truncate block">
                          {hostname}
                        </span>
                      )}
                      <span className="text-xs text-dark-500">
                        {formatRelativeTime(job.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center mb-2 lg:mb-0">
                    {getStatusBadge(job.status)}
                  </div>

                  {/* Success */}
                  <div className="col-span-2 flex items-center gap-2 mb-2 lg:mb-0">
                    <ProgressBar value={successRate} className="w-16" />
                    <span className={`text-sm font-bold ${
                      successRate >= 90 ? 'text-green-400' :
                      successRate >= 70 ? 'text-gold-400' : 'text-red-400'
                    }`}>
                      {successRate}%
                    </span>
                  </div>

                  {/* Pages */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm font-medium text-dark-200">{job.pagesCloned}</span>
                  </div>

                  {/* Assets */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm font-medium text-dark-200">{job.assetsCaptured}</span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {job.status === 'completed' && (
                      <>
                        <button
                          onClick={() => onPreview(job)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/preview/${job.id}/index.html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {job.exportPath && (
                          <a
                            href={`/api/download/${job.id}`}
                            download
                            className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => onViewLogs(job)}
                      className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
                      title="View logs"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(job)}
                      className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dark-700 flex items-center justify-between text-sm text-dark-500">
            <span>
              Showing <strong className="text-dark-300">{sortedJobs.length}</strong> of{' '}
              <strong className="text-dark-300">{jobs.length}</strong> clones
            </span>
            <div className="flex items-center gap-4">
              <span className="text-green-400">
                <strong>{jobs.filter((j) => j.status === 'completed').length}</strong> completed
              </span>
              <span className="text-red-400">
                <strong>{jobs.filter((j) => j.status === 'failed').length}</strong> failed
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ClonesTable
