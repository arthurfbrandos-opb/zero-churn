'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, TrendingDown, TrendingUp, Minus,
  CheckSquare, Square, MessageCircle, CreditCard,
  Building2, BarChart2, AlertTriangle, Check,
  RefreshCw, Send, Clock, User, Calendar,
  Phone, Mail, MapPin, FileText, History,
  Plug, Zap, ExternalLink, ChevronRight,
  Shield, Activity, Heart, Star, UserMinus, UserCheck, Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { Client, ActionItem, Integration, Trend, PaymentStatus, ChurnRecord } from '@/types'
import { useAnalysisCredits } from '@/hooks/use-analysis-credits'
import { getNpsClassification, isInObservation } from '@/lib/nps-utils'
import { ChurnModal, CHURN_CATEGORIES } from '@/components/dashboard/churn-modal'
import { useClient } from '@/hooks/use-client'
import { Loader2 } from 'lucide-react'
import { AsaasLinkModal } from '@/components/integracoes/asaas-link-modal'
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
  { id: 'visao-geral',  label: 'Visão Geral',  icon: Activity  },
  { id: 'cadastro',     label: 'Cadastro',     icon: Building2 },
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
function TabVisaoGeral({ client }: { client: Client }) {
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
            {(hs.criticalFlags ?? hs.flags ?? []).length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Shield className="w-4 h-4" /> Nenhum sinal crítico detectado
              </div>
            ) : (
              <div className="space-y-2">
                {(hs.criticalFlags ?? hs.flags ?? []).map((flag, i) => (
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
                  {client.clientType === 'mrr' ? fmt(client.contractValue ?? 0) + '/mês' : fmt(client.totalProjectValue ?? 0) + ' total'}
                </p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs">
                  {client.clientType === 'mrr' ? 'Renova em' : 'Entrega em'}
                </p>
                <p className={cn('text-sm font-semibold', daysTo(client.contractEndDate ?? "") <= 20 ? 'text-red-400' : 'text-zinc-200')}>
                  {daysTo(client.contractEndDate ?? "")} dias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4 Pilares */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PILLARS.map(({ key, label, icon: Icon, color, weight }) => {
          const pillar = hs.pillars?.[key]
          const c = colorMap[color]
          const pillarScore = pillar?.score ?? 0
          const pillarContrib = pillar?.contribution ?? 0
          return (
            <Card key={key} className={cn('border', c.border, 'bg-zinc-900')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
                    <Icon className={cn('w-4 h-4', c.text)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={pillar?.trend ?? 'stable'} />
                    <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs">{weight}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">{label}</p>
                  <p className={cn('text-2xl font-bold', c.text)}>{pillarScore}</p>
                  <p className="text-zinc-600 text-xs">contribuição: {pillarContrib.toFixed(1)} pts</p>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', c.bar)} style={{ width: `${pillarScore}%` }} />
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
// TAB 2 — CADASTRO
// ─────────────────────────────────────────────────────────────────
function TabCadastro({ client }: { client: Client }) {
  const raw = client as unknown as Record<string, unknown>
  const clientType = client.clientType ?? 'mrr'
  const mrrVal = client.mrrValue ?? client.contractValue
  const tcvVal = client.tcvValue ?? client.totalProjectValue

  const fmtCnpj = (v?: string) => {
    if (!v) return null
    const d = v.replace(/\D/g, '')
    if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
    if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
    return v
  }
  const fmtDate  = (v?: string) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : null
  const fmtMoney = (v?: number) => v != null ? v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : null

  const F = ({ label, value, full }: { label: string; value?: string | null; full?: boolean }) => (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      {value ? <p className="text-zinc-200 text-sm break-all">{value}</p>
             : <p className="text-zinc-600 text-sm italic">Não informado</p>}
    </div>
  )

  const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-zinc-200 font-semibold text-sm">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
      </CardContent>
    </Card>
  )

  const hasAddress = !!(raw.logradouro || raw.cep || raw.cidade)

  return (
    <div className="space-y-4">

      <S title="Identificação da empresa">
        <F label="Razão Social"      value={client.razaoSocial || client.name} full />
        <F label="Nome Resumido"     value={client.nomeResumido} />
        <F label="CNPJ / CPF"        value={fmtCnpj(client.cnpj ?? client.cnpjCpf)} />
        <F label="Segmento"          value={client.segment} />
        <F label="Nome do Decisor"   value={client.nomeDecisor} />
        <F label="Telefone"          value={client.telefone} />
        <F label="E-mail"            value={client.email} />
        <F label="E-mail Financeiro" value={client.emailFinanceiro} />
      </S>

      {hasAddress && (
        <S title="Endereço">
          <F label="CEP"         value={raw.cep         ? String(raw.cep)          : null} />
          <F label="Estado"      value={raw.estado      ? String(raw.estado)       : null} />
          <F label="Logradouro"  value={raw.logradouro  ? String(raw.logradouro)   : null} full />
          <F label="Número"      value={raw.numero      ? String(raw.numero)       : null} />
          <F label="Complemento" value={raw.complemento ? String(raw.complemento)  : null} />
          <F label="Bairro"      value={raw.bairro      ? String(raw.bairro)       : null} />
          <F label="Cidade"      value={raw.cidade      ? String(raw.cidade)       : null} />
        </S>
      )}

      <S title="Contrato">
        <F label="Tipo" value={clientType === 'mrr' ? 'MRR — Recorrente mensal' : 'TCV — Projeto com valor fixo'} />
        <F label="Início do contrato" value={fmtDate(client.contractStartDate)} />
        {clientType === 'mrr' && <F label="Mensalidade (MRR)"        value={fmtMoney(mrrVal)} />}
        {clientType === 'tcv' && <F label="Valor total do projeto"    value={fmtMoney(tcvVal)} />}
        <F label="Cadastrado em" value={fmtDate(client.createdAt)} />
      </S>

      {client.observations && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-2">
            <h3 className="text-zinc-200 font-semibold text-sm">Observações</h3>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{client.observations}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Link href={`/clientes/${client.id}/editar`}>
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Editar cadastro
          </Button>
        </Link>
        {client.email && (
          <a href={`mailto:${client.email}`}>
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5" /> Enviar e-mail
            </Button>
          </a>
        )}
        {client.telefone && (
          <a href={`https://wa.me/55${client.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="border-emerald-700/40 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB 3 — INTEGRAÇÕES
// ─────────────────────────────────────────────────────────────────
function TabIntegracoes({ client, refetch }: { client: Client; refetch: () => void }) {
  const [asaasModal, setAsaasModal] = useState(false)

  const integrations = client.integrations ?? []

  const DEFS = [
    { type: 'whatsapp',       label: 'WhatsApp',        sub: 'Análise de sentimento via Evolution API',       icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10' },
    { type: 'asaas',          label: 'Asaas',           sub: 'Cobranças e status de pagamento em tempo real', icon: CreditCard,    color: 'text-blue-400 bg-blue-500/10'       },
    { type: 'dom_pagamentos', label: 'Dom Pagamentos',  sub: 'Gateway alternativo de cobranças',              icon: Building2,     color: 'text-violet-400 bg-violet-500/10'   },
  ] as const

  const statusConfig = {
    connected:    { label: 'Conectado',    cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    error:        { label: 'Erro',         cls: 'text-red-400 border-red-500/30 bg-red-500/10'             },
    expired:      { label: 'Expirado',     cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'    },
    disconnected: { label: 'Desconectado', cls: 'text-zinc-500 border-zinc-700 bg-zinc-800'                },
  }

  function handleConnect(type: string) {
    if (type === 'asaas') setAsaasModal(true)
  }

  return (
    <>
      <div className="space-y-3">
        {DEFS.map(({ type, label, sub, icon: Icon, color }) => {
          const integ = integrations.find(i => i.type === type)
          const status = (integ?.status ?? 'disconnected') as keyof typeof statusConfig
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
                          onClick={() => handleConnect(type)}
                          className="border-zinc-700 text-zinc-400 hover:text-white gap-1 text-xs">
                          <RefreshCw className="w-3 h-3" /> Reconfigurar
                        </Button>
                      </div>
                    ) : hasIssue ? (
                      <Button size="sm" onClick={() => handleConnect(type)}
                        className="bg-red-500 hover:bg-red-600 text-white gap-1 text-xs">
                        <RefreshCw className="w-3 h-3" /> Reconectar
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleConnect(type)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs">
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

      {asaasModal && (
        <AsaasLinkModal
          clientId={client.id}
          clientName={client.nomeResumido ?? client.name}
          clientCnpj={client.cnpj}
          onSuccess={() => { setAsaasModal(false); refetch() }}
          onClose={() => setAsaasModal(false)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB 3 — FORMULÁRIOS
// ─────────────────────────────────────────────────────────────────
function TabFormularios({ clientId, client }: { clientId: string; client: Client }) {
  // Usa o último formulário disponível no cliente (vindo do hook)
  const lastForm = client.lastFormSubmission
  const forms = lastForm ? [lastForm] : []
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
                        {f.npsScore !== undefined && (() => {
                          const cls = getNpsClassification(f.npsScore!)
                          return (
                            <div className="text-center">
                              <p className={cn('font-bold text-lg', cls.color)}>{f.npsScore}</p>
                              <p className={cn('text-xs font-medium', cls.color)}>{cls.label}</p>
                              <p className="text-zinc-600 text-xs">NPS</p>
                            </div>
                          )
                        })()}
                        {f.resultScore !== undefined && (
                          <div className="text-center">
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
  const alerts: unknown[] = [] // será conectado via API na Sprint 2

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
function ClientePerfilInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'visao-geral'
  const [activeTab, setActiveTab]     = useState(initialTab)
  const [showChurnModal, setShowChurnModal]   = useState(false)
  const [churnRecord, setChurnRecord]          = useState<ChurnRecord | undefined>(undefined)
  const [isInactive, setIsInactive]            = useState(false)
  const [showDeleteModal, setShowDeleteModal]  = useState(false)
  const [deleting, setDeleting]                = useState(false)

  const { client, loading, error, refetch } = useClient(id)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert('Erro ao excluir: ' + (d.error ?? `HTTP ${res.status}`))
        setDeleting(false)
        return
      }
      router.push('/clientes')
    } catch (err) {
      alert('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
    </div>
  )

  if (error || !client) return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-zinc-300">{error ?? 'Cliente não encontrado'}</p>
        <Link href="/clientes" className="text-emerald-400 text-sm hover:underline">← Voltar para clientes</Link>
      </div>
    </div>
  )

  const daysToEnd = daysTo(client.contractEndDate ?? "")
  const risk = client.healthScore?.churnRisk ?? 'observacao'

  function handleInactivate(record: ChurnRecord) {
    setChurnRecord(record)
    setIsInactive(true)
    setShowChurnModal(false)
  }

  const churnCatInfo = churnRecord
    ? CHURN_CATEGORIES.find(c => c.id === churnRecord.category)
    : null

  return (
    <div className="min-h-screen">
      {/* Modal de inativação */}
      {showChurnModal && (
        <ChurnModal
          clientName={client.nomeResumido ?? client.name}
          clientType={client.clientType}
          onConfirm={handleInactivate}
          onClose={() => setShowChurnModal(false)}
        />
      )}

      {/* Modal de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Excluir cliente permanentemente?</p>
                <p className="text-zinc-500 text-xs mt-0.5">{client.nomeResumido ?? client.name}</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Esta ação é <span className="text-red-400 font-medium">irreversível</span>. Todo o histórico, health scores,
              análises e integrações do cliente serão apagados permanentemente.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Button variant="outline" size="sm" className="flex-1 border-zinc-700 text-zinc-400 hover:text-white"
                onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Excluindo...</> : <><Trash2 className="w-3.5 h-3.5" /> Excluir</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header do perfil */}
      <div className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <div className="px-4 lg:px-6 pt-4 pb-0">

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
              {isInactive ? (
                <Button size="sm" variant="outline"
                  onClick={() => { setIsInactive(false); setChurnRecord(undefined) }}
                  className="border-emerald-700/40 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Reativar cliente
                </Button>
              ) : (
                <Button size="sm" variant="outline"
                  onClick={() => setShowChurnModal(true)}
                  className="border-red-800/40 text-red-400 hover:bg-red-500/10 text-xs gap-1.5">
                  <UserMinus className="w-3.5 h-3.5" /> Inativar
                </Button>
              )}
              <Button size="sm" variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="border-red-900/50 text-red-600 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 text-xs gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
              <Link href={`/clientes/${id}/editar`}>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white text-xs">
                  Editar cadastro
                </Button>
              </Link>
            </div>
          </div>

          {/* Banner de inativo */}
          {isInactive && churnRecord && churnCatInfo && (
            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              {(() => { const Icon = churnCatInfo.icon; return <Icon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-red-300 text-sm font-semibold">Cliente inativo</p>
                  <span className="text-xs text-red-500 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded">
                    {churnCatInfo.label}
                  </span>
                  <span className="text-zinc-600 text-xs">
                    Inativado em {new Date(churnRecord.inactivatedAt).toLocaleDateString('pt-BR')}
                    {churnRecord.inactivatedBy ? ` por ${churnRecord.inactivatedBy}` : ''}
                  </span>
                </div>
                {churnRecord.detail && (
                  <p className="text-red-400/70 text-xs mt-1 leading-relaxed">{churnRecord.detail}</p>
                )}
              </div>
            </div>
          )}

          {/* Identidade do cliente */}
          <div className={cn('flex items-start gap-4 mb-4', isInactive && 'opacity-60')}>
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
                {isInactive && (
                  <Badge variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/10 gap-1">
                    <UserMinus className="w-2.5 h-2.5" /> Inativo
                  </Badge>
                )}
                {!isInactive && <PaymentBadge status={client.paymentStatus} />}
                {/* NPS classification */}
                {client.lastFormSubmission?.npsScore !== undefined && (() => {
                  const nps = client.lastFormSubmission!.npsScore!
                  const cls = getNpsClassification(nps)
                  return (
                    <Badge variant="outline" className={cn('text-xs', cls.color, cls.bg, cls.border)}>
                      NPS {nps} · {cls.label}
                    </Badge>
                  )
                })()}
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
                  {client.clientType === 'mrr' ? fmt(client.contractValue ?? 0) + '/mês' : fmt(client.totalProjectValue ?? 0) + ' total'}
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
          <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-none">
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
      <div className="p-4 lg:p-6 max-w-4xl">
        {activeTab === 'visao-geral' && <TabVisaoGeral client={client} />}
        {activeTab === 'cadastro'    && <TabCadastro client={client} />}
        {activeTab === 'integracoes' && <TabIntegracoes client={client} refetch={refetch} />}
        {activeTab === 'formularios' && <TabFormularios clientId={client.id} client={client} />}
        {activeTab === 'historico'   && <TabHistorico clientId={client.id} />}
      </div>
    </div>
  )
}

export default function ClientePerfilPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-zinc-500 text-sm">Carregando...</div></div>}>
      <ClientePerfilInner />
    </Suspense>
  )
}
