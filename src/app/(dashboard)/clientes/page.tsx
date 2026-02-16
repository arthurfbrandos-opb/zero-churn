'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  MessageCircle, CreditCard, Building2, BarChart2,
  ChevronRight, Clock, Plus, Search, Filter,
  Users, Sparkles, RefreshCw, TrendingUp, AlertTriangle, Timer,
  CheckCircle2, AlertCircle, XCircle, X,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { getClientsSortedByRisk, getClientSummary } from '@/lib/mock-data'
import { Integration, ChurnRisk, ClientType, PaymentStatus } from '@/types'
import { cn } from '@/lib/utils'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function getDaysToEnd(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

// ── Badge de status de pagamento ──────────────────────────────────
function PaymentBadge({ status }: { status?: PaymentStatus }) {
  if (!status) return null
  const config = {
    em_dia:      { icon: CheckCircle2, label: 'Em dia',      cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/8' },
    vencendo:    { icon: AlertCircle,  label: 'Vencendo',    cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8'   },
    inadimplente:{ icon: XCircle,      label: 'Inadimplente', cls: 'text-red-400 border-red-500/30 bg-red-500/8'          },
  }
  const { icon: Icon, label, cls } = config[status]
  return (
    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium', cls)}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}

// ── Botão de integração ───────────────────────────────────────────
function IntegrationBtn({ integration, type, clientId }: {
  integration?: Integration
  type: 'whatsapp' | 'asaas' | 'dom_pagamentos' | 'ads'
  clientId: string
}) {
  const connected = integration?.status === 'connected'
  const error = integration?.status === 'error' || integration?.status === 'expired'

  const config = {
    whatsapp: {
      icon: MessageCircle,
      labelOn: 'Abrir grupo', labelOff: 'Conectar WhatsApp',
      color: connected ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
        : error ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
    asaas: {
      icon: CreditCard,
      labelOn: 'Ver no Asaas', labelOff: 'Conectar Asaas',
      color: connected ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
        : error ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
    dom_pagamentos: {
      icon: Building2,
      labelOn: 'Ver no Dom', labelOff: 'Conectar Dom',
      color: connected ? 'text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20'
        : error ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
    ads: {
      icon: BarChart2,
      labelOn: 'Ver anúncios', labelOff: 'Conectar anúncios',
      color: connected ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
  }

  const { icon: Icon, labelOn, labelOff, color } = config[type]

  return (
    <Link href={`/clientes/${clientId}?tab=integracoes`}>
      <button className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all', color)}>
        <Icon className="w-3 h-3 shrink-0" />
        <span className="hidden sm:inline">{connected ? labelOn : labelOff}</span>
      </button>
    </Link>
  )
}

// ── Card de resumo ────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType
  color: string; sub?: string
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-white text-xl font-bold leading-none">{value}</p>
          <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
          {sub && <p className="text-zinc-600 text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Filtros ───────────────────────────────────────────────────────
type RiskFilter = ChurnRisk | 'all'
type TypeFilter = ClientType | 'all'
type PaymentFilter = PaymentStatus | 'all'

function FilterPill({ active, onClick, children, color }: {
  active: boolean; onClick: () => void; children: React.ReactNode; color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap',
        active
          ? color ?? 'border-zinc-500 bg-zinc-700 text-white'
          : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
      )}
    >
      {children}
    </button>
  )
}

// ── Página ────────────────────────────────────────────────────────
export default function ClientesPage() {
  const allClients = getClientsSortedByRisk()
  const summary = getClientSummary()

  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  const hasActiveFilters = riskFilter !== 'all' || typeFilter !== 'all' || paymentFilter !== 'all' || search !== ''

  const filtered = useMemo(() => {
    return allClients.filter(c => {
      const risk = c.healthScore?.churnRisk ?? 'observacao'
      if (riskFilter !== 'all' && risk !== riskFilter) return false
      if (typeFilter !== 'all' && c.clientType !== typeFilter) return false
      if (paymentFilter !== 'all' && c.paymentStatus !== paymentFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !(c.nomeResumido ?? c.name).toLowerCase().includes(q) &&
          !c.razaoSocial?.toLowerCase().includes(q) &&
          !c.segment.toLowerCase().includes(q) &&
          !c.nomeDecisor?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [allClients, riskFilter, typeFilter, paymentFilter, search])

  function clearFilters() {
    setSearch(''); setRiskFilter('all'); setTypeFilter('all'); setPaymentFilter('all')
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Clientes"
        description={`${summary.ativos} clientes ativos na carteira`}
        action={
          <Link href="/clientes/novo">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Novo cliente
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-4">

        {/* Resumo executivo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <SummaryCard label="Ativos"          value={summary.ativos}         icon={Users}          color="bg-zinc-700 text-zinc-300" />
          <SummaryCard label="Novos (30d)"     value={summary.novos}          icon={Sparkles}       color="bg-emerald-500/15 text-emerald-400" sub="recém integrados" />
          <SummaryCard label="MRR"             value={summary.mrr}            icon={TrendingUp}     color="bg-emerald-500/10 text-emerald-400" sub="recorrentes" />
          <SummaryCard label="TCV"             value={summary.tcv}            icon={BarChart2}      color="bg-blue-500/10 text-blue-400" sub="projetos" />
          <SummaryCard label="Em renovação"    value={summary.renovacao}      icon={RefreshCw}      color={summary.renovacao > 0 ? "bg-yellow-500/10 text-yellow-400" : "bg-zinc-700 text-zinc-500"} sub="vencem em 45d" />
          <SummaryCard label="TCV encerrando"  value={summary.tcvEncerrando}  icon={Timer}          color={summary.tcvEncerrando > 0 ? "bg-orange-500/10 text-orange-400" : "bg-zinc-700 text-zinc-500"} sub="próximos 30d" />
          <SummaryCard label="Em risco"        value={summary.emRisco}        icon={AlertTriangle}  color={summary.emRisco > 0 ? "bg-red-500/10 text-red-400" : "bg-zinc-700 text-zinc-500"} sub="score crítico" />
        </div>

        {/* Banners */}
        <div className="space-y-2">
          {summary.emRisco > 0 && (
            <div className="flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">
                <span className="font-semibold">{summary.emRisco} {summary.emRisco === 1 ? 'cliente' : 'clientes'}</span>
                {' '}em alto risco de churn — intervenção imediata recomendada.
              </p>
            </div>
          )}
          {summary.tcvEncerrando > 0 && (
            <div className="flex items-center gap-2.5 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-2.5">
              <Timer className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-orange-300 text-sm">
                <span className="font-semibold">{summary.tcvEncerrando} projeto{summary.tcvEncerrando !== 1 ? 's' : ''} TCV</span>
                {' '}encerrando nos próximos 30 dias — prepare a entrega e avalie proposta de continuidade.
              </p>
            </div>
          )}
          {summary.renovacao > 0 && (
            <div className="flex items-center gap-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-2.5">
              <RefreshCw className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-yellow-300 text-sm">
                <span className="font-semibold">{summary.renovacao} {summary.renovacao === 1 ? 'contrato MRR' : 'contratos MRR'}</span>
                {' '}vencendo nos próximos 45 dias — acione a renovação antes que o cliente saia.
              </p>
            </div>
          )}
        </div>

        {/* Busca + filtros */}
        <div className="space-y-3">

          {/* Linha 1: busca + limpar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, segmento, decisor..."
                className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg px-3 py-2 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            )}
          </div>

          {/* Linha 2: pills de filtro */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ícone filtro */}
            <Filter className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

            {/* Separador: Risco */}
            <span className="text-zinc-700 text-xs shrink-0">Risco:</span>
            <FilterPill active={riskFilter === 'all'}       onClick={() => setRiskFilter('all')}>Todos</FilterPill>
            <FilterPill active={riskFilter === 'high'}      onClick={() => setRiskFilter('high')}      color="border-red-500/40 bg-red-500/10 text-red-400">🔴 Alto</FilterPill>
            <FilterPill active={riskFilter === 'medium'}    onClick={() => setRiskFilter('medium')}    color="border-yellow-500/40 bg-yellow-500/10 text-yellow-400">🟡 Médio</FilterPill>
            <FilterPill active={riskFilter === 'low'}       onClick={() => setRiskFilter('low')}       color="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">🟢 Baixo</FilterPill>
            <FilterPill active={riskFilter === 'observacao'} onClick={() => setRiskFilter('observacao')} color="border-zinc-500/40 bg-zinc-700 text-zinc-400">⏱ Observação</FilterPill>

            <span className="text-zinc-700 text-xs shrink-0 ml-1">Tipo:</span>
            <FilterPill active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Todos</FilterPill>
            <FilterPill active={typeFilter === 'mrr'} onClick={() => setTypeFilter('mrr')} color="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">MRR</FilterPill>
            <FilterPill active={typeFilter === 'tcv'} onClick={() => setTypeFilter('tcv')} color="border-blue-500/40 bg-blue-500/10 text-blue-400">TCV</FilterPill>

            <span className="text-zinc-700 text-xs shrink-0 ml-1">Pagamento:</span>
            <FilterPill active={paymentFilter === 'all'}           onClick={() => setPaymentFilter('all')}>Todos</FilterPill>
            <FilterPill active={paymentFilter === 'em_dia'}        onClick={() => setPaymentFilter('em_dia')}        color="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">✅ Em dia</FilterPill>
            <FilterPill active={paymentFilter === 'vencendo'}      onClick={() => setPaymentFilter('vencendo')}      color="border-yellow-500/40 bg-yellow-500/10 text-yellow-400">⚠️ Vencendo</FilterPill>
            <FilterPill active={paymentFilter === 'inadimplente'}  onClick={() => setPaymentFilter('inadimplente')}  color="border-red-500/40 bg-red-500/10 text-red-400">🔴 Inadimplente</FilterPill>
          </div>

          {/* Resultado do filtro */}
          {hasActiveFilters && (
            <p className="text-zinc-600 text-xs">
              {filtered.length} de {allClients.length} clientes exibidos
            </p>
          )}
        </div>

        {/* Lista de clientes */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum cliente encontrado com os filtros aplicados.</p>
            <button onClick={clearFilters} className="text-emerald-400 text-xs mt-2 hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((client) => {
              const daysToEnd = getDaysToEnd(client.contractEndDate)
              const risk = client.healthScore?.churnRisk ?? 'observacao'
              const score = client.healthScore?.scoreTotal
              const isObservacao = !client.healthScore

              const whatsapp = client.integrations.find(i => i.type === 'whatsapp')
              const asaas    = client.integrations.find(i => i.type === 'asaas')
              const dom      = client.integrations.find(i => i.type === 'dom_pagamentos')
              const ads      = client.integrations.find(i => i.type === 'meta_ads' || i.type === 'google_ads')

              return (
                <Card key={client.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">

                      {/* Score gauge */}
                      <div className="shrink-0 pt-1">
                        {isObservacao ? (
                          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-zinc-500" />
                          </div>
                        ) : (
                          <ScoreGauge score={score!} size="sm" />
                        )}
                      </div>

                      {/* Conteúdo central */}
                      <div className="flex-1 min-w-0 space-y-2">

                        {/* Linha 1: nome + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">
                            {client.nomeResumido ?? client.name}
                          </p>
                          <RiskBadge risk={risk} size="sm" />
                          <Badge variant="outline" className={cn('text-xs px-1.5 py-0 border font-medium',
                            client.clientType === 'mrr'
                              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                              : 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                          )}>
                            {client.clientType.toUpperCase()}
                          </Badge>
                          <PaymentBadge status={client.paymentStatus} />
                        </div>

                        {/* Linha 2: detalhes */}
                        <div className="flex items-center gap-2 text-zinc-500 text-xs flex-wrap">
                          <span className="text-zinc-400">{client.razaoSocial ?? client.name}</span>
                          <span>·</span>
                          <span>{client.segment}</span>
                          {client.nomeDecisor && <><span>·</span><span>{client.nomeDecisor}</span></>}
                          {client.clientType === 'mrr' && daysToEnd > 0 && daysToEnd <= 60 && (
                            <><span>·</span>
                            <span className={daysToEnd <= 20 ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                              Renova em {daysToEnd}d
                            </span></>
                          )}
                          {client.clientType === 'tcv' && daysToEnd > 0 && (
                            <><span>·</span>
                            <span className={daysToEnd <= 15 ? 'text-red-400 font-medium' : 'text-blue-400'}>
                              {daysToEnd}d restantes
                            </span></>
                          )}
                        </div>

                        {/* Linha 3: integrações */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <IntegrationBtn type="whatsapp"      integration={whatsapp} clientId={client.id} />
                          <IntegrationBtn type="asaas"         integration={asaas}    clientId={client.id} />
                          <IntegrationBtn type="dom_pagamentos" integration={dom}     clientId={client.id} />
                          <IntegrationBtn type="ads"           integration={ads}      clientId={client.id} />
                        </div>
                      </div>

                      {/* Valor + link */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="text-right">
                          {client.clientType === 'mrr' ? (
                            <>
                              <p className="text-zinc-200 text-sm font-bold">{formatCurrency(client.contractValue)}</p>
                              <p className="text-zinc-500 text-xs">/mês</p>
                            </>
                          ) : (
                            <>
                              <p className="text-blue-400 text-sm font-bold">{formatCurrency(client.totalProjectValue ?? 0)}</p>
                              <p className="text-zinc-500 text-xs">total projeto</p>
                            </>
                          )}
                        </div>
                        <Link href={`/clientes/${client.id}`}>
                          <Button size="sm" variant="outline"
                            className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs gap-1">
                            Ver perfil <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
