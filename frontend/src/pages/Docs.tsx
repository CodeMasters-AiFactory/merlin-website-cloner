import { Zap, Shield, Download, Code, BookOpen, Terminal, Settings, Layers, ArrowRight, Copy, Check, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Navbar, Footer } from '../components/layout'

export default function Docs() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const quickStartCode = `curl -X POST https://api.merlin.dev/v1/clone \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": {
      "maxPages": 100,
      "maxDepth": 5,
      "exportFormat": "zip"
    }
  }'`

  const responseCode = `{
  "id": "clone_abc123",
  "status": "processing",
  "url": "https://example.com",
  "progress": 0,
  "estimatedTime": "30s",
  "webhookUrl": null
}`

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: BookOpen },
    { id: 'api-reference', title: 'API Reference', icon: Terminal },
    { id: 'features', title: 'Features', icon: Layers },
    { id: 'configuration', title: 'Configuration', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar transparent />

      {/* Hero Section */}
      <section className="pt-16 pb-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4 mr-2" />
              Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Learn how to use Merlin
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Everything you need to clone websites, build backups, and integrate with our API.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                <section.icon className="w-4 h-4" />
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto space-y-16">

          {/* Getting Started */}
          <section id="getting-started">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h3>
              <p className="text-gray-600 mb-6">Clone your first website in 3 simple steps:</p>

              <div className="space-y-4">
                {[
                  { step: '1', title: 'Sign up for a free account', desc: 'Get 5 free clones to try Merlin' },
                  { step: '2', title: 'Enter the website URL', desc: 'Paste any URL you want to clone' },
                  { step: '3', title: 'Download your backup', desc: 'Get a complete offline copy as ZIP' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-violet-600 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Try Demo
                </Link>
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section id="api-reference">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Terminal className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">API Reference</h2>
            </div>

            <div className="space-y-6">
              {/* Clone endpoint */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">POST</span>
                    <code className="text-gray-300 text-sm">/v1/clone</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(quickStartCode, 'quickstart')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copiedCode === 'quickstart' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                  <code>{quickStartCode}</code>
                </pre>
              </div>

              {/* Response */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                  <span className="text-gray-400 text-sm">Response</span>
                  <button
                    onClick={() => copyToClipboard(responseCode, 'response')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copiedCode === 'response' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                  <code>{responseCode}</code>
                </pre>
              </div>

              {/* Parameters table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-900">Request Parameters</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { name: 'url', type: 'string', required: true, desc: 'The URL of the website to clone' },
                    { name: 'options.maxPages', type: 'number', required: false, desc: 'Maximum pages to clone (default: 100)' },
                    { name: 'options.maxDepth', type: 'number', required: false, desc: 'Maximum crawl depth (default: 5)' },
                    { name: 'options.exportFormat', type: 'string', required: false, desc: 'Output format: zip, warc, or folder' },
                    { name: 'webhookUrl', type: 'string', required: false, desc: 'URL to notify when clone completes' },
                  ].map((param) => (
                    <div key={param.name} className="px-6 py-4 flex items-start gap-4">
                      <div className="min-w-[160px]">
                        <code className="text-sm text-violet-600 font-medium">{param.name}</code>
                        {param.required && (
                          <span className="ml-2 text-xs text-red-500 font-medium">required</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{param.type}</span>
                        <p className="text-sm text-gray-600 mt-1">{param.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section id="features">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Features</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Zap,
                  title: 'Lightning Fast',
                  description: '50 pages in under 30 seconds with parallel processing. 14x faster than traditional tools.',
                  color: 'bg-amber-100 text-amber-600',
                },
                {
                  icon: Shield,
                  title: 'Cloudflare Bypass',
                  description: 'Works on 95%+ of protected sites including Cloudflare, Akamai, and DataDome.',
                  color: 'bg-green-100 text-green-600',
                },
                {
                  icon: Download,
                  title: 'Complete Capture',
                  description: 'All assets included: HTML, CSS, JS, fonts, images, videos, and SVGs.',
                  color: 'bg-blue-100 text-blue-600',
                },
                {
                  icon: Code,
                  title: 'SPA Support',
                  description: 'Full JavaScript rendering for React, Vue, Angular, Next.js, and more.',
                  color: 'bg-purple-100 text-purple-600',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white"
                >
                  <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Configuration */}
          <section id="configuration">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-pink-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone Options</h3>
              <div className="space-y-4">
                {[
                  { option: 'JavaScript Rendering', desc: 'Enable for SPAs and dynamic content', default: 'Auto-detect' },
                  { option: 'Asset Inlining', desc: 'Embed CSS/JS directly in HTML', default: 'Off' },
                  { option: 'Link Rewriting', desc: 'Convert URLs for offline browsing', default: 'On' },
                  { option: 'Proxy Mode', desc: 'Use rotating proxies for protected sites', default: 'Auto' },
                  { option: 'Verification', desc: 'Auto-verify clone completeness', default: 'On' },
                ].map((config, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <h4 className="font-medium text-gray-900">{config.option}</h4>
                      <p className="text-sm text-gray-500">{config.desc}</p>
                    </div>
                    <span className="text-sm text-violet-600 bg-violet-50 px-3 py-1 rounded-lg font-medium">
                      {config.default}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Need Help? */}
          <section className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Need Help?</h3>
            <p className="text-violet-100 mb-6 max-w-xl mx-auto">
              Our support team is here to help you get the most out of Merlin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@merlin.dev"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-violet-600 rounded-xl font-semibold hover:bg-violet-50 transition-colors"
              >
                Contact Support
              </a>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-400 transition-colors"
              >
                View Plans
              </Link>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  )
}
