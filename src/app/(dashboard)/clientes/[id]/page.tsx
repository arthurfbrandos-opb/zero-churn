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
import { Loader2, Plus, Search, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mockServices } from '@/lib/mock-data'
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
  { id: 'visao-geral',  label: 'Visão Geral',  icon: Activity  },
  { id: 'cadastro',     label: 'Cadastro',     icon: Building2 },
  { id: 'financeiro',   label: 'Financeiro',   icon: CreditCard },
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
  const c = client as unknown as Record<string, unknown>
  const clientType  = client.clientType ?? 'mrr'
  const service     = mockServices.find(s => s.id === client.serviceId)
  const entregaveis = service?.entregaveis.filter(e => (client.entregaveisIncluidos ?? []).includes(e.id)) ?? []
  const bonus       = service?.bonus?.filter(b => (client.bonusIncluidos ?? []).includes(b.id)) ?? []
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
        <F label="Tipo" value={clientType === 'mrr' ? 'MRR — Recorrente mensal' : 'TCV — Projeto com valor fixo'} />
        {service && <F label="Produto / Serviço" value={service.name} />}
        <F label="Início do contrato" value={fmtDate(client.contractStartDate)} />
        {clientType === 'mrr' && <F label="Mensalidade (MRR)"     value={fmtMoney(mrrVal)} />}
        {clientType === 'tcv' && <F label="Valor total do projeto" value={fmtMoney(tcvVal)} />}
        <F label="Cadastrado em" value={fmtDate(client.createdAt)} />
      </S>

      {/* Entregáveis */}
      {entregaveis.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-zinc-200 font-semibold text-sm">Entregáveis do contrato</h3>
            <ul className="space-y-1.5">
              {entregaveis.map(e => (
                <li key={e.id} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>{e.name}</span>
                </li>
              ))}
            </ul>
            {bonus.length > 0 && (
              <>
                <h4 className="text-zinc-400 text-xs font-medium pt-2">Bônus incluídos</h4>
                <ul className="space-y-1">
                  {bonus.map(b => (
                    <li key={b.id} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-yellow-400 mt-0.5">★</span>
                      <span>{b.name}</span>
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

// ─── TabFinanceiro ────────────────────────────────────────────────
function TabFinanceiro({ client }: { client: Client }) {
  const [payments,      setPayments]      = useState<PaymentWithAccount[]>([])
  const [subscriptions, setSubscriptions] = useState<SubWithAccount[]>([])
  const [accounts,      setAccounts]      = useState<{ id: string; name: string }[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [showAll,       setShowAll]       = useState(false)
  const [cobrancaTarget, setCobrancaTarget] = useState<{ id: string; name: string } | null>(null)

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

  useEffect(() => { loadPayments() }, [client.id])

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
  if (accounts.length === 0) return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-zinc-600" />
        </div>
        <p className="text-zinc-400 text-sm font-medium">Nenhuma conta Asaas vinculada</p>
        <p className="text-zinc-600 text-xs">Vincule uma conta na aba Integrações para visualizar o histórico financeiro.</p>
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
    </div>
  )
}

// ─── Tipo de integração Asaas com credenciais ────────────────────
interface AsaasInteg {
  id:          string
  status:      string
  last_sync_at: string | null
  label:       string | null
  credentials: { customer_id: string; customer_name?: string | null } | null
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

  async function loadAccounts() {
    setLoadingAccounts(true)
    const res = await fetch(`/api/asaas/sync/${client.id}`)
    if (res.ok) { const d = await res.json(); setAsaasAccounts(d.integrations ?? []) }
    setLoadingAccounts(false)
  }

  useEffect(() => { loadAccounts() }, [])

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

        {/* ── WhatsApp ──────────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 font-semibold text-sm">WhatsApp</p>
                <p className="text-zinc-500 text-xs">Análise de sentimento via Evolution API</p>
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs shrink-0">Em breve</Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── Dom Pagamentos ────────────────────────────────────── */}
        <Card className="bg-zinc-900/50 border-zinc-800 opacity-60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-400 font-semibold text-sm">Dom Pagamentos</p>
                <p className="text-zinc-600 text-xs">Gateway alternativo de cobranças</p>
              </div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs shrink-0">Em breve</Badge>
            </div>
          </CardContent>
        </Card>

      </div>
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
        {activeTab === 'visao-geral' && <TabVisaoGeral client={client} />}
        {activeTab === 'cadastro'    && <TabCadastro client={client} />}
        {activeTab === 'financeiro'  && <TabFinanceiro client={client} />}
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
