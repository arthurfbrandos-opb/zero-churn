import Link from 'next/link'
import {
  MessageCircle, CreditCard, Building2, BarChart2,
  ChevronRight, Clock, Plus, Search, Filter,
  Users, Sparkles, RefreshCw, TrendingUp, AlertTriangle, Timer,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RiskBadge } from '@/components/dashboard/risk-badge'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { getClientsSortedByRisk, getClientSummary } from '@/lib/mock-data'
import { Integration } from '@/types'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function getDaysToRenew(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

// ── Botão de integração ──────────────────────────────────────────
interface IntegrationBtnProps {
  integration?: Integration
  type: 'whatsapp' | 'asaas' | 'dom_pagamentos' | 'ads'
  clientId: string
}

function IntegrationBtn({ integration, type, clientId }: IntegrationBtnProps) {
  const connected = integration?.status === 'connected'
  const error = integration?.status === 'error' || integration?.status === 'expired'

  const config = {
    whatsapp: {
      icon: MessageCircle,
      labelOn: 'Abrir grupo',
      labelOff: 'Conectar WhatsApp',
      color: connected ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
        : error ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
    asaas: {
      icon: CreditCard,
      labelOn: 'Ver no Asaas',
      labelOff: 'Conectar Asaas',
      color: connected ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
        : error ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
    dom_pagamentos: {
      icon: Building2,
      labelOn: 'Ver no Dom',
      labelOff: 'Conectar Dom',
      color: connected ? 'text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20'
        : error ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
    ads: {
      icon: BarChart2,
      labelOn: 'Ver anúncios',
      labelOff: 'Conectar anúncios',
      color: connected ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20'
        : 'text-zinc-500 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50',
    },
  }

  const { icon: Icon, labelOn, labelOff, color } = config[type]

  return (
    <Link href={`/clientes/${clientId}?tab=integracoes`}>
      <button
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${color}`}
        title={connected ? labelOn : labelOff}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span className="hidden sm:inline">{connected ? labelOn : labelOff}</span>
      </button>
    </Link>
  )
}

// ── Card de resumo ────────────────────────────────────────────────
interface SummaryCardProps {
  label: string
  value: number
  icon: React.ElementType
  color: string
  sub?: string
}

function SummaryCard({ label, value, icon: Icon, color, sub }: SummaryCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
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

// ── Página ───────────────────────────────────────────────────────
export default function ClientesPage() {
  const clients = getClientsSortedByRisk()
  const summary = getClientSummary()

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
          <SummaryCard
            label="Ativos"
            value={summary.ativos}
            icon={Users}
            color="bg-zinc-700 text-zinc-300"
          />
          <SummaryCard
            label="Novos (30d)"
            value={summary.novos}
            icon={Sparkles}
            color="bg-emerald-500/15 text-emerald-400"
            sub="recém integrados"
          />
          <SummaryCard
            label="MRR"
            value={summary.mrr}
            icon={TrendingUp}
            color="bg-emerald-500/10 text-emerald-400"
            sub="recorrentes"
          />
          <SummaryCard
            label="TCV"
            value={summary.tcv}
            icon={BarChart2}
            color="bg-blue-500/10 text-blue-400"
            sub="projetos"
          />
          <SummaryCard
            label="Em renovação"
            value={summary.renovacao}
            icon={RefreshCw}
            color={summary.renovacao > 0 ? "bg-yellow-500/10 text-yellow-400" : "bg-zinc-700 text-zinc-500"}
            sub="vencem em 45d"
          />
          <SummaryCard
            label="TCV encerrando"
            value={summary.tcvEncerrando}
            icon={Timer}
            color={summary.tcvEncerrando > 0 ? "bg-orange-500/10 text-orange-400" : "bg-zinc-700 text-zinc-500"}
            sub="próximos 30d"
          />
          <SummaryCard
            label="Em risco"
            value={summary.emRisco}
            icon={AlertTriangle}
            color={summary.emRisco > 0 ? "bg-red-500/10 text-red-400" : "bg-zinc-700 text-zinc-500"}
            sub="score crítico"
          />
        </div>

        {/* Banners de atenção */}
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
                {' '}encerrando nos próximos 30 dias — prepare a entrega final e avalie proposta de continuidade.
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

        {/* Barra de busca + filtro */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            />
          </div>
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2">
            <Filter className="w-4 h-4" /> Filtrar
          </Button>
        </div>

        {/* Lista de clientes */}
        <div className="space-y-3">
          {clients.map((client) => {
            const daysToRenew = getDaysToRenew(client.contractEndDate)
            const isObservacao = !client.healthScore
            const risk = client.healthScore?.churnRisk ?? 'observacao'
            const score = client.healthScore?.scoreTotal

            const whatsapp = client.integrations.find(i => i.type === 'whatsapp')
            const asaas = client.integrations.find(i => i.type === 'asaas')
            const dom = client.integrations.find(i => i.type === 'dom_pagamentos')
            const ads = client.integrations.find(i => i.type === 'meta_ads' || i.type === 'google_ads')

            return (
              <Card key={client.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">

                    {/* Score */}
                    <div className="shrink-0 pt-1">
                      {isObservacao ? (
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-zinc-500" />
                        </div>
                      ) : (
                        <ScoreGauge score={score!} size="sm" />
                      )}
                    </div>

                    {/* Info + ações */}
                    <div className="flex-1 min-w-0 space-y-2.5">

                      {/* Linha 1: nome + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{client.nomeResumido ?? client.name}</p>
                        <RiskBadge risk={risk} size="sm" />
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 border font-medium ${client.clientType === 'mrr' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>
                          {client.clientType.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Linha 2: detalhes */}
                      <div className="flex items-center gap-3 text-zinc-500 text-xs flex-wrap">
                        <span>{client.razaoSocial ?? client.name}</span>
                        <span>·</span>
                        <span>{client.segment}</span>
                        <span>·</span>
                        <span>{client.serviceSold}</span>
                        {client.clientType === 'mrr' && daysToRenew > 0 && daysToRenew <= 60 && (
                          <>
                            <span>·</span>
                            <span className={daysToRenew <= 20 ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                              Renova em {daysToRenew}d
                            </span>
                          </>
                        )}
                        {client.clientType === 'tcv' && (
                          <>
                            <span>·</span>
                            <span className={daysToRenew <= 15 ? 'text-red-400 font-medium' : 'text-blue-400'}>
                              {daysToRenew}d restantes
                            </span>
                          </>
                        )}
                      </div>

                      {/* Linha 3: botões de integração */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <IntegrationBtn type="whatsapp" integration={whatsapp} clientId={client.id} />
                        <IntegrationBtn type="asaas" integration={asaas} clientId={client.id} />
                        <IntegrationBtn type="dom_pagamentos" integration={dom} clientId={client.id} />
                        <IntegrationBtn type="ads" integration={ads} clientId={client.id} />
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
                        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs gap-1">
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
      </div>
    </div>
  )
}
