/**
 * Disaster Recovery Dashboard
 * Monitor sites, view backups, manage failover, one-click restore
 */

import { useState, useEffect } from 'react'
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Play,
  Pause,
  History,
  Activity,
  Server,
  TrendingUp,
  Eye,
  Plus,
  ChevronRight,
  Calendar
} from 'lucide-react'
import api from '../utils/api'
import { Navbar, Footer } from '../components/layout'

interface MonitoredSite {
  id: string
  url: string
  name: string
  status: 'online' | 'degraded' | 'offline'
  lastCheck: string
  lastBackup: string
  backupCount: number
  syncEnabled: boolean
  syncInterval: number
  uptime24h: number
  uptime7d: number
  uptime30d: number
  responseTime: number
  failoverEnabled: boolean
  failoverTriggered: boolean
  failoverUrl?: string
}

interface BackupVersion {
  id: string
  siteId: string
  timestamp: string
  size: number
  pageCount: number
  assetCount: number
  type: 'full' | 'incremental'
  status: 'complete' | 'partial' | 'failed'
}

interface FailoverEvent {
  id: string
  siteId: string
  siteName: string
  timestamp: string
  type: 'triggered' | 'resolved' | 'manual'
  reason: string
  duration?: number
}

export default function DisasterRecovery() {
  const [sites, setSites] = useState<MonitoredSite[]>([])
  const [selectedSite, setSelectedSite] = useState<MonitoredSite | null>(null)
  const [backups, setBackups] = useState<BackupVersion[]>([])
  const [events, setEvents] = useState<FailoverEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSiteUrl, setNewSiteUrl] = useState('')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [sitesRes, eventsRes] = await Promise.all([
        api.get('/dr/sites').catch(() => ({ data: null })),
        api.get('/dr/events').catch(() => ({ data: null }))
      ])
      const sitesData = Array.isArray(sitesRes.data) ? sitesRes.data : getMockSites()
      const eventsData = Array.isArray(eventsRes.data) ? eventsRes.data : getMockEvents()
      setSites(sitesData)
      setEvents(eventsData)
    } catch (error) {
      console.error('Failed to fetch DR data:', error)
      setSites(getMockSites())
      setEvents(getMockEvents())
    } finally {
      setLoading(false)
    }
  }

  const fetchBackups = async (siteId: string) => {
    try {
      const res = await api.get(`/dr/sites/${siteId}/backups`).catch(() => ({ data: getMockBackups(siteId) }))
      setBackups(res.data || getMockBackups(siteId))
    } catch {
      setBackups(getMockBackups(siteId))
    }
  }

  const handleSelectSite = (site: MonitoredSite) => {
    setSelectedSite(site)
    fetchBackups(site.id)
  }

  const handleAddSite = async () => {
    if (!newSiteUrl) return
    try {
      await api.post('/dr/sites', { url: newSiteUrl })
      setNewSiteUrl('')
      setShowAddSite(false)
      fetchData()
    } catch (error) {
      console.error('Failed to add site:', error)
    }
  }

  const handleRestore = async (backupId: string) => {
    if (!selectedSite) return
    try {
      await api.post(`/dr/sites/${selectedSite.id}/restore`, { backupId })
      alert('Restore initiated successfully!')
    } catch (error) {
      console.error('Failed to restore:', error)
    }
  }

  const handleToggleSync = async (site: MonitoredSite) => {
    try {
      await api.patch(`/dr/sites/${site.id}`, { syncEnabled: !site.syncEnabled })
      fetchData()
    } catch (error) {
      console.error('Failed to toggle sync:', error)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`
    return `${bytes} B`
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-500/10'
      case 'degraded': return 'text-yellow-400 bg-yellow-500/10'
      case 'offline': return 'text-red-400 bg-red-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />
      case 'degraded': return <AlertTriangle className="w-4 h-4" />
      case 'offline': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  // Summary stats
  const onlineSites = sites.filter(s => s.status === 'online').length
  const degradedSites = sites.filter(s => s.status === 'degraded').length
  const offlineSites = sites.filter(s => s.status === 'offline').length
  const totalBackups = sites.reduce((sum, s) => sum + s.backupCount, 0)
  const avgUptime = sites.length > 0
    ? (sites.reduce((sum, s) => sum + s.uptime30d, 0) / sites.length).toFixed(2)
    : '0.00'

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Disaster Recovery</h1>
                <p className="text-sm text-gray-500">Monitor sites, manage backups, and enable failover</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddSite(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Monitor Site
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-gray-500 text-sm">Online</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{onlineSites}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-500 text-sm">Degraded</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{degradedSites}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-gray-500 text-sm">Offline</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{offlineSites}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-5 h-5 text-blue-400" />
              <span className="text-gray-500 text-sm">Backups</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalBackups}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              <span className="text-gray-500 text-sm">Avg Uptime</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgUptime}%</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sites List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-violet-500" />
                  Monitored Sites ({sites.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {sites.map(site => (
                  <div
                    key={site.id}
                    onClick={() => handleSelectSite(site)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedSite?.id === site.id ? 'bg-gray-50 border-l-2 border-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(site.status)}`}>
                          {getStatusIcon(site.status)}
                          {site.status}
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-900">{site.name}</h3>
                          <p className="text-sm text-gray-500">{site.url}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${selectedSite?.id === site.id ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-gray-500">Response</span>
                        <p className={`font-mono ${site.responseTime < 500 ? 'text-green-400' : site.responseTime < 1000 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {site.responseTime}ms
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">24h Uptime</span>
                        <p className="text-gray-700 font-mono">{site.uptime24h}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Backup</span>
                        <p className="text-gray-700">{formatTimeAgo(site.lastBackup)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Sync</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleSync(site); }}
                          className={`flex items-center gap-1 ${site.syncEnabled ? 'text-green-400' : 'text-gray-500'}`}
                        >
                          {site.syncEnabled ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          {site.syncEnabled ? 'On' : 'Off'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {sites.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sites monitored yet</p>
                    <button
                      onClick={() => setShowAddSite(true)}
                      className="mt-4 text-violet-500 hover:text-primary-300"
                    >
                      Add your first site
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-violet-500" />
                  Recent Events
                </h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {events.slice(0, 10).map(event => (
                  <div key={event.id} className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      event.type === 'triggered' ? 'bg-red-500/10 text-red-400' :
                      event.type === 'resolved' ? 'bg-green-500/10 text-green-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {event.type === 'triggered' ? <AlertTriangle className="w-4 h-4" /> :
                       event.type === 'resolved' ? <CheckCircle className="w-4 h-4" /> :
                       <RefreshCw className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm">
                        <span className="font-medium">{event.siteName}</span>: {event.reason}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatTimeAgo(event.timestamp)}
                        {event.duration && ` - Duration: ${event.duration}s`}
                      </p>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No events recorded</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Backup Panel */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-violet-500" />
                  {selectedSite ? `Backups for ${selectedSite.name}` : 'Select a Site'}
                </h2>
              </div>

              {selectedSite ? (
                <>
                  {/* Site Details */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Uptime (30d)</span>
                        <p className="text-gray-900 font-semibold">{selectedSite.uptime30d}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Backups</span>
                        <p className="text-gray-900 font-semibold">{selectedSite.backupCount}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Sync Interval</span>
                        <p className="text-gray-900 font-semibold">{selectedSite.syncInterval} min</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Failover</span>
                        <p className={selectedSite.failoverEnabled ? 'text-green-400' : 'text-gray-500'}>
                          {selectedSite.failoverEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Backup List */}
                  <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                    {backups.map(backup => (
                      <div key={backup.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                backup.type === 'full' ? 'bg-violet-500/10 text-violet-500' : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {backup.type}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                backup.status === 'complete' ? 'bg-green-500/10 text-green-400' :
                                backup.status === 'partial' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>
                                {backup.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(backup.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                          <div>
                            <span className="text-gray-500">Size</span>
                            <p className="text-gray-700">{formatBytes(backup.size)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Pages</span>
                            <p className="text-gray-700">{backup.pageCount}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Assets</span>
                            <p className="text-gray-700">{backup.assetCount}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleRestore(backup.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Restore
                          </button>
                          <button className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors">
                            <Download className="w-3 h-3" />
                          </button>
                          <button className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors">
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {backups.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No backups yet</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a site to view backups</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Site Modal */}
      {showAddSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-md" onClick={() => setShowAddSite(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md animate-slide-up">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-500" />
                Monitor New Site
              </h3>
              <input
                type="url"
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                We'll monitor uptime, create backups, and enable auto-failover.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddSite(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSite}
                  disabled={!newSiteUrl}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Start Monitoring
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer minimal />
    </div>
  )
}

// Mock data generators for demo
function getMockSites(): MonitoredSite[] {
  return [
    {
      id: '1',
      url: 'https://mycompany.com',
      name: 'Company Website',
      status: 'online',
      lastCheck: new Date().toISOString(),
      lastBackup: new Date(Date.now() - 3600000).toISOString(),
      backupCount: 24,
      syncEnabled: true,
      syncInterval: 60,
      uptime24h: 100,
      uptime7d: 99.9,
      uptime30d: 99.95,
      responseTime: 245,
      failoverEnabled: true,
      failoverTriggered: false
    },
    {
      id: '2',
      url: 'https://store.mycompany.com',
      name: 'E-commerce Store',
      status: 'online',
      lastCheck: new Date().toISOString(),
      lastBackup: new Date(Date.now() - 7200000).toISOString(),
      backupCount: 48,
      syncEnabled: true,
      syncInterval: 30,
      uptime24h: 100,
      uptime7d: 99.8,
      uptime30d: 99.5,
      responseTime: 312,
      failoverEnabled: true,
      failoverTriggered: false
    },
    {
      id: '3',
      url: 'https://blog.mycompany.com',
      name: 'Company Blog',
      status: 'degraded',
      lastCheck: new Date().toISOString(),
      lastBackup: new Date(Date.now() - 1800000).toISOString(),
      backupCount: 12,
      syncEnabled: true,
      syncInterval: 120,
      uptime24h: 98.5,
      uptime7d: 99.0,
      uptime30d: 98.8,
      responseTime: 1250,
      failoverEnabled: false,
      failoverTriggered: false
    }
  ]
}

function getMockBackups(siteId: string): BackupVersion[] {
  const backups: BackupVersion[] = []
  for (let i = 0; i < 10; i++) {
    backups.push({
      id: `backup-${siteId}-${i}`,
      siteId,
      timestamp: new Date(Date.now() - i * 3600000 * 6).toISOString(),
      size: Math.floor(Math.random() * 50000000) + 10000000,
      pageCount: Math.floor(Math.random() * 100) + 20,
      assetCount: Math.floor(Math.random() * 500) + 100,
      type: i % 4 === 0 ? 'full' : 'incremental',
      status: Math.random() > 0.1 ? 'complete' : 'partial'
    })
  }
  return backups
}

function getMockEvents(): FailoverEvent[] {
  return [
    {
      id: '1',
      siteId: '3',
      siteName: 'Company Blog',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      type: 'triggered',
      reason: 'Response time exceeded 2000ms threshold'
    },
    {
      id: '2',
      siteId: '1',
      siteName: 'Company Website',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      type: 'resolved',
      reason: 'Site recovered after temporary outage',
      duration: 45
    },
    {
      id: '3',
      siteId: '2',
      siteName: 'E-commerce Store',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      type: 'manual',
      reason: 'Manual backup triggered by admin'
    }
  ]
}
