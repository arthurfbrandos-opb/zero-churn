'use client'

import { cn } from '@/lib/utils'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import type { Client } from '@/types'
import { getAverageHealthScore, getRiskCounts } from '@/lib/client-stats'

interface PortfolioHealthHeroProps {
  clients: Client[]
}

const riskItems = [
  { key: 'high' as const, label: 'Alto', dot: 'bg-red-500', text: 'text-red-400' },
  { key: 'medium' as const, label: 'Médio', dot: 'bg-yellow-500', text: 'text-yellow-400' },
  { key: 'low' as const, label: 'Baixo', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  { key: 'observacao' as const, label: 'Obs.', dot: 'bg-zinc-600', text: 'text-zinc-500' },
]

export function PortfolioHealthHero({ clients }: PortfolioHealthHeroProps) {
  const avgScore = getAverageHealthScore(clients)
  const riskCounts = getRiskCounts(clients)
  const totalWithScore = clients.filter(c => c.healthScore).length

  const heroGlow = avgScore >= 70 ? 'glow-hero-healthy'
    : avgScore >= 45 ? 'glow-hero-warning'
    : avgScore > 0 ? 'glow-hero-danger'
    : ''

  return (
    <div className={cn(
      'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-5 lg:p-6 h-full flex flex-col',
      heroGlow
    )}>
      {/* Label */}
      <p className="text-zinc-500 text-xs font-medium mb-4">Saúde da Carteira</p>

      {/* Gauge + Score */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <ScoreGauge score={avgScore} size="lg" />
        <p className="text-zinc-500 text-xs mt-2">
          {totalWithScore} de {clients.length} analisados
        </p>
      </div>

      {/* Risk distribution bar */}
      <div className="mt-4 space-y-3">
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {riskItems.map(({ key, dot }) => {
            const pct = clients.length > 0 ? (riskCounts[key] / clients.length) * 100 : 0
            if (pct === 0) return null
            return (
              <div
                key={key}
                className={cn('rounded-full transition-all duration-500', dot)}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>

        {/* Risk legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {riskItems.map(({ key, label, dot, text }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', dot)} />
                <span className="text-zinc-500 text-xs">{label}</span>
              </div>
              <span className={cn('text-xs font-bold tabular-nums', text)}>
                {riskCounts[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
