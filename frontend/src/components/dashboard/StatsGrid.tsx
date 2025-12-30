import { useEffect, useState } from 'react'
import { Globe, CheckCircle, Sparkles, Calendar, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsData {
  totalClones: number
  completedClones: number
  creditsRemaining: number
  thisMonth: number
  lastMonth: number
}

interface StatsGridProps {
  stats: StatsData
  loading?: boolean
}

// Animated counter hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (end === 0) {
      setCount(0)
      return
    }

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return count
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  color,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: number
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color: 'purple' | 'green' | 'gold' | 'blue'
  loading?: boolean
}) {
  const animatedValue = useCountUp(loading ? 0 : value)

  const colorClasses = {
    purple: 'text-violet-600 bg-violet-50',
    green: 'text-emerald-600 bg-emerald-50',
    gold: 'text-amber-600 bg-amber-50',
    blue: 'text-blue-600 bg-blue-50',
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="w-16 h-6 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="mt-4">
          <div className="w-20 h-8 rounded bg-gray-100 animate-pulse mb-2" />
          <div className="w-24 h-4 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-gray-900">
          {animatedValue.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

export function StatsGrid({ stats, loading = false }: StatsGridProps) {
  // Calculate trends
  const monthlyTrend = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(0)
    : '0'
  const monthlyTrendDir = stats.thisMonth >= stats.lastMonth ? 'up' : 'down'

  const successRate = stats.totalClones > 0
    ? Math.round((stats.completedClones / stats.totalClones) * 100)
    : 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Globe}
        label="Total Clones"
        value={stats.totalClones}
        color="purple"
        loading={loading}
      />
      <StatCard
        icon={CheckCircle}
        label="Success Rate"
        value={successRate}
        trend={successRate >= 90 ? 'up' : successRate >= 70 ? 'neutral' : 'down'}
        trendValue={`${successRate}%`}
        color="green"
        loading={loading}
      />
      <StatCard
        icon={Sparkles}
        label="Credits Left"
        value={stats.creditsRemaining}
        color="gold"
        loading={loading}
      />
      <StatCard
        icon={Calendar}
        label="This Month"
        value={stats.thisMonth}
        trend={monthlyTrendDir}
        trendValue={`${monthlyTrend}%`}
        color="blue"
        loading={loading}
      />
    </div>
  )
}

export default StatsGrid
