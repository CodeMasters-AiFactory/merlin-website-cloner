import { ArrowRight, Check, Zap, Shield, Globe, Download, Code, BarChart3, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed relative" style={{ backgroundImage: "url('/images/merlin-wizard.jpg')" }}>
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Merlin Clone Wizard</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/pricing" className="text-gray-200 hover:text-primary-400 transition-colors">Pricing</Link>
              <Link to="/docs" className="text-gray-200 hover:text-primary-400 transition-colors">Documentation</Link>
              <Link to="/login" className="text-gray-200 hover:text-primary-400 transition-colors">Login</Link>
              <Link to="/signup" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-primary-600/80 text-white rounded-full text-sm font-semibold mb-6">
            <Star className="w-4 h-4 mr-2" />
            World's #1 Website Cloner
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Clone Any Website
            <br />
            <span className="text-primary-400">100% Offline Ready</span>
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Create complete, fully-functional offline backups of any website.
            Works on 95%+ of websites including Cloudflare-protected sites.
            When your ISP crashes, your data is safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/signup" className="btn-primary text-lg px-8 py-4 flex items-center">
              Start Cloning Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link to="/dashboard" className="bg-white/20 backdrop-blur text-white border border-white/30 text-lg px-8 py-4 rounded-lg font-semibold hover:bg-white/30 transition-colors">
              Try Demo
            </Link>
          </div>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-300">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-2" />
              No Credit Card
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-2" />
              14-Day Free Trial
            </div>
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-2" />
              Cancel Anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Everything You Need for Complete Website Backup
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Built for perfection. Every feature designed to ensure nothing is missed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-black/50 transition-all">
            <div className="w-12 h-12 bg-primary-600/30 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Lightning Fast</h3>
            <p className="text-gray-300">
              50 pages in under 30 seconds. 14x faster than competitors with parallel processing.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-black/50 transition-all">
            <div className="w-12 h-12 bg-primary-600/30 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Cloudflare Bypass</h3>
            <p className="text-gray-300">
              Works on 95%+ of websites including Cloudflare-protected sites. Level 1-3 challenge solving.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-black/50 transition-all">
            <div className="w-12 h-12 bg-primary-600/30 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Complete Asset Capture</h3>
            <p className="text-gray-300">
              Fonts, videos, audio, icons, SVG, PDFs - everything. Nothing is missed.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-black/50 transition-all">
            <div className="w-12 h-12 bg-primary-600/30 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">SPA Support</h3>
            <p className="text-gray-300">
              React, Vue, Angular, Next.js, Nuxt - all frameworks supported with route discovery.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-black/50 transition-all">
            <div className="w-12 h-12 bg-primary-600/30 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">100% Offline Ready</h3>
            <p className="text-gray-300">
              All links rewritten, all assets localized. Works perfectly without internet connection.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-black/50 transition-all">
            <div className="w-12 h-12 bg-primary-600/30 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Auto Verification</h3>
            <p className="text-gray-300">
              Automated testing ensures everything works before you need it. Know what's broken.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary-600/80 backdrop-blur-md text-white py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">95%+</div>
              <div className="text-primary-100">Success Rate</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">14x</div>
              <div className="text-primary-100">Faster</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-primary-100">Offline Ready</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">120%</div>
              <div className="text-primary-100">vs Competition</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">How It Works</h2>
          <p className="text-xl text-gray-300">Three simple steps to complete website backup</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/50">
              1
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Enter URL</h3>
            <p className="text-gray-300">
              Simply paste the website URL you want to clone. Our system handles everything else.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/50">
              2
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Automatic Cloning</h3>
            <p className="text-gray-300">
              We crawl, capture, and fix everything. Assets, links, JavaScript - all preserved.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/50">
              3
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Download & Use</h3>
            <p className="text-gray-300">
              Get your complete backup as ZIP or run locally. 100% functional offline.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="bg-gradient-to-br from-primary-600/90 to-primary-800/90 backdrop-blur-md rounded-2xl text-white text-center py-16 border border-white/10">
          <h2 className="text-4xl font-bold mb-4">Ready to Clone Your First Website?</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust Merlin Clone for complete website backups.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link to="/pricing" className="bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/90 backdrop-blur-md text-gray-300 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Merlin Clone Wizard</span>
              </div>
              <p className="text-sm">
                World's #1 website cloner for complete offline backups.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/acceptable-use" className="hover:text-white transition-colors">Acceptable Use</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">DMCA</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Merlin Clone Wizard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

