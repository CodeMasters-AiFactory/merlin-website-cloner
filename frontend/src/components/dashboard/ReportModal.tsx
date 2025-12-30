import { useEffect } from 'react'
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Globe,
  Image,
  Code,
  Link2,
  Type,
  Film,
  Sparkles,
  Download,
  ExternalLink,
  Copy,
  Printer,
} from 'lucide-react'

interface CloneJob {
  id: string
  url: string
  status: string
  pagesCloned: number
  assetsCaptured: number
  createdAt: string
  completedAt?: string
  verification?: {
    passed: boolean
    score: number
    summary: string
    timestamp?: string
    checks?: Array<{
      name: string
      category: string
      passed: boolean
      message: string
      details?: string[]
    }>
  }
}

interface ReportModalProps {
  job: CloneJob
  onClose: () => void
}

const categoryIcons: Record<string, React.ElementType> = {
  html: FileText,
  css: Code,
  js: Code,
  images: Image,
  links: Link2,
  fonts: Type,
  animations: Sparkles,
  videos: Film,
}

const categoryColors: Record<string, string> = {
  html: 'text-blue-400',
  css: 'text-purple-400',
  js: 'text-yellow-400',
  images: 'text-green-400',
  links: 'text-cyan-400',
  fonts: 'text-pink-400',
  animations: 'text-orange-400',
  videos: 'text-red-400',
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-500/20 border-green-500/30'
  if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30'
  if (score >= 50) return 'bg-orange-500/20 border-orange-500/30'
  return 'bg-red-500/20 border-red-500/30'
}

function formatDuration(start: string, end?: string): string {
  if (!end) return 'N/A'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diff = endDate.getTime() - startDate.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function ReportModal({ job, onClose }: ReportModalProps) {
  const hostname = (() => {
    try {
      return new URL(job.url).hostname
    } catch {
      return job.url
    }
  })()

  const score = job.verification?.score || 0
  const checks = job.verification?.checks || []
  const passedChecks = checks.filter((c) => c.passed).length
  const failedChecks = checks.filter((c) => !c.passed).length

  // Group checks by category
  const checksByCategory = checks.reduce((acc, check) => {
    const cat = check.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(check)
    return acc
  }, {} as Record<string, typeof checks>)

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

  const handleCopyReport = () => {
    const reportText = `
Clone Report: ${hostname}
URL: ${job.url}
Date: ${new Date(job.createdAt).toLocaleString()}
Status: ${job.status}
Score: ${score}%

Pages Cloned: ${job.pagesCloned}
Assets Captured: ${job.assetsCaptured}
Duration: ${formatDuration(job.createdAt, job.completedAt)}

Checks (${passedChecks}/${checks.length} passed):
${checks.map((c) => `  ${c.passed ? '✓' : '✗'} ${c.name}: ${c.message}`).join('\n')}
    `.trim()
    navigator.clipboard.writeText(reportText)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-900 rounded-2xl border border-dark-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in print:max-w-none print:max-h-none print:border-none print:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 print:border-gray-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white print:text-black">Clone Report</h2>
              <p className="text-sm text-dark-400 print:text-gray-600">{hostname}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleCopyReport}
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
              title="Copy Report"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
              title="Print Report"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score Card */}
          <div className={`rounded-xl border p-6 ${getScoreBgColor(score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400 mb-1">Overall Score</p>
                <div className="flex items-center gap-3">
                  <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
                    {score}%
                  </span>
                  {job.verification?.passed ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Passed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      Issues Found
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-300 mt-2">
                  {job.verification?.summary || 'No verification summary available'}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{passedChecks}</p>
                    <p className="text-xs text-dark-400">Passed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{failedChecks}</p>
                    <p className="text-xs text-dark-400">Failed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <Globe className="w-4 h-4" />
                <span className="text-xs">Pages Cloned</span>
              </div>
              <p className="text-2xl font-bold text-white">{job.pagesCloned}</p>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <Image className="w-4 h-4" />
                <span className="text-xs">Assets Captured</span>
              </div>
              <p className="text-2xl font-bold text-white">{job.assetsCaptured}</p>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Duration</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatDuration(job.createdAt, job.completedAt)}
              </p>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Total Checks</span>
              </div>
              <p className="text-2xl font-bold text-white">{checks.length}</p>
            </div>
          </div>

          {/* Checks by Category */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Verification Details</h3>
            <div className="space-y-3">
              {Object.entries(checksByCategory).map(([category, categoryChecks]) => {
                const Icon = categoryIcons[category] || FileText
                const colorClass = categoryColors[category] || 'text-gray-400'
                const allPassed = categoryChecks.every((c) => c.passed)
                const someFailed = categoryChecks.some((c) => !c.passed)

                return (
                  <div
                    key={category}
                    className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-dark-700 ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-medium text-white capitalize">{category}</span>
                          <span className="text-sm text-dark-400 ml-2">
                            ({categoryChecks.filter((c) => c.passed).length}/{categoryChecks.length} passed)
                          </span>
                        </div>
                      </div>
                      {allPassed ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : someFailed ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>

                    {/* Individual checks */}
                    <div className="border-t border-dark-700 divide-y divide-dark-700">
                      {categoryChecks.map((check, idx) => (
                        <div key={idx} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {check.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${check.passed ? 'text-dark-300' : 'text-white'}`}>
                                {check.message}
                              </p>
                              {check.details && check.details.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {check.details.slice(0, 5).map((detail, i) => (
                                    <p key={i} className="text-xs text-dark-500 font-mono">
                                      {detail}
                                    </p>
                                  ))}
                                  {check.details.length > 5 && (
                                    <p className="text-xs text-dark-500">
                                      ...and {check.details.length - 5} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-sm text-dark-500 border-t border-dark-700 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p>Clone ID: <span className="font-mono text-dark-400">{job.id}</span></p>
                <p>Created: {new Date(job.createdAt).toLocaleString()}</p>
                {job.completedAt && (
                  <p>Completed: {new Date(job.completedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary-400 hover:text-primary-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Original Site
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-700 bg-dark-800/50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:bg-dark-700 transition-colors"
          >
            Close
          </button>
          <a
            href={`/api/download/${job.id}`}
            download
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Clone
          </a>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
