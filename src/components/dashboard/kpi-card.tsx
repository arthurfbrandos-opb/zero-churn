'use client'

import { cn } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/animated-number'

interface KpiCardProps {
  label: string
  value: number
  formatFn: (n: number) => string
  sublabel: string
  icon: React.ReactNode
  color: 'emerald' | 'red' | 'blue' | 'yellow'
  glowActive?: boolean
}

const colorClasses = {
  emerald: {
    value: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    hover: 'hover:border-emerald-500/20 hover:glow-emerald',
    active: 'border-emerald-500/20 glow-emerald',
  },
  red: {
    value: 'text-red-400',
    iconBg: 'bg-red-500/10',
    hover: 'hover:border-red-500/20 hover:glow-red',
    active: 'border-red-500/20 glow-red bg-red-500/5',
  },
  blue: {
    value: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    hover: 'hover:border-blue-500/20 hover:glow-blue',
    active: 'border-blue-500/20 glow-blue',
  },
  yellow: {
    value: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
    hover: 'hover:border-yellow-500/20 hover:glow-yellow',
    active: 'border-yellow-500/20 glow-yellow',
  },
}

export function KpiCard({ label, value, formatFn, sublabel, icon, color, glowActive }: KpiCardProps) {
  const c = colorClasses[color]

  return (
    <div className={cn(
      'bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-4 transition-all duration-300',
      glowActive ? c.active : c.hover
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', c.iconBg)}>
          {icon}
        </div>
        <span className="text-zinc-500 text-xs font-medium">{label}</span>
      </div>
      <p className={cn('text-xl font-bold tracking-tight', c.value)}>
        <AnimatedNumber value={value} formatFn={formatFn} />
      </p>
      <p className="text-zinc-600 text-xs mt-0.5">{sublabel}</p>
    </div>
  )
}
