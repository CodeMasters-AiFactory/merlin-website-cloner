import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sidebar, Header, ClonesTable, PreviewModal, ReportModal } from '../components/dashboard'
import { JobProgressModal } from '../components/dashboard/JobProgressModal'
import { CloneWizard } from '../components/CloneWizard'
import api from '../utils/api'
import {
  X, FileText, CheckCircle, XCircle, AlertTriangle, Trash2, Plus,
  Globe, Sparkles, Zap, Shield, Archive, Network, ArrowRight,
  TrendingUp, Clock, BarChart3, Activity
} from 'lucide-react'

interface CloneJob {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused'
  progress: number
  pagesCloned: number
  assetsCaptured: number
  createdAt: string
  completedAt?: string
  pausedAt?: string
  outputDir?: string
  exportPath?: string
  errors?: string[]
  currentUrl?: string
  message?: string
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
    timestamp?: string
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

// Animated counter hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (end === 0) {
      setCount(0)
      return
    }

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return count
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  color,
  delay = 0,
}: {
  icon: React.ElementType
  label: string
  value: number
  suffix?: string
  color: 'violet' | 'emerald' | 'amber' | 'blue' | 'rose'
  delay?: number
}) {
  const animatedValue = useCountUp(value)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const colorClasses = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/25',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    blue: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/25',
  }

  const iconBgClasses = {
    violet: 'bg-violet-500/20',
    emerald: 'bg-emerald-500/20',
    amber: 'bg-amber-500/20',
    blue: 'bg-blue-500/20',
    rose: 'bg-rose-500/20',
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-6
        bg-gradient-to-br ${colorClasses[color]}
        shadow-lg transform transition-all duration-500
        hover:scale-[1.02] hover:shadow-xl
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

      <div className="relative">
        <div className={`inline-flex p-3 rounded-xl ${iconBgClasses[color]} mb-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="text-4xl font-bold text-white mb-1">
          {animatedValue.toLocaleString()}{suffix}
        </div>
        <div className="text-white/80 text-sm font-medium">{label}</div>
      </div>
    </div>
  )
}

// Quick action card component
function QuickActionCard({
  icon: Icon,
  title,
  description,
  to,
  gradient,
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  description: string
  to: string
  gradient: string
  delay?: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <Link
      to={to}
      className={`
        group relative overflow-hidden rounded-2xl bg-white border border-gray-200
        p-6 transition-all duration-300 hover:shadow-xl hover:border-transparent
        hover:-translate-y-1
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative">
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} mb-4 shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white transition-colors mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors mb-4">
          {description}
        </p>
        <div className="flex items-center gap-2 text-sm font-medium text-violet-600 group-hover:text-white transition-colors">
          <span>Get started</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

// Active job card component
function ActiveJobCard({ job, onViewProgress }: { job: CloneJob; onViewProgress: (job: CloneJob) => void }) {
  const hostname = (() => {
    try {
      return new URL(job.url).hostname
    } catch {
      return job.url
    }
  })()

  return (
    <div
      className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-violet-200 transition-all duration-300 cursor-pointer"
      onClick={() => onViewProgress(job)}
    >
      <div className="flex items-center gap-4">
        {/* Progress circle */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-100"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${job.progress * 1.51} 151`}
              className="text-violet-500 transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-900">{job.progress}%</span>
          </div>
        </div>

        {/* Job info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-violet-500" />
            <span className="font-medium text-gray-900 truncate">{hostname}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {job.pagesCloned} pages
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {job.assetsCaptured} assets
            </span>
          </div>
          {job.currentUrl && (
            <p className="text-xs text-gray-400 truncate mt-1">
              {job.currentUrl}
            </p>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
          style={{ width: `${job.progress}%` }}
        />
      </div>
    </div>
  )
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
  const [progressJob, setProgressJob] = useState<CloneJob | null>(null)
  const [reportJob, setReportJob] = useState<CloneJob | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadJobs()
    loadUserCredits()

    // Poll for updates every 5 seconds if there are processing or paused jobs
    const interval = setInterval(() => {
      if (jobs.some((j) => j.status === 'processing' || j.status === 'paused')) {
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
      const response = await api.get('/credits')
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

  const handleStop = async (job: CloneJob) => {
    try {
      await api.post(`/jobs/${job.id}/stop`)
      loadJobs()
    } catch (error) {
      console.error('Failed to stop job:', error)
    }
  }

  const handlePause = async (job: CloneJob) => {
    try {
      await api.post(`/jobs/${job.id}/pause`)
      loadJobs()
    } catch (error) {
      console.error('Failed to pause job:', error)
    }
  }

  const handleResume = async (job: CloneJob) => {
    try {
      await api.post(`/jobs/${job.id}/resume`)
      loadJobs()
    } catch (error) {
      console.error('Failed to resume job:', error)
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
  }

  const processingJobs = jobs.filter((j) => j.status === 'processing')
  const recentJobs = jobs.slice(0, 5)
  const successRate = stats.totalClones > 0
    ? Math.round((stats.completedClones / stats.totalClones) * 100)
    : 100

  // Get user name from token
  const getUserName = () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.name || 'User'
      }
    } catch {
      return 'User'
    }
    return 'User'
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-gray-900/50 z-30"
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
        <main className="p-4 lg:p-8">
          {/* Hero Section with Gradient */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 lg:p-10 mb-8 shadow-2xl shadow-violet-500/20">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-48 translate-x-48" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl translate-y-32 -translate-x-32" />
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-white/90 text-sm font-medium mb-4 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Welcome back to Merlin</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
                  {getGreeting()}, {getUserName()}!
                </h1>
                <p className="text-white/80 text-lg max-w-xl">
                  Ready to clone the web? You have <span className="text-white font-semibold">{stats.creditsRemaining} credits</span> remaining
                  and <span className="text-white font-semibold">{processingJobs.length} active {processingJobs.length === 1 ? 'job' : 'jobs'}</span> running.
                </p>
              </div>

              <button
                onClick={() => setShowCloneWizard(true)}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-violet-600 font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="p-2 bg-violet-100 rounded-xl group-hover:bg-violet-200 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-lg">New Clone</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <StatCard
              icon={Globe}
              label="Total Clones"
              value={stats.totalClones}
              color="violet"
              delay={0}
            />
            <StatCard
              icon={CheckCircle}
              label="Success Rate"
              value={successRate}
              suffix="%"
              color="emerald"
              delay={100}
            />
            <StatCard
              icon={Sparkles}
              label="Credits Left"
              value={stats.creditsRemaining}
              color="amber"
              delay={200}
            />
            <StatCard
              icon={TrendingUp}
              label="This Month"
              value={stats.thisMonth}
              color="blue"
              delay={300}
            />
          </div>

          {/* Active Jobs + Quick Actions Row */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Active Jobs */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-xl">
                      <Activity className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
                      <p className="text-sm text-gray-500">{processingJobs.length} jobs in progress</p>
                    </div>
                  </div>
                  {processingJobs.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
                      </span>
                      Processing
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : processingJobs.length > 0 ? (
                  <div className="space-y-4">
                    {processingJobs.map((job) => (
                      <ActiveJobCard
                        key={job.id}
                        job={job}
                        onViewProgress={setProgressJob}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active jobs</h3>
                    <p className="text-gray-500 mb-6">Start a new clone to see progress here</p>
                    <button
                      onClick={() => setShowCloneWizard(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Clone
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 px-1">Quick Actions</h2>
              <QuickActionCard
                icon={Shield}
                title="Disaster Recovery"
                description="Backup and monitor your sites"
                to="/disaster-recovery"
                gradient="from-emerald-500 to-teal-600"
                delay={0}
              />
              <QuickActionCard
                icon={Archive}
                title="Browse Archives"
                description="Explore your cloned websites"
                to="/archive-browser"
                gradient="from-blue-500 to-indigo-600"
                delay={100}
              />
              <QuickActionCard
                icon={Network}
                title="Proxy Network"
                description="Earn credits sharing bandwidth"
                to="/proxy-network"
                gradient="from-amber-500 to-orange-600"
                delay={200}
              />
            </div>
          </div>

          {/* Recent Clones Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <Globe className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">All Clones</h2>
                    <p className="text-sm text-gray-500">{jobs.length} total clones</p>
                  </div>
                </div>
              </div>
            </div>

            <ClonesTable
              jobs={jobs}
              loading={loading}
              onPreview={(job) => setPreviewJob(job)}
              onViewLogs={(job) => setLogsJob(job)}
              onDelete={(job) => setDeleteJob(job)}
              onViewProgress={(job) => setProgressJob(job)}
              onStop={handleStop}
              onPause={handlePause}
              onResume={handleResume}
              onViewReport={(job) => setReportJob(job)}
            />
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
          onDelete={(job) => {
            setPreviewJob(null)
            setDeleteJob(job as CloneJob)
          }}
        />
      )}

      {/* Progress Modal */}
      {progressJob && (
        <JobProgressModal
          job={progressJob}
          onClose={() => setProgressJob(null)}
        />
      )}

      {/* Report Modal */}
      {reportJob && (
        <ReportModal
          job={reportJob}
          onClose={() => setReportJob(null)}
        />
      )}

      {/* Logs Modal */}
      {logsJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setLogsJob(null)}
          />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Clone Logs</h3>
              </div>
              <button
                onClick={() => setLogsJob(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">URL:</span> {logsJob.url}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Created:</span>{' '}
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
                      className={`p-3 rounded-xl ${
                        log.level === 'success'
                          ? 'bg-green-50 border border-green-100'
                          : log.level === 'error'
                          ? 'bg-red-50 border border-red-100'
                          : log.level === 'warning'
                          ? 'bg-amber-50 border border-amber-100'
                          : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                          {log.timestamp}
                        </span>
                        <span
                          className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                            log.level === 'success'
                              ? 'text-green-600 bg-green-100'
                              : log.level === 'error'
                              ? 'text-red-600 bg-red-100'
                              : log.level === 'warning'
                              ? 'text-amber-600 bg-amber-100'
                              : 'text-gray-600 bg-gray-100'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-sm text-gray-700">{log.message}</span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1 ml-20 font-mono">{log.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : logsJob.errors && logsJob.errors.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600 mb-2">Errors:</h4>
                  {logsJob.errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No detailed logs available for this clone.</p>
                </div>
              )}
            </div>

            {/* Verification checks */}
            {logsJob.verification?.checks && logsJob.verification.checks.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Verification Checks:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {logsJob.verification.checks.map((check, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2.5 rounded-xl ${
                        check.passed
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
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
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setDeleteJob(null)}
          />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Clone</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the clone of{' '}
                <strong className="text-gray-900">{(() => {
                  try {
                    return new URL(deleteJob.url).hostname
                  } catch {
                    return deleteJob.url
                  }
                })()}</strong>?
                All files and data will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteJob(null)}
                  className="px-4 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
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
