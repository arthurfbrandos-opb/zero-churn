import Link from 'next/link'
import { ChevronRight, AlertTriangle, Clock, TrendingDown, TrendingUp, Users, Minus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { IntegrationStatusIcon } from '@/components/integracoes/integration-status-icon'
import {
  getClientsSortedByRisk,
  getTotalRevenueAtRisk,
  getAverageHealthScore,
  getRevenueByRisk,
  getRiskCounts,
  getActiveClientsCount,
  getLastMonthAvgChurn,
  getLast3MonthsAvgChurn,
  mockAlerts,
} from '@/lib/mock-data'
import { ChurnRisk } from '@/types'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getTimeAsClient(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date()
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
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
  const clients = getClientsSortedByRisk()
  const totalRevenueAtRisk = getTotalRevenueAtRisk()
  const avgScore = getAverageHealthScore()
  const riskCounts = getRiskCounts()
  const revenueByRisk = getRevenueByRisk()
  const highRiskCount = riskCounts.high
  const unreadAlerts = mockAlerts.filter((a) => !a.isRead).length
  const totalClients = clients.length
  const totalWithScore = clients.filter((c) => c.healthScore).length
  const activeClients = getActiveClientsCount()
  const churnLastMonth = getLastMonthAvgChurn()
  const churnLast3Months = getLast3MonthsAvgChurn()
  const churnDelta = churnLastMonth - churnLast3Months

  const riskDistribution = [
    { label: 'Alto',        count: riskCounts.high,       color: 'bg-red-500',     textColor: 'text-red-400',     revenue: revenueByRisk.high   },
    { label: 'Médio',       count: riskCounts.medium,     color: 'bg-yellow-500',  textColor: 'text-yellow-400',  revenue: revenueByRisk.medium },
    { label: 'Baixo',       count: riskCounts.low,        color: 'bg-emerald-500', textColor: 'text-emerald-400', revenue: revenueByRisk.low    },
    { label: 'Observação',  count: riskCounts.observacao, color: 'bg-zinc-600',    textColor: 'text-zinc-400',    revenue: 0                    },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        description="Visão geral da saúde da sua carteira de clientes"
        action={
          <Link href="/clientes/novo">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              + Novo cliente
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">

        {/* Banner de alerta */}
        {highRiskCount > 0 && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">
              <span className="font-semibold">
                {highRiskCount} cliente{highRiskCount > 1 ? 's' : ''}
              </span>{' '}
              em risco alto de churn.{' '}
              {unreadAlerts > 0 && (
                <Link href="/alertas" className="underline hover:no-underline">
                  Ver {unreadAlerts} alerta{unreadAlerts > 1 ? 's' : ''} não lido{unreadAlerts > 1 ? 's' : ''}
                </Link>
              )}
            </p>
          </div>
        )}

        {/* ─── Métricas rápidas ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Clientes ativos */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Clientes ativos</p>
                <p className="text-white text-xl font-bold leading-tight">{activeClients}</p>
              </div>
            </CardContent>
          </Card>

          {/* Churn médio — último mês */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Churn — último mês</p>
                <p className="text-red-400 text-xl font-bold leading-tight">{churnLastMonth}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Churn médio — últimos 3 meses */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Churn — média 3 meses</p>
                <p className="text-zinc-300 text-xl font-bold leading-tight">{churnLast3Months}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Variação */}
          <Card className={`border ${churnDelta > 0 ? 'bg-red-500/5 border-red-500/20' : churnDelta < 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
            <CardContent className="px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                churnDelta > 0 ? 'bg-red-500/10' : churnDelta < 0 ? 'bg-emerald-500/10' : 'bg-zinc-800'
              }`}>
                {churnDelta > 0
                  ? <TrendingUp className="w-4 h-4 text-red-400" />
                  : churnDelta < 0
                  ? <TrendingDown className="w-4 h-4 text-emerald-400" />
                  : <Minus className="w-4 h-4 text-zinc-400" />
                }
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Variação do churn</p>
                <p className={`text-xl font-bold leading-tight ${
                  churnDelta > 0 ? 'text-red-400' : churnDelta < 0 ? 'text-emerald-400' : 'text-zinc-400'
                }`}>
                  {churnDelta > 0 ? '+' : ''}{churnDelta}pp
                </p>
                <p className="text-zinc-600 text-xs leading-tight">
                  {churnDelta > 0 ? 'piorando' : churnDelta < 0 ? 'melhorando' : 'estável'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Resumo visual ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Card 1 — Score médio (gauge circular) */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 flex flex-col items-center justify-center gap-3">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                Score médio da carteira
              </p>
              <ScoreGauge score={avgScore} size="lg" />
              <p className="text-zinc-500 text-xs">
                Baseado em {totalWithScore} de {totalClients} clientes analisados
              </p>
            </CardContent>
          </Card>

          {/* Card 2 — Distribuição por risco */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 flex flex-col gap-4">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                Distribuição por risco
              </p>

              {/* Barra proporcional */}
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {riskDistribution.map(({ label, count, color }) => {
                  const pct = totalClients > 0 ? (count / totalClients) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div
                      key={label}
                      className={`${color} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${label}: ${count}`}
                    />
                  )
                })}
              </div>

              {/* Legenda */}
              <div className="space-y-2.5">
                {riskDistribution.map(({ label, count, color, textColor }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <span className="text-zinc-400 text-sm">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${textColor}`}>{count}</span>
                      <span className="text-zinc-600 text-xs">
                        cliente{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 3 — Receita em risco */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                  Receita em risco
                </p>
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>

              {/* Total */}
              <div>
                <p className="text-3xl font-bold text-red-400">
                  {formatCurrency(totalRevenueAtRisk)}
                </p>
                <p className="text-zinc-500 text-xs mt-1">por mês em risco de cancelamento</p>
              </div>

              {/* Breakdown por nível */}
              <div className="space-y-2.5 pt-1 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-zinc-400 text-sm">Risco Alto</span>
                  </div>
                  <span className="text-red-400 text-sm font-semibold">
                    {formatCurrency(revenueByRisk.high)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="text-zinc-400 text-sm">Risco Médio</span>
                  </div>
                  <span className="text-yellow-400 text-sm font-semibold">
                    {formatCurrency(revenueByRisk.medium)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-400 text-sm">Risco Baixo</span>
                  </div>
                  <span className="text-emerald-400 text-sm font-semibold">
                    {formatCurrency(revenueByRisk.low)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Lista de clientes ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Clientes por risco</h2>
            <Link
              href="/clientes"
              className="text-zinc-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {clients.map((client) => {
              const daysToRenew = getDaysToRenew(client.contractEndDate)
              const isObservacao = !client.healthScore
              const score = client.healthScore?.scoreTotal
              const risk: ChurnRisk = client.healthScore?.churnRisk ?? 'observacao'

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
                            <p className="text-white font-medium text-sm truncate">{client.name}</p>
                            <RiskBadge risk={risk} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-zinc-500 text-xs flex-wrap">
                            <span>{client.serviceSold}</span>
                            <span>•</span>
                            <span>{getTimeAsClient(client.contractStartDate)}</span>
                            {daysToRenew <= 60 && daysToRenew > 0 && (
                              <>
                                <span>•</span>
                                <span className={daysToRenew <= 20 ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                                  Renova em {daysToRenew}d
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Valor + integrações */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <p className="text-zinc-300 text-sm font-semibold">
                            {formatCurrency(client.contractValue)}
                            <span className="text-zinc-500 font-normal">/mês</span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            {client.integrations.map((int) => (
                              <IntegrationStatusIcon key={int.id} type={int.type} status={int.status} />
                            ))}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
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
