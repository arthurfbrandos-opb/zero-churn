'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { IntegrationStatusIcon } from '@/components/integracoes/integration-status-icon'
import { getNpsClassification } from '@/lib/nps-utils'
import { sortClientsByRisk } from '@/lib/client-stats'
import type { Client, ChurnRisk } from '@/types'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

function getTimeAsClient(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (months < 1) return 'Novo'
  if (months === 1) return '1 mês'
  return `${months}m`
}

function getDaysToRenew(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

const riskFilters: { key: ChurnRisk | 'all'; label: string; dot?: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'high', label: 'Alto', dot: 'bg-red-500' },
  { key: 'medium', label: 'Médio', dot: 'bg-yellow-500' },
  { key: 'low', label: 'Baixo', dot: 'bg-emerald-500' },
  { key: 'observacao', label: 'Obs.', dot: 'bg-zinc-500' },
]

interface ClientListSectionProps {
  clients: Client[]
}

export function ClientListSection({ clients }: ClientListSectionProps) {
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<ChurnRisk | 'all'>('all')

  const sorted = useMemo(() => sortClientsByRisk(clients), [clients])

  const filtered = useMemo(() => {
    let list = sorted
    if (riskFilter !== 'all') {
      list = list.filter(c => (c.healthScore?.churnRisk ?? 'observacao') === riskFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.segment?.toLowerCase().includes(q)
      )
    }
    return list
  }, [sorted, riskFilter, search])

  const riskBorderColor = (risk: ChurnRisk) =>
    risk === 'high' ? 'border-l-red-500'
    : risk === 'medium' ? 'border-l-yellow-500'
    : risk === 'low' ? 'border-l-emerald-500'
    : 'border-l-zinc-600'

  return (
    <div>
      {/* Header with search + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-zinc-300 text-sm font-semibold whitespace-nowrap">Seus clientes</h3>
          <span className="text-zinc-600 text-xs">({filtered.length})</span>
        </div>

        {/* Risk filter pills */}
        <div className="flex items-center gap-1.5">
          {riskFilters.map(({ key, label, dot }) => (
            <button
              key={key}
              onClick={() => setRiskFilter(key)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                riskFilter === key
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              )}
            >
              {dot && <div className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-zinc-900/60 border border-zinc-800/40 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
            </button>
          )}
        </div>
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(client => {
            const risk: ChurnRisk = client.healthScore?.churnRisk ?? 'observacao'
            const score = client.healthScore?.scoreTotal
            const isObservacao = !client.healthScore
            const daysToRenew = getDaysToRenew(client.contractEndDate ?? '')
            const npsScore = client.lastFormSubmission?.npsScore
            const npsClass = npsScore !== undefined ? getNpsClassification(npsScore) : null
            const payBadge = client.paymentStatus === 'inadimplente'
              ? { label: 'Inadimplente', cls: 'text-red-400 border-red-500/30 bg-red-500/8' }
              : client.paymentStatus === 'vencendo'
              ? { label: 'Vencendo', cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8' }
              : null

            return (
              <Link key={client.id} href={`/clientes/${client.id}`}>
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-l-[3px] bg-zinc-900/60 border border-zinc-800/40 hover:bg-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200 cursor-pointer group',
                  riskBorderColor(risk)
                )}>
                  {/* Score gauge */}
                  <div className="shrink-0">
                    {isObservacao ? (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-zinc-500" />
                      </div>
                    ) : (
                      <ScoreGauge score={score!} size="sm" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <p className="text-zinc-200 text-sm font-medium truncate">{client.name}</p>
                      <RiskBadge risk={risk} size="sm" />
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border font-medium',
                        client.clientType === 'mrr'
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-blue-400 border-blue-500/30 bg-blue-500/10')}>
                        {client.clientType.toUpperCase()}
                      </Badge>
                      {npsClass && (
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border font-medium', npsClass.color, npsClass.bg, npsClass.border)}>
                          NPS {npsScore}
                        </Badge>
                      )}
                      {payBadge && (
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border font-medium', payBadge.cls)}>
                          {payBadge.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <span>{client.segment}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{getTimeAsClient(client.contractStartDate ?? client.createdAt)}</span>
                      {client.clientType === 'tcv' && daysToRenew > 0 && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className={daysToRenew <= 15 ? 'text-red-400 font-medium' : 'text-blue-400'}>
                            {daysToRenew}d restantes
                          </span>
                        </>
                      )}
                      {client.clientType === 'mrr' && daysToRenew <= 60 && daysToRenew > 0 && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className={daysToRenew <= 20 ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                            Renova {daysToRenew}d
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Value + integrations (hidden on mobile) */}
                  <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                    {client.clientType === 'mrr' ? (
                      <p className="text-zinc-300 text-sm font-semibold">
                        {formatCurrency(client.contractValue ?? 0)}
                        <span className="text-zinc-600 font-normal text-xs">/mês</span>
                      </p>
                    ) : (
                      <p className="text-blue-400 text-sm font-semibold">
                        {formatCurrency(client.totalProjectValue ?? 0)}
                      </p>
                    )}
                    <div className="flex items-center gap-1">
                      {client.integrations.map(int => (
                        <IntegrationStatusIcon key={int.id} type={int.type} status={int.status} />
                      ))}
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
