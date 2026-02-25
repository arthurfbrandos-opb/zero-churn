'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, XCircle, AlertCircle, Calendar, Layers,
  MessageSquare, Plug, ClipboardList, BarChart2,
  ArrowRight, ShieldCheck, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Client } from '@/types'
import {
  getRevenueByRisk,
  getPaymentStatusSummary,
  getClientsRenewingSoon,
  getTCVExpiringSoon,
  getClientsWithIntegrationErrors,
  getClientsWithPendingForms,
  getClientsWithoutRecentNPS,
  getNpsDistribution,
} from '@/lib/client-stats'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

function getDaysToRenew(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

interface ActionQueueProps {
  clients: Client[]
  maxItems?: number
}

type ActionItem = {
  priority: number
  color: string
  icon: React.ElementType
  label: string
  sub: string
  value: string
  href: string
}

export function ActionQueue({ clients, maxItems = 4 }: ActionQueueProps) {
  const [expanded, setExpanded] = useState(false)

  const revenueByRisk = getRevenueByRisk(clients)
  const payments = getPaymentStatusSummary(clients)
  const npsDist = getNpsDistribution(clients)
  const highRiskClients = clients.filter(c => c.healthScore?.churnRisk === 'high')
  const renewingSoon = getClientsRenewingSoon(clients, 30)
  const tcvExpiring = getTCVExpiringSoon(clients, 15)
  const integrationErrors = getClientsWithIntegrationErrors(clients)
  const pendingForms = getClientsWithPendingForms(clients)
  const withoutNPS = getClientsWithoutRecentNPS(clients)

  const allItems: ActionItem[] = [
    highRiskClients.length > 0 ? {
      priority: 1, color: 'red', icon: AlertTriangle,
      label: `${highRiskClients.length} cliente${highRiskClients.length > 1 ? 's' : ''} em risco alto`,
      sub: highRiskClients.map(c => c.name).join(' · '),
      value: formatCurrency(revenueByRisk.high) + '/mês em risco',
      href: '/clientes',
    } : null,
    payments.inadimplente.count > 0 ? {
      priority: 1, color: 'red', icon: XCircle,
      label: `${payments.inadimplente.count} inadimplente${payments.inadimplente.count > 1 ? 's' : ''}`,
      sub: clients.filter(c => c.paymentStatus === 'inadimplente').map(c => c.name).join(' · '),
      value: formatCurrency(payments.inadimplente.value) + ' bloqueado',
      href: '/clientes',
    } : null,
    payments.vencendo.count > 0 ? {
      priority: 2, color: 'orange', icon: AlertCircle,
      label: `${payments.vencendo.count} pagamento${payments.vencendo.count > 1 ? 's' : ''} vencendo`,
      sub: clients.filter(c => c.paymentStatus === 'vencendo').map(c => c.name).join(' · '),
      value: formatCurrency(payments.vencendo.value) + ' em risco',
      href: '/clientes',
    } : null,
    renewingSoon.length > 0 ? {
      priority: 2, color: 'yellow', icon: Calendar,
      label: `${renewingSoon.length} renovação${renewingSoon.length > 1 ? 'ões' : ''} em 30 dias`,
      sub: renewingSoon.map(c => `${c.name} (${getDaysToRenew(c.contractEndDate ?? '')}d)`).join(' · '),
      value: formatCurrency(renewingSoon.reduce((s, c) => s + (c.contractValue ?? 0), 0)) + '/mês',
      href: '/clientes',
    } : null,
    tcvExpiring.length > 0 ? {
      priority: 2, color: 'blue', icon: Layers,
      label: `${tcvExpiring.length} TCV encerrando em 15 dias`,
      sub: tcvExpiring.map(c => c.name).join(' · '),
      value: 'Propor renovação',
      href: '/clientes',
    } : null,
    npsDist.detratores > 0 ? {
      priority: 3, color: 'red', icon: MessageSquare,
      label: `${npsDist.detratores} detrator${npsDist.detratores > 1 ? 'es' : ''}`,
      sub: clients.filter(c => c.lastFormSubmission?.npsScore !== undefined && c.lastFormSubmission.npsScore < 7).map(c => c.name).join(' · '),
      value: 'Contate antes do churn',
      href: '/clientes',
    } : null,
    integrationErrors.length > 0 ? {
      priority: 3, color: 'orange', icon: Plug,
      label: `${integrationErrors.length} integração${integrationErrors.length > 1 ? 'ões' : ''} com erro`,
      sub: integrationErrors.map(c => c.name).join(' · '),
      value: 'Score pode estar desatualizado',
      href: '/operacional',
    } : null,
    pendingForms.length > 0 ? {
      priority: 4, color: 'yellow', icon: ClipboardList,
      label: `${pendingForms.length} formulário${pendingForms.length > 1 ? 's' : ''} sem resposta`,
      sub: pendingForms.map(c => c.name).join(' · '),
      value: 'NPS desatualizado',
      href: '/clientes',
    } : null,
    withoutNPS.length > 0 ? {
      priority: 5, color: 'zinc', icon: BarChart2,
      label: `${withoutNPS.length} sem NPS há +45 dias`,
      sub: withoutNPS.map(c => c.name).join(' · '),
      value: 'Envie o formulário',
      href: '/clientes',
    } : null,
  ].filter(Boolean) as ActionItem[]

  const visibleItems = expanded ? allItems : allItems.slice(0, maxItems)
  const hiddenCount = allItems.length - maxItems

  const borderColor: Record<string, string> = {
    red: 'border-l-red-500 bg-red-500/5 hover:bg-red-500/8',
    orange: 'border-l-orange-400 bg-orange-500/5 hover:bg-orange-500/8',
    yellow: 'border-l-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/8',
    blue: 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/8',
    zinc: 'border-l-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50',
  }
  const iconColor: Record<string, string> = {
    red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400',
    blue: 'text-blue-400', zinc: 'text-zinc-400',
  }
  const valueColor: Record<string, string> = {
    red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400',
    blue: 'text-blue-400', zinc: 'text-zinc-500',
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {allItems.length > 0 && (
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
          )}
          <h3 className="text-zinc-300 text-sm font-semibold">Precisa de atenção</h3>
          {allItems.length > 0 && (
            <span className="text-zinc-600 text-xs">({allItems.length})</span>
          )}
        </div>
        <Link href="/alertas" className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
          Ver alertas →
        </Link>
      </div>

      {/* Items */}
      {allItems.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-emerald-400 text-sm font-medium">Carteira saudável</p>
            <p className="text-zinc-600 text-xs">Nenhuma ação urgente hoje</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item, i) => {
            const Icon = item.icon
            return (
              <Link key={i} href={item.href}>
                <div className={cn(
                  'flex items-center gap-3 py-2 px-3 rounded-lg border-l-2 transition-all duration-200 cursor-pointer group',
                  borderColor[item.color]
                )}>
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', iconColor[item.color])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-xs font-medium truncate">{item.label}</p>
                  </div>
                  <span className={cn('text-[10px] font-medium shrink-0 hidden sm:block', valueColor[item.color])}>
                    {item.value}
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                </div>
              </Link>
            )
          })}
          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1.5 w-full py-1.5 text-zinc-600 hover:text-zinc-400 text-xs transition-colors justify-center"
            >
              <ChevronDown className="w-3 h-3" />
              e mais {hiddenCount} item{hiddenCount > 1 ? 'ns' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
