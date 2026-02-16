import { Badge } from '@/components/ui/badge'
import { ChurnRisk } from '@/types'
import { cn } from '@/lib/utils'

interface RiskBadgeProps {
  risk: ChurnRisk
  size?: 'sm' | 'md'
}

const config: Record<ChurnRisk, { label: string; className: string }> = {
  high:       { label: 'Risco Alto',     className: 'bg-red-500/15 text-red-400 border-red-500/30'       },
  medium:     { label: 'Risco Médio',    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  low:        { label: 'Risco Baixo',    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  observacao: { label: 'Em Observação',  className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'    },
}

export function RiskBadge({ risk, size = 'md' }: RiskBadgeProps) {
  const { label, className } = config[risk]
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        className,
        size === 'sm' ? 'text-xs px-2 py-0' : 'text-xs px-2.5 py-0.5'
      )}
    >
      {label}
    </Badge>
  )
}
