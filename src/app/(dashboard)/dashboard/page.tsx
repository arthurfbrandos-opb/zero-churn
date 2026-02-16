import Link from 'next/link'
import {
  ChevronRight, Clock, TrendingDown, TrendingUp, Minus,
  RefreshCw, Layers, AlertTriangle, Calendar, Plug,
  ClipboardList, BarChart2, ShieldCheck, ArrowRight,
  CreditCard, CheckCircle2, AlertCircle, XCircle,
  MessageSquare, ThumbsUp, ThumbsDown, Meh,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { ChurnSparkline } from '@/components/dashboard/churn-sparkline'
import { IntegrationStatusIcon } from '@/components/integracoes/integration-status-icon'
import {
  getClientsSortedByRisk,
  getAverageHealthScore,
  getRevenueByRisk,
  getRiskCounts,
  getLastMonthAvgChurn,
  getLast3MonthsAvgChurn,
  getMRRClients,
  getTCVClients,
  getTotalMRR,
  getTotalTCVInExecution,
  getMRRAtRisk,
  getNewTCVClients,
  getMonthlyBillingForecast,
  getClientsRenewingSoon,
  getTCVExpiringSoon,
  getClientsWithIntegrationErrors,
  getClientsWithPendingForms,
  getClientsWithoutRecentNPS,
  getNpsDistribution,
  getPaymentStatusSummary,
  mockChurnHistory,
  mockAlerts,
} from '@/lib/mock-data'
import { getNpsClassification } from '@/lib/nps-utils'
import { ChurnRisk } from '@/types'
import { cn } from '@/lib/utils'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getTimeAsClient(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (months < 1) return 'Novo cliente'
  if (months === 1) return '1 mês'
  return `${months} meses`
}

function getDaysToRenew(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function DashboardPage() {
  const clients          = getClientsSortedByRisk()
  const avgScore         = getAverageHealthScore()
  const riskCounts       = getRiskCounts()
  const revenueByRisk    = getRevenueByRisk()
  const churnLastMonth   = getLastMonthAvgChurn()
  const churnLast3Months = getLast3MonthsAvgChurn()
  const churnDelta       = churnLastMonth - churnLast3Months
  const mrrClients       = getMRRClients()
  const tcvClients       = getTCVClients()
  const totalMRR         = getTotalMRR()
  const totalTCV         = getTotalTCVInExecution()
  const mrrAtRisk        = getMRRAtRisk()
  const newTCVClients    = getNewTCVClients(30)
  const billing          = getMonthlyBillingForecast()
  const totalWithScore   = clients.filter((c) => c.healthScore).length
  const unreadAlerts     = mockAlerts.filter((a) => !a.isRead).length
  const npsDist          = getNpsDistribution()
  const payments         = getPaymentStatusSummary()

  // Radar da Operação
  const highRiskClients   = clients.filter((c) => c.healthScore?.churnRisk === 'high')
  const renewingSoon      = getClientsRenewingSoon(30)
  const tcvExpiring       = getTCVExpiringSoon(15)
  const integrationErrors = getClientsWithIntegrationErrors()
  const pendingForms      = getClientsWithPendingForms()
  const withoutNPS        = getClientsWithoutRecentNPS()

  const radarItems = [
    highRiskClients.length > 0 && {
      priority: 1, color: 'red', icon: AlertTriangle,
      label: `${highRiskClients.length} cliente${highRiskClients.length > 1 ? 's' : ''} em risco alto`,
      sub: highRiskClients.map((c) => c.name).join(' · '),
      value: formatCurrency(revenueByRisk.high) + '/mês em risco',
      href: '/clientes',
    },
    payments.inadimplente.count > 0 && {
      priority: 1, color: 'red', icon: XCircle,
      label: `${payments.inadimplente.count} cliente${payments.inadimplente.count > 1 ? 's' : ''} inadimplente${payments.inadimplente.count > 1 ? 's' : ''}`,
      sub: clients.filter(c => c.paymentStatus === 'inadimplente').map(c => c.name).join(' · '),
      value: formatCurrency(payments.inadimplente.value) + ' em MRR bloqueado',
      href: '/clientes',
    },
    payments.vencendo.count > 0 && {
      priority: 2, color: 'orange', icon: AlertCircle,
      label: `${payments.vencendo.count} pagamento${payments.vencendo.count > 1 ? 's' : ''} vencendo em breve`,
      sub: clients.filter(c => c.paymentStatus === 'vencendo').map(c => c.name).join(' · '),
      value: formatCurrency(payments.vencendo.value) + ' em risco de atraso',
      href: '/clientes',
    },
    renewingSoon.length > 0 && {
      priority: 2, color: 'yellow', icon: Calendar,
      label: `${renewingSoon.length} renovação${renewingSoon.length > 1 ? 'ões' : ''} nos próximos 30 dias`,
      sub: renewingSoon.map((c) => `${c.name} (${getDaysToRenew(c.contractEndDate)}d)`).join(' · '),
      value: formatCurrency(renewingSoon.reduce((s, c) => s + c.contractValue, 0)) + '/mês',
      href: '/clientes',
    },
    tcvExpiring.length > 0 && {
      priority: 2, color: 'blue', icon: Layers,
      label: `${tcvExpiring.length} projeto${tcvExpiring.length > 1 ? 's' : ''} TCV encerrando em 15 dias`,
      sub: tcvExpiring.map((c) => `${c.name} (${getDaysToRenew(c.contractEndDate)}d)`).join(' · '),
      value: 'Momento de propor renovação ou upgrade',
      href: '/clientes',
    },
    npsDist.detratores > 0 && {
      priority: 3, color: 'red', icon: MessageSquare,
      label: `${npsDist.detratores} cliente${npsDist.detratores > 1 ? 's' : ''} detrator${npsDist.detratores > 1 ? 'es' : ''} — ação imediata`,
      sub: clients.filter(c => c.lastFormSubmission?.npsScore !== undefined && c.lastFormSubmission.npsScore < 7).map(c => `${c.name} (NPS ${c.lastFormSubmission!.npsScore}`).join(') · ') + (npsDist.detratores > 0 ? ')' : ''),
      value: 'Entre em contato antes que virem churn',
      href: '/clientes',
    },
    integrationErrors.length > 0 && {
      priority: 3, color: 'orange', icon: Plug,
      label: `${integrationErrors.length} integração${integrationErrors.length > 1 ? 'ões' : ''} com erro ou expirada`,
      sub: integrationErrors.map((c) => c.name).join(' · '),
      value: 'Score pode estar desatualizado',
      href: '/operacional',
    },
    pendingForms.length > 0 && {
      priority: 4, color: 'yellow', icon: ClipboardList,
      label: `${pendingForms.length} formulário${pendingForms.length > 1 ? 's' : ''} sem resposta há +7 dias`,
      sub: pendingForms.map((c) => c.name).join(' · '),
      value: 'NPS e resultado podem estar desatualizados',
      href: '/clientes',
    },
    withoutNPS.length > 0 && {
      priority: 5, color: 'zinc', icon: BarChart2,
      label: `${withoutNPS.length} cliente${withoutNPS.length > 1 ? 's' : ''} sem NPS nos últimos 45 dias`,
      sub: withoutNPS.map((c) => c.name).join(' · '),
      value: 'Envie o formulário para ter dados atualizados',
      href: '/clientes',
    },
  ].filter(Boolean) as {
    priority: number; color: string; icon: React.ElementType
    label: string; sub: string; value: string; href: string
  }[]

  const colorMap: Record<string, string> = {
    red:    'border-red-500/30 bg-red-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    blue:   'border-blue-500/30 bg-blue-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
    zinc:   'border-zinc-700 bg-zinc-800/50',
  }
  const iconColorMap: Record<string, string> = {
    red:    'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    blue:   'text-blue-400 bg-blue-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    zinc:   'text-zinc-400 bg-zinc-800',
  }

  const riskDistribution = [
    { label: 'Alto',       count: riskCounts.high,       color: 'bg-red-500',     textColor: 'text-red-400'     },
    { label: 'Médio',      count: riskCounts.medium,     color: 'bg-yellow-500',  textColor: 'text-yellow-400'  },
    { label: 'Baixo',      count: riskCounts.low,        color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    { label: 'Observação', count: riskCounts.observacao, color: 'bg-zinc-600',    textColor: 'text-zinc-500'    },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        description="Visão da operação e saúde do negócio"
        action={
          <Link href="/clientes/novo">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              + Novo cliente
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-5">

        {/* ── 0. BARRA RESUMO ──────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="px-5 py-3">
            <div className="flex flex-wrap items-center gap-0 divide-x divide-zinc-800">

              <div className="flex items-center gap-3 pr-5">
                <div>
                  <p className="text-zinc-500 text-xs">Clientes ativos</p>
                  <p className="text-white text-xl font-bold leading-tight">{clients.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-zinc-500 text-xs">MRR</p>
                  <p className="text-white text-xl font-bold leading-tight">
                    {mrrClients.length}
                    <span className="text-zinc-500 text-xs font-normal ml-1">clientes</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="text-zinc-500 text-xs">TCV</p>
                  <p className="text-white text-xl font-bold leading-tight">
                    {tcvClients.length}
                    <span className="text-zinc-500 text-xs font-normal ml-1">projetos</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5">
                <div className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
                <div>
                  <p className="text-zinc-500 text-xs">Em observação</p>
                  <p className="text-white text-xl font-bold leading-tight">
                    {riskCounts.observacao}
                    <span className="text-zinc-500 text-xs font-normal ml-1">novos</span>
                  </p>
                </div>
              </div>

              {/* Alertas de pagamento inline */}
              {(payments.inadimplente.count > 0 || payments.vencendo.count > 0) && (
                <div className="flex items-center gap-2 px-5">
                  {payments.inadimplente.count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                      <XCircle className="w-3 h-3" /> {payments.inadimplente.count} inadimplente{payments.inadimplente.count > 1 ? 's' : ''}
                    </span>
                  )}
                  {payments.vencendo.count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2.5 py-1">
                      <AlertCircle className="w-3 h-3" /> {payments.vencendo.count} vencendo
                    </span>
                  )}
                </div>
              )}

              <div className="flex-1" />

              <div className="pl-5">
                <p className="text-zinc-500 text-xs capitalize">
                  Faturamento previsto — {billing.currentMonthLabel}
                </p>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <p className="text-emerald-400 text-xl font-bold leading-tight">
                    {formatCurrency(billing.total)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>MRR <span className="text-zinc-300 font-semibold">{formatCurrency(billing.mrrForecast)}</span></span>
                    {billing.tcvForecast > 0 && (
                      <span>+ TCV <span className="text-blue-400 font-semibold">{formatCurrency(billing.tcvForecast)}</span></span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── 1. PULSO FINANCEIRO ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-zinc-500 text-xs font-medium">MRR Total</span>
              </div>
              <p className="text-emerald-400 text-2xl font-bold">{formatCurrency(totalMRR)}</p>
              <p className="text-zinc-500 text-xs mt-1">{mrrClients.length} clientes recorrentes</p>
            </CardContent>
          </Card>

          <Card className={cn('border', mrrAtRisk > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span className="text-zinc-500 text-xs font-medium">MRR em Risco</span>
              </div>
              <p className="text-red-400 text-2xl font-bold">{formatCurrency(mrrAtRisk)}</p>
              <p className="text-zinc-500 text-xs mt-1">
                {totalMRR > 0 ? Math.round((mrrAtRisk / totalMRR) * 100) : 0}% do MRR em risco
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-zinc-500 text-xs font-medium">TCV em Execução</span>
              </div>
              <p className="text-blue-400 text-2xl font-bold">{formatCurrency(totalTCV)}</p>
              <p className="text-zinc-500 text-xs mt-1">{tcvClients.length} projeto{tcvClients.length !== 1 ? 's' : ''} ativos</p>
            </CardContent>
          </Card>

          <Card className={cn('border',
            churnDelta > 0 ? 'bg-red-500/5 border-red-500/20'
            : churnDelta < 0 ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-zinc-900 border-zinc-800')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center',
                  churnDelta > 0 ? 'bg-red-500/10' : churnDelta < 0 ? 'bg-emerald-500/10' : 'bg-zinc-800')}>
                  {churnDelta > 0
                    ? <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                    : churnDelta < 0
                    ? <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    : <Minus className="w-3.5 h-3.5 text-zinc-400" />}
                </div>
                <span className="text-zinc-500 text-xs font-medium">Tendência de Churn</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={cn('text-2xl font-bold',
                  churnDelta > 0 ? 'text-red-400' : churnDelta < 0 ? 'text-emerald-400' : 'text-zinc-400')}>
                  {churnLastMonth}%
                </p>
                <span className={cn('text-xs font-semibold',
                  churnDelta > 0 ? 'text-red-400' : churnDelta < 0 ? 'text-emerald-400' : 'text-zinc-500')}>
                  {churnDelta > 0 ? `+${churnDelta}pp` : `${churnDelta}pp`}
                </span>
              </div>
              <p className="text-zinc-500 text-xs mt-1">vs. média {churnLast3Months}% (3 meses)</p>
            </CardContent>
          </Card>
        </div>

        {/* ── 2. NPS + PAGAMENTOS ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* NPS Snapshot — 3 cols */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-3">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 text-sm font-semibold">Snapshot de NPS</span>
                <span className="text-zinc-600 text-xs ml-1">— {npsDist.total} respondente{npsDist.total !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-5">
                {/* Score NPS grande */}
                <div className="flex flex-col items-center shrink-0">
                  <p className={cn('text-4xl font-black leading-none',
                    npsDist.npsScore === null ? 'text-zinc-600'
                    : npsDist.npsScore >= 50 ? 'text-emerald-400'
                    : npsDist.npsScore >= 0 ? 'text-yellow-400'
                    : 'text-red-400')}>
                    {npsDist.npsScore !== null ? (npsDist.npsScore > 0 ? `+${npsDist.npsScore}` : npsDist.npsScore) : '—'}
                  </p>
                  <p className="text-zinc-600 text-xs mt-1">NPS score</p>
                  {npsDist.avgScore !== null && (
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Média <span className="text-zinc-300 font-medium">{npsDist.avgScore}</span>/10
                    </p>
                  )}
                </div>

                {/* Distribuição */}
                <div className="flex-1 space-y-3">
                  {/* Barra proporcional */}
                  {npsDist.total > 0 && (
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                      {npsDist.promotores > 0 && (
                        <div className="bg-emerald-500 rounded-full" style={{ width: `${(npsDist.promotores / npsDist.total) * 100}%` }} />
                      )}
                      {npsDist.neutros > 0 && (
                        <div className="bg-yellow-500 rounded-full" style={{ width: `${(npsDist.neutros / npsDist.total) * 100}%` }} />
                      )}
                      {npsDist.detratores > 0 && (
                        <div className="bg-red-500 rounded-full" style={{ width: `${(npsDist.detratores / npsDist.total) * 100}%` }} />
                      )}
                    </div>
                  )}

                  {/* Legenda */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg p-2.5 text-center">
                      <ThumbsUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <p className="text-emerald-400 text-xl font-bold">{npsDist.promotores}</p>
                      <p className="text-zinc-500 text-xs">Promotore{npsDist.promotores !== 1 ? 's' : ''}</p>
                      <p className="text-zinc-600 text-xs">NPS 9–10</p>
                    </div>
                    <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-lg p-2.5 text-center">
                      <Meh className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                      <p className="text-yellow-400 text-xl font-bold">{npsDist.neutros}</p>
                      <p className="text-zinc-500 text-xs">Neutro{npsDist.neutros !== 1 ? 's' : ''}</p>
                      <p className="text-zinc-600 text-xs">NPS 7–8</p>
                    </div>
                    <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-2.5 text-center">
                      <ThumbsDown className="w-4 h-4 text-red-400 mx-auto mb-1" />
                      <p className="text-red-400 text-xl font-bold">{npsDist.detratores}</p>
                      <p className="text-zinc-500 text-xs">Detratores{npsDist.detratores !== 1 ? 's' : ''}</p>
                      <p className="text-zinc-600 text-xs">NPS 0–6</p>
                    </div>
                  </div>

                  {npsDist.semResposta > 0 && (
                    <p className="text-zinc-600 text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />
                      {npsDist.semResposta} cliente{npsDist.semResposta !== 1 ? 's' : ''} sem resposta ainda
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos — 2 cols */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 text-sm font-semibold">Status de Pagamentos</span>
              </div>

              <div className="space-y-2.5">
                {/* Em dia */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-400 text-xs font-semibold">Em dia</p>
                    <p className="text-zinc-500 text-xs">{formatCurrency(payments.emDia.value)}/mês</p>
                  </div>
                  <span className="text-emerald-400 font-bold text-lg">{payments.emDia.count}</span>
                </div>

                {/* Vencendo */}
                <div className={cn('flex items-center gap-3 p-2.5 rounded-lg border',
                  payments.vencendo.count > 0
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-zinc-800/40 border-zinc-800')}>
                  <AlertCircle className={cn('w-4 h-4 shrink-0',
                    payments.vencendo.count > 0 ? 'text-yellow-400' : 'text-zinc-600')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold',
                      payments.vencendo.count > 0 ? 'text-yellow-400' : 'text-zinc-600')}>Vencendo em breve</p>
                    <p className="text-zinc-500 text-xs">{formatCurrency(payments.vencendo.value)}/mês</p>
                  </div>
                  <span className={cn('font-bold text-lg',
                    payments.vencendo.count > 0 ? 'text-yellow-400' : 'text-zinc-700')}>{payments.vencendo.count}</span>
                </div>

                {/* Inadimplente */}
                <div className={cn('flex items-center gap-3 p-2.5 rounded-lg border',
                  payments.inadimplente.count > 0
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-zinc-800/40 border-zinc-800')}>
                  <XCircle className={cn('w-4 h-4 shrink-0',
                    payments.inadimplente.count > 0 ? 'text-red-400' : 'text-zinc-600')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold',
                      payments.inadimplente.count > 0 ? 'text-red-400' : 'text-zinc-600')}>Inadimplente</p>
                    <p className="text-zinc-500 text-xs">{formatCurrency(payments.inadimplente.value)}/mês parado</p>
                  </div>
                  <span className={cn('font-bold text-lg',
                    payments.inadimplente.count > 0 ? 'text-red-400' : 'text-zinc-700')}>{payments.inadimplente.count}</span>
                </div>

                {payments.totalAtRisk > 0 && (
                  <div className="border-t border-zinc-800 pt-2.5 flex items-center justify-between">
                    <p className="text-zinc-600 text-xs">Total em risco de inadimplência</p>
                    <p className="text-red-400 text-sm font-bold">{formatCurrency(payments.totalAtRisk)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 3. SAÚDE DA CARTEIRA + RADAR DA OPERAÇÃO ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* SAÚDE — 2 cols */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 text-sm font-semibold">Saúde da Carteira</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">
              <div className="flex items-center gap-5">
                <ScoreGauge score={avgScore} size="lg" />
                <div className="space-y-1">
                  <p className="text-zinc-400 text-xs">Score médio</p>
                  <p className="text-zinc-500 text-xs">{totalWithScore} de {clients.length} analisados</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {churnDelta > 0
                      ? <span className="text-red-400 text-xs font-medium">⚠ Churn piorando</span>
                      : churnDelta < 0
                      ? <span className="text-emerald-400 text-xs font-medium">✓ Churn melhorando</span>
                      : <span className="text-zinc-400 text-xs font-medium">→ Churn estável</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {riskDistribution.map(({ label, count, color }) => {
                    const pct = clients.length > 0 ? (count / clients.length) * 100 : 0
                    if (pct === 0) return null
                    return <div key={label} className={color} style={{ width: `${pct}%` }} />
                  })}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {riskDistribution.map(({ label, count, color, textColor }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', color)} />
                        <span className="text-zinc-500 text-xs">{label}</span>
                      </div>
                      <span className={cn('text-xs font-bold', textColor)}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-zinc-800">
                <ChurnSparkline data={mockChurnHistory} />
              </div>
            </CardContent>
          </Card>

          {/* RADAR DA OPERAÇÃO — 3 cols */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-3">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-zinc-300 text-sm font-semibold">Radar da Operação</span>
                </div>
                {unreadAlerts > 0 && (
                  <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs">
                    {unreadAlerts} alerta{unreadAlerts > 1 ? 's' : ''} não lido{unreadAlerts > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-zinc-600 text-xs mt-0.5">Ordenado por urgência — clique para agir</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {radarItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-medium text-sm">Carteira saudável!</p>
                  <p className="text-zinc-500 text-xs mt-1">Nenhuma ação urgente identificada hoje.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {radarItems.map((item, i) => {
                    const Icon = item.icon
                    return (
                      <Link key={i} href={item.href}>
                        <div className={cn('flex items-start gap-3 p-3 rounded-lg border transition-all hover:brightness-110 cursor-pointer', colorMap[item.color])}>
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconColorMap[item.color])}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-zinc-200 text-xs font-semibold leading-snug">{item.label}</p>
                            <p className="text-zinc-500 text-xs truncate mt-0.5">{item.sub}</p>
                            <p className={cn('text-xs mt-1 font-medium',
                              item.color === 'red' ? 'text-red-400' :
                              item.color === 'yellow' ? 'text-yellow-400' :
                              item.color === 'blue' ? 'text-blue-400' :
                              item.color === 'orange' ? 'text-orange-400' : 'text-zinc-400')}>
                              {item.value}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── 4. LISTA DE CLIENTES ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">
              Clientes — rankeados por risco
            </h2>
            <Link href="/clientes" className="text-zinc-500 hover:text-white text-xs flex items-center gap-1 transition-colors">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {clients.map((client) => {
              const daysToRenew   = getDaysToRenew(client.contractEndDate)
              const isObservacao  = !client.healthScore
              const score         = client.healthScore?.scoreTotal
              const risk: ChurnRisk = client.healthScore?.churnRisk ?? 'observacao'
              const npsScore      = client.lastFormSubmission?.npsScore
              const npsClass      = npsScore !== undefined ? getNpsClassification(npsScore) : null

              // Badge de pagamento
              const payBadge = client.paymentStatus === 'inadimplente'
                ? { label: 'Inadimplente', color: 'text-red-400 border-red-500/30 bg-red-500/8' }
                : client.paymentStatus === 'vencendo'
                ? { label: 'Vencendo', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8' }
                : null

              return (
                <Link key={client.id} href={`/clientes/${client.id}`}>
                  <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">

                        {/* Score */}
                        <div className="shrink-0">
                          {isObservacao ? (
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-zinc-500" />
                            </div>
                          ) : (
                            <ScoreGauge score={score!} size="sm" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-white font-medium text-sm">{client.name}</p>
                            <RiskBadge risk={risk} size="sm" />
                            <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border font-medium',
                              client.clientType === 'mrr'
                                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                : 'text-blue-400 border-blue-500/30 bg-blue-500/10')}>
                              {client.clientType.toUpperCase()}
                            </Badge>
                            {/* NPS badge */}
                            {npsClass && (
                              <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border font-medium', npsClass.color, npsClass.bg, npsClass.border)}>
                                NPS {npsScore} · {npsClass.label}
                              </Badge>
                            )}
                            {/* Payment badge */}
                            {payBadge && (
                              <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border font-medium', payBadge.color)}>
                                {payBadge.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500 text-xs flex-wrap">
                            <span>{client.segment}</span>
                            <span>·</span>
                            <span>{getTimeAsClient(client.contractStartDate)}</span>
                            {client.clientType === 'tcv' && (
                              <>
                                <span>·</span>
                                <span className={daysToRenew <= 15 ? 'text-red-400 font-medium' : 'text-blue-400'}>
                                  {daysToRenew > 0 ? `${daysToRenew}d restantes` : 'Encerrado'}
                                </span>
                              </>
                            )}
                            {client.clientType === 'mrr' && daysToRenew <= 60 && daysToRenew > 0 && (
                              <>
                                <span>·</span>
                                <span className={daysToRenew <= 20 ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                                  Renova em {daysToRenew}d
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Valor + integrações */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {client.clientType === 'mrr' ? (
                            <p className="text-zinc-300 text-sm font-semibold">
                              {formatCurrency(client.contractValue)}
                              <span className="text-zinc-500 font-normal text-xs">/mês</span>
                            </p>
                          ) : (
                            <p className="text-blue-400 text-sm font-semibold">
                              {formatCurrency(client.totalProjectValue ?? 0)}
                              <span className="text-zinc-500 font-normal text-xs"> total</span>
                            </p>
                          )}
                          <div className="flex items-center gap-1.5">
                            {client.integrations.map((int) => (
                              <IntegrationStatusIcon key={int.id} type={int.type} status={int.status} />
                            ))}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
