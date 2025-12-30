import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, ArrowRight, Check, AlertTriangle, User, Mail, Lock } from 'lucide-react'
import api from '../utils/api'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Acceptable Use Policy')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post('/auth/signup', { name, email, password })
      localStorage.setItem('token', response.data.token)
      navigate('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Merlin</span>
          </Link>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-gray-600 mb-8">Start cloning websites in seconds</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1.5 text-sm text-gray-500">Must be at least 8 characters</p>
            </div>

            {/* Benefits */}
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-violet-900 mb-2">What you get:</p>
              <ul className="space-y-1.5 text-sm text-violet-700">
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-violet-500" />
                  14-day free trial
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-violet-500" />
                  No credit card required
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-violet-500" />
                  Cancel anytime
                </li>
              </ul>
            </div>

            {/* Legal Agreement */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 mr-3 h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-amber-800">
                    I certify that I have <strong>legal authority</strong> to clone any websites I submit.
                    I agree to the{' '}
                    <Link to="/terms" className="text-violet-600 hover:text-violet-700 font-semibold underline" target="_blank">
                      Terms
                    </Link>
                    ,{' '}
                    <Link to="/privacy" className="text-violet-600 hover:text-violet-700 font-semibold underline" target="_blank">
                      Privacy
                    </Link>
                    , and{' '}
                    <Link to="/acceptable-use" className="text-violet-600 hover:text-violet-700 font-semibold underline" target="_blank">
                      Acceptable Use
                    </Link>
                    .
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={!agreedToTerms || isLoading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 hover:text-violet-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-violet-50 to-purple-50 items-center justify-center p-12">
        <div className="max-w-lg">
          <img
            src="/images/login-illustration.jpg"
            alt="Get started"
            className="w-full h-auto rounded-2xl shadow-2xl shadow-violet-500/20"
          />
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join thousands of users</h2>
            <p className="text-gray-600">
              Clone websites with 95%+ success rate, even on protected sites.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
