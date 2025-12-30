import { ArrowRight, Check, Zap, Shield, Globe, Download, Code, BarChart3, Star, Play, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Navbar, Footer } from '../components/layout'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar transparent />

      {/* Hero Section */}
      <section className="pt-20 pb-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-violet-500 rounded-full mr-2"></span>
              95%+ success rate on protected sites
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Clone any website
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">in seconds</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Create perfect offline backups of any website. Works on Cloudflare-protected sites,
              SPAs, and more. Download as ZIP and browse offline.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center bg-gray-900 text-white text-lg px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-sm"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center bg-white text-gray-700 text-lg px-8 py-4 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Play className="mr-2 w-5 h-5" />
                View Demo
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center flex-wrap gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-100 to-purple-100 rounded-3xl blur-2xl opacity-60" />
            <img
              src="/images/hero-clone-concept.jpg"
              alt="Website cloning concept"
              className="relative w-full h-auto rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-200"
            />
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-16 border-y border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 mb-8">Trusted by teams at leading companies</p>
          <div className="flex justify-center items-center gap-12 flex-wrap opacity-60">
            {['Shopify', 'Notion', 'Stripe', 'Vercel', 'Linear'].map((company) => (
              <div key={company} className="text-xl font-bold text-gray-400">{company}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to clone websites
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features that make website cloning simple, fast, and reliable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Clone 50 pages in under 30 seconds. 14x faster than traditional methods.',
                color: 'bg-amber-100 text-amber-600',
              },
              {
                icon: Shield,
                title: 'Bypass Protection',
                description: 'Works on 95%+ of Cloudflare, Akamai, and other protection systems.',
                color: 'bg-green-100 text-green-600',
              },
              {
                icon: Download,
                title: 'Complete Capture',
                description: 'All assets included: fonts, images, videos, SVGs, and more.',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                icon: Code,
                title: 'SPA Support',
                description: 'Full support for React, Vue, Angular, Next.js and other frameworks.',
                color: 'bg-purple-100 text-purple-600',
              },
              {
                icon: Globe,
                title: '100% Offline',
                description: 'All links rewritten for offline browsing. No internet needed.',
                color: 'bg-indigo-100 text-indigo-600',
              },
              {
                icon: BarChart3,
                title: 'Auto Verification',
                description: 'Built-in checks ensure every clone works perfectly.',
                color: 'bg-pink-100 text-pink-600',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-5`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-600">
              Three simple steps to clone any website
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Enter URL',
                description: 'Paste the website URL you want to clone. Merlin analyzes its structure automatically.',
                icon: Copy
              },
              {
                step: '2',
                title: 'Configure',
                description: 'Choose depth, file types, and other options. Or just use smart defaults.',
                icon: Code
              },
              {
                step: '3',
                title: 'Download',
                description: 'Get your complete website backup as a ZIP file. Browse offline instantly.',
                icon: Download
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-white border-2 border-violet-200 text-violet-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: '95%+', label: 'Success Rate' },
              { value: '14x', label: 'Faster Than Competitors' },
              { value: '100K+', label: 'Websites Cloned' },
              { value: '10K+', label: 'Happy Users' },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-amber-400 fill-current" />
            ))}
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-8 leading-relaxed">
            "Merlin saved us countless hours. We needed offline backups of our client sites for
            disaster recovery. It just works, even on complex SPAs."
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
              JD
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">James Davidson</div>
              <div className="text-gray-500 text-sm">CTO at TechCorp</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: 'Free', price: '$0', period: 'forever', features: ['5 clones/month', 'Basic support', '10MB per clone'] },
              { name: 'Pro', price: '$29', period: '/month', features: ['Unlimited clones', 'Priority support', '100MB per clone', 'Cloudflare bypass'], popular: true },
              { name: 'Team', price: '$99', period: '/month', features: ['Everything in Pro', '5 team members', 'API access', 'Custom integrations'] },
            ].map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-2xl ${plan.popular ? 'bg-gray-900 text-white ring-4 ring-violet-500/20' : 'bg-white border border-gray-200'}`}
              >
                {plan.popular && (
                  <div className="inline-block bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={plan.popular ? 'text-gray-400' : 'text-gray-500'}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className={`w-5 h-5 mr-3 ${plan.popular ? 'text-violet-400' : 'text-green-500'}`} />
                      <span className={plan.popular ? 'text-gray-300' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to clone your first website?
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of users who trust Merlin for their website cloning needs.
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
