import { useState, useEffect } from 'react'
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Download,
  RefreshCw,
  Maximize2,
  CheckCircle,
  Globe,
  AlertTriangle,
  Trash2,
} from 'lucide-react'

interface CloneJob {
  id: string
  url: string
  status: string
  pagesCloned: number
  assetsCaptured: number
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
    }>
  }
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

const viewports: Record<ViewportSize, { width: string; icon: React.ElementType; label: string }> = {
  desktop: { width: '100%', icon: Monitor, label: 'Desktop' },
  tablet: { width: '768px', icon: Tablet, label: 'Tablet' },
  mobile: { width: '375px', icon: Smartphone, label: 'Mobile' },
}

interface PreviewModalProps {
  job: CloneJob
  onClose: () => void
  onDelete?: (job: CloneJob) => void
}

export function PreviewModal({ job, onClose, onDelete }: PreviewModalProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const hostname = new URL(job.url).hostname
  const previewUrl = `/preview/${job.id}/index.html`

  // Check if preview exists before loading iframe
  useEffect(() => {
    const checkPreview = async () => {
      try {
        const response = await fetch(previewUrl, { method: 'HEAD' })
        if (!response.ok) {
          setPreviewError(true)
          setIsLoading(false)
        }
      } catch {
        setPreviewError(true)
        setIsLoading(false)
      }
    }
    checkPreview()
  }, [previewUrl])

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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/90 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative z-10 bg-dark-900 rounded-2xl shadow-2xl
          border border-dark-700 overflow-hidden
          animate-slide-up
          ${isFullscreen ? 'w-full h-full max-w-none' : 'w-full max-w-6xl max-h-[90vh]'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800/50">
          <div className="flex items-center gap-4">
            {/* Logo/Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-sm">
              <Globe className="w-5 h-5 text-white" />
            </div>

            {/* Info */}
            <div>
              <h2 className="font-semibold text-dark-100 flex items-center gap-2">
                {hostname}
                {job.verification?.passed && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </h2>
              <div className="flex items-center gap-3 text-xs text-dark-500">
                <span>{job.pagesCloned} pages</span>
                <span>•</span>
                <span>{job.assetsCaptured} assets</span>
                {job.verification && (
                  <>
                    <span>•</span>
                    <span className={job.verification.passed ? 'text-green-400' : 'text-gold-400'}>
                      {job.verification.score}% match
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Viewport Switcher */}
            <div className="hidden sm:flex items-center bg-dark-800 rounded-lg p-1">
              {(Object.keys(viewports) as ViewportSize[]).map((size) => {
                const config = viewports[size]
                const Icon = config.icon
                const isActive = viewport === size

                return (
                  <button
                    key={size}
                    onClick={() => setViewport(size)}
                    className={`
                      p-2 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-primary-600 text-white shadow-glow-sm'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                      }
                    `}
                    title={config.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                )
              })}
            </div>

            <div className="w-px h-6 bg-dark-700 mx-1 hidden sm:block" />

            {/* Action Buttons */}
            <button
              onClick={() => {
                setIsLoading(true)
                const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement
                if (iframe) iframe.src = iframe.src
              }}
              className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
              title="Toggle fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <a
              href={`/api/download/${job.id}`}
              download
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors ml-2"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-dark-950 p-4 overflow-hidden">
          {/* Magical Frame */}
          <div
            className={`
              mx-auto h-full rounded-xl overflow-hidden
              bg-white shadow-2xl
              transition-all duration-300 ease-out
              ring-1 ring-dark-700
              relative
            `}
            style={{
              width: viewports[viewport].width,
              maxWidth: '100%',
            }}
          >
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-xl pointer-events-none">
              <div className="absolute inset-0 rounded-xl opacity-50 bg-gradient-to-r from-primary-500 via-purple-500 to-gold-500 blur-sm -z-10" />
            </div>

            {/* Loading overlay */}
            {isLoading && !previewError && (
              <div className="absolute inset-0 bg-dark-900 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                  <p className="text-dark-400 text-sm">Loading preview...</p>
                </div>
              </div>
            )}

            {/* Error state - files not found */}
            {previewError && (
              <div className="absolute inset-0 bg-dark-900 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-dark-100">Preview Not Available</h3>
                  <p className="text-dark-400 max-w-md">
                    The cloned files for this website are no longer available.
                    This may happen if the files were deleted or moved.
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    {onDelete && (
                      <button
                        onClick={() => {
                          onDelete(job)
                          onClose()
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Job
                      </button>
                    )}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-200 text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Original Site
                    </a>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-dark-400 hover:text-dark-200 text-sm transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Iframe */}
            {!previewError && (
              <iframe
                id="preview-iframe"
                src={previewUrl}
                className="w-full h-full border-0"
                title={`Preview of ${hostname}`}
                onLoad={() => setIsLoading(false)}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            )}
          </div>
        </div>

        {/* Mobile viewport indicator */}
        <div className="sm:hidden px-4 py-2 border-t border-dark-700 bg-dark-800/50">
          <div className="flex items-center justify-center gap-2">
            {(Object.keys(viewports) as ViewportSize[]).map((size) => {
              const config = viewports[size]
              const Icon = config.icon
              const isActive = viewport === size

              return (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                    ${isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:text-dark-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewModal
