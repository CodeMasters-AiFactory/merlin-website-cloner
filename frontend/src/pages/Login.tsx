import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, ArrowRight } from 'lucide-react'
import api from '../utils/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // PASSWORD-LESS LOGIN: Only send email
      const response = await api.post('/auth/login', { email })
      localStorage.setItem('token', response.data.token)
      navigate('/dashboard')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Login failed')
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Enter your email to sign in (no password required)</p>
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
                Email Address or Username
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="demo or test@example.com"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Try: <code className="bg-gray-100 px-2 py-1 rounded">demo</code> or <code className="bg-gray-100 px-2 py-1 rounded">test@example.com</code>
              </p>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center">
              Sign In
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

