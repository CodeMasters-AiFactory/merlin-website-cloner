import { Globe, Zap, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Docs() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="flex items-center space-x-2">
            <Globe className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">Merlin Clone</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Documentation</h1>

          <div className="space-y-8">
            <section className="card">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
              <div className="prose prose-lg">
                <h3>Quick Start</h3>
                <p>Clone your first website in 3 simple steps:</p>
                <ol>
                  <li>Sign up for a free account</li>
                  <li>Enter the website URL you want to clone</li>
                  <li>Download your complete offline backup</li>
                </ol>

                <h3>API Usage</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
{`POST /api/clone
{
  "url": "https://example.com",
  "options": {
    "maxPages": 100,
    "maxDepth": 5,
    "exportFormat": "zip"
  }
}`}
                </pre>
              </div>
            </section>

            <section className="card">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Zap className="w-8 h-8 text-primary-600 mb-2" />
                  <h3 className="font-semibold text-lg mb-2">Speed</h3>
                  <p className="text-gray-600">
                    50 pages in under 30 seconds with parallel processing.
                  </p>
                </div>
                <div>
                  <Shield className="w-8 h-8 text-primary-600 mb-2" />
                  <h3 className="font-semibold text-lg mb-2">Cloudflare Bypass</h3>
                  <p className="text-gray-600">
                    Works on 95%+ of websites including protected sites.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

