'use client'

import { RefreshCw, TrendingDown, Layers, Calendar } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import type { Client } from '@/types'
import {
  getTotalMRR,
  getMRRAtRisk,
  getTotalTCVInExecution,
  getMRRClients,
  getTCVClients,
  getMonthlyBillingForecast,
} from '@/lib/client-stats'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

interface KpiCardRowProps {
  clients: Client[]
}

export function KpiCardRow({ clients }: KpiCardRowProps) {
  const totalMRR = getTotalMRR(clients)
  const mrrAtRisk = getMRRAtRisk(clients)
  const totalTCV = getTotalTCVInExecution(clients)
  const billing = getMonthlyBillingForecast(clients)
  const mrrClients = getMRRClients(clients)
  const tcvClients = getTCVClients(clients)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Recorrente"
        value={totalMRR}
        formatFn={formatCurrency}
        sublabel={`${mrrClients.length} cliente${mrrClients.length !== 1 ? 's' : ''}`}
        icon={<RefreshCw className="w-3 h-3 text-emerald-400" />}
        color="emerald"
      />
      <KpiCard
        label="Em Risco"
        value={mrrAtRisk}
        formatFn={formatCurrency}
        sublabel={totalMRR > 0 ? `${Math.round((mrrAtRisk / totalMRR) * 100)}% do recorrente` : 'Sem recorrente'}
        icon={<TrendingDown className="w-3 h-3 text-red-400" />}
        color="red"
        glowActive={mrrAtRisk > 0}
      />
      <KpiCard
        label="TCV Ativo"
        value={totalTCV}
        formatFn={formatCurrency}
        sublabel={`${tcvClients.length} projeto${tcvClients.length !== 1 ? 's' : ''}`}
        icon={<Layers className="w-3 h-3 text-blue-400" />}
        color="blue"
      />
      <KpiCard
        label="Previsão Mês"
        value={billing.total}
        formatFn={formatCurrency}
        sublabel={new Date().toLocaleDateString('pt-BR', { month: 'long' })}
        icon={<Calendar className="w-3 h-3 text-emerald-400" />}
        color="emerald"
      />
    </div>
  )
}
