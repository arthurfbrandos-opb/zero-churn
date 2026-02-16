'use client'

import Link from 'next/link'
import {
  Activity, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, RefreshCw, Bot, Cpu,
  Calendar, Clock, TrendingUp, Zap,
  MessageCircle, CreditCard, BarChart2, Plug,
  ShieldCheck,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IntegrationStatusIcon } from '@/components/integracoes/integration-status-icon'
import { getClientsSortedByRisk } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// ── Mock data operacional ─────────────────────────────────────────

const mockJobHistory = [
  {
    id: 'job-001', month: 'Fevereiro 2026', ranAt: '2026-02-05T06:02:11Z',
    status: 'success' as const, total: 6, processed: 6, failed: 0,
    duration: '4m 23s', tokensUsed: 41200, costBRL: 8.70,
  },
  {
    id: 'job-002', month: 'Janeiro 2026', ranAt: '2026-01-05T06:01:44Z',
    status: 'partial' as const, total: 5, processed: 4, failed: 1,
    duration: '3m 51s', tokensUsed: 34800, costBRL: 7.35,
    failedClients: ['Imobiliária Casa Certa — Erro na API Asaas (timeout)'],
  },
  {
    id: 'job-003', month: 'Dezembro 2025', ranAt: '2025-12-05T06:00:52Z',
    status: 'success' as const, total: 4, processed: 4, failed: 0,
    duration: '3m 02s', tokensUsed: 28600, costBRL: 6.05,
  },
]

const mockAICostMonthly = [
  { month: 'Dez', cost: 6.05, tokens: 28600 },
  { month: 'Jan', cost: 7.35, tokens: 34800 },
  { month: 'Fev', cost: 8.70, tokens: 41200 },
]

const NEXT_JOB_DATE = '05/03/2026'

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
  const clients = getClientsSortedByRisk()

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

  // IA — último job
  const lastJob  = mockJobHistory[0]
  const totalTokens = mockAICostMonthly.reduce((s, m) => s + m.tokens, 0)
  const totalCost   = mockAICostMonthly.reduce((s, m) => s + m.cost, 0)
  const maxCost     = Math.max(...mockAICostMonthly.map(m => m.cost))

  return (
    <div className="min-h-screen">
      <Header
        title="Painel Operacional"
        description="Saúde das integrações, uso de IA e status dos jobs mensais"
      />

      <div className="p-6 space-y-5">

        {/* ── Resumo rápido ─────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
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
              <p className="text-blue-400 text-lg font-bold">{NEXT_JOB_DATE}</p>
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
              <div className="flex items-end gap-3 h-28 mb-3">
                {mockAICostMonthly.map(m => {
                  const pct = maxCost > 0 ? (m.cost / maxCost) * 100 : 0
                  const isLast = m.month === mockAICostMonthly[mockAICostMonthly.length - 1].month
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-zinc-300 text-xs font-semibold">
                        R$ {m.cost.toFixed(2)}
                      </span>
                      <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                        <div
                          className={cn('w-full rounded-t-lg transition-all', isLast ? 'bg-emerald-500' : 'bg-zinc-700')}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 text-xs">{m.month}</span>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
                <div>
                  <p className="text-zinc-500 text-xs">Total (3 meses)</p>
                  <p className="text-zinc-200 font-bold text-sm">R$ {totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Tokens consumidos</p>
                  <p className="text-zinc-200 font-bold text-sm">{totalTokens.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Média por análise</p>
                  <p className="text-zinc-200 font-bold text-sm">R$ {(totalCost / mockJobHistory.reduce((s, j) => s + j.processed, 0)).toFixed(2)}</p>
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
              <div className={cn('p-3 rounded-xl border',
                lastJob.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-yellow-500/5 border-yellow-500/20')}>
                <div className="flex items-center gap-2 mb-1">
                  {lastJob.status === 'success'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                  <span className={cn('text-xs font-semibold',
                    lastJob.status === 'success' ? 'text-emerald-400' : 'text-yellow-400')}>
                    {lastJob.status === 'success' ? 'Concluído com sucesso' : 'Concluído com falhas'}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs">{lastJob.month}</p>
                <p className="text-zinc-500 text-xs">{lastJob.processed}/{lastJob.total} clientes · {lastJob.duration}</p>
                <p className="text-zinc-600 text-xs mt-0.5">{formatDate(lastJob.ranAt)}</p>
              </div>

              {/* Próximo */}
              <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400 text-xs font-semibold">Próximo job</span>
                </div>
                <p className="text-zinc-200 text-sm font-bold">{NEXT_JOB_DATE}</p>
                <p className="text-zinc-500 text-xs">às 06:00 · {clients.length} clientes a processar</p>
              </div>

              {/* Histórico resumido */}
              <div className="space-y-1.5">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Histórico</p>
                {mockJobHistory.map(job => (
                  <div key={job.id} className="flex items-center gap-2 text-xs">
                    {job.status === 'success'
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      : <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />}
                    <span className="text-zinc-400 flex-1">{job.month}</span>
                    <span className="text-zinc-600">{job.processed}/{job.total}</span>
                    <span className="text-zinc-600">R$ {job.costBRL.toFixed(2)}</span>
                  </div>
                ))}
              </div>
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
