/**
 * Archive Browser
 * Browse WARC archives, temporal navigation, version comparison
 */

import { useState, useEffect } from 'react'
import {
  Archive,
  Clock,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  Globe,
  Layers,
  GitCompare,
  Play,
  ExternalLink,
  SortAsc,
  CheckCircle
} from 'lucide-react'
import api from '../utils/api'
import { Navbar, Footer } from '../components/layout'

interface ArchiveRecord {
  id: string
  url: string
  domain: string
  captureDate: string
  size: number
  pageCount: number
  assetCount: number
  warcFile: string
  status: 'complete' | 'partial' | 'pending'
  format: 'warc' | 'warc.gz'
  cdxIndexed: boolean
}

interface CaptureTimeline {
  date: string
  count: number
  urls: string[]
}

interface VersionSnapshot {
  id: string
  url: string
  timestamp: string
  title: string
  size: number
  screenshot?: string
  changes?: number
}

export default function ArchiveBrowser() {
  const [archives, setArchives] = useState<ArchiveRecord[]>([])
  const [timeline, setTimeline] = useState<CaptureTimeline[]>([])
  const [selectedArchive, setSelectedArchive] = useState<ArchiveRecord | null>(null)
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSnapshots, setCompareSnapshots] = useState<[VersionSnapshot | null, VersionSnapshot | null]>([null, null])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [archivesRes, timelineRes] = await Promise.all([
        api.get('/archives').catch(() => ({ data: getMockArchives() })),
        api.get('/archives/timeline').catch(() => ({ data: getMockTimeline() }))
      ])
      setArchives(archivesRes.data || getMockArchives())
      setTimeline(timelineRes.data || getMockTimeline())
    } catch (error) {
      console.error('Failed to fetch archives:', error)
      setArchives(getMockArchives())
      setTimeline(getMockTimeline())
    } finally {
      setLoading(false)
    }
  }

  const fetchSnapshots = async (archiveId: string) => {
    try {
      const res = await api.get(`/archives/${archiveId}/snapshots`).catch(() => ({ data: getMockSnapshots() }))
      setSnapshots(res.data || getMockSnapshots())
    } catch {
      setSnapshots(getMockSnapshots())
    }
  }

  const handleSelectArchive = (archive: ArchiveRecord) => {
    setSelectedArchive(archive)
    fetchSnapshots(archive.id)
  }

  const handleCompareSelect = (snapshot: VersionSnapshot) => {
    if (!compareMode) return
    if (!compareSnapshots[0]) {
      setCompareSnapshots([snapshot, null])
    } else if (!compareSnapshots[1]) {
      setCompareSnapshots([compareSnapshots[0], snapshot])
    } else {
      setCompareSnapshots([snapshot, null])
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`
    return `${bytes} B`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getCapturesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return timeline.find(t => t.date === dateStr)?.count || 0
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const filteredArchives = archives.filter(a =>
    a.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats
  const totalArchives = archives.length
  const totalSize = archives.reduce((sum, a) => sum + a.size, 0)
  const totalPages = archives.reduce((sum, a) => sum + a.pageCount, 0)
  const completeArchives = archives.filter(a => a.status === 'complete').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
                <Archive className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Archive Browser</h1>
                <p className="text-sm text-gray-500">Browse WARC archives and temporal navigation</p>
              </div>
            </div>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                compareMode
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Compare
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileArchive className="w-5 h-5 text-violet-500" />
              <span className="text-gray-500 text-sm">Archives</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalArchives}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span className="text-gray-500 text-sm">Total Pages</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalPages.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-5 h-5 text-green-400" />
              <span className="text-gray-500 text-sm">Total Size</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatBytes(totalSize)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-gray-500 text-sm">Complete</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{completeArchives}/{totalArchives}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Calendar & Filters */}
          <div className="lg:col-span-1">
            {/* Calendar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h3 className="font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-gray-500 py-2">{day}</div>
                ))}
                {getDaysInMonth(currentMonth).map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />
                  const captures = getCapturesForDate(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const dateStr = date.toISOString().split('T')[0]

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        relative py-2 rounded text-sm transition-colors
                        ${isToday ? 'ring-1 ring-primary-500' : ''}
                        ${selectedDate === dateStr ? 'bg-violet-600 text-white' : ''}
                        ${captures > 0 && selectedDate !== dateStr ? 'bg-gray-100 text-gray-900' : ''}
                        ${captures === 0 && selectedDate !== dateStr ? 'text-gray-500 hover:bg-gray-100' : ''}
                      `}
                    >
                      {date.getDate()}
                      {captures > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Archives
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by URL or domain..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* View Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">View Mode</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Archives List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-violet-500" />
                  WARC Archives ({filteredArchives.length})
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <SortAsc className="w-4 h-4" />
                  <span>Newest first</span>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 gap-4 p-4">
                  {filteredArchives.map(archive => (
                    <div
                      key={archive.id}
                      onClick={() => handleSelectArchive(archive)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedArchive?.id === archive.id
                          ? 'bg-gray-100 border-primary-500'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-violet-500" />
                          <span className="font-medium text-gray-900">{archive.domain}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          archive.status === 'complete' ? 'bg-green-500/10 text-green-400' :
                          archive.status === 'partial' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {archive.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-3">{archive.url}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Date</span>
                          <p className="text-gray-700">{new Date(archive.captureDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pages</span>
                          <p className="text-gray-700">{archive.pageCount}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Size</span>
                          <p className="text-gray-700">{formatBytes(archive.size)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded transition-colors">
                          <Play className="w-3 h-3" />
                          Playback
                        </button>
                        <button className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors">
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredArchives.map(archive => (
                    <div
                      key={archive.id}
                      onClick={() => handleSelectArchive(archive)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedArchive?.id === archive.id ? 'bg-gray-50 border-l-2 border-primary-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-violet-500" />
                          <div>
                            <h3 className="font-medium text-gray-900">{archive.domain}</h3>
                            <p className="text-xs text-gray-500">{archive.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{archive.pageCount} pages</span>
                          <span>{formatBytes(archive.size)}</span>
                          <span>{formatDate(archive.captureDate)}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            archive.status === 'complete' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {archive.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredArchives.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No archives found</p>
                  <p className="text-sm">Clone a website to create WARC archives</p>
                </div>
              )}
            </div>

            {/* Snapshots Timeline */}
            {selectedArchive && snapshots.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-500" />
                    Version Timeline for {selectedArchive.domain}
                  </h2>
                  {compareMode && (
                    <p className="text-xs text-violet-500 mt-1">
                      Click two versions to compare
                    </p>
                  )}
                </div>
                <div className="p-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />

                    <div className="space-y-4">
                      {snapshots.map((snapshot, i) => (
                        <div
                          key={snapshot.id}
                          onClick={() => handleCompareSelect(snapshot)}
                          className={`relative pl-10 cursor-pointer ${
                            compareMode && (compareSnapshots[0]?.id === snapshot.id || compareSnapshots[1]?.id === snapshot.id)
                              ? 'opacity-100'
                              : compareMode ? 'opacity-60 hover:opacity-100' : ''
                          }`}
                        >
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                            compareSnapshots[0]?.id === snapshot.id ? 'bg-green-500 border-green-400' :
                            compareSnapshots[1]?.id === snapshot.id ? 'bg-blue-500 border-blue-400' :
                            'bg-white border-gray-300'
                          }`} />

                          <div className={`p-4 rounded-lg transition-colors ${
                            compareSnapshots[0]?.id === snapshot.id || compareSnapshots[1]?.id === snapshot.id
                              ? 'bg-gray-100 border border-primary-500'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-gray-900">{snapshot.title}</p>
                                <p className="text-xs text-gray-500">{formatDate(snapshot.timestamp)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {snapshot.changes !== undefined && (
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    snapshot.changes > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {snapshot.changes > 0 ? `${snapshot.changes} changes` : 'No changes'}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">{formatBytes(snapshot.size)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors">
                                <Eye className="w-3 h-3" />
                                Preview
                              </button>
                              <button className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors">
                                <ExternalLink className="w-3 h-3" />
                                Open
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Compare Panel */}
            {compareMode && compareSnapshots[0] && compareSnapshots[1] && (
              <div className="bg-white rounded-xl border border-primary-500 overflow-hidden mt-6">
                <div className="p-4 border-b border-gray-200 bg-violet-500/10">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-violet-500" />
                    Comparing Versions
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 divide-x divide-gray-200">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-gray-600 text-sm">Version A</span>
                    </div>
                    <p className="font-medium text-gray-900">{compareSnapshots[0].title}</p>
                    <p className="text-xs text-gray-500">{formatDate(compareSnapshots[0].timestamp)}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatBytes(compareSnapshots[0].size)}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-gray-600 text-sm">Version B</span>
                    </div>
                    <p className="font-medium text-gray-900">{compareSnapshots[1].title}</p>
                    <p className="text-xs text-gray-500">{formatDate(compareSnapshots[1].timestamp)}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatBytes(compareSnapshots[1].size)}</p>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors">
                    <GitCompare className="w-4 h-4" />
                    View Diff
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer minimal />
    </div>
  )
}

// Mock data
function getMockArchives(): ArchiveRecord[] {
  return [
    {
      id: '1',
      url: 'https://example.com',
      domain: 'example.com',
      captureDate: new Date(Date.now() - 86400000).toISOString(),
      size: 52428800,
      pageCount: 45,
      assetCount: 230,
      warcFile: 'example-com-2024-12-28.warc.gz',
      status: 'complete',
      format: 'warc.gz',
      cdxIndexed: true
    },
    {
      id: '2',
      url: 'https://docs.company.com',
      domain: 'docs.company.com',
      captureDate: new Date(Date.now() - 172800000).toISOString(),
      size: 125829120,
      pageCount: 156,
      assetCount: 890,
      warcFile: 'docs-company-com-2024-12-27.warc.gz',
      status: 'complete',
      format: 'warc.gz',
      cdxIndexed: true
    },
    {
      id: '3',
      url: 'https://blog.startup.io',
      domain: 'blog.startup.io',
      captureDate: new Date(Date.now() - 259200000).toISOString(),
      size: 31457280,
      pageCount: 28,
      assetCount: 112,
      warcFile: 'blog-startup-io-2024-12-26.warc.gz',
      status: 'partial',
      format: 'warc.gz',
      cdxIndexed: false
    }
  ]
}

function getMockTimeline(): CaptureTimeline[] {
  const timeline: CaptureTimeline[] = []
  for (let i = 0; i < 30; i++) {
    if (Math.random() > 0.6) {
      const date = new Date(Date.now() - i * 86400000)
      timeline.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 5) + 1,
        urls: ['https://example.com', 'https://docs.company.com']
      })
    }
  }
  return timeline
}

function getMockSnapshots(): VersionSnapshot[] {
  return [
    {
      id: 'snap-1',
      url: 'https://example.com',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      title: 'Latest Capture',
      size: 52428800,
      changes: 0
    },
    {
      id: 'snap-2',
      url: 'https://example.com',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      title: 'Homepage Update',
      size: 51380224,
      changes: 12
    },
    {
      id: 'snap-3',
      url: 'https://example.com',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      title: 'Blog Post Added',
      size: 49807360,
      changes: 5
    },
    {
      id: 'snap-4',
      url: 'https://example.com',
      timestamp: new Date(Date.now() - 259200000).toISOString(),
      title: 'Initial Capture',
      size: 48234496,
      changes: undefined
    }
  ]
}
