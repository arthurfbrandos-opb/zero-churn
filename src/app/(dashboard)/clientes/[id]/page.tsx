'use client'

import { useState, useEffect } from 'react'
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
  FolderOpen, Upload, Download, File, X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { Client, ActionItem, Integration, Trend, PaymentStatus, ChurnRecord } from '@/types'
import { getNpsClassification, isInObservation } from '@/lib/nps-utils'
import { ChurnModal, CHURN_CATEGORIES } from '@/components/dashboard/churn-modal'
import { useClient } from '@/hooks/use-client'
import { Loader2, Plus, Search, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

import { AsaasCobrancaModal } from '@/components/integracoes/asaas-cobranca-modal'

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
  { id: 'visao-geral',  label: 'Visão Geral',  icon: Activity    },
  { id: 'cadastro',     label: 'Cadastro',     icon: Building2   },
  { id: 'financeiro',   label: 'Financeiro',   icon: CreditCard  },
  { id: 'pasta',        label: 'Contrato',     icon: FileText    },
  { id: 'integracoes',  label: 'Integrações',  icon: Plug        },
  { id: 'formularios',  label: 'Formulários',  icon: FileText    },
  { id: 'sentimento',   label: 'Sentimento',   icon: Heart       },
  { id: 'historico',    label: 'Histórico',    icon: History     },
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
function TabVisaoGeral({ client, refetch }: { client: Client; refetch: () => void }) {
  const hs = client.healthScore
  const [actions, setActions] = useState<ActionItem[]>(hs?.actionPlan ?? [])
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [analysisMsg, setAnalysisMsg]         = useState('')
  const [analysisError, setAnalysisError]     = useState<string | null>(null)


  async function handleRunAnalysis() {
    setAnalysisError(null)
    setRunningAnalysis(true)

    // Mensagens de progresso enquanto aguarda a análise
    const steps = [
      'Coletando dados financeiros…',
      'Processando formulários NPS…',
      'Calculando health score…',
      'Gerando diagnóstico com IA…',
    ]
    let stepIdx = 0
    setAnalysisMsg(steps[0])
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length
      setAnalysisMsg(steps[stepIdx])
    }, 3000)

    try {
      const res  = await fetch(`/api/analysis/${client.id}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setAnalysisError(data.error ?? 'Erro ao executar análise')
      } else if (data.skipped) {
        setAnalysisError(data.skipReason ?? 'Análise pulada')
      } else {
        // Recarrega o perfil do cliente para exibir o novo score
        refetch()
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      clearInterval(interval)
      setRunningAnalysis(false)
      setAnalysisMsg('')
    }
  }

  async function toggleAction(id: string) {
    // Atualiza estado local imediatamente (optimistic update)
    const newDone = !actions.find(a => a.id === id)?.done
    setActions(prev => prev.map(a =>
      a.id === id
        ? { ...a, done: newDone, doneAt: newDone ? new Date().toLocaleDateString('pt-BR') : undefined, doneBy: newDone ? 'Você' : undefined }
        : a
    ))
    // Persiste no banco (fire-and-forget — UI já foi atualizada otimisticamente)
    fetch(`/api/clients/${client.id}/action-items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, isDone: newDone }),
    }).catch(err => console.warn('[action-items] falha ao persistir:', err))
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
          <Button size="sm" onClick={handleRunAnalysis}
            disabled={runningAnalysis}
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
            Última análise: <span className="text-zinc-300">{fmtDate(hs.analyzedAt ?? hs.calculatedAt)}</span>
            {' · '}<span className="text-zinc-400">{hs.triggeredBy === 'manual' ? 'Manual' : 'Automática'}</span>
          </p>
          <div className="flex items-center gap-2">
            {/* Indicador de créditos */}
            <Button size="sm" variant="outline" onClick={handleRunAnalysis}
              disabled={runningAnalysis}
              className="gap-1.5 text-xs border-zinc-700 text-zinc-400 hover:text-white">
              {runningAnalysis
                ? <><RefreshCw className="w-3 h-3 animate-spin" />{analysisMsg}</>
                : <><RefreshCw className="w-3 h-3" />Rodar análise</>}
            </Button>
          </div>
        </div>
        {/* Erro de análise */}
        {analysisError && (
          <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-red-300 text-xs">{analysisError}</p>
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
          const pillar  = hs.pillars?.[key]
          const c       = colorMap[color]
          const rawScore = pillar?.score ?? null
          // Sem dados do banco: tenta pegar dos campos diretos do health score
          const scoreFromHs = key === 'financial'  ? (hs.scoreFinanceiro  ?? null)
                            : key === 'proximity'  ? (hs.scoreProximidade ?? null)
                            : key === 'result'     ? (hs.scoreResultado   ?? null)
                            : key === 'nps'        ? (hs.scoreNps         ?? null)
                            : null
          const pillarScore  = rawScore ?? scoreFromHs
          const hasData      = pillarScore !== null
          const displayScore = hasData ? pillarScore : 0
          const pillarContrib = pillar?.contribution ?? 0
          return (
            <Card key={key} className={cn('border bg-zinc-900', hasData ? c.border : 'border-zinc-800 opacity-60')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', hasData ? c.bg : 'bg-zinc-800')}>
                    <Icon className={cn('w-4 h-4', hasData ? c.text : 'text-zinc-600')} />
                  </div>
                  <div className="flex items-center gap-1">
                    {hasData && <TrendIcon trend={pillar?.trend ?? 'stable'} />}
                    <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs">{weight}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">{label}</p>
                  {hasData ? (
                    <>
                      <p className={cn('text-2xl font-bold', c.text)}>{displayScore}</p>
                      {pillarContrib > 0 && <p className="text-zinc-600 text-xs">contribuição: {pillarContrib.toFixed(1)} pts</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-zinc-600 text-lg font-bold">—</p>
                      <p className="text-zinc-600 text-xs">
                        {key === 'proximity' ? 'WhatsApp não conectado' : 'Sem dados'}
                      </p>
                    </>
                  )}
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', hasData ? c.bar : 'bg-zinc-700')}
                    style={{ width: `${displayScore}%` }} />
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
  const c = client as unknown as Record<string, unknown>
  const clientType  = client.clientType ?? 'mrr'
  // Entregáveis/bônus: armazenados como array de nomes (ou IDs resolvíveis via localStorage)
  const entregaveis = (client.entregaveisIncluidos ?? []).map(v => typeof v === 'string' ? v : String(v)).filter(Boolean)
  const bonus       = (client.bonusIncluidos ?? []).map(v => typeof v === 'string' ? v : String(v)).filter(Boolean)
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

  const hasAddress = !!(c.logradouro || c.cep || c.cidade)

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
          <F label="CEP"         value={c.cep         ? String(c.cep)         : null} />
          <F label="Estado"      value={c.estado      ? String(c.estado)      : null} />
          <F label="Logradouro"  value={c.logradouro  ? String(c.logradouro)  : null} full />
          <F label="Número"      value={c.numero      ? String(c.numero)      : null} />
          <F label="Complemento" value={c.complemento ? String(c.complemento) : null} />
          <F label="Bairro"      value={c.bairro      ? String(c.bairro)      : null} />
          <F label="Cidade"      value={c.cidade      ? String(c.cidade)      : null} />
        </S>
      )}

      <S title="Contrato">
        <F label="Tipo" value={clientType === 'mrr' ? 'Recorrente mensal' : 'Projeto com valor fixo'} />
        <F label="Início do contrato" value={fmtDate(client.contractStartDate)} />
        {clientType === 'mrr' && <F label="Mensalidade mensal"     value={fmtMoney(mrrVal)} />}
        {clientType === 'tcv' && <F label="Valor total do projeto" value={fmtMoney(tcvVal)} />}
        <F label="Cadastrado em" value={fmtDate(client.createdAt)} />
      </S>

      {/* Entregáveis */}
      {entregaveis.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-zinc-200 font-semibold text-sm">Entregáveis do contrato</h3>
            <ul className="space-y-1.5">
              {entregaveis.map((name, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
            {bonus.length > 0 && (
              <>
                <h4 className="text-zinc-400 text-xs font-medium pt-2">Bônus incluídos</h4>
                <ul className="space-y-1">
                  {bonus.map((name, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-yellow-400 mt-0.5">★</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contexto / Briefing */}
      {(client.resumoReuniao || client.expectativasCliente || client.principaisDores || client.nichoEspecifico) && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-zinc-200 font-semibold text-sm">Contexto do cliente</h3>
            {client.nichoEspecifico && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Nicho específico</p>
                <p className="text-zinc-300 text-sm">{client.nichoEspecifico}</p>
              </div>
            )}
            {client.resumoReuniao && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Resumo da reunião de fechamento</p>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{client.resumoReuniao}</p>
              </div>
            )}
            {client.expectativasCliente && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Expectativas declaradas</p>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{client.expectativasCliente}</p>
              </div>
            )}
            {client.principaisDores && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">Principais dores e motivações</p>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{client.principaisDores}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
// ─────────────────────────────────────────────────────────────────
// TAB — FINANCEIRO
// ─────────────────────────────────────────────────────────────────

type PaymentWithAccount = {
  id: string; value: number; dueDate: string; paymentDate: string | null
  status: string; billingType: string; description: string | null
  invoiceUrl: string | null; _customerName: string | null
}
type SubWithAccount = {
  id: string; value: number; cycle: string; nextDueDate: string
  status: string; description: string | null; _customerName: string | null
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  RECEIVED:          { label: 'Recebido',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  CONFIRMED:         { label: 'Confirmado',  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  RECEIVED_IN_CASH:  { label: 'Recebido',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  PENDING:           { label: 'Pendente',    cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30'         },
  OVERDUE:           { label: 'Vencido',     cls: 'text-red-400 bg-red-500/10 border-red-500/30'            },
  REFUNDED:          { label: 'Estornado',   cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'   },
  REFUND_REQUESTED:  { label: 'Estorno req.', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  CHARGEBACK_REQUESTED: { label: 'Chargeback', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
}

const BILLING_LABEL: Record<string, string> = {
  BOLETO: 'Boleto', PIX: 'PIX', CREDIT_CARD: 'Cartão', UNDEFINED: 'Boleto / PIX',
}

const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', SEMIANNUALLY: 'Semestral', YEARLY: 'Anual',
}

// ── Helpers moeda ────────────────────────────────────────────────
function parseMoney(str: string): number {
  if (!str) return 0
  const clean = str.replace(/R\$\s?/g, '').trim()
  if (clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(clean.replace(/[^\d.]/g, '')) || 0
}
function formatMoney(str: string): string {
  const n = parseMoney(str)
  if (!n) return str
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── EditablePayRow — linha de cobrança com edição inline ────────
function EditablePayRow({
  p, accounts, onUpdated, onCancelled,
}: {
  p: PaymentWithAccount
  accounts: { id: string; name: string }[]
  onUpdated:  (id: string, value: number, dueDate: string) => void
  onCancelled:(id: string) => void
}) {
  const isPaid    = ['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(p.status)
  const isOverdue = p.status === 'OVERDUE'
  const isPending = p.status === 'PENDING'
  const canEdit   = isPending || isOverdue

  const [mode, setMode]         = useState<'view' | 'edit' | 'confirm-cancel'>('view')
  const [editVal, setEditVal]   = useState(() =>
    p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
  const [editDate, setEditDate] = useState(p.dueDate)
  const [editDesc, setEditDesc] = useState(p.description ?? '')
  const [saving, setSaving]     = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const sc    = STATUS_LABEL[p.status] ?? { label: p.status, cls: 'text-zinc-500 bg-zinc-800 border-zinc-700' }
  const today = new Date().toISOString().slice(0, 10)

  async function handleSave() {
    const val = parseMoney(editVal)
    if (!val || val <= 0) { setRowError('Valor inválido'); return }
    if (!editDate)        { setRowError('Data inválida'); return }
    setSaving(true); setRowError(null)
    const res = await fetch(`/api/asaas/payments/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: val, dueDate: editDate, description: editDesc || undefined }),
    })
    const d = await res.json()
    if (!res.ok) { setRowError(d.error ?? 'Erro ao salvar'); setSaving(false); return }
    onUpdated(p.id, val, editDate)
    setMode('view'); setSaving(false)
  }

  async function handleConfirmCancel() {
    setSaving(true)
    const res = await fetch(`/api/asaas/payments/${p.id}`, { method: 'DELETE' })
    if (res.ok) { onCancelled(p.id) }
    else {
      const d = await res.json()
      setRowError(d.error ?? 'Erro ao cancelar')
      setSaving(false); setMode('view')
    }
  }

  const borderCls = isOverdue ? 'border-red-500/20 bg-red-500/5'
                  : isPending ? 'border-blue-500/15 bg-blue-500/5'
                              : 'border-zinc-700/50 bg-zinc-800/40'

  // ── Modo edição ───────────────────────────────────────────────
  if (mode === 'edit') return (
    <div className={`rounded-xl border ${borderCls} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-700/40">
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className="text-zinc-400 text-sm line-through">
            {p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${sc.cls}`}>{sc.label}</Badge>
          <span className="text-zinc-600 text-xs">Venc. {fmtDate(p.dueDate)}</span>
        </div>
        <button onClick={() => { setMode('view'); setRowError(null) }} className="text-zinc-500 hover:text-zinc-300 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-zinc-500 text-xs mb-1.5">Valor (R$)</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">R$</span>
              <input type="text" inputMode="decimal" value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onBlur={e => setEditVal(formatMoney(e.target.value))}
                className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500 text-right" />
            </div>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1.5">Vencimento</p>
            <input type="date" min={today} value={editDate}
              onChange={e => setEditDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-1.5">Descrição</p>
          <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        {rowError && <p className="text-red-400 text-xs">{rowError}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setMode('view'); setRowError(null) }}
            className="border-zinc-700 text-zinc-400 hover:text-white text-xs">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )

  // ── Modo confirmação de cancelamento ──────────────────────────
  if (mode === 'confirm-cancel') return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Cancelar esta cobrança?</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              {p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Venc. {fmtDate(p.dueDate)}
            </p>
            <p className="text-zinc-600 text-xs mt-1">Esta ação não pode ser desfeita no Asaas.</p>
          </div>
        </div>
        {rowError && <p className="text-red-400 text-xs">{rowError}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleConfirmCancel} disabled={saving}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {saving ? 'Cancelando…' : 'Sim, cancelar cobrança'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setMode('view'); setRowError(null) }}
            className="border-zinc-700 text-zinc-400 hover:text-white text-xs">
            Manter
          </Button>
        </div>
      </div>
    </div>
  )

  // ── Modo visualização ─────────────────────────────────────────
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borderCls}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-200 text-sm font-semibold">
            {p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${sc.cls}`}>{sc.label}</Badge>
          <span className="text-zinc-600 text-xs">{BILLING_LABEL[p.billingType] ?? p.billingType}</span>
        </div>
        {p.description && <p className="text-zinc-500 text-xs mt-0.5 truncate">{p.description}</p>}
        <div className="flex items-center gap-3 mt-1 text-zinc-500 text-xs">
          <span>Venc. {fmtDate(p.dueDate)}</span>
          {p.paymentDate && <span className="text-emerald-500">Pago {fmtDate(p.paymentDate)}</span>}
          {p._customerName && accounts.length > 1 &&
            <span className="text-zinc-600 truncate max-w-[100px]">{p._customerName}</span>}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {p.invoiceUrl && canEdit && (
          <a href={p.invoiceUrl} target="_blank" rel="noreferrer"
            className="p-1.5 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Ver boleto">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        {canEdit && (
          <>
            <button onClick={() => setMode('edit')}
              className="p-1.5 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMode('confirm-cancel')}
              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Cancelar cobrança">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {isPaid && p.invoiceUrl && (
          <a href={p.invoiceUrl} target="_blank" rel="noreferrer"
            className="p-1.5 text-zinc-700 hover:text-zinc-500 rounded-lg transition-colors" title="Comprovante">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Tipos Dom para TabFinanceiro ────────────────────────────────
interface DomTx {
  id: string; data: string; status: string
  valorTotal: number; valorLiquido: number
  tipo: string; parcelas: string | null; cartao: string | null
  descricao: string | null; comprador: string; documento: string; email: string
}

// ─── TabFinanceiro ────────────────────────────────────────────────
function TabFinanceiro({ client }: { client: Client }) {
  const [payments,      setPayments]      = useState<PaymentWithAccount[]>([])
  const [subscriptions, setSubscriptions] = useState<SubWithAccount[]>([])
  const [accounts,      setAccounts]      = useState<{ id: string; name: string }[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [showAll,       setShowAll]       = useState(false)
  const [cobrancaTarget, setCobrancaTarget] = useState<{ id: string; name: string } | null>(null)

  // Dom Pagamentos
  const [domTxs,     setDomTxs]     = useState<DomTx[]>([])
  const [loadingDom, setLoadingDom] = useState(false)

  function loadPayments() {
    setLoading(true)
    fetch(`/api/asaas/payments?clientId=${client.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setPayments(d.payments ?? [])
        setSubscriptions(d.subscriptions ?? [])
        setAccounts(d.accounts ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  function loadDomPayments() {
    setLoadingDom(true)
    const ano = new Date().getFullYear()
    fetch(`/api/dom/payments?clientId=${client.id}&inicio=${ano}-01-01&fim=${ano}-12-31`)
      .then(r => r.json())
      .then(d => { if (!d.error) setDomTxs(d.transactions ?? []) })
      .catch(() => {})
      .finally(() => setLoadingDom(false))
  }

  useEffect(() => { loadPayments(); loadDomPayments() }, [client.id])

  // Callbacks — atualização local sem re-fetch completo
  function handleUpdated(id: string, value: number, dueDate: string) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, value, dueDate } : p))
  }
  function handleCancelled(id: string) {
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  const isPaid    = (s: string) => ['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(s)
  const isOverdue = (s: string) => s === 'OVERDUE'
  const isPending = (s: string) => s === 'PENDING'

  const overdue  = payments.filter(p => isOverdue(p.status))
  const pending  = payments.filter(p => isPending(p.status)).sort((a,b) => a.dueDate.localeCompare(b.dueDate))
  const history  = payments.filter(p => isPaid(p.status))
  const historyVisible = showAll ? history : history.slice(0, 10)

  const clientDefaultValue = client.clientType === 'mrr'
    ? (client.mrrValue ?? client.contractValue)
    : (client.tcvValue ?? client.totalProjectValue)

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
    </div>
  )
  if (error) return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-6 text-center"><p className="text-zinc-500 text-sm">{error}</p></CardContent>
    </Card>
  )
  // Se não tem Asaas mas tem Dom, mostra só Dom
  const hasAsaas = accounts.length > 0
  const hasDom   = domTxs.length > 0

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDt = (s: string) => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
  const TIPO: Record<string, string> = {
    credit_card: 'Cartão', debit_card: 'Débito', boleto: 'Boleto', pix: 'Pix',
  }

  if (!hasAsaas && !hasDom && !loadingDom) return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-zinc-400 text-sm font-medium">Nenhuma integração financeira vinculada</p>
        <p className="text-zinc-600 text-xs">Vincule Asaas ou Dom Pagamentos na aba Integrações.</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-5">
      {/* Modal cobrança */}
      {cobrancaTarget && (
        <AsaasCobrancaModal
          customerId={cobrancaTarget.id}
          customerName={cobrancaTarget.name}
          clientType={client.clientType ?? 'mrr'}
          defaultValue={clientDefaultValue}
          contractMonths={client.contractMonths}
          contractStartDate={client.contractStartDate}
          onClose={() => { setCobrancaTarget(null); loadPayments() }}
        />
      )}

      {/* Assinaturas ativas (legado Asaas) */}
      {subscriptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">Assinaturas ativas</p>
          {subscriptions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 text-sm font-semibold">
                    {s.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <Badge variant="outline" className="text-xs text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                    {CYCLE_LABEL[s.cycle] ?? s.cycle}
                  </Badge>
                </div>
                {s.description && <p className="text-zinc-500 text-xs mt-0.5">{s.description}</p>}
                <p className="text-zinc-500 text-xs mt-1">
                  Próxima cobrança: <span className="text-zinc-300">{fmtDate(s.nextDueDate)}</span>
                  {s._customerName && accounts.length > 1 && <span className="text-zinc-600"> · {s._customerName}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Em atraso */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wide">
              Em atraso ({overdue.length})
            </p>
            <span className="text-red-400 text-xs font-semibold">
              {overdue.reduce((s,p) => s + p.value, 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
            </span>
          </div>
          {overdue.map(p => (
            <EditablePayRow key={p.id} p={p} accounts={accounts}
              onUpdated={handleUpdated} onCancelled={handleCancelled} />
          ))}
        </div>
      )}

      {/* Próximas cobranças */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-wide">
              Próximas cobranças ({pending.length})
            </p>
            <span className="text-blue-400 text-xs font-semibold">
              {pending.reduce((s,p) => s + p.value, 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
            </span>
          </div>
          {pending.map(p => (
            <EditablePayRow key={p.id} p={p} accounts={accounts}
              onUpdated={handleUpdated} onCancelled={handleCancelled} />
          ))}
        </div>
      )}

      {/* Histórico — read-only */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">Histórico de pagamentos</p>
            <span className="text-zinc-400 text-xs">
              Total recebido: {history.reduce((s,p) => s + p.value, 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
            </span>
          </div>
          {historyVisible.map(p => (
            <EditablePayRow key={p.id} p={p} accounts={accounts}
              onUpdated={handleUpdated} onCancelled={handleCancelled} />
          ))}
          {history.length > 10 && (
            <button onClick={() => setShowAll(v => !v)}
              className="w-full py-2 text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
              {showAll ? 'Ver menos' : `Ver todos os ${history.length} pagamentos`}
            </button>
          )}
        </div>
      )}

      {overdue.length === 0 && pending.length === 0 && history.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <p className="text-zinc-500 text-sm">Nenhuma cobrança encontrada no Asaas.</p>
          </CardContent>
        </Card>
      )}

      {/* Botão nova cobrança */}
      {accounts.length > 0 && (
        <Button variant="outline" onClick={() => setCobrancaTarget(accounts[0])}
          className="w-full border-zinc-700 text-zinc-400 hover:text-white gap-2">
          <Plus className="w-4 h-4" /> Nova cobrança
        </Button>
      )}

      {/* ── Dom Pagamentos ──────────────────────────────────────── */}
      {(loadingDom || domTxs.length > 0) && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <p className="text-zinc-200 text-sm font-semibold">Dom Pagamentos</p>
                <p className="text-zinc-500 text-xs">Últimos 3 meses</p>
              </div>
              {loadingDom && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600 ml-auto" />}
            </div>

            {domTxs.length === 0 && !loadingDom && (
              <p className="text-zinc-600 text-sm text-center py-3">Nenhuma transação encontrada no período.</p>
            )}

            <div className="divide-y divide-zinc-800/50">
              {domTxs.map(tx => {
                const temTaxa = Math.abs(tx.valorTotal - tx.valorLiquido) >= 0.01
                return (
                  <div key={tx.id} className="flex items-start gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">Recebido</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {TIPO[tx.tipo] ?? tx.tipo}{tx.parcelas ? ` ${tx.parcelas}` : ''}{tx.cartao ? ` · ${tx.cartao}` : ''}
                        </span>
                        {tx.descricao && <span className="text-zinc-500 text-xs truncate max-w-[140px]">{tx.descricao}</span>}
                      </div>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        {fmtDt(tx.data)} · {tx.comprador}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {temTaxa ? (
                        <>
                          <p className="text-zinc-500 text-[11px] tabular-nums">total {fmt(tx.valorTotal)}</p>
                          <p className="text-emerald-400 text-sm font-semibold tabular-nums">
                            {fmt(tx.valorLiquido)}<span className="text-[10px] font-normal opacity-50 ml-0.5">líq.</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-emerald-400 text-sm font-semibold tabular-nums">{fmt(tx.valorTotal)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Tipos de integrações com credenciais ────────────────────────
interface AsaasInteg {
  id:          string
  status:      string
  last_sync_at: string | null
  label:       string | null
  credentials: { customer_id: string; customer_name?: string | null } | null
}
interface DomInteg {
  id:         string
  status:     string
  label:      string | null
  created_at: string | null
  credentials: { document: string } | null
}

// ─────────────────────────────────────────────────────────────────
// TAB — PASTA DO CLIENTE
// ─────────────────────────────────────────────────────────────────
function TabPasta({ client, refetch }: { client: Client; refetch: () => void }) {
  const [dragging,   setDragging]   = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [removing,   setRemoving]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  const contractUrl      = (client as unknown as Record<string, unknown>).contract_url as string | null
  const contractFilename = (client as unknown as Record<string, unknown>).contract_filename as string | null
  const contractUploadedAt = (client as unknown as Record<string, unknown>).contract_uploaded_at as string | null

  async function handleUpload(file: File) {
    if (!file) return
    setError(null); setSuccess(null); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/clients/${client.id}/contract`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao enviar'); return }
      setSuccess('Contrato enviado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
      refetch()
    } catch { setError('Erro de conexão') }
    finally { setUploading(false) }
  }

  async function handleRemove() {
    setRemoving(true); setError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}/contract`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao remover'); return }
      refetch()
    } catch { setError('Erro de conexão') }
    finally { setRemoving(false) }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-base">Contrato do cliente</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Arquivo do contrato firmado com o cliente · Futura integração com Autentique</p>
        </div>
      </div>

      {/* Contrato */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            <p className="text-zinc-200 text-sm font-medium">Contrato</p>
          </div>

          {contractUrl ? (
            /* Contrato existente */
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-800 border border-zinc-700">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                  <File className="w-4 h-4 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-zinc-200 text-sm truncate">{contractFilename ?? 'Contrato'}</p>
                  {contractUploadedAt && (
                    <p className="text-zinc-600 text-xs">
                      Enviado em {new Date(contractUploadedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={contractUrl} target="_blank" rel="noopener noreferrer">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs transition-colors">
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </button>
                </a>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            /* Área de upload */
            <label
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer',
                dragging
                  ? 'border-emerald-500/60 bg-emerald-500/5'
                  : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
              )}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-zinc-400 text-sm">Enviando...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-300 text-sm font-medium">Clique ou arraste o contrato aqui</p>
                    <p className="text-zinc-600 text-xs mt-1">PDF, DOC, DOCX · máx. 10MB</p>
                  </div>
                </>
              )}
            </label>
          )}

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <Check className="w-3.5 h-3.5 shrink-0" /> {success}
            </div>
          )}

          {/* Substituir contrato existente */}
          {contractUrl && !uploading && (
            <label className="flex items-center gap-2 cursor-pointer text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
              <Upload className="w-3.5 h-3.5" />
              Substituir contrato
            </label>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TabIntegracoes({ client, refetch }: { client: Client; refetch: () => void }) {
  const [asaasAccounts, setAsaasAccounts]   = useState<AsaasInteg[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [removing, setRemoving]             = useState<string | null>(null)
  const [showSearch, setShowSearch]         = useState(false)
  const [customers, setCustomers]           = useState<{ id: string; name: string; cpfCnpj: string | null }[]>([])
  const [search, setSearch]                 = useState('')
  const [loadingCust, setLoadingCust]       = useState(false)
  const [linking, setLinking]               = useState(false)
  const [linkError, setLinkError]           = useState<string | null>(null)
  const [cobrancaTarget, setCobrancaTarget] = useState<{ id: string; name: string } | null>(null)
  const [creating, setCreating]             = useState(false)
  const [createError, setCreateError]       = useState<string | null>(null)

  // Dom Pagamentos
  const [domAccounts, setDomAccounts]       = useState<DomInteg[]>([])
  const [loadingDom, setLoadingDom]         = useState(true)
  const [domDoc, setDomDoc]                 = useState('')
  const [domLabel, setDomLabel]             = useState('')
  const [domLinking, setDomLinking]         = useState(false)
  const [domError, setDomError]             = useState<string | null>(null)
  const [removingDom, setRemovingDom]       = useState<string | null>(null)
  const [showDomForm, setShowDomForm]       = useState(false)

  // WhatsApp
  type WppGroup = { id: string; name: string }
  const [wppGroupId,       setWppGroupId]       = useState(client.whatsappGroupId ?? '')
  const [wppConnected,     setWppConnected]      = useState(!!client.whatsappGroupId)
  const [wppConnecting,    setWppConnecting]     = useState(false)
  const [wppError,         setWppError]          = useState<string | null>(null)
  const [wppEditing,       setWppEditing]        = useState(false)
  // Seletor de grupos
  const [wppGroups,        setWppGroups]         = useState<WppGroup[] | null>(null)
  const [wppGroupsLoading, setWppGroupsLoading]  = useState(false)
  const [wppGroupsError,   setWppGroupsError]    = useState<string | null>(null)
  const [wppSearch,        setWppSearch]         = useState('')
  const [wppGroupName,     setWppGroupName]      = useState<string | null>(client.whatsappGroupName ?? null)

  // Sentiment analysis
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [sentimentMsg, setSentimentMsg]         = useState('')
  const [sentimentError, setSentimentError]     = useState<string | null>(null)
  const [sentimentResult, setSentimentResult]   = useState<{
    score: number | null
    sentiment: string | null
    engagementLevel: string | null
    summary: string | null
    flags: string[]
    totalMessages: number
  } | null>(null)

  // Team members
  const [teamOpen, setTeamOpen]                   = useState(false)
  const [teamParticipants, setTeamParticipants]   = useState<{ jid: string; displayName: string; isAdmin: boolean; isTeam: boolean; isAgencyPhone: boolean }[]>([])
  const [teamLoading, setTeamLoading]             = useState(false)
  const [teamError, setTeamError]                 = useState<string | null>(null)
  const [teamSaving, setTeamSaving]               = useState(false)
  const [teamSelection, setTeamSelection]         = useState<Set<string>>(new Set())

  async function loadTeamParticipants() {
    if (!client.whatsappGroupId) return
    setTeamLoading(true); setTeamError(null)
    try {
      const res = await fetch(`/api/whatsapp/group-participants/${encodeURIComponent(client.whatsappGroupId)}`)
      const data = await res.json()
      if (!res.ok) { setTeamError(data.error ?? 'Erro ao carregar participantes'); return }
      setTeamParticipants(data.participants ?? [])
      // Pre-select existing team members
      const selected = new Set<string>()
      for (const p of data.participants ?? []) {
        if (p.isTeam) selected.add(p.jid)
      }
      setTeamSelection(selected)
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally { setTeamLoading(false) }
  }

  async function saveTeamMembers() {
    setTeamSaving(true); setTeamError(null)
    try {
      // First, get current members to know which to remove
      const getRes = await fetch('/api/whatsapp/team-members')
      const getCur = await getRes.json()
      const currentJids = new Set<string>((getCur.members ?? []).map((m: { jid: string }) => m.jid))

      // Remove members no longer selected (excluding agency phone)
      for (const jid of currentJids) {
        const isAgencyPhone = teamParticipants.find(p => p.jid === jid)?.isAgencyPhone
        if (!teamSelection.has(jid) && !isAgencyPhone) {
          await fetch(`/api/whatsapp/team-members?jid=${encodeURIComponent(jid)}`, { method: 'DELETE' })
        }
      }

      // Add new team members
      const members = [...teamSelection]
        .filter(jid => !teamParticipants.find(p => p.jid === jid)?.isAgencyPhone)
        .map(jid => ({
          jid,
          displayName: teamParticipants.find(p => p.jid === jid)?.displayName,
        }))

      if (members.length > 0) {
        await fetch('/api/whatsapp/team-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ members }),
        })
      }

      setTeamOpen(false)
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setTeamSaving(false) }
  }

  async function loadWppGroups() {
    setWppGroupsLoading(true); setWppGroupsError(null)
    
    try {
      console.log('[WhatsApp] 🔄 Buscando grupos da agência...')
      const startTime = Date.now()
      
      // Usa novo endpoint que lista apenas grupos da agência (rápido!)
      const r = await fetch('/api/whatsapp/agency/groups')
      
      const duration = Math.round((Date.now() - startTime) / 1000)
      console.log(`[WhatsApp] 📡 Resposta em ${duration}s - Status: ${r.status}`)
      
      const d = await r.json()
      
      if (!r.ok) { 
        console.error('[WhatsApp] ❌ Erro:', d)
        setWppGroupsError(d.error ?? 'Erro ao carregar grupos')
        return 
      }
      
      const groups = d.groups ?? []
      console.log(`[WhatsApp] ✅ ${groups.length} grupos da agência`)
      setWppGroups(groups)
      
    } catch (err) {
      console.error('[WhatsApp] ❌ Exception:', err)
      setWppGroupsError(err instanceof Error ? err.message : 'Erro ao buscar grupos')
    } finally { 
      setWppGroupsLoading(false) 
    }
  }

  async function handleWppConnect(groupId: string, groupName?: string) {
    setWppConnecting(true); setWppError(null)
    const res = await fetch(`/api/whatsapp/connect/${client.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: groupId.trim() }),
    })
    const d = await res.json()
    if (res.ok) {
      setWppConnected(true); setWppEditing(false); setWppGroupId(groupId)
      setWppGroupName(groupName ?? null); setWppGroups(null); refetch()
    } else { setWppError(d.error ?? 'Erro ao conectar') }
    setWppConnecting(false)
  }

  async function handleSentimentAnalysis() {
    setSentimentError(null)
    setSentimentResult(null)
    setSentimentLoading(true)

    const steps = [
      'Coletando mensagens do grupo…',
      'Resumindo conversas semanais…',
      'Analisando sentimento com IA…',
      'Finalizando análise…',
    ]
    let stepIdx = 0
    setSentimentMsg(steps[0])
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length
      setSentimentMsg(steps[stepIdx])
    }, 3000)

    try {
      const res = await fetch(`/api/whatsapp/sentiment/${client.id}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setSentimentError(data.error ?? 'Erro ao analisar sentimento')
      } else {
        setSentimentResult({
          score:           data.score,
          sentiment:       data.sentiment,
          engagementLevel: data.engagementLevel,
          summary:         data.summary,
          flags:           data.flags ?? [],
          totalMessages:   data.totalMessages ?? 0,
        })
      }
    } catch (err) {
      setSentimentError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      clearInterval(interval)
      setSentimentLoading(false)
      setSentimentMsg('')
    }
  }

  async function loadAccounts() {
    setLoadingAccounts(true)
    const res = await fetch(`/api/asaas/sync/${client.id}`)
    if (res.ok) { const d = await res.json(); setAsaasAccounts(d.integrations ?? []) }
    setLoadingAccounts(false)
  }

  async function loadDomAccounts() {
    setLoadingDom(true)
    const res = await fetch(`/api/dom/sync/${client.id}`)
    if (res.ok) { const d = await res.json(); setDomAccounts(d.integrations ?? []) }
    setLoadingDom(false)
  }

  async function handleDomLink() {
    setDomLinking(true); setDomError(null)
    const res = await fetch(`/api/dom/sync/${client.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: domDoc, label: domLabel || undefined }),
    })
    const d = await res.json()
    if (!res.ok) { setDomError(d.error ?? 'Erro ao vincular'); setDomLinking(false); return }
    setDomDoc(''); setDomLabel(''); setShowDomForm(false)
    loadDomAccounts()
    setDomLinking(false)
  }

  async function handleDomRemove(integId: string) {
    setRemovingDom(integId)
    await fetch(`/api/dom/sync/${client.id}?integrationId=${integId}`, { method: 'DELETE' })
    loadDomAccounts()
    setRemovingDom(null)
  }

  function fmtDoc(doc: string) {
    const d = doc.replace(/\D/g, '')
    if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
    if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
    return doc
  }

  useEffect(() => { loadAccounts(); loadDomAccounts() }, [])

  async function openSearch() {
    setShowSearch(true); setSearch(''); setLinkError(null)
    setLoadingCust(true)
    const res = await fetch('/api/asaas/customers')
    if (res.ok) { const d = await res.json(); setCustomers(d.customers ?? []) }
    setLoadingCust(false)
  }

  async function handleLink(c: { id: string; name: string }) {
    setLinking(true); setLinkError(null)
    const res = await fetch(`/api/asaas/sync/${client.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asaas_customer_id: c.id, customer_name: c.name }),
    })
    if (res.ok) { setShowSearch(false); loadAccounts(); refetch() }
    else { const d = await res.json(); setLinkError(d.error ?? 'Erro ao vincular') }
    setLinking(false)
  }

  async function handleCreateInAsaas() {
    setCreating(true); setCreateError(null)
    const res = await fetch('/api/asaas/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        client.razaoSocial || client.name,
        cpfCnpj:     client.cnpj,
        email:       client.email,
        mobilePhone: client.telefone,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setCreateError(d.error ?? 'Erro ao criar no Asaas'); setCreating(false); return }
    // Auto-vincula
    await fetch(`/api/asaas/sync/${client.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asaas_customer_id: d.customer.id, customer_name: d.customer.name }),
    })
    loadAccounts(); refetch(); setCreating(false)
  }

  async function handleRemove(integId: string) {
    const isLast = asaasAccounts.length === 1
    if (isLast) {
      const ok = window.confirm(
        'Esta é a última conta Asaas vinculada. Ao desvincular, você perderá o acesso ao histórico financeiro deste cliente neste perfil. Deseja continuar?'
      )
      if (!ok) return
    }
    setRemoving(integId)
    const res = await fetch(`/api/asaas/sync/${client.id}?integrationId=${integId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setLinkError(d.error ?? 'Erro ao desvincular')
      setRemoving(null)
      return
    }
    loadAccounts(); refetch(); setRemoving(null)
  }

  async function handleSync(integId: string) {
    const res = await fetch(`/api/asaas/sync/${client.id}?integrationId=${integId}`, { method: 'PATCH' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLinkError(
        d.error === 'customer_not_found'
          ? 'Customer não encontrado no Asaas. Pode ter sido excluído. Um alerta foi criado.'
          : d.message ?? 'Erro ao sincronizar'
      )
    }
    loadAccounts()
  }

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.cpfCnpj ?? '').includes(q.replace(/\D/g, ''))
  })

  const clientDefaultValue = client.clientType === 'mrr'
    ? (client.mrrValue ?? client.contractValue)
    : (client.tcvValue ?? client.totalProjectValue)

  return (
    <>
      {/* Modal busca Asaas */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div>
                <p className="text-zinc-100 font-semibold text-sm">Vincular conta Asaas</p>
                <p className="text-zinc-500 text-xs">Busque pelo nome ou CNPJ</p>
              </div>
              <button onClick={() => setShowSearch(false)} className="text-zinc-500 hover:text-zinc-300 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou CNPJ..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {loadingCust
                ? <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
                : filtered.length === 0
                  ? <p className="text-zinc-600 text-sm text-center py-8">Nenhum customer encontrado</p>
                  : filtered.slice(0, 50).map(c => (
                    <button key={c.id} onClick={() => handleLink(c)} disabled={linking}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-zinc-200 text-sm font-medium truncate">{c.name}</p>
                        {c.cpfCnpj && <p className="text-zinc-500 text-xs">{c.cpfCnpj}</p>}
                      </div>
                    </button>
                  ))
              }
            </div>
            {linkError && <p className="text-red-400 text-xs px-5 pb-3">{linkError}</p>}
          </div>
        </div>
      )}

      {/* Modal de cobrança */}
      {cobrancaTarget && (
        <AsaasCobrancaModal
          customerId={cobrancaTarget.id}
          customerName={cobrancaTarget.name}
          clientType={client.clientType ?? 'mrr'}
          defaultValue={clientDefaultValue}
          contractMonths={client.contractMonths}
          contractStartDate={client.contractStartDate}
          onClose={() => setCobrancaTarget(null)}
        />
      )}

      <div className="space-y-4">

        {/* ── Asaas ─────────────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-4">

            {/* Header da seção */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-zinc-200 font-semibold text-sm">Asaas</p>
                  <p className="text-zinc-500 text-xs">Cobranças e status de pagamento</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={openSearch}
                className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Adicionar conta
              </Button>
            </div>

            {/* Lista de contas vinculadas */}
            {loadingAccounts
              ? <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-zinc-600" /></div>
              : asaasAccounts.length === 0
                ? (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                      <p className="text-zinc-500 text-sm">Nenhuma conta Asaas vinculada</p>
                      <p className="text-zinc-600 text-xs">Vincule uma conta existente ou crie este cliente no Asaas</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button variant="outline" onClick={openSearch}
                        className="border-zinc-700 text-zinc-400 hover:text-white gap-2 text-xs">
                        <Search className="w-3.5 h-3.5" /> Vincular existente
                      </Button>
                      <Button variant="outline" onClick={handleCreateInAsaas} disabled={creating}
                        className="border-blue-700/40 text-blue-400 hover:bg-blue-500/10 gap-2 text-xs">
                        {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Criar no Asaas
                      </Button>
                    </div>
                    {createError && <p className="text-red-400 text-xs">{createError}</p>}
                  </div>
                )
                : (
                  <div className="space-y-2">
                    {asaasAccounts.map(integ => {
                      const customerId   = integ.credentials?.customer_id ?? ''
                      const customerName = integ.credentials?.customer_name ?? integ.label ?? customerId
                      return (
                        <div key={integ.id} className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-zinc-200 text-sm font-medium truncate">{customerName}</p>
                            <p className="text-zinc-500 text-xs">
                              ID: {customerId}
                              {integ.last_sync_at && <> · Sync: {new Date(integ.last_sync_at).toLocaleDateString('pt-BR')}</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {customerId && (
                              <button title="Criar cobrança"
                                onClick={() => setCobrancaTarget({ id: customerId, name: customerName })}
                                className="p-1.5 text-blue-500 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors">
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button title="Sincronizar"
                              onClick={() => handleSync(integ.id)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button title="Desvincular"
                              onClick={() => handleRemove(integ.id)}
                              disabled={removing === integ.id}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              {removing === integ.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Botão adicionar mais */}
                    <button onClick={openSearch}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 text-xs transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Adicionar outra conta Asaas
                    </button>
                  </div>
                )
            }
          </CardContent>
        </Card>

        {/* ── Dom Pagamentos ────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-zinc-200 font-semibold text-sm">Dom Pagamentos</p>
                  <p className="text-zinc-500 text-xs">CPF/CNPJ dos compradores vinculados</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setShowDomForm(f => !f); setDomError(null) }}
                className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>

            {/* Formulário para novo documento */}
            {showDomForm && (
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                <p className="text-zinc-400 text-xs font-medium">Informe o CPF ou CNPJ do comprador que aparece nas transações Dom</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={domDoc}
                    onChange={e => setDomDoc(e.target.value)}
                    placeholder="CPF ou CNPJ (só números)"
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-violet-500 w-full"
                  />
                  <input
                    value={domLabel}
                    onChange={e => setDomLabel(e.target.value)}
                    placeholder="Nome / rótulo (opcional)"
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-violet-500 w-full"
                  />
                </div>
                {domError && <p className="text-red-400 text-xs">{domError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDomLink} disabled={domLinking || !domDoc.trim()}
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 text-xs">
                    {domLinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Vincular
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowDomForm(false); setDomError(null) }}
                    className="text-zinc-500 text-xs">Cancelar</Button>
                </div>
              </div>
            )}

            {/* Lista de documentos vinculados */}
            {loadingDom
              ? <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-zinc-600" /></div>
              : domAccounts.length === 0 && !showDomForm
                ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <p className="text-zinc-500 text-sm">Nenhum documento vinculado</p>
                    <p className="text-zinc-600 text-xs">Adicione o CPF/CNPJ do comprador que aparece nas transações Dom</p>
                  </div>
                )
                : (
                  <div className="space-y-2">
                    {domAccounts.map(integ => {
                      const doc = integ.credentials?.document ?? ''
                      return (
                        <div key={integ.id} className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-zinc-200 text-sm font-medium">{integ.label ?? fmtDoc(doc)}</p>
                            <p className="text-zinc-500 text-xs">{fmtDoc(doc)}</p>
                          </div>
                          <button title="Desvincular"
                            onClick={() => handleDomRemove(integ.id)}
                            disabled={removingDom === integ.id}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            {removingDom === integ.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <X className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )
                    })}
                    {domAccounts.length > 0 && (
                      <button onClick={() => setShowDomForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 text-xs transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Adicionar outro documento
                      </button>
                    )}
                  </div>
                )
            }
          </CardContent>
        </Card>

        {/* ── WhatsApp ──────────────────────────────────────────── */}
        <Card className={cn('border-zinc-800', wppConnected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900')}>
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  wppConnected ? 'bg-emerald-500/15' : 'bg-emerald-500/10')}>
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-zinc-200 font-semibold text-sm">Grupo WhatsApp</p>
                  <p className="text-zinc-500 text-xs">
                    {wppConnected ? 'Monitoramento ativo' : 'Selecione o grupo do cliente'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-xs shrink-0',
                wppConnected
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'border-zinc-700 text-zinc-500'
              )}>
                {wppConnected ? '✓ Conectado' : 'Não vinculado'}
              </Badge>
            </div>

            {/* Aviso: WhatsApp da agência precisa estar conectado */}
            <div className="flex gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-blue-300/80 text-xs leading-relaxed">
                  <strong>Pré-requisito:</strong> O WhatsApp da agência deve estar conectado em{' '}
                  <Link href="/configuracoes?tab=whatsapp" className="underline hover:text-blue-200">
                    Configurações → WhatsApp
                  </Link>
                </p>
                <p className="text-zinc-500 text-xs">
                  As mensagens do grupo serão analisadas por IA para cálculo de proximidade e sentimento (LGPD).
                </p>
              </div>
            </div>

            {/* ── Grupo Conectado ── */}
            {wppConnected && !wppEditing && (
              <div className="space-y-2">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-400 text-xs mb-1">Grupo WhatsApp:</p>
                      {wppGroupName
                        ? <p className="text-emerald-300 text-sm font-semibold leading-tight truncate">{wppGroupName}</p>
                        : <p className="text-zinc-300 text-xs font-mono truncate">
                            {client.whatsappGroupId?.slice(0, 8)}···{client.whatsappGroupId?.slice(-6)}
                          </p>
                      }
                      <p className="text-zinc-600 text-xs mt-0.5">Mensagens sendo analisadas via webhook</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline"
                    onClick={handleSentimentAnalysis}
                    disabled={sentimentLoading}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-1.5 text-xs">
                    {sentimentLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{sentimentMsg}</>
                      : <><Heart className="w-3.5 h-3.5" />Analisar Sentimento</>
                    }
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => { setWppEditing(true); setWppGroups(null); setWppSearch('') }}
                    className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Alterar grupo
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      if (!confirm('Desvincular este grupo? O monitoramento será interrompido.')) return
                      setWppConnecting(true); setWppError(null)
                      const res = await fetch(`/api/whatsapp/connect/${client.id}`, { method: 'DELETE' })
                      if (res.ok) { setWppConnected(false); setWppGroupId(''); setWppGroupName(null); refetch() }
                      else { const d = await res.json(); setWppError(d.error ?? 'Erro ao desvincular') }
                      setWppConnecting(false)
                    }}
                    disabled={wppConnecting}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
                    {wppConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Desvincular
                  </Button>
                </div>

                {/* Sentiment error */}
                {sentimentError && (
                  <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-red-300 text-xs">{sentimentError}</p>
                  </div>
                )}

                {/* Sentiment result */}
                {sentimentResult && (
                  <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {sentimentResult.score !== null && (
                        <div className="shrink-0">
                          <ScoreGauge score={sentimentResult.score} size="sm" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {sentimentResult.sentiment && (
                            <Badge variant="outline" className={cn('text-xs',
                              sentimentResult.sentiment === 'positive' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                              sentimentResult.sentiment === 'negative' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                              'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'
                            )}>
                              {sentimentResult.sentiment === 'positive' ? 'Positivo' :
                               sentimentResult.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                            </Badge>
                          )}
                          {sentimentResult.engagementLevel && (
                            <Badge variant="outline" className={cn('text-xs',
                              sentimentResult.engagementLevel === 'high'   ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                              sentimentResult.engagementLevel === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                              'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'
                            )}>
                              Engajamento {sentimentResult.engagementLevel === 'high' ? 'Alto' :
                                           sentimentResult.engagementLevel === 'medium' ? 'Médio' : 'Baixo'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-zinc-500 text-xs">{sentimentResult.totalMessages} mensagens analisadas (60 dias)</p>
                      </div>
                      <button onClick={() => setSentimentResult(null)}
                        className="text-zinc-600 hover:text-zinc-400 p-1 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sentimentResult.summary && (
                      <p className="text-zinc-300 text-xs leading-relaxed">{sentimentResult.summary}</p>
                    )}

                    {sentimentResult.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {sentimentResult.flags.map(flag => (
                          <Badge key={flag} variant="outline"
                            className="text-xs text-orange-400 border-orange-500/30 bg-orange-500/10">
                            {flag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ── Seletor de Grupo (Simples) ── */}
            {(!wppConnected || wppEditing) && (
              <div className="space-y-3">
                {wppError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-red-400 text-xs">{wppError}</p>
                    {wppError.includes('WhatsApp da agência não está conectado') && (
                      <Link href="/configuracoes?tab=whatsapp" 
                        className="text-blue-400 hover:text-blue-300 text-xs underline mt-1 inline-block">
                        Ir para Configurações
                      </Link>
                    )}
                  </div>
                )}

                {/* Botão carregar grupos */}
                {!wppGroups && (
                  <Button size="sm" variant="outline" onClick={loadWppGroups}
                    disabled={wppGroupsLoading}
                    className="border-emerald-600 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 w-full text-xs">
                    {wppGroupsLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando grupos...</>
                    ) : (
                      <><MessageCircle className="w-3.5 h-3.5" /> Buscar Grupos do WhatsApp</>
                    )}
                  </Button>
                )}

                {/* Erro ao carregar */}
                {wppGroupsError && (
                  <div className="space-y-2">
                    <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {wppGroupsError}
                    </p>
                    <Button size="sm" variant="outline" onClick={loadWppGroups}
                      className="border-zinc-700 text-zinc-400 text-xs gap-1">
                      <RefreshCw className="w-3 h-3" /> Tentar novamente
                    </Button>
                  </div>
                )}

                {/* Lista de grupos */}
                {wppGroups && wppGroups.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-xs">{wppGroups.length} grupos encontrados</span>
                      <button onClick={() => { setWppGroups(null); setWppSearch('') }}
                        className="text-zinc-600 hover:text-zinc-400 text-xs">limpar</button>
                    </div>
                    <input
                      type="text" autoFocus
                      placeholder="Filtrar por nome..."
                      value={wppSearch}
                      onChange={e => setWppSearch(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500"
                    />
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                      {wppGroups
                        .filter(g => !wppSearch || g.name.toLowerCase().includes(wppSearch.toLowerCase()))
                        .map(g => (
                          <button key={g.id}
                            onClick={() => handleWppConnect(g.id, g.name)}
                            disabled={wppConnecting}
                            className="w-full flex items-center gap-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-zinc-200 text-xs truncate flex-1">{g.name}</span>
                            {wppConnecting && wppGroupId === g.id
                              ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400 shrink-0" />
                              : <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                            }
                          </button>
                        ))}
                      {wppGroups.filter(g => !wppSearch || g.name.toLowerCase().includes(wppSearch.toLowerCase())).length === 0 && (
                        <p className="text-zinc-600 text-xs text-center py-3">Nenhum grupo encontrado</p>
                      )}
                    </div>
                  </div>
                )}

                {wppGroups && wppGroups.length === 0 && !wppGroupsLoading && (
                  <div className="text-center py-4">
                    <p className="text-zinc-500 text-xs">Nenhum grupo disponível</p>
                    <Link href="/configuracoes?tab=whatsapp" 
                      className="text-blue-400 hover:text-blue-300 text-xs underline mt-2 inline-block">
                      Conectar WhatsApp em Configurações
                    </Link>
                  </div>
                )}

                {wppEditing && (
                  <Button size="sm" variant="ghost"
                    onClick={() => { setWppEditing(false); setWppError(null); setWppGroups(null); setWppSearch('') }}
                    className="text-zinc-500 text-xs">Cancelar</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB 3 — FORMULÁRIOS
// ─────────────────────────────────────────────────────────────────
// ── Tipos internos de formulário ─────────────────────────────────
interface FormEntry {
  id:             string
  token:          string
  sentAt:         string | null
  expiresAt:      string | null
  respondedAt:    string | null
  sentVia:        string | null
  status:         'responded' | 'pending' | 'expired'
  expired:        boolean
  daysToRespond:  number | null
  npsScore:       number | null
  scoreResultado: number | null
  comment:        string | null
  submittedAt:    string | null
}

function TabFormularios({ clientId }: { clientId: string; client: Client }) {
  const [forms, setForms]         = useState<FormEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newLink, setNewLink]     = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [genError, setGenError]   = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

  // Carrega histórico
  useEffect(() => {
    setLoading(true)
    fetch(`/api/clients/${clientId}/forms`)
      .then(r => r.json())
      .then(d => setForms(d.forms ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  // Gera novo link
  async function handleGerar() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/forms`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error ?? 'Erro ao gerar link'); return }

      const url = data.url ?? `${appUrl}/f/${data.token}`
      setNewLink(url)

      // Insere na lista localmente
      setForms(prev => [{
        id:             data.id,
        token:          data.token,
        sentAt:         data.sentAt,
        expiresAt:      data.expiresAt,
        respondedAt:    null,
        sentVia:        'manual',
        status:         'pending',
        expired:        false,
        daysToRespond:  null,
        npsScore:       null,
        scoreResultado: null,
        comment:        null,
        submittedAt:    null,
      }, ...prev])
    } catch {
      setGenError('Não foi possível gerar o link. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopiar(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback: seleciona o texto */
    }
  }

  const responded   = forms.filter(f => f.status === 'responded')
  const responseRate = forms.length ? Math.round((responded.length / forms.length) * 100) : 0
  const npsMedia     = responded.length
    ? (responded.reduce((s, f) => s + (f.npsScore ?? 0), 0) / responded.length)
    : null

  return (
    <div className="space-y-5">
      {/* ── Gerar link ─────────────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-zinc-200 text-sm font-semibold">Enviar formulário de satisfação</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Gere um link único e envie ao cliente pelo WhatsApp ou e-mail.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleGerar}
              disabled={generating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 shrink-0"
            >
              {generating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando…</>
                : <><Send className="w-3.5 h-3.5" /> Gerar link</>
              }
            </Button>
          </div>

          {genError && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {genError}
            </p>
          )}

          {newLink && (
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
              <p className="flex-1 text-zinc-300 text-xs font-mono truncate">{newLink}</p>
              <button
                onClick={() => handleCopiar(newLink)}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all shrink-0',
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white'
                )}
              >
                {copied ? <><Check className="w-3 h-3" /> Copiado!</> : <><ExternalLink className="w-3 h-3" /> Copiar</>}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats ──────────────────────────────────────────────── */}
      {forms.length > 0 && (
        <div className="flex items-center gap-5">
          <div>
            <p className="text-zinc-200 text-xl font-bold">{forms.length}</p>
            <p className="text-zinc-500 text-xs">enviados</p>
          </div>
          <div>
            <p className="text-zinc-200 text-xl font-bold">{responseRate}%</p>
            <p className="text-zinc-500 text-xs">respondidos</p>
          </div>
          {npsMedia !== null && (
            <div>
              <p className={cn('text-xl font-bold',
                npsMedia >= 9 ? 'text-emerald-400' : npsMedia >= 7 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {npsMedia.toFixed(1)}
              </p>
              <p className="text-zinc-500 text-xs">NPS médio</p>
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum formulário enviado ainda.</p>
          <p className="text-xs mt-1">Gere um link acima e envie ao cliente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider px-1">Histórico</p>
          {forms.map(f => {
            const isResponded = f.status === 'responded'
            const isExpired   = f.status === 'expired'
            const formUrl     = `${appUrl}/f/${f.token}`

            return (
              <Card key={f.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn('text-xs',
                            isResponded ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            : isExpired ? 'text-zinc-600 border-zinc-700 bg-zinc-800'
                            : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                          )}
                        >
                          {isResponded ? '✓ Respondido' : isExpired ? '✗ Expirado' : '⏳ Aguardando'}
                        </Badge>
                        {f.sentAt && (
                          <span className="text-zinc-600 text-xs">
                            Enviado {fmtDate(f.sentAt)}
                          </span>
                        )}
                        {f.sentVia && f.sentVia !== 'manual' && (
                          <span className="text-zinc-700 text-xs">via {f.sentVia}</span>
                        )}
                      </div>

                      {isResponded && f.respondedAt && (
                        <p className="text-zinc-500 text-xs">
                          Respondido {fmtDate(f.respondedAt)}
                          {f.daysToRespond !== null && ` · ${f.daysToRespond}d para responder`}
                        </p>
                      )}

                      {!isResponded && !isExpired && f.expiresAt && (
                        <p className="text-zinc-600 text-xs">
                          Expira {fmtDate(f.expiresAt)}
                        </p>
                      )}

                      {f.comment && (
                        <p className="text-zinc-400 text-sm italic mt-1.5 leading-relaxed">
                          "{f.comment}"
                        </p>
                      )}

                      {/* Link copiável para formulários pendentes */}
                      {f.status === 'pending' && (
                        <button
                          onClick={() => handleCopiar(formUrl)}
                          className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-xs mt-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Copiar link
                        </button>
                      )}
                    </div>

                    {isResponded && (
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        {f.npsScore !== null && (() => {
                          const cls = getNpsClassification(f.npsScore!)
                          return (
                            <div className="text-center">
                              <p className={cn('font-bold text-lg leading-none', cls.color)}>{f.npsScore}</p>
                              <p className={cn('text-xs font-medium mt-0.5', cls.color)}>{cls.label}</p>
                              <p className="text-zinc-600 text-xs">NPS</p>
                            </div>
                          )
                        })()}
                        {f.scoreResultado !== null && (
                          <div className="text-center">
                            <p className="text-zinc-200 font-bold text-lg leading-none">{f.scoreResultado}</p>
                            <p className="text-zinc-600 text-xs mt-0.5">Resultado</p>
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
// TAB 4 — HISTÓRICO (dados reais do banco)
// ─────────────────────────────────────────────────────────────────

interface AnalysisHistoryEntry {
  id:               string
  scoreTotal:       number
  scoreFinanceiro:  number | null
  scoreProximidade: number | null
  scoreResultado:   number | null
  scoreNps:         number | null
  churnRisk:        string
  diagnosis:        string | null
  flags:            string[]
  triggeredBy:      string
  proximitySentiment?:     string | null
  proximityEngagement?:    string | null
  proximitySummary?:       string | null
  proximityMessagesTotal?: number | null
  proximityMessagesClient?: number | null
  proximityWeeklyBatches?: number | null
  analyzedAt:       string
}

function ScoreSparkbar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-xs font-bold',
        score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'
      )}>{score}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TAB — SENTIMENTO
// ─────────────────────────────────────────────────────────────────
function TabSentimento({ clientId, client, refetch }: { clientId: string; client: Client; refetch: () => void }) {
  const hs = client.healthScore
  const [analyses, setAnalyses]     = useState<AnalysisHistoryEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState<string | null>(null)

  // Team members state
  const [teamParticipants, setTeamParticipants] = useState<{ jid: string; displayName: string; isAdmin: boolean; isTeam: boolean; isAgencyPhone: boolean }[]>([])
  const [teamLoading, setTeamLoading]           = useState(false)
  const [teamError, setTeamError]               = useState<string | null>(null)
  const [teamSaving, setTeamSaving]             = useState(false)
  const [teamSelection, setTeamSelection]       = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/analysis/${clientId}`)
      .then(r => r.json())
      .then(d => setAnalyses((d.analyses ?? []).map((a: Record<string, unknown>) => ({
        id:               String(a.id),
        scoreTotal:       Number(a.score_total),
        scoreFinanceiro:  a.score_financeiro != null ? Number(a.score_financeiro) : null,
        scoreProximidade: a.score_proximidade != null ? Number(a.score_proximidade) : null,
        scoreResultado:   a.score_resultado != null ? Number(a.score_resultado) : null,
        scoreNps:         a.score_nps != null ? Number(a.score_nps) : null,
        churnRisk:        String(a.churn_risk ?? 'low'),
        diagnosis:        a.diagnosis ? String(a.diagnosis) : null,
        flags:            (a.flags as string[]) ?? [],
        triggeredBy:      String(a.triggered_by ?? 'scheduled'),
        analyzedAt:       String(a.analyzed_at),
        proximitySentiment:     a.proximity_sentiment != null ? String(a.proximity_sentiment) : null,
        proximityEngagement:    a.proximity_engagement != null ? String(a.proximity_engagement) : null,
        proximitySummary:       a.proximity_summary != null ? String(a.proximity_summary) : null,
        proximityMessagesTotal: a.proximity_messages_total != null ? Number(a.proximity_messages_total) : null,
        proximityMessagesClient: a.proximity_messages_client != null ? Number(a.proximity_messages_client) : null,
        proximityWeeklyBatches: a.proximity_weekly_batches != null ? Number(a.proximity_weekly_batches) : null,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  async function loadTeamParticipants() {
    if (!client.whatsappGroupId) return
    setTeamLoading(true); setTeamError(null)
    try {
      const res = await fetch(`/api/whatsapp/group-participants/${encodeURIComponent(client.whatsappGroupId)}`)
      const data = await res.json()
      if (!res.ok) { setTeamError(data.error ?? 'Erro ao carregar participantes'); return }
      setTeamParticipants(data.participants ?? [])
      const selected = new Set<string>()
      for (const p of data.participants ?? []) {
        if (p.isTeam) selected.add(p.jid)
      }
      setTeamSelection(selected)
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally { setTeamLoading(false) }
  }

  async function saveTeamMembers() {
    setTeamSaving(true); setTeamError(null)
    try {
      const getRes = await fetch('/api/whatsapp/team-members')
      const getCur = await getRes.json()
      const currentJids = new Set<string>((getCur.members ?? []).map((m: { jid: string }) => m.jid))

      for (const jid of currentJids) {
        const isAgencyPhone = teamParticipants.find(p => p.jid === jid)?.isAgencyPhone
        if (!teamSelection.has(jid) && !isAgencyPhone) {
          await fetch(`/api/whatsapp/team-members?jid=${encodeURIComponent(jid)}`, { method: 'DELETE' })
        }
      }

      const members = [...teamSelection]
        .filter(jid => !teamParticipants.find(p => p.jid === jid)?.isAgencyPhone)
        .map(jid => ({
          jid,
          displayName: teamParticipants.find(p => p.jid === jid)?.displayName,
        }))

      if (members.length > 0) {
        await fetch('/api/whatsapp/team-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ members }),
        })
      }
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setTeamSaving(false) }
  }

  // Sentimento history entries (only those with proximity data)
  const sentimentHistory = analyses.filter(a => a.proximitySentiment || a.proximitySummary)

  // Chart data for proximity score evolution
  const chartEntries = analyses.filter(a => a.scoreProximidade != null).slice().reverse()
  const chartW = 280
  const chartH = 60
  const xStep = chartEntries.length > 1 ? chartW / (chartEntries.length - 1) : chartW
  const chartPoints = chartEntries.map((a, i) => ({
    x: chartEntries.length === 1 ? chartW / 2 : i * xStep,
    y: chartH - ((a.scoreProximidade ?? 0) / 100) * chartH,
    score: a.scoreProximidade ?? 0,
    date: a.analyzedAt,
  }))
  const polyline = chartPoints.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = chartPoints.length > 0
    ? `M${chartPoints[0].x},${chartH} ${chartPoints.map(p => `L${p.x},${p.y}`).join(' ')} L${chartPoints[chartPoints.length - 1].x},${chartH} Z`
    : ''

  const sentimentLabel = (s?: string | null) =>
    s === 'positive' ? 'Positivo' : s === 'negative' ? 'Negativo' : 'Neutro'
  const sentimentCls = (s?: string | null) =>
    s === 'positive' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
    s === 'negative' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
    'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'
  const engagementLabel = (e?: string | null) =>
    e === 'high' ? 'Alto' : e === 'medium' ? 'Médio' : 'Baixo'
  const engagementCls = (e?: string | null) =>
    e === 'high' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
    e === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
    'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'

  return (
    <div className="space-y-5">

      {/* ── Seção 1: Análise atual ── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Heart className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-200 font-semibold text-sm">Análise de Sentimento</p>
              <p className="text-zinc-500 text-xs">Última análise de proximidade do WhatsApp</p>
            </div>
          </div>

          {hs?.proximitySummary ? (
            <>
              {/* Score gauge + badges */}
              <div className="flex items-start gap-4">
                {hs.scoreProximidade != null && (
                  <div className="shrink-0">
                    <ScoreGauge score={hs.scoreProximidade} size="sm" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {hs.proximitySentiment && (
                      <Badge variant="outline" className={cn('text-xs', sentimentCls(hs.proximitySentiment))}>
                        Sentimento {sentimentLabel(hs.proximitySentiment)}
                      </Badge>
                    )}
                    {hs.proximityEngagement && (
                      <Badge variant="outline" className={cn('text-xs', engagementCls(hs.proximityEngagement))}>
                        Engajamento {engagementLabel(hs.proximityEngagement)}
                      </Badge>
                    )}
                  </div>

                  {/* Grid: msgs totais | msgs do cliente | semanas */}
                  <div className="grid grid-cols-3 gap-3">
                    {hs.proximityMessagesTotal != null && (
                      <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                        <p className="text-zinc-200 text-lg font-bold">{hs.proximityMessagesTotal}</p>
                        <p className="text-zinc-500 text-xs">msgs totais</p>
                      </div>
                    )}
                    {hs.proximityMessagesClient != null && (
                      <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                        <p className="text-zinc-200 text-lg font-bold">{hs.proximityMessagesClient}</p>
                        <p className="text-zinc-500 text-xs">msgs do cliente</p>
                      </div>
                    )}
                    {hs.proximityWeeklyBatches != null && (
                      <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
                        <p className="text-zinc-200 text-lg font-bold">{hs.proximityWeeklyBatches}</p>
                        <p className="text-zinc-500 text-xs">semanas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumo completo da IA */}
              <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-blue-500/30 pl-3">
                {hs.proximitySummary}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <MessageCircle className="w-8 h-8 text-zinc-700" />
              <p className="text-zinc-500 text-sm">Nenhuma análise de sentimento disponível</p>
              <p className="text-zinc-600 text-xs max-w-sm">
                Conecte o grupo WhatsApp do cliente na aba Integrações e rode uma análise para ver os resultados aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Seção 2: Histórico de sentimento ── */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Gráfico de evolução do score_proximidade */}
          {chartPoints.length > 1 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-zinc-400 text-xs font-medium mb-3">Evolução do Score de Proximidade</p>
                <div className="overflow-x-auto">
                  <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 10}`} className="min-w-[200px]">
                    <defs>
                      <linearGradient id="proxGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#proxGrad)" />
                    <polyline
                      points={polyline}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    {chartPoints.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
                        <text x={p.x} y={chartH + 9} textAnchor="middle" fontSize="7" fill="#52525b">
                          {p.score}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <div className="flex justify-between text-zinc-700 text-xs mt-1">
                    <span>{fmtDate(chartEntries[0].analyzedAt.slice(0, 10))}</span>
                    <span>{fmtDate(chartEntries[chartEntries.length - 1].analyzedAt.slice(0, 10))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de análises anteriores com sentimento */}
          {sentimentHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider px-1">Histórico de sentimento</p>
              {sentimentHistory.map(a => {
                const isExp = expanded === a.id
                return (
                  <Card key={a.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <button
                        className="w-full flex items-center gap-3 text-left"
                        onClick={() => setExpanded(isExp ? null : a.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {a.scoreProximidade != null && <ScoreSparkbar score={a.scoreProximidade} />}
                            {a.proximitySentiment && (
                              <Badge variant="outline" className={cn('text-xs', sentimentCls(a.proximitySentiment))}>
                                {sentimentLabel(a.proximitySentiment)}
                              </Badge>
                            )}
                            {a.proximityEngagement && (
                              <Badge variant="outline" className={cn('text-xs', engagementCls(a.proximityEngagement))}>
                                Eng. {engagementLabel(a.proximityEngagement)}
                              </Badge>
                            )}
                            {a.proximityMessagesClient != null && (
                              <span className="text-zinc-600 text-xs">{a.proximityMessagesClient} msgs cliente</span>
                            )}
                          </div>
                          <p className="text-zinc-600 text-xs mt-1">{fmtDate(a.analyzedAt.slice(0, 10))}</p>
                        </div>
                        <ChevronRight className={cn('w-4 h-4 text-zinc-600 shrink-0 transition-transform', isExp && 'rotate-90')} />
                      </button>

                      {isExp && a.proximitySummary && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                          <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-blue-500/30 pl-3">
                            {a.proximitySummary}
                          </p>
                          {a.proximityMessagesTotal != null && (
                            <div className="flex items-center gap-4 mt-3 text-zinc-500 text-xs">
                              <span>{a.proximityMessagesTotal} msgs totais</span>
                              {a.proximityWeeklyBatches != null && <span>{a.proximityWeeklyBatches} semanas analisadas</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Seção 3: Configurar membros do time ── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-200 font-semibold text-sm">Membros do time</p>
              <p className="text-zinc-500 text-xs">Marque quem faz parte do time da agência para separar mensagens na análise</p>
            </div>
          </div>

          {!client.whatsappGroupId ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <MessageCircle className="w-6 h-6 text-zinc-700" />
              <p className="text-zinc-500 text-sm">Grupo WhatsApp não conectado</p>
              <p className="text-zinc-600 text-xs">Conecte o grupo na aba Integrações primeiro.</p>
            </div>
          ) : (
            <>
              {teamParticipants.length === 0 && !teamLoading && !teamError && (
                <Button size="sm" variant="outline" onClick={loadTeamParticipants}
                  className="w-full border-zinc-700 text-zinc-400 text-xs gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Carregar participantes do grupo
                </Button>
              )}

              {teamLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                </div>
              )}

              {teamError && (
                <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-red-300 text-xs">{teamError}</p>
                </div>
              )}

              {!teamLoading && teamParticipants.length > 0 && (
                <>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {teamParticipants.map(p => {
                      const isChecked = teamSelection.has(p.jid) || p.isAgencyPhone
                      return (
                        <label key={p.jid}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs',
                            isChecked ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-zinc-800/40 border border-transparent hover:bg-zinc-800/70',
                            p.isAgencyPhone && 'opacity-70 cursor-not-allowed'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={p.isAgencyPhone}
                            onChange={e => {
                              const next = new Set(teamSelection)
                              if (e.target.checked) next.add(p.jid)
                              else next.delete(p.jid)
                              setTeamSelection(next)
                            }}
                            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5"
                          />
                          <span className={cn('flex-1 truncate', isChecked ? 'text-zinc-200' : 'text-zinc-400')}>
                            {p.displayName}
                          </span>
                          {p.isAgencyPhone && (
                            <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30 bg-blue-500/10 shrink-0">
                              Agência
                            </Badge>
                          )}
                          {p.isAdmin && !p.isAgencyPhone && (
                            <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700 shrink-0">
                              Admin
                            </Badge>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-600 text-xs">
                      {teamSelection.size} marcados como time
                    </span>
                    <Button size="sm" onClick={saveTeamMembers} disabled={teamSaving}
                      className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-xs h-7">
                      {teamSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Salvar
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TabHistorico({ clientId }: { clientId: string }) {
  const [analyses, setAnalyses]     = useState<AnalysisHistoryEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/analysis/${clientId}`)
      .then(r => r.json())
      .then(d => setAnalyses((d.analyses ?? []).map((a: Record<string, unknown>) => ({
        id:               String(a.id),
        scoreTotal:       Number(a.score_total),
        scoreFinanceiro:  a.score_financeiro != null ? Number(a.score_financeiro) : null,
        scoreProximidade: a.score_proximidade != null ? Number(a.score_proximidade) : null,
        scoreResultado:   a.score_resultado != null ? Number(a.score_resultado) : null,
        scoreNps:         a.score_nps != null ? Number(a.score_nps) : null,
        churnRisk:        String(a.churn_risk ?? 'low'),
        diagnosis:        a.diagnosis ? String(a.diagnosis) : null,
        flags:            (a.flags as string[]) ?? [],
        triggeredBy:      String(a.triggered_by ?? 'scheduled'),
        analyzedAt:       String(a.analyzed_at),
        proximitySentiment:     a.proximity_sentiment != null ? String(a.proximity_sentiment) : null,
        proximityEngagement:    a.proximity_engagement != null ? String(a.proximity_engagement) : null,
        proximitySummary:       a.proximity_summary != null ? String(a.proximity_summary) : null,
        proximityMessagesTotal: a.proximity_messages_total != null ? Number(a.proximity_messages_total) : null,
        proximityMessagesClient: a.proximity_messages_client != null ? Number(a.proximity_messages_client) : null,
        proximityWeeklyBatches: a.proximity_weekly_batches != null ? Number(a.proximity_weekly_batches) : null,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <History className="w-8 h-8 text-zinc-700" />
        <p className="text-zinc-500 text-sm">Nenhuma análise realizada ainda.</p>
        <p className="text-zinc-600 text-xs">Clique em "Analisar agora" para gerar o primeiro health score.</p>
      </div>
    )
  }

  // Gráfico de linha simples com SVG
  const maxScore    = 100
  const chartW      = 280
  const chartH      = 60
  const pts         = analyses.slice().reverse()  // mais antigo primeiro
  const xStep       = pts.length > 1 ? chartW / (pts.length - 1) : chartW
  const points      = pts.map((a, i) => ({
    x: pts.length === 1 ? chartW / 2 : i * xStep,
    y: chartH - (a.scoreTotal / maxScore) * chartH,
    score: a.scoreTotal,
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = points.length > 0
    ? `M${points[0].x},${chartH} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${chartH} Z`
    : ''

  return (
    <div className="space-y-4">
      {/* Gráfico de evolução */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <p className="text-zinc-400 text-xs font-medium mb-3">Evolução do Health Score</p>
          {pts.length > 1 ? (
            <div className="overflow-x-auto">
              <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 10}`} className="min-w-[200px]">
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#scoreGrad)" />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3" fill="#10b981" />
                    <text x={p.x} y={chartH + 9} textAnchor="middle" fontSize="7" fill="#52525b">
                      {p.score}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="flex justify-between text-zinc-700 text-xs mt-1">
                <span>{fmtDate(pts[0].analyzedAt.slice(0, 10))}</span>
                <span>{fmtDate(pts[pts.length - 1].analyzedAt.slice(0, 10))}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <ScoreSparkbar score={pts[0].scoreTotal} />
              <span className="text-zinc-600 text-xs">Apenas 1 análise disponível</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de análises */}
      <div className="space-y-2">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider px-1">Análises anteriores</p>
        {analyses.map(a => {
          const isExpanded = expanded === a.id
          const riskColor  = a.churnRisk === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/20'
                           : a.churnRisk === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                           : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          const riskLabel  = a.churnRisk === 'high' ? 'Alto' : a.churnRisk === 'medium' ? 'Médio' : 'Baixo'

          return (
            <Card key={a.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <button
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => setExpanded(isExpanded ? null : a.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ScoreSparkbar score={a.scoreTotal} />
                      <Badge variant="outline" className={cn('text-xs', riskColor)}>
                        {riskLabel}
                      </Badge>
                      <span className="text-zinc-600 text-xs">
                        {a.triggeredBy === 'manual' ? '🔘 Manual' : '🔄 Automática'}
                      </span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">{fmtDate(a.analyzedAt.slice(0, 10))}</p>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 text-zinc-600 shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3">
                    {/* Breakdown dos pilares */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '💰 Financeiro',  value: a.scoreFinanceiro  },
                        { label: '💬 Proximidade', value: a.scoreProximidade },
                        { label: '🎯 Resultado',   value: a.scoreResultado   },
                        { label: '⭐ NPS',          value: a.scoreNps         },
                      ].map(p => (
                        <div key={p.label} className="bg-zinc-800/50 rounded-lg p-2">
                          <p className="text-zinc-500 text-xs">{p.label}</p>
                          {p.value !== null
                            ? <ScoreSparkbar score={p.value} />
                            : <p className="text-zinc-700 text-xs">sem dados</p>
                          }
                        </div>
                      ))}
                    </div>

                    {/* Flags */}
                    {a.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.flags.map(f => (
                          <Badge key={f} variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/5">
                            ⚠️ {f.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Diagnóstico */}
                    {a.diagnosis && (
                      <div className="bg-zinc-800/30 rounded-lg p-3">
                        <p className="text-zinc-500 text-xs font-medium mb-1.5">Diagnóstico</p>
                        <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line line-clamp-6">
                          {a.diagnosis}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
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
  const [deleteAsaas, setDeleteAsaas]          = useState(false)
  const [deleting, setDeleting]                = useState(false)
  const [deleteError, setDeleteError]          = useState<string | null>(null)

  const { client, loading, error, refetch } = useClient(id)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      // 1. Se solicitado, tenta excluir cada customer Asaas vinculado
      if (deleteAsaas && client?.integrations?.length) {
        const asaasInteg = (client.integrations as Integration[]).filter(i => i.type === 'asaas')
        await Promise.allSettled(
          asaasInteg.map(async integ => {
            const creds = integ.credentials as { customer_id?: string } | undefined
            if (!creds?.customer_id) return
            await fetch(`/api/asaas/customers?customerId=${creds.customer_id}`, { method: 'DELETE' })
          })
        )
      }

      // 2. Exclui o cliente no ZC
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setDeleteError(d.error ?? `Erro HTTP ${res.status}`)
        setDeleting(false)
        return
      }
      router.push('/clientes')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro inesperado')
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
              análises e integrações serão apagados permanentemente.
            </p>

            {/* Opção Asaas — só mostra se tem integração vinculada */}
            {client.integrations?.some(i => i.type === 'asaas') && (
              <button
                onClick={() => setDeleteAsaas(v => !v)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                  deleteAsaas
                    ? 'border-red-500/40 bg-red-500/8'
                    : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all',
                  deleteAsaas ? 'border-red-500 bg-red-500' : 'border-zinc-600'
                )}>
                  {deleteAsaas && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className={cn('text-sm font-medium', deleteAsaas ? 'text-red-300' : 'text-zinc-300')}>
                    Excluir também no Asaas
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                    Remove o customer da sua conta Asaas. Cobranças pagas não são afetadas.
                  </p>
                </div>
              </button>
            )}

            {deleteError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-red-300 text-xs">{deleteError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button variant="outline" size="sm" className="flex-1 border-zinc-700 text-zinc-400 hover:text-white"
                onClick={() => { setShowDeleteModal(false); setDeleteError(null); setDeleteAsaas(false) }}
                disabled={deleting}>
                Cancelar
              </Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={handleDelete} disabled={deleting}>
                {deleting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Excluindo...</>
                  : <><Trash2 className="w-3.5 h-3.5" /> Excluir</>}
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
        {activeTab === 'visao-geral'  && <TabVisaoGeral client={client} refetch={refetch} />}
        {activeTab === 'cadastro'     && <TabCadastro client={client} />}
        {activeTab === 'financeiro'   && <TabFinanceiro client={client} />}
        {activeTab === 'pasta'        && <TabPasta client={client} refetch={refetch} />}
        {activeTab === 'integracoes'  && <TabIntegracoes client={client} refetch={refetch} />}
        {activeTab === 'formularios'  && <TabFormularios clientId={client.id} client={client} />}
        {activeTab === 'sentimento'   && <TabSentimento clientId={client.id} client={client} refetch={refetch} />}
        {activeTab === 'historico'    && <TabHistorico clientId={client.id} />}
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
