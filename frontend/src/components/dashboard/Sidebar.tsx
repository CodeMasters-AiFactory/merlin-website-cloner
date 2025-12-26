import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
  premium?: boolean
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Templates', href: '/templates', icon: FolderOpen },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, premium: true },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const secondaryNav: NavItem[] = [
  { name: 'Credits & Billing', href: '/pricing', icon: CreditCard },
  { name: 'Help & Docs', href: '/docs', icon: HelpCircle },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)

  const isActive = (href: string) => location.pathname === href

  const showLabels = !collapsed || isHovered

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-40
        bg-dark-900 border-r border-dark-800
        flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed && !isHovered ? 'w-20' : 'w-64'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-dark-800">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-md transition-shadow">
            <Globe className="w-6 h-6 text-white" />
          </div>
          {showLabels && (
            <div className="flex flex-col animate-fade-in">
              <span className="font-bold text-dark-100 text-lg leading-tight">Merlin</span>
              <span className="text-xs text-primary-400 leading-tight">Clone Wizard</span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
        <div className="mb-2 px-3">
          {showLabels && (
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
              Menu
            </span>
          )}
        </div>

        {mainNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 group relative
                ${active
                  ? 'bg-primary-900/40 text-primary-400 border-l-2 border-primary-500 ml-0 pl-[10px]'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'
                }
              `}
              title={collapsed && !isHovered ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary-400' : ''}`} />
              {showLabels && (
                <span className="font-medium animate-fade-in">{item.name}</span>
              )}
              {item.premium && showLabels && (
                <Sparkles className="w-4 h-4 text-gold-400 ml-auto" />
              )}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full" />
              )}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="my-6 border-t border-dark-800" />

        {/* Secondary Navigation */}
        <div className="mb-2 px-3">
          {showLabels && (
            <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
              Account
            </span>
          )}
        </div>

        {secondaryNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${active
                  ? 'bg-primary-900/40 text-primary-400'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'
                }
              `}
              title={collapsed && !isHovered ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showLabels && (
                <span className="font-medium animate-fade-in">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-dark-800">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                     text-dark-500 hover:text-dark-300 hover:bg-dark-800
                     transition-all duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Pro Upgrade Card */}
      {showLabels && (
        <div className="p-4 m-3 rounded-xl bg-gradient-to-br from-primary-900/50 to-dark-800 border border-primary-800/50 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <span className="font-semibold text-dark-100">Go Pro</span>
          </div>
          <p className="text-xs text-dark-400 mb-3">
            Unlock unlimited clones and premium features
          </p>
          <Link
            to="/pricing"
            className="block w-full text-center py-2 px-4 rounded-lg
                       bg-gradient-to-r from-primary-600 to-primary-700
                       hover:from-primary-500 hover:to-primary-600
                       text-white text-sm font-semibold
                       transition-all duration-200 hover:shadow-glow-sm"
          >
            Upgrade Now
          </Link>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
