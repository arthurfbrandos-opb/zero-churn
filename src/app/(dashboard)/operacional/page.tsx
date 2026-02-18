'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, RefreshCw, Bot, Cpu,
  Calendar, Clock, TrendingUp, Zap,
  MessageCircle, CreditCard, BarChart2, Plug,
  ShieldCheck, Loader2,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IntegrationStatusIcon } from '@/components/integracoes/integration-status-icon'
import { useClients } from '@/hooks/use-clients'
import { sortClientsByRisk } from '@/lib/client-stats'
import { cn } from '@/lib/utils'

// ── Tipos do painel operacional ───────────────────────────────────

interface JobEntry {
  date:        string
  total:       number
  success:     number
  failed:      number
  skipped:     number
  tokensTotal: number
  costTotal:   number
  startedAt:   string
  finishedAt:  string | null
  failures:    string[]
}

interface AiCostEntry {
  month:  string
  label:  string
  tokens: number
  cost:   number
}

interface OperacionalData {
  jobHistory:       JobEntry[]
  aiCost:           AiCostEntry[]
  nextAnalysisDate: string
  analysisDay:      number
}

function useOperacional() {
  const [data, setData]       = useState<OperacionalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/operacional')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

// ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const INT_LABEL: Record<string, string> = {
  whatsapp:       'WhatsApp',
  asaas:          'Asaas',
  dom_pagamentos: 'Dom Pag.',
  meta_ads:       'Meta Ads',
  google_ads:     'Google Ads',
}

