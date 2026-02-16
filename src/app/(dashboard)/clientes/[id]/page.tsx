'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, TrendingDown, TrendingUp, Minus,
  CheckSquare, Square, MessageCircle, CreditCard,
  Building2, BarChart2, AlertTriangle, Check,
  RefreshCw, Send, Clock, User, Calendar,
  Phone, Mail, MapPin, FileText, History,
  Plug, Zap, ExternalLink, ChevronRight,
  Shield, Activity, Heart, Star,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { getClientById, getFormsByClientId, getAlertsByClientId } from '@/lib/mock-data'
import { ActionItem, Integration, Trend, PaymentStatus } from '@/types'
import { useAnalysisCredits } from '@/hooks/use-analysis-credits'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
function daysTo(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

const TABS = [
  { id: 'visao-geral',  label: 'Visão Geral',  icon: Activity },
  { id: 'integracoes',  label: 'Integrações',  icon: Plug      },
  { id: 'formularios',  label: 'Formulários',  icon: FileText  },
  { id: 'historico',    label: 'Histórico',    icon: History   },
]

// ── Badge pagamento ───────────────────────────────────────────────
function PaymentBadge({ status }: { status?: PaymentStatus }) {
  if (!status) return null
  const map = {
    em_dia:       { label: 'Em dia',       cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    vencendo:     { label: 'Vencendo',     cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'   },
    inadimplente: { label: 'Inadimplente', cls: 'text-red-400 border-red-500/30 bg-red-500/10'            },
  }
  const { label, cls } = map[status]
  return <Badge variant="outline" className={cn('text-xs', cls)}>{label}</Badge>
}

// ── Trend icon ────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-zinc-500" />
}

// ─────────────────────────────────────────────────────────────────
// TAB 1 — VISÃO GERAL
// ─────────────────────────────────────────────────────────────────
function TabVisaoGeral({ client }: { client: NonNullable<ReturnType<typeof getClientById>> }) {
  const hs = client.healthScore
  const [actions, setActions] = useState<ActionItem[]>(hs?.actionPlan ?? [])
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [analysisMsg, setAnalysisMsg] = useState('')
  const [blockedMsg, setBlockedMsg] = useState(false)
  const credits = useAnalysisCredits('starter') // plano mockado

  async function handleRunAnalysis() {
    if (!credits.canAnalyze) { setBlockedMsg(true); return }
    const ok = credits.consume()
    if (!ok) { setBlockedMsg(true); return }
    setBlockedMsg(false)
    setRunningAnalysis(true)
    setAnalysisMsg('Coletando dados do cliente...')
    await new Promise(r => setTimeout(r, 1000))
    setAnalysisMsg('Processando integrações...')
    await new Promise(r => setTimeout(r, 1200))
    setAnalysisMsg('Gerando diagnóstico...')
    await new Promise(r => setTimeout(r, 1000))
    setRunningAnalysis(false)
    setAnalysisMsg('')
  }

  function toggleAction(id: string) {
    setActions(prev => prev.map(a =>
      a.id === id
        ? { ...a, done: !a.done, doneAt: !a.done ? new Date().toLocaleDateString('pt-BR') : undefined, doneBy: !a.done ? 'Você' : undefined }
        : a
    ))
  }

  const PILLARS = [
    { key: 'financial', label: 'Financeiro',    icon: CreditCard, color: 'emerald', weight: '35%' },
    { key: 'proximity', label: 'Proximidade',   icon: MessageCircle, color: 'blue',    weight: '30%' },
    { key: 'result',    label: 'Resultado',     icon: BarChart2,  color: 'violet',  weight: '25%' },
    { key: 'nps',       label: 'NPS',           icon: Star,       color: 'yellow',  weight: '10%' },
  ] as const

  const colorMap = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500' },
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    bar: 'bg-blue-500'    },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20',  bar: 'bg-violet-500'  },
    yellow:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  bar: 'bg-yellow-500'  },
  }

  if (!hs) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
          <Clock className="w-8 h-8 text-zinc-600" />
        </div>
        <p className="text-zinc-300 font-medium">Cliente em observação</p>
        <p className="text-zinc-500 text-sm max-w-sm">
          O cliente foi cadastrado há menos de 60 dias. A primeira análise de health score será gerada em breve.
        </p>
        <div className="space-y-2 mt-2">
          {!credits.unlimited && (
            <p className={cn('text-xs text-center', credits.remaining > 0 ? 'text-zinc-500' : 'text-red-400')}>
              ⚡ {credits.remaining}/{credits.total} análises disponíveis hoje
            </p>
          )}
          <Button size="sm" onClick={handleRunAnalysis}
            disabled={runningAnalysis || !credits.canAnalyze}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 disabled:opacity-50">
            {runningAnalysis ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />{analysisMsg}</> : <><Zap className="w-3.5 h-3.5" />Rodar análise agora</>}
          </Button>
        </div>
      </div>
    )
  }

  const doneCount = actions.filter(a => a.done).length

  return (
    <div className="space-y-5">

      {/* Rodar análise + créditos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-xs">
            Última análise: <span className="text-zinc-300">{fmtDate(hs.calculatedAt)}</span>
            {' · '}<span className="text-zinc-400">{hs.triggeredBy === 'manual' ? 'Manual' : 'Automática'}</span>
          </p>
          <div className="flex items-center gap-2">
            {/* Indicador de créditos */}
            {!credits.unlimited && (
              <span className={cn('text-xs flex items-center gap-1 px-2 py-1 rounded-lg border',
                credits.remaining > 0
                  ? 'text-zinc-400 border-zinc-700 bg-zinc-800'
                  : 'text-red-400 border-red-500/30 bg-red-500/10'
              )}>
                ⚡ {credits.remaining}/{credits.total} análises hoje
              </span>
            )}
            <Button size="sm" variant="outline" onClick={handleRunAnalysis}
              disabled={runningAnalysis || !credits.canAnalyze}
              className={cn('gap-1.5 text-xs', credits.canAnalyze
                ? 'border-zinc-700 text-zinc-400 hover:text-white'
                : 'border-red-500/30 text-red-400 cursor-not-allowed opacity-60')}>
              {runningAnalysis
                ? <><RefreshCw className="w-3 h-3 animate-spin" />{analysisMsg}</>
                : <><RefreshCw className="w-3 h-3" />Rodar análise</>}
            </Button>
          </div>
        </div>
        {/* Aviso de créditos esgotados */}
        {blockedMsg && (
          <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-red-300 text-xs">
              Você usou todos os {credits.total} créditos de análise do dia.
              Os créditos renovam à meia-noite ou você pode{' '}
              <Link href="/configuracoes" className="text-emerald-400 underline hover:no-underline">fazer upgrade do plano</Link>.
            </p>
          </div>
        )}
      </div>

      {/* Score + flags críticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge */}
        <Card className="bg-zinc-900 border-zinc-800 flex items-center justify-center py-6">
          <CardContent className="p-0 flex flex-col items-center gap-3">
            <ScoreGauge score={hs.scoreTotal} size="lg" />
            <RiskBadge risk={hs.churnRisk} />
            <p className="text-zinc-500 text-xs text-center">
              Probabilidade de churn:<br />
              <span className="text-zinc-300 font-semibold text-sm">
                {hs.churnRisk === 'high' ? 'Alta' : hs.churnRisk === 'medium' ? 'Média' : 'Baixa'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Flags críticas */}
        <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
          <CardContent className="p-4 space-y-3">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Sinais de alerta</p>
            {hs.criticalFlags.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Shield className="w-4 h-4" /> Nenhum sinal crítico detectado
              </div>
            ) : (
              <div className="space-y-2">
                {hs.criticalFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-zinc-300 text-sm">{flag}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mini resumo financeiro */}
            <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-3">
              <div>
                <p className="text-zinc-600 text-xs">Receita mensal</p>
                <p className="text-zinc-200 text-sm font-semibold">
                  {client.clientType === 'mrr' ? fmt(client.contractValue) + '/mês' : fmt(client.totalProjectValue ?? 0) + ' total'}
                </p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs">
                  {client.clientType === 'mrr' ? 'Renova em' : 'Entrega em'}
                </p>
                <p className={cn('text-sm font-semibold', daysTo(client.contractEndDate) <= 20 ? 'text-red-400' : 'text-zinc-200')}>
                  {daysTo(client.contractEndDate)} dias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4 Pilares */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PILLARS.map(({ key, label, icon: Icon, color, weight }) => {
          const pillar = hs.pillars[key]
          const c = colorMap[color]
          return (
            <Card key={key} className={cn('border', c.border, 'bg-zinc-900')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
                    <Icon className={cn('w-4 h-4', c.text)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={pillar.trend} />
                    <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs">{weight}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">{label}</p>
                  <p className={cn('text-2xl font-bold', c.text)}>{pillar.score}</p>
                  <p className="text-zinc-600 text-xs">contribuição: {pillar.contribution.toFixed(1)} pts</p>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', c.bar)} style={{ width: `${pillar.score}%` }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Diagnóstico da IA */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <p className="text-zinc-300 font-semibold text-sm">Diagnóstico da IA</p>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-violet-500/30 pl-3">
            {hs.diagnosis}
          </p>
        </CardContent>
      </Card>

      {/* Plano de ação */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-zinc-300 font-semibold text-sm">Plano de ação</p>
            </div>
            <span className="text-zinc-500 text-xs">{doneCount}/{actions.length} concluídos</span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: actions.length ? `${(doneCount / actions.length) * 100}%` : '0%' }} />
          </div>

          <div className="space-y-2 pt-1">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => toggleAction(action.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all group',
                  action.done
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {action.done
                    ? <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                    : <div className="w-5 h-5 rounded border-2 border-zinc-600 group-hover:border-zinc-400 transition-colors" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', action.done ? 'line-through text-zinc-500' : 'text-zinc-200')}>
                    {action.text}
                  </p>
                  {action.done && action.doneAt && (
                    <p className="text-zinc-600 text-xs mt-0.5 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      Feito por {action.doneBy} em {action.doneAt}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB 2 — INTEGRAÇÕES
// ─────────────────────────────────────────────────────────────────
function TabIntegracoes({ integrations }: { integrations: Integration[] }) {
  const DEFS = [
    { type: 'whatsapp',       label: 'WhatsApp',        sub: 'Análise de sentimento via Evolution API', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10' },
    { type: 'asaas',          label: 'Asaas',           sub: 'Cobranças e status de pagamento',          icon: CreditCard,   color: 'text-blue-400 bg-blue-500/10'    },
    { type: 'dom_pagamentos', label: 'Dom Pagamentos',  sub: 'Gateway alternativo de cobranças',         icon: Building2,    color: 'text-violet-400 bg-violet-500/10' },
    { type: 'meta_ads',       label: 'Meta Ads',        sub: 'Performance de campanhas no Facebook/Instagram', icon: BarChart2, color: 'text-blue-500 bg-blue-600/10'  },
    { type: 'google_ads',     label: 'Google Ads',      sub: 'Performance de campanhas no Google',       icon: BarChart2,    color: 'text-red-400 bg-red-500/10'       },
  ] as const

  const statusConfig = {
    connected:    { label: 'Conectado',    cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    error:        { label: 'Erro',         cls: 'text-red-400 border-red-500/30 bg-red-500/10'             },
    expired:      { label: 'Expirado',     cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'   },
    disconnected: { label: 'Desconectado', cls: 'text-zinc-500 border-zinc-700 bg-zinc-800'               },
  }

  return (
    <div className="space-y-3">
      {DEFS.map(({ type, label, sub, icon: Icon, color }) => {
        const integ = integrations.find(i => i.type === type)
        const status = integ?.status ?? 'disconnected'
        const sc = statusConfig[status]
        const isConnected = status === 'connected'
        const hasIssue = status === 'error' || status === 'expired'

        return (
          <Card key={type} className={cn('border', hasIssue ? 'border-red-500/20 bg-red-500/3' : 'border-zinc-800 bg-zinc-900')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-zinc-200 font-medium text-sm">{label}</p>
                    <Badge variant="outline" className={cn('text-xs', sc.cls)}>
                      {isConnected ? '●' : hasIssue ? '⚠' : '○'} {sc.label}
                    </Badge>
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>
                  {integ?.lastSyncAt && (
                    <p className="text-zinc-600 text-xs mt-0.5">
                      Última sync: {fmtDate(integ.lastSyncAt)}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {isConnected ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"
                        className="border-zinc-700 text-zinc-400 hover:text-white gap-1 text-xs">
                        <ExternalLink className="w-3 h-3" /> Abrir
                      </Button>
                      <Button size="sm" variant="outline"
                        className="border-zinc-700 text-zinc-500 hover:text-red-400 text-xs">
                        Desconectar
                      </Button>
                    </div>
                  ) : hasIssue ? (
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1 text-xs">
                      <RefreshCw className="w-3 h-3" /> Reconectar
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs">
                      <Zap className="w-3 h-3" /> Conectar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB 3 — FORMULÁRIOS
// ─────────────────────────────────────────────────────────────────
function TabFormularios({ clientId }: { clientId: string }) {
  const forms = getFormsByClientId(clientId)
  const responded = forms.filter(f => f.respondedAt)
  const responseRate = forms.length ? Math.round((responded.length / forms.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Stats + enviar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-zinc-200 text-xl font-bold">{forms.length}</p>
            <p className="text-zinc-500 text-xs">formulários enviados</p>
          </div>
          <div>
            <p className="text-zinc-200 text-xl font-bold">{responseRate}%</p>
            <p className="text-zinc-500 text-xs">taxa de resposta</p>
          </div>
          {forms.length > 0 && responded.length > 0 && (
            <div>
              <p className="text-zinc-200 text-xl font-bold">
                {(responded.reduce((s, f) => s + (f.npsScore ?? 0), 0) / responded.length).toFixed(1)}
              </p>
              <p className="text-zinc-500 text-xs">NPS médio</p>
            </div>
          )}
        </div>
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
          <Send className="w-3.5 h-3.5" /> Enviar formulário
        </Button>
      </div>

      {/* Lista */}
      {forms.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum formulário enviado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(f => {
            const responded = !!f.respondedAt
            return (
              <Card key={f.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', responded
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-zinc-500 border-zinc-700')}>
                          {responded ? '✓ Respondido' : '⏳ Aguardando'}
                        </Badge>
                        <span className="text-zinc-600 text-xs">Enviado em {fmtDate(f.sentAt)}</span>
                      </div>
                      {responded && f.respondedAt && (
                        <p className="text-zinc-500 text-xs">
                          Respondido em {fmtDate(f.respondedAt)}
                          {f.daysToRespond && ` · ${f.daysToRespond} dias para responder`}
                        </p>
                      )}
                      {f.comment && (
                        <p className="text-zinc-400 text-sm italic mt-1">"{f.comment}"</p>
                      )}
                    </div>
                    {responded && (
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        {f.npsScore !== undefined && (
                          <div>
                            <p className="text-zinc-200 font-bold text-lg">{f.npsScore}</p>
                            <p className="text-zinc-600 text-xs">NPS</p>
                          </div>
                        )}
                        {f.resultScore !== undefined && (
                          <div>
                            <p className="text-zinc-200 font-bold text-lg">{f.resultScore}</p>
                            <p className="text-zinc-600 text-xs">Resultado</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB 4 — HISTÓRICO
// ─────────────────────────────────────────────────────────────────
function TabHistorico({ clientId }: { clientId: string }) {
  const alerts = getAlertsByClientId(clientId)

  const MOCK_EVENTS = [
    { id: 'ev1', date: '2026-02-05', icon: RefreshCw, color: 'text-violet-400 bg-violet-500/15', title: 'Análise automática executada', sub: 'Score: 32 · Risco: Alto' },
    { id: 'ev2', date: '2026-02-03', icon: AlertTriangle, color: 'text-red-400 bg-red-500/15',    title: 'Pagamento em atraso detectado', sub: 'R$ 4.500 — 8 dias em atraso' },
    { id: 'ev3', date: '2026-01-28', icon: Send,     color: 'text-blue-400 bg-blue-500/15',    title: 'Formulário de satisfação enviado', sub: 'Respondido em 3 dias — NPS: 6' },
    { id: 'ev4', date: '2026-01-15', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/15', title: 'Grupo de WhatsApp integrado', sub: 'Grupo: Bella Forma × Agência' },
    { id: 'ev5', date: '2026-01-10', icon: Check,    color: 'text-emerald-400 bg-emerald-500/15', title: 'Ação concluída: relatório enviado', sub: 'Por Arthur · Plano de Jan/26' },
    { id: 'ev6', date: '2025-12-05', icon: RefreshCw, color: 'text-violet-400 bg-violet-500/15', title: 'Análise automática executada', sub: 'Score: 41 · Risco: Médio' },
    { id: 'ev7', date: '2025-06-01', icon: User,     color: 'text-zinc-400 bg-zinc-700',        title: 'Cliente cadastrado', sub: 'Início do contrato MRR' },
  ]

  return (
    <div className="space-y-1">
      {MOCK_EVENTS.map((ev, i) => {
        const Icon = ev.icon
        return (
          <div key={ev.id} className="flex gap-3">
            {/* Linha do tempo */}
            <div className="flex flex-col items-center">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', ev.color)}>
                <Icon className="w-4 h-4" />
              </div>
              {i < MOCK_EVENTS.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-1" />}
            </div>
            {/* Conteúdo */}
            <div className="pb-5 flex-1">
              <p className="text-zinc-200 text-sm font-medium">{ev.title}</p>
              <p className="text-zinc-500 text-xs">{ev.sub}</p>
              <p className="text-zinc-700 text-xs mt-0.5">{fmtDate(ev.date)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('visao-geral')

  const client = getClientById(id)

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-zinc-300">Cliente não encontrado</p>
          <Link href="/clientes" className="text-emerald-400 text-sm hover:underline">← Voltar para clientes</Link>
        </div>
      </div>
    )
  }

  const daysToEnd = daysTo(client.contractEndDate)
  const risk = client.healthScore?.churnRisk ?? 'observacao'

  return (
    <div className="min-h-screen">
      {/* Header do perfil */}
      <div className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <div className="px-6 pt-4 pb-0">

          {/* Breadcrumb + ações */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/clientes')}
                className="text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-700">/</span>
              <Link href="/clientes" className="text-zinc-500 hover:text-zinc-300 text-sm">Clientes</Link>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-300 text-sm">{client.nomeResumido ?? client.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/clientes/${id}/editar`}>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white text-xs">
                  Editar cadastro
                </Button>
              </Link>
            </div>
          </div>

          {/* Identidade do cliente */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 font-bold text-lg">
              {(client.nomeResumido ?? client.name).charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-white font-bold text-lg">{client.nomeResumido ?? client.name}</h1>
                <RiskBadge risk={risk} />
                <Badge variant="outline" className={cn('text-xs border font-medium',
                  client.clientType === 'mrr' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                )}>
                  {client.clientType.toUpperCase()}
                </Badge>
                <PaymentBadge status={client.paymentStatus} />
              </div>

              <p className="text-zinc-400 text-sm mt-0.5">{client.razaoSocial}</p>

              {/* Linha de detalhes */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-500 mt-1.5">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{client.segment}</span>
                {client.nomeDecisor && <span className="flex items-center gap-1"><User className="w-3 h-3" />{client.nomeDecisor}</span>}
                {client.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.telefone}</span>}
                {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
              </div>

              {/* Linha do contrato */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Início: {fmtDate(client.contractStartDate)}
                </span>
                <span>·</span>
                <span className={cn('flex items-center gap-1', daysToEnd <= 20 ? 'text-red-400 font-medium' : '')}>
                  <Clock className="w-3 h-3" />
                  {client.clientType === 'mrr' ? 'Renova' : 'Encerra'} em {daysToEnd} dias ({fmtDate(client.contractEndDate)})
                </span>
                <span>·</span>
                <span className="text-zinc-400 font-medium">
                  {client.clientType === 'mrr' ? fmt(client.contractValue) + '/mês' : fmt(client.totalProjectValue ?? 0) + ' total'}
                </span>
              </div>
            </div>

            {/* Score compacto */}
            {client.healthScore && (
              <div className="shrink-0 hidden md:block">
                <ScoreGauge score={client.healthScore.scoreTotal} size="sm" />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 -mb-px">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                    isActive
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo da tab */}
      <div className="p-6 max-w-4xl">
        {activeTab === 'visao-geral' && <TabVisaoGeral client={client} />}
        {activeTab === 'integracoes' && <TabIntegracoes integrations={client.integrations} />}
        {activeTab === 'formularios' && <TabFormularios clientId={client.id} />}
        {activeTab === 'historico' && <TabHistorico clientId={client.id} />}
      </div>
    </div>
  )
}
