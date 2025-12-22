import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, ArrowRight, Check, AlertTriangle } from 'lucide-react'
import api from '../utils/api'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Acceptable Use Policy')
      return
    }

    try {
      const response = await api.post('/auth/signup', { name, email, password })
      localStorage.setItem('token', response.data.token)
      navigate('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">Merlin Clone</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Start cloning websites in seconds</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input"
                placeholder="••••••••"
              />
              <p className="mt-2 text-sm text-gray-500">
                Must be at least 8 characters
              </p>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-primary-900 mb-2">What you get:</p>
              <ul className="space-y-1 text-sm text-primary-700">
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  14-day free trial
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  No credit card required
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Cancel anytime
                </li>
              </ul>
            </div>

            {/* Legal Agreement Checkbox */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-yellow-800">
                      I certify that I have <strong>legal authority</strong> to clone any websites I submit to this service.
                      I have read and agree to the{' '}
                      <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-semibold underline" target="_blank">
                        Terms of Service
                      </Link>
                      ,{' '}
                      <Link to="/privacy" className="text-primary-600 hover:text-primary-700 font-semibold underline" target="_blank">
                        Privacy Policy
                      </Link>
                      , and{' '}
                      <Link to="/acceptable-use" className="text-primary-600 hover:text-primary-700 font-semibold underline" target="_blank">
                        Acceptable Use Policy
                      </Link>
                      . I accept full responsibility for my use of this service.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center" disabled={!agreedToTerms}>
              Create Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

