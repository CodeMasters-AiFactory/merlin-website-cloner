import { Globe } from 'lucide-react'
import { Link } from 'react-router-dom'

interface FooterProps {
  minimal?: boolean
}

export default function Footer({ minimal = false }: FooterProps) {
  if (minimal) {
    return (
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Merlin</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">&copy; {new Date().getFullYear()} Merlin. All rights reserved.</p>
          <div className="flex justify-center space-x-6 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-gray-900 transition-colors">Terms</Link>
            <Link to="/privacy" className="text-gray-500 hover:text-gray-900 transition-colors">Privacy</Link>
            <Link to="/acceptable-use" className="text-gray-500 hover:text-gray-900 transition-colors">Acceptable Use</Link>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-gray-200 py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Merlin</span>
            </div>
            <p className="text-gray-500 text-sm">
              The modern way to clone and backup websites.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link to="/docs" className="hover:text-gray-900 transition-colors">Documentation</Link></li>
              <li><Link to="/templates" className="hover:text-gray-900 transition-colors">Templates</Link></li>
              <li><Link to="/proxy-network" className="hover:text-gray-900 transition-colors">Earn Credits</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Features</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><Link to="/disaster-recovery" className="hover:text-gray-900 transition-colors">Disaster Recovery</Link></li>
              <li><Link to="/archives" className="hover:text-gray-900 transition-colors">Archive Browser</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
              <li><Link to="/acceptable-use" className="hover:text-gray-900 transition-colors">Acceptable Use</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Merlin. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
