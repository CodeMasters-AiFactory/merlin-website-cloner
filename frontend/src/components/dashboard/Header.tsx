import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  CreditCard,
  ChevronDown,
  Command,
  Menu,
  X,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const navigate = useNavigate()

  // Get user info from token
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ name: payload.name || 'User', email: payload.email })
      } catch {
        setUser({ name: 'User', email: '' })
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-menu]')) {
        setShowUserMenu(false)
        setShowNotifications(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Keyboard shortcut for search (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-md border-b border-dark-800 sticky top-0 z-30">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-4 flex-1">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`w-4 h-4 ${searchFocused ? 'text-primary-400' : 'text-dark-500'}`} />
            </div>
            <input
              id="global-search"
              type="text"
              placeholder="Search clones..."
              className={`
                w-full pl-10 pr-12 py-2 rounded-lg
                bg-dark-800/50 border
                text-dark-100 placeholder-dark-500
                text-sm transition-all duration-200
                ${searchFocused
                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-dark-700 hover:border-dark-600'
                }
              `}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-xs text-dark-500 bg-dark-700 rounded">
                <Command className="w-3 h-3" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all duration-200"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="relative" data-menu>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all duration-200 relative"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-dark-800 border border-dark-700 shadow-xl animate-fade-in">
                <div className="p-4 border-b border-dark-700">
                  <h3 className="font-semibold text-dark-100">Notifications</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 text-sm">✓</span>
                    </div>
                    <div>
                      <p className="text-sm text-dark-100">Clone completed</p>
                      <p className="text-xs text-dark-500">www.jeton.com finished cloning</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-400 text-sm">★</span>
                    </div>
                    <div>
                      <p className="text-sm text-dark-100">Welcome to Merlin!</p>
                      <p className="text-xs text-dark-500">Start by cloning your first website</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-dark-700">
                  <button className="w-full text-center text-sm text-primary-400 hover:text-primary-300">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" data-menu>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-dark-800 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:block text-sm font-medium text-dark-200">
                {user?.name || 'User'}
              </span>
              <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-dark-800 border border-dark-700 shadow-xl animate-fade-in">
                <div className="p-4 border-b border-dark-700">
                  <p className="font-semibold text-dark-100">{user?.name || 'User'}</p>
                  <p className="text-sm text-dark-500 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </Link>
                  <Link
                    to="/pricing"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm">Billing</span>
                  </Link>
                </div>
                <div className="p-2 border-t border-dark-700">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
