import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Eye, Calendar, FileCode, Download, Layers, Search, ArrowRight } from 'lucide-react'
import { Navbar, Footer } from '../components/layout'

interface Template {
  id: string
  name: string
  title: string
  url: string
  directory: string
  createdAt: string
  size: string
  preview?: string
  category?: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    const clonedTemplates: Template[] = [
      {
        id: '1',
        name: 'Jeton Payment Platform',
        title: 'One app for all needs. Single account for all your payments.',
        url: 'https://www.jeton.com',
        directory: 'jeton-test-1766508722654',
        createdAt: '2024-12-23',
        size: '~15MB',
        preview: 'Payment platform with wallet features',
        category: 'Finance'
      },
      {
        id: '2',
        name: 'David Langarica Portfolio',
        title: 'Freelance Web Developer & UX/UI Designer',
        url: 'https://www.davidlangarica.dev',
        directory: 'template2-test-1766519307381',
        createdAt: '2024-12-23',
        size: '~12MB',
        preview: 'Award-winning Next.js portfolio with 3D design',
        category: 'Portfolio'
      },
      {
        id: '3',
        name: 'Formless',
        title: 'SHARE Protocol - Illuminating true human purpose',
        url: 'https://formless.xyz',
        directory: 'formless-test-1766556795679',
        createdAt: '2024-12-24',
        size: '~8MB',
        preview: 'Technology platform for SHARE Protocol',
        category: 'Technology'
      },
      {
        id: '4',
        name: 'Osmo Supply',
        title: 'Dev Toolkit Built to Flex',
        url: 'https://www.osmo.supply',
        directory: 'osmo-learning-test-1766511899724',
        createdAt: '2024-12-23',
        size: '~10MB',
        preview: 'Webflow & HTML resources vault for creative developers',
        category: 'Technology'
      },
      {
        id: '5',
        name: 'Accounting Firms',
        title: 'Accounting Firms Test Clone',
        url: 'Various',
        directory: 'accounting-firms-test-1766491186617',
        createdAt: '2024-12-23',
        size: '~5MB',
        preview: 'Professional accounting website clone',
        category: 'Business'
      }
    ]

    setTemplates(clonedTemplates)
    setLoading(false)
  }, [])

  const viewInBrowser = (directory: string) => {
    const url = `http://localhost:3000/clones/${directory}/index.html`
    window.open(url, '_blank')
  }

  const categories: string[] = ['all', ...new Set(templates.map(t => t.category).filter((c): c is string => Boolean(c)))]

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar transparent />

      {/* Hero Section */}
      <section className="pt-16 pb-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-sm font-medium mb-6">
              <Layers className="w-4 h-4 mr-2" />
              Template Library
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Website Templates
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Browse pre-cloned templates. View them offline or use them as starting points for your projects.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-20">
              <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No templates found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Template Preview Area */}
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 h-48 flex items-center justify-center relative overflow-hidden">
                    <FileCode className="w-20 h-20 text-white/30" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {template.category && (
                      <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                        {template.category}
                      </span>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.title}</p>

                    {template.preview && (
                      <p className="text-gray-500 text-xs mb-4">{template.preview}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{template.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        <span>{template.size}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => viewInBrowser(template.directory)}
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <a
                        href={template.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Original
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Want to clone your own website?
          </h2>
          <p className="text-gray-600 mb-8">
            Get started with Merlin and create perfect offline backups of any website.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Start Cloning
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
