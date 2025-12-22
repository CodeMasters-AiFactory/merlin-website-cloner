/**
 * Proxy Network Dashboard
 * Manage bandwidth contribution and view earned credits
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Globe,
  Server,
  Zap,
  TrendingUp,
  Award,
  Download,
  Activity,
  ArrowRight,
  Check,
  Copy
} from 'lucide-react'
import api from '../utils/api'

interface NetworkStats {
  totalNodes: number
  onlineNodes: number
  totalBandwidth: number
  totalRequestsServed: number
  averageLatency: number
  averageSuccessRate: number
  countryCoverage: string[]
  bytesTransferredTotal: number
}

interface ProxyNode {
  id: string
  host: string
  port: number
  country: string
  isOnline: boolean
  successRate: number
  totalRequests: number
  bytesServed: number
  creditsEarned: number
  registeredAt: string
}

interface LeaderboardEntry {
  userId: string
  totalCredits: number
  totalNodes: number
  totalBytesServed: number
}

export default function ProxyNetwork() {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null)
  const [myNodes, setMyNodes] = useState<ProxyNode[]>([])
  const [myCredits, setMyCredits] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, nodesRes, leaderboardRes] = await Promise.all([
        api.get('/proxy-network/stats'),
        api.get('/proxy-network/my-nodes').catch(() => ({ data: { nodes: [], totalCredits: 0 } })),
        api.get('/proxy-network/leaderboard')
      ])

      setNetworkStats(statsRes.data)
      setMyNodes(nodesRes.data.nodes || [])
      setMyCredits(nodesRes.data.totalCredits || 0)
      setLeaderboard(leaderboardRes.data || [])
    } catch (error) {
      console.error('Failed to fetch proxy network data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npx merlin-proxy-sdk')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`
    return `${bytes} B`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">Merlin Clone</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link to="/dashboard" className="text-gray-600 hover:text-primary-600">Dashboard</Link>
              <Link to="/pricing" className="text-gray-600 hover:text-primary-600">Pricing</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Our Own P2P Proxy Network
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contribute Bandwidth, Earn Credits
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of users powering the Merlin Proxy Network. Share your bandwidth
            and earn credits for free website cloning. No third-party dependencies.
          </p>
        </div>

        {/* Network Stats */}
        {networkStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Server className="w-8 h-8 text-primary-500" />
                <span className="text-xs text-green-500 font-medium">{networkStats.onlineNodes} online</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{networkStats.totalNodes}</p>
              <p className="text-sm text-gray-500">Total Nodes</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{networkStats.totalBandwidth} Mbps</p>
              <p className="text-sm text-gray-500">Total Bandwidth</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{networkStats.totalRequestsServed.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Requests Served</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{networkStats.countryCoverage.length}</p>
              <p className="text-sm text-gray-500">Countries</p>
            </div>
          </div>
        )}

        {/* Your Credits */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl shadow-lg p-8 mb-12 text-white">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <p className="text-primary-200 mb-2">Your Earned Credits</p>
              <p className="text-5xl font-bold">{myCredits.toFixed(2)}</p>
              <p className="text-primary-200 mt-2">= {Math.floor(myCredits * 10)} free pages</p>
            </div>
            <div className="text-right">
              <p className="text-primary-200 mb-2">Your Active Nodes</p>
              <p className="text-5xl font-bold">{myNodes.filter(n => n.isOnline).length}</p>
              <p className="text-primary-200 mt-2">of {myNodes.length} total</p>
            </div>
          </div>
        </div>

        {/* How to Contribute */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Download className="w-6 h-6 mr-3 text-primary-600" />
            Start Contributing
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Install the SDK</h3>
              <p className="text-gray-600 text-sm">Run the Merlin Proxy SDK on your computer or server</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Share Bandwidth</h3>
              <p className="text-gray-600 text-sm">Your device helps other users clone websites faster</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Earn Credits</h3>
              <p className="text-gray-600 text-sm">Get credits for free website cloning based on your contribution</p>
            </div>
          </div>

          <div className="mt-8 bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-green-400 font-mono">
                MERLIN_USER_ID=your-id MERLIN_AUTH_TOKEN=your-token npx merlin-proxy-sdk
              </code>
              <button
                onClick={copyInstallCommand}
                className="ml-4 p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Credit Rates</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 0.001 credits per request served</li>
                <li>• 0.01 credits per MB transferred</li>
                <li>• 1.5x bonus for 95%+ success rate</li>
                <li>• 10 credits bonus for registering</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Requirements</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Stable internet connection</li>
                <li>• At least 10 Mbps upload speed</li>
                <li>• Node.js 18+ installed</li>
                <li>• Port 8899 available</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Your Nodes */}
        {myNodes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Server className="w-6 h-6 mr-3 text-primary-600" />
              Your Nodes
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3">Node ID</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Success Rate</th>
                    <th className="pb-3">Requests</th>
                    <th className="pb-3">Data Served</th>
                    <th className="pb-3">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {myNodes.map(node => (
                    <tr key={node.id} className="border-b last:border-0">
                      <td className="py-4 font-mono text-sm">{node.id.substring(0, 8)}...</td>
                      <td className="py-4">{node.country}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          node.isOnline
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {node.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-4">{(node.successRate * 100).toFixed(1)}%</td>
                      <td className="py-4">{node.totalRequests.toLocaleString()}</td>
                      <td className="py-4">{formatBytes(node.bytesServed)}</td>
                      <td className="py-4 font-semibold text-primary-600">{node.creditsEarned.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Award className="w-6 h-6 mr-3 text-yellow-500" />
            Top Contributors
          </h2>

          <div className="space-y-4">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-100 border border-gray-200' :
                  index === 2 ? 'bg-orange-50 border border-orange-200' :
                  'bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-400 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">Contributor #{entry.userId.substring(0, 6)}</p>
                    <p className="text-sm text-gray-500">{entry.totalNodes} nodes • {formatBytes(entry.totalBytesServed)} served</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">{entry.totalCredits.toFixed(2)} credits</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} Merlin Clone. All rights reserved.</p>
          <p className="mt-2 text-sm">Powered by our community of contributors - No third-party proxies!</p>
        </div>
      </footer>
    </div>
  )
}