export default function OperacionalPage() {
  const { clients: rawClients } = useClients()
  const { data: opData, loading: opLoading } = useOperacional()
  const clients = sortClientsByRisk(rawClients.filter(c => c.status !== 'inactive'))

  const integrationTypes = ['whatsapp', 'asaas', 'dom_pagamentos', 'meta_ads', 'google_ads']

  // Erros gerais
  const clientsWithErrors = clients.filter(c =>
    c.integrations.some(i => i.status === 'error' || i.status === 'disconnected')
  )

  // Stats gerais das integrações
  const allIntegrations = clients.flatMap(c => c.integrations)
  const connectedCount    = allIntegrations.filter(i => i.status === 'connected').length
  const errorCount        = allIntegrations.filter(i => i.status === 'error').length
  const disconnectedCount = allIntegrations.filter(i => i.status === 'disconnected').length

  // Dados reais do painel
  const jobHistory      = opData?.jobHistory ?? []
  const aiCost          = opData?.aiCost ?? []
  const nextJobDate     = opData?.nextAnalysisDate
    ? new Date(opData.nextAnalysisDate + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—'

  const lastJob    = jobHistory[0]
  const totalTokens = aiCost.reduce((s, m) => s + m.tokens, 0)
  const totalCost   = aiCost.reduce((s, m) => s + m.cost, 0)
  const maxCost     = aiCost.length > 0 ? Math.max(...aiCost.map(m => m.cost)) : 1

  return (
    <div className="min-h-screen">
      <Header
        title="Painel Operacional"
        description="Saúde das integrações, uso de IA e status dos jobs mensais"
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">

        {/* ── Resumo rápido ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-500 text-xs">Conectadas</span>
              </div>
              <p className="text-emerald-400 text-2xl font-bold">{connectedCount}</p>
              <p className="text-zinc-600 text-xs mt-1">integrações ativas</p>
            </CardContent>
          </Card>

          <Card className={cn('border', errorCount > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className={cn('w-4 h-4', errorCount > 0 ? 'text-red-400' : 'text-zinc-600')} />
                <span className="text-zinc-500 text-xs">Com erro</span>
              </div>
              <p className={cn('text-2xl font-bold', errorCount > 0 ? 'text-red-400' : 'text-zinc-600')}>{errorCount}</p>
              <p className="text-zinc-600 text-xs mt-1">precisam de atenção</p>
            </CardContent>
          </Card>

          <Card className={cn('border', disconnectedCount > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-zinc-900 border-zinc-800')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className={cn('w-4 h-4', disconnectedCount > 0 ? 'text-orange-400' : 'text-zinc-600')} />
                <span className="text-zinc-500 text-xs">Desconectadas</span>
              </div>
              <p className={cn('text-2xl font-bold', disconnectedCount > 0 ? 'text-orange-400' : 'text-zinc-600')}>{disconnectedCount}</p>
              <p className="text-zinc-600 text-xs mt-1">sem dados</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-zinc-500 text-xs">Próximo job</span>
              </div>
              <p className="text-blue-400 text-lg font-bold">{nextJobDate}</p>
              <p className="text-zinc-600 text-xs mt-1">análise mensal agendada</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Saúde das Integrações ─────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 text-sm font-semibold">Saúde das Integrações</span>
              </div>
              {clientsWithErrors.length > 0 && (
                <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs">
                  {clientsWithErrors.length} cliente{clientsWithErrors.length > 1 ? 's' : ''} com problema
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-zinc-500 text-xs font-medium pb-2 pr-4">Cliente</th>
                    {integrationTypes.map(t => (
                      <th key={t} className="text-center text-zinc-500 text-xs font-medium pb-2 px-2">
                        {INT_LABEL[t]}
                      </th>
                    ))}
                    <th className="text-right text-zinc-500 text-xs font-medium pb-2 pl-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {clients.map(client => {
                    const hasError = client.integrations.some(i => i.status === 'error' || i.status === 'disconnected')
                    return (
                      <tr key={client.id} className={cn('transition-colors', hasError ? 'bg-red-500/3' : '')}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {hasError && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            <div>
                              <p className="text-zinc-200 text-sm font-medium">{client.name}</p>
                              <p className="text-zinc-600 text-xs">{client.segment}</p>
                            </div>
                          </div>
                        </td>
                        {integrationTypes.map(type => {
                          const integ = client.integrations.find(i => i.type === type)
                          return (
                            <td key={type} className="text-center px-2 py-3">
                              {integ
                                ? <IntegrationStatusIcon type={integ.type} status={integ.status} />
                                : <span className="text-zinc-800 text-xs">—</span>
                              }
                            </td>
                          )
                        })}
                        <td className="py-3 pl-4 text-right">
                          <Link href={`/clientes/${client.id}?tab=integracoes`}>
                            <Button size="sm" variant="ghost"
                              className="text-zinc-500 hover:text-zinc-200 text-xs gap-1 h-7 px-2">
                              Ver <ChevronRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800">
              {[
                { icon: CheckCircle2, color: 'text-emerald-400', label: 'Conectado' },
                { icon: XCircle,      color: 'text-red-400',     label: 'Erro'      },
                { icon: AlertCircle,  color: 'text-zinc-500',    label: 'Desconectado' },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className={cn('w-3.5 h-3.5', color)} />
                  <span className="text-zinc-500 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── IA: Custo e Uso ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfico de custo */}
          <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 text-sm font-semibold">Custo de IA (últimos 3 meses)</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {opLoading ? (
                <div className="flex items-center justify-center h-28">
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                </div>
              ) : aiCost.length === 0 ? (
                <div className="flex items-center justify-center h-28 text-zinc-600 text-sm">
                  Nenhuma análise realizada ainda
                </div>
              ) : (
                <div className="flex items-end gap-3 h-28 mb-3">
                  {aiCost.map((m, idx) => {
                    const pct    = maxCost > 0 ? (m.cost / maxCost) * 100 : 0
                    const isLast = idx === aiCost.length - 1
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-zinc-300 text-xs font-semibold">
                          {m.cost > 0 ? `R$ ${m.cost.toFixed(2)}` : '—'}
                        </span>
                        <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                          <div
                            className={cn('w-full rounded-t-lg transition-all', isLast ? 'bg-emerald-500' : 'bg-zinc-700')}
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className="text-zinc-500 text-xs">{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
                <div>
                  <p className="text-zinc-500 text-xs">Total acumulado</p>
                  <p className="text-zinc-200 font-bold text-sm">R$ {totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Tokens consumidos</p>
                  <p className="text-zinc-200 font-bold text-sm">{totalTokens.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Média por análise</p>
                  {(() => {
                    const totalAnalyses = jobHistory.reduce((s, j) => s + j.success, 0)
                    return (
                      <p className="text-zinc-200 font-bold text-sm">
                        {totalAnalyses > 0 ? `R$ ${(totalCost / totalAnalyses).toFixed(2)}` : '—'}
                      </p>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximo job */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 text-sm font-semibold">Job Mensal</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {/* Último job */}
              {lastJob ? (
                <div className={cn('p-3 rounded-xl border',
                  lastJob.failed === 0 ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-yellow-500/5 border-yellow-500/20')}>
                  <div className="flex items-center gap-2 mb-1">
                    {lastJob.failed === 0
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      : <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                    <span className={cn('text-xs font-semibold',
                      lastJob.failed === 0 ? 'text-emerald-400' : 'text-yellow-400')}>
                      {lastJob.failed === 0 ? 'Concluído com sucesso' : 'Concluído com falhas'}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs">{new Date(lastJob.date).toLocaleDateString('pt-BR')}</p>
                  <p className="text-zinc-500 text-xs">{lastJob.success}/{lastJob.total} clientes · {lastJob.tokensTotal.toLocaleString()} tokens</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{formatDate(lastJob.startedAt)}</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-800/30 text-center">
                  <p className="text-zinc-600 text-xs">Nenhum job executado ainda</p>
                </div>
              )}

              {/* Próximo */}
              <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400 text-xs font-semibold">Próximo job</span>
                </div>
                <p className="text-zinc-200 text-sm font-bold">{nextJobDate}</p>
                <p className="text-zinc-500 text-xs">às 09:00 UTC · {clients.length} clientes a processar</p>
              </div>

              {/* Histórico resumido */}
              {jobHistory.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Histórico</p>
                  {jobHistory.map((job, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {job.failed === 0
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        : <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />}
                      <span className="text-zinc-400 flex-1">
                        {new Date(job.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-zinc-600">{job.success}/{job.total}</span>
                      <span className="text-zinc-600">R$ {job.costTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Clientes com problemas — ação imediata ─────────────── */}
        {clientsWithErrors.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm font-semibold">Ação necessária — integrações com problema</span>
              </div>
              <p className="text-zinc-500 text-xs mt-0.5">
                Estes clientes podem ter o health score desatualizado até a integração ser corrigida.
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {clientsWithErrors.map(client => {
                const broken = client.integrations.filter(i => i.status !== 'connected')
                return (
                  <div key={client.id}
                    className="flex items-center gap-3 bg-zinc-900/70 rounded-xl p-3 border border-zinc-800">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm font-medium">{client.name}</p>
                      <p className="text-zinc-500 text-xs">
                        {broken.map(i => `${INT_LABEL[i.type] ?? i.type}: ${i.status}`).join(' · ')}
                      </p>
                    </div>
                    <Link href={`/clientes/${client.id}?tab=integracoes`}>
                      <Button size="sm" variant="outline"
                        className="border-zinc-700 text-zinc-400 hover:text-white text-xs gap-1">
                        Corrigir <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Estado saudável */}
        {clientsWithErrors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-semibold">Todas as integrações estão saudáveis!</p>
            <p className="text-zinc-500 text-sm mt-1">Nenhum cliente com problema de integração detectado.</p>
          </div>
        )}

      </div>
    </div>
  )
}
