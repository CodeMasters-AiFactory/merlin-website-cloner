import { Plus, History, Download, Zap } from 'lucide-react'

interface QuickActionsProps {
  onNewClone: () => void
  recentTemplates?: Array<{
    id: string
    hostname: string
    favicon?: string
  }>
}

export function QuickActions({ onNewClone, recentTemplates = [] }: QuickActionsProps) {
  return (
    <div className="card-glass p-6">
      <h3 className="text-lg font-semibold text-dark-100 mb-4">Quick Actions</h3>

      {/* Main CTA Button */}
      <button
        onClick={onNewClone}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl
                   bg-gradient-to-r from-primary-600 to-primary-700
                   hover:from-primary-500 hover:to-primary-600
                   text-white font-semibold text-lg
                   transition-all duration-300
                   hover:shadow-glow-md
                   group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        <span>New Clone</span>
        <Zap className="w-5 h-5 text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Keyboard shortcut hint */}
      <p className="text-center text-xs text-dark-500 mt-2">
        Press <kbd className="px-1.5 py-0.5 bg-dark-700 rounded text-dark-400">N</kbd> to start a new clone
      </p>

      {/* Recent Templates */}
      {recentTemplates.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-dark-500" />
            <h4 className="text-sm font-medium text-dark-400">Recent Templates</h4>
          </div>
          <div className="space-y-2">
            {recentTemplates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg
                           bg-dark-800/50 hover:bg-dark-700
                           border border-dark-700 hover:border-primary-700
                           transition-all duration-200 group"
              >
                {template.favicon ? (
                  <img
                    src={template.favicon}
                    alt=""
                    className="w-6 h-6 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-dark-600 flex items-center justify-center">
                    <span className="text-xs text-dark-400">
                      {template.hostname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-dark-300 group-hover:text-dark-100 truncate flex-1 text-left">
                  {template.hostname}
                </span>
                <Download className="w-4 h-4 text-dark-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="mt-6 p-4 rounded-lg bg-primary-900/20 border border-primary-800/30">
        <h4 className="text-sm font-medium text-primary-400 mb-2">Pro Tip</h4>
        <p className="text-xs text-dark-400 leading-relaxed">
          Use the stealth mode for websites with anti-bot protection.
          Enable it in the clone settings for better success rates.
        </p>
      </div>
    </div>
  )
}

export default QuickActions
