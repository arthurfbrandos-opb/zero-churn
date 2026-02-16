import Link from 'next/link'
import {
  Users, TrendingDown, DollarSign, Activity,
  ChevronRight, AlertTriangle, Clock,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { IntegrationStatusIcon } from '@/components/integracoes/integration-status-icon'
import {
  mockClients,
  getClientsSortedByRisk,
  getTotalRevenueAtRisk,
  getAverageHealthScore,
  mockAlerts,
} from '@/lib/mock-data'
import { ChurnRisk } from '@/types'

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
  const clients = getClientsSortedByRisk()
  const totalRevenueAtRisk = getTotalRevenueAtRisk()
  const avgScore = getAverageHealthScore()
  const highRiskCount = clients.filter(c => c.healthScore?.churnRisk === 'high').length
  const unreadAlerts = mockAlerts.filter(a => !a.isRead).length

  const summaryCards = [
    {
      label: 'Total de clientes',
      value: mockClients.length,
      icon: Users,
      color: 'text-zinc-400',
      bg: 'bg-zinc-800',
    },
    {
      label: 'Em risco alto',
      value: highRiskCount,
      icon: TrendingDown,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Score médio',
      value: `${avgScore}/100`,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Receita em risco',
      value: formatCurrency(totalRevenueAtRisk),
      icon: DollarSign,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
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
        {/* Alerta de alto risco */}
        {highRiskCount > 0 && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">
              <span className="font-semibold">{highRiskCount} cliente{highRiskCount > 1 ? 's' : ''}</span>
              {' '}em risco alto de churn.{' '}
              {unreadAlerts > 0 && (
                <Link href="/alertas" className="underline hover:no-underline">
                  Ver {unreadAlerts} alerta{unreadAlerts > 1 ? 's' : ''} não lido{unreadAlerts > 1 ? 's' : ''}
                </Link>
              )}
            </p>
          </div>
        )}

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-zinc-500 text-xs font-medium mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de clientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Clientes por risco</h2>
            <Link href="/clientes" className="text-zinc-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
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
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium text-sm truncate">{client.name}</p>
                            <RiskBadge risk={risk} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-zinc-500 text-xs">
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

                        {/* Integrações + valor */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <p className="text-zinc-300 text-sm font-semibold">
                            {formatCurrency(client.contractValue)}<span className="text-zinc-500 font-normal">/mês</span>
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
