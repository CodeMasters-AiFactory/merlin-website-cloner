import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download, Eye, Calendar, FileCode } from 'lucide-react'

interface Template {
  id: string
  name: string
  title: string
  url: string
  directory: string
  createdAt: string
  size: string
  preview?: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hardcoded templates from your clone directories
    const clonedTemplates: Template[] = [
      {
        id: '1',
        name: 'Jeton Payment Platform',
        title: 'One app for all needs. Single account for all your payments.',
        url: 'https://www.jeton.com',
        directory: 'jeton-test-1766508722654',
        createdAt: '2024-12-23',
        size: '~15MB',
        preview: 'Payment platform with wallet features'
      },
      {
        id: '2',
        name: 'David Langarica Portfolio',
        title: 'Freelance Web Developer & UX/UI Designer',
        url: 'https://www.davidlangarica.dev',
        directory: 'template2-test-1766519307381',
        createdAt: '2024-12-23',
        size: '~12MB',
        preview: 'Award-winning Next.js portfolio with 3D design'
      },
      {
        id: '3',
        name: 'Formless',
        title: 'SHARE Protocol - Illuminating true human purpose',
        url: 'https://formless.xyz',
        directory: 'formless-test-1766556795679',
        createdAt: '2024-12-24',
        size: '~8MB',
        preview: 'Technology platform for SHARE Protocol'
      },
      {
        id: '4',
        name: 'Osmo Supply',
        title: 'Dev Toolkit Built to Flex',
        url: 'https://www.osmo.supply',
        directory: 'osmo-learning-test-1766511899724',
        createdAt: '2024-12-23',
        size: '~10MB',
        preview: 'Webflow & HTML resources vault for creative developers'
      },
      {
        id: '5',
        name: 'Accounting Firms',
        title: 'Accounting Firms Test Clone',
        url: 'Various',
        directory: 'accounting-firms-test-1766491186617',
        createdAt: '2024-12-23',
        size: '~5MB',
        preview: 'Professional accounting website clone'
      }
    ]

    setTemplates(clonedTemplates)
    setLoading(false)
  }, [])

  const openTemplate = (directory: string) => {
    // Open the local clone in a new window
    const fullPath = `file:///${window.location.pathname.split('/').slice(0, -1).join('/')}/../../${directory}/index.html`
    window.open(fullPath, '_blank')
  }

  const viewInBrowser = (directory: string) => {
    // Open via backend server (works anywhere!)
    const url = `http://localhost:3000/clones/${directory}/index.html`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-bold text-white">My Templates</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Cloned Website Templates</h2>
          <p className="text-purple-200">Browse and preview your cloned websites offline</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-purple-200 mt-4">Loading templates...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:border-purple-400 transition-all hover:scale-105"
              >
                {/* Template Preview Area */}
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 h-48 flex items-center justify-center">
                  <FileCode className="w-20 h-20 text-white/50" />
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
                  <p className="text-purple-200 text-sm mb-4 line-clamp-2">{template.title}</p>

                  {template.preview && (
                    <p className="text-purple-300 text-xs mb-4 italic">{template.preview}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-purple-300 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{template.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{template.size}</span>
                    </div>
                  </div>

                  <div className="text-xs text-purple-400 mb-4 font-mono bg-black/30 p-2 rounded">
                    {template.directory}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewInBrowser(template.directory)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <a
                      href={template.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Original</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 bg-purple-900/30 backdrop-blur-lg rounded-xl border border-purple-400/30 p-6">
          <h3 className="text-lg font-bold text-white mb-2">📂 How to Access Templates</h3>
          <div className="text-purple-200 space-y-2 text-sm">
            <p><strong>Option 1 (File Path):</strong> Navigate to your project directory and open:</p>
            <code className="block bg-black/40 p-2 rounded text-purple-300 font-mono">
              C:\Cursor Projects\Merlin website clone\[template-directory]\index.html
            </code>

            <p className="mt-4"><strong>Option 2 (Browser):</strong> Click "View" button to get the file path, then:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open your browser</li>
              <li>Press Ctrl+O (or File → Open)</li>
              <li>Navigate to the template directory</li>
              <li>Open index.html</li>
            </ol>

            <p className="mt-4"><strong>All templates are 100% offline and functional!</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
