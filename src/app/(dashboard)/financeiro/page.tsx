'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  DollarSign, TrendingUp, AlertTriangle, HelpCircle,
  ChevronDown, ChevronRight, RefreshCw, ExternalLink,
  CheckCircle2, Clock, XCircle, Filter, Calendar,
  Building2, Loader2, AlertCircle, CreditCard,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Tipos ────────────────────────────────────────────────────────
interface Cobranca {
  id:         string
  clientId:   string | null
  clientName: string
  valor:      number
  vencimento: string
  pagamento:  string | null
  status:     string
  tipo:       string
  descricao:  string | null
  invoiceUrl: string | null
  fonte:      string
  contaLabel: string
}

interface ClienteGroup {
  clientId:   string | null
  clientName: string
  recebido:   number
  previsto:   number
  emAtraso:   number
  cobranças:  Cobranca[]
}

interface Resumo {
  recebido:         number
  previsto:         number
  emAtraso:         number
  semIdentificacao: number
}

interface FinanceiroData {
  resumo:              Resumo
  cobrancasPorCliente: ClienteGroup[]
  semIdentificacao:    Cobranca[]
  periodo:             { inicio: string; fim: string; mes: string }
  fontes:              string[]
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function getMesLabel(mes: string) {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// Gera lista dos últimos 12 meses
function getUltimos12Meses() {
  const meses = []
  const hoje = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    meses.push({ valor, label })
  }
  return meses
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  RECEIVED:         { label: 'Recebido',    icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
  CONFIRMED:        { label: 'Confirmado',  icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
  RECEIVED_IN_CASH: { label: 'Rec. Dinheiro', icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
  PENDING:          { label: 'Pendente',    icon: Clock,        cls: 'text-yellow-400 bg-yellow-500/10'  },
  OVERDUE:          { label: 'Em atraso',   icon: XCircle,      cls: 'text-red-400 bg-red-500/10'        },
  REFUNDED:         { label: 'Estornado',   icon: AlertCircle,  cls: 'text-zinc-400 bg-zinc-700'         },
  CHARGEBACK_REQUESTED: { label: 'Chargeback', icon: AlertCircle, cls: 'text-red-400 bg-red-500/10'     },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: HelpCircle, cls: 'text-zinc-400 bg-zinc-800' }
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.cls)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    BOLETO:      'Boleto',
    PIX:         'Pix',
    CREDIT_CARD: 'Cartão',
    UNDEFINED:   'Boleto/Pix',
  }
  return (
    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
      {map[tipo] ?? tipo}
    </span>
  )
}

// ── Card de resumo ────────────────────────────────────────────────
function ResumoCard({
  label, value, sub, icon: Icon, color, bg, border,
}: {
  label: string; value: number; sub?: string
  icon: React.ElementType; color: string; bg: string; border: string
}) {
  return (
    <Card className={cn('border', bg, border)}>
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-zinc-500 text-xs font-medium mb-1">{label}</p>
            <p className={cn('text-xl lg:text-2xl font-bold tabular-nums', color)}>{fmt(value)}</p>
            {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
          </div>
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Linha de cobrança ─────────────────────────────────────────────
function CobrancaRow({ c }: { c: Cobranca }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={c.status} />
          <TipoBadge tipo={c.tipo} />
          {c.descricao && (
            <span className="text-zinc-500 text-xs truncate max-w-[200px]">{c.descricao}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
          <span>Venc: {fmtDate(c.vencimento)}</span>
          {c.pagamento && <span>Pago: {fmtDate(c.pagamento)}</span>}
          <span className="text-zinc-700">{c.contaLabel}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('font-semibold text-sm tabular-nums',
          ['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(c.status) ? 'text-emerald-400'
          : c.status === 'OVERDUE' ? 'text-red-400'
          : 'text-zinc-300'
        )}>
          {fmt(c.valor)}
        </p>
        {c.invoiceUrl && (
          <a href={c.invoiceUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5 justify-end mt-0.5">
            <ExternalLink className="w-3 h-3" /> Ver boleto
          </a>
        )}
      </div>
    </div>
  )
}

// ── Bloco por cliente ─────────────────────────────────────────────
function ClienteBlock({ grupo }: { grupo: ClienteGroup }) {
  const [open, setOpen] = useState(grupo.emAtraso > 0) // abre automaticamente inadimplentes
  const total = grupo.recebido + grupo.previsto + grupo.emAtraso

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      grupo.emAtraso > 0 ? 'border-red-500/20 bg-red-500/3' : 'border-zinc-800 bg-zinc-900/40'
    )}>
      {/* Cabeçalho do cliente */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
          grupo.clientId ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-700 text-zinc-500'
        )}>
          {grupo.clientId
            ? grupo.clientName.slice(0, 2).toUpperCase()
            : <HelpCircle className="w-4 h-4" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-zinc-200 text-sm font-medium truncate">{grupo.clientName}</p>
            {grupo.emAtraso > 0 && (
              <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs shrink-0">
                Inadimplente
              </Badge>
            )}
            {!grupo.clientId && (
              <Badge className="bg-zinc-700 text-zinc-500 border border-zinc-600 text-xs shrink-0">
                Sem cadastro
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs">
            {grupo.recebido > 0 && (
              <span className="text-emerald-400">✓ {fmt(grupo.recebido)}</span>
            )}
            {grupo.previsto > 0 && (
              <span className="text-yellow-400">⏳ {fmt(grupo.previsto)}</span>
            )}
            {grupo.emAtraso > 0 && (
              <span className="text-red-400">⚠ {fmt(grupo.emAtraso)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-zinc-400 text-xs">Total período</p>
            <p className="text-zinc-200 text-sm font-semibold tabular-nums">{fmt(total)}</p>
          </div>
          {grupo.clientId && (
            <Link
              href={`/clientes/${grupo.clientId}?tab=financeiro`}
              onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
            </Link>
          )}
          {open
            ? <ChevronDown className="w-4 h-4 text-zinc-600" />
            : <ChevronRight className="w-4 h-4 text-zinc-600" />
          }
        </div>
      </button>

      {/* Cobranças expandidas */}
      {open && (
        <div className="px-4 pb-3 border-t border-zinc-800/50">
          {grupo.cobranças.map(c => <CobrancaRow key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function FinanceiroPage() {
  const meses = getUltimos12Meses()
  const [mesSelecionado, setMesSelecionado] = useState(meses[0].valor)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'recebido' | 'previsto' | 'emAtraso'>('todos')
  const [dados, setDados] = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSemIdent, setShowSemIdent] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/financeiro?mes=${mesSelecionado}`)
      if (!r.ok) throw new Error((await r.json()).error ?? 'Erro ao carregar dados')
      setDados(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }, [mesSelecionado])

  useEffect(() => { carregar() }, [carregar])

  // Filtra clientes por status selecionado
  const clientesFiltrados = (dados?.cobrancasPorCliente ?? []).filter(g => {
    if (filtroStatus === 'recebido') return g.recebido > 0
    if (filtroStatus === 'previsto') return g.previsto > 0
    if (filtroStatus === 'emAtraso') return g.emAtraso > 0
    return true
  })

  const resumo = dados?.resumo ?? { recebido: 0, previsto: 0, emAtraso: 0, semIdentificacao: 0 }
  const totalClientes = dados?.cobrancasPorCliente.length ?? 0
  const inadimplentes = dados?.cobrancasPorCliente.filter(g => g.emAtraso > 0).length ?? 0

  return (
    <div className="min-h-screen">
      <Header
        title="Financeiro"
        description="Contas a receber — visão consolidada da carteira"
        action={
          <Button
            variant="ghost" size="icon"
            onClick={carregar}
            disabled={loading}
            className="text-zinc-400 hover:text-white w-9 h-9"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">

        {/* ── Filtros de período e status ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de mês */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <select
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              className="pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 appearance-none cursor-pointer focus:outline-none focus:border-zinc-600 capitalize"
            >
              {meses.map(m => (
                <option key={m.valor} value={m.valor} className="capitalize">{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          {/* Filtro de status */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {([
              { key: 'todos',     label: 'Todos'     },
              { key: 'recebido',  label: 'Recebidos' },
              { key: 'previsto',  label: 'Previstos' },
              { key: 'emAtraso',  label: 'Em atraso' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroStatus(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  filtroStatus === f.key
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Fonte ativa */}
          {dados?.fontes.map(f => (
            <span key={f} className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/60 border border-zinc-700 px-2.5 py-1.5 rounded-lg">
              <CreditCard className="w-3 h-3" />
              {f}
            </span>
          ))}
        </div>

        {/* ── Estado de loading ────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-zinc-500 text-sm">Consultando Asaas…</p>
            </div>
          </div>
        )}

        {/* ── Estado de erro ───────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-zinc-400 text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={carregar}
              className="border-zinc-700 text-zinc-400">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* ── Conteúdo ─────────────────────────────────────────────── */}
        {!loading && !error && dados && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ResumoCard
                label="Recebido"
                value={resumo.recebido}
                sub={getMesLabel(mesSelecionado)}
                icon={CheckCircle2}
                color="text-emerald-400"
                bg="bg-emerald-500/5"
                border="border-emerald-500/20"
              />
              <ResumoCard
                label="Previsto a receber"
                value={resumo.previsto}
                sub="cobranças em aberto"
                icon={TrendingUp}
                color="text-blue-400"
                bg="bg-blue-500/5"
                border="border-blue-500/20"
              />
              <ResumoCard
                label="Em atraso"
                value={resumo.emAtraso}
                sub={inadimplentes > 0 ? `${inadimplentes} cliente${inadimplentes > 1 ? 's' : ''}` : 'nenhum cliente'}
                icon={AlertTriangle}
                color={resumo.emAtraso > 0 ? 'text-red-400' : 'text-zinc-500'}
                bg={resumo.emAtraso > 0 ? 'bg-red-500/5' : 'bg-zinc-900'}
                border={resumo.emAtraso > 0 ? 'border-red-500/20' : 'border-zinc-800'}
              />
              <ResumoCard
                label="Sem identificação"
                value={resumo.semIdentificacao}
                sub="recebimentos não vinculados"
                icon={HelpCircle}
                color={resumo.semIdentificacao > 0 ? 'text-yellow-400' : 'text-zinc-500'}
                bg={resumo.semIdentificacao > 0 ? 'bg-yellow-500/5' : 'bg-zinc-900'}
                border={resumo.semIdentificacao > 0 ? 'border-yellow-500/20' : 'border-zinc-800'}
              />
            </div>

            {/* Barra de saúde financeira */}
            {(resumo.recebido + resumo.previsto + resumo.emAtraso) > 0 && (() => {
              const total = resumo.recebido + resumo.previsto + resumo.emAtraso
              const pRecebido = (resumo.recebido / total) * 100
              const pPrevisto  = (resumo.previsto / total) * 100
              const pAtraso    = (resumo.emAtraso / total) * 100
              return (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-zinc-400 text-xs font-medium">Composição do faturamento — {getMesLabel(mesSelecionado)}</p>
                      <p className="text-zinc-300 text-xs font-semibold">{fmt(total)}</p>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                      {pRecebido > 0 && <div className="bg-emerald-500 rounded-full" style={{ width: `${pRecebido}%` }} />}
                      {pPrevisto  > 0 && <div className="bg-blue-500 rounded-full"    style={{ width: `${pPrevisto}%`  }} />}
                      {pAtraso    > 0 && <div className="bg-red-500 rounded-full"     style={{ width: `${pAtraso}%`    }} />}
                    </div>
                    <div className="flex items-center gap-4 mt-2.5">
                      {[
                        { color: 'bg-emerald-500', label: 'Recebido',  pct: pRecebido },
                        { color: 'bg-blue-500',    label: 'Previsto',  pct: pPrevisto  },
                        { color: 'bg-red-500',     label: 'Em atraso', pct: pAtraso    },
                      ].filter(i => i.pct > 0).map(i => (
                        <div key={i.label} className="flex items-center gap-1.5">
                          <div className={cn('w-2 h-2 rounded-full', i.color)} />
                          <span className="text-zinc-500 text-xs">{i.label} {i.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Cobranças sem identificação */}
            {dados.semIdentificacao.length > 0 && (
              <Card className="bg-yellow-500/5 border-yellow-500/20">
                <CardHeader className="px-5 pt-4 pb-2">
                  <button
                    onClick={() => setShowSemIdent(o => !o)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-300 text-sm font-semibold">
                        Recebimentos sem identificação
                      </span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        {dados.semIdentificacao.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-sm font-semibold">{fmt(resumo.semIdentificacao)}</span>
                      {showSemIdent
                        ? <ChevronDown className="w-4 h-4 text-yellow-600" />
                        : <ChevronRight className="w-4 h-4 text-yellow-600" />}
                    </div>
                  </button>
                  <p className="text-zinc-500 text-xs mt-1 text-left">
                    Pagamentos no Asaas de clientes que ainda não foram cadastrados no Zero Churn.
                    <Link href="/clientes/novo" className="text-yellow-400 hover:underline ml-1">
                      Cadastrar cliente →
                    </Link>
                  </p>
                </CardHeader>
                {showSemIdent && (
                  <CardContent className="px-5 pb-4 space-y-0">
                    {dados.semIdentificacao.map(c => <CobrancaRow key={c.id} c={c} />)}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Lista por cliente */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400 text-sm font-medium">
                    {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
                    {filtroStatus !== 'todos' && ` com ${
                      filtroStatus === 'recebido' ? 'recebimentos' :
                      filtroStatus === 'previsto' ? 'valores previstos' : 'valores em atraso'
                    }`}
                  </span>
                </div>
                {totalClientes > 0 && (
                  <span className="text-zinc-600 text-xs">
                    {inadimplentes > 0 ? `${inadimplentes} inadimplente${inadimplentes > 1 ? 's' : ''}` : 'Carteira saudável ✓'}
                  </span>
                )}
              </div>

              {clientesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <Filter className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">Nenhum cliente com esse filtro neste período.</p>
                  <button
                    onClick={() => setFiltroStatus('todos')}
                    className="text-zinc-400 hover:text-white text-xs mt-2 underline"
                  >
                    Ver todos
                  </button>
                </div>
              ) : (
                clientesFiltrados.map(g => (
                  <ClienteBlock
                    key={g.clientId ?? g.clientName}
                    grupo={g}
                  />
                ))
              )}
            </div>

            {/* Estado vazio — sem integração Asaas */}
            {dados.fontes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
                <DollarSign className="w-12 h-12 text-zinc-700 mb-4" />
                <p className="text-zinc-300 font-semibold mb-1">Nenhuma conta financeira conectada</p>
                <p className="text-zinc-500 text-sm mb-4">
                  Conecte uma conta Asaas ou Dom Pagamentos para visualizar os dados financeiros da sua carteira.
                </p>
                <Link href="/configuracoes">
                  <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white">
                    Ir para Configurações
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
