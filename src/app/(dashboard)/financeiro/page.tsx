'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DollarSign, TrendingUp, AlertTriangle, HelpCircle,
  ChevronDown, ChevronRight, RefreshCw, ExternalLink,
  CheckCircle2, Clock, XCircle, Filter, Calendar,
  Building2, Loader2, AlertCircle, CreditCard,
  UserPlus, Link2, Search, X, Check,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ── Tipos ────────────────────────────────────────────────────────
interface Cobranca {
  id: string; clientId: string; clientName: string
  valorTotal:  number   // bruto
  valorLiquido: number  // líquido (o que cai na conta)
  vencimento: string; pagamento: string | null
  status: string; tipo: string; descricao: string | null
  invoiceUrl: string | null; fonte: string; contaLabel: string
  parcelas?: string | null; cartao?: string | null
  domCliente?: { nome: string; documento: string; email: string; telefone: string | null; produto: string | null } | null
}
interface ClienteGroup {
  clientId: string; clientName: string
  recebido: number; previsto: number; emAtraso: number
  cobranças: Cobranca[]
}
interface CustomerSemIdent {
  customerId: string; customerName: string
  cpfCnpj: string | null; email: string | null
  totalValor: number; pagamentos: Cobranca[]
  fonte: 'asaas' | 'dom'
}
interface Resumo {
  recebido: number;     recebidoBruto: number
  previsto: number;     previstobruto: number
  emAtraso: number;     emAtrasoBruto: number
  semIdentificacao: number
}
interface FinanceiroData {
  resumo: Resumo
  cobrancasPorCliente: ClienteGroup[]
  semIdentificacao: CustomerSemIdent[]
  periodo: { inicio: string; fim: string; mes: string }
  fontes: string[]
}
interface ClienteBasico {
  id: string; name: string; nome_resumido: string | null
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}
function fmtDoc(v: string | null) {
  if (!v) return null
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return v
}
function getMesLabel(mes: string) {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function getUltimos12Meses() {
  const hoje = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    return {
      valor: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  })
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  RECEIVED:             { label: 'Recebido',      icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
  CONFIRMED:            { label: 'Confirmado',    icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
  RECEIVED_IN_CASH:     { label: 'Rec. dinheiro', icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
  PENDING:              { label: 'Pendente',      icon: Clock,        cls: 'text-yellow-400 bg-yellow-500/10'   },
  OVERDUE:              { label: 'Em atraso',     icon: XCircle,      cls: 'text-red-400 bg-red-500/10'         },
  REFUNDED:             { label: 'Estornado',     icon: AlertCircle,  cls: 'text-zinc-400 bg-zinc-700'          },
  CHARGEBACK_REQUESTED: { label: 'Chargeback',    icon: AlertCircle,  cls: 'text-red-400 bg-red-500/10'         },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: HelpCircle, cls: 'text-zinc-400 bg-zinc-800' }
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', cfg.cls)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

// ── Card de resumo ────────────────────────────────────────────────
function ResumoCard({ label, value, sub, icon: Icon, color, bg, border }: {
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

// ── Badge de origem da cobrança ───────────────────────────────────
function FonteBadge({ fonte }: { fonte: string }) {
  if (fonte === 'dom') return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold
      bg-violet-500/15 text-violet-400 border border-violet-500/25 shrink-0">Dom</span>
  )
  return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold
      bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">Asaas</span>
  )
}

// ── Linha de cobrança ─────────────────────────────────────────────
function CobrancaRow({ c }: { c: Cobranca }) {
  const tipoMap: Record<string, string> = {
    BOLETO: 'Boleto', PIX: 'Pix', CREDIT_CARD: 'Cartão', DEBIT_CARD: 'Débito',
    credit_card: 'Cartão', debit_card: 'Débito', boleto: 'Boleto', pix: 'Pix',
    UNDEFINED: 'Bol/Pix',
  }
  const isPago   = ['RECEIVED','CONFIRMED','RECEIVED_IN_CASH','paid'].includes(c.status)
  const isAtraso = c.status === 'OVERDUE'
  const temTaxa  = Math.abs(c.valorTotal - c.valorLiquido) >= 0.01

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        {/* Linha 1: badges de status, tipo, origem */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={c.status} />
          <FonteBadge fonte={c.fonte} />
          <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
            {tipoMap[c.tipo] ?? c.tipo}{c.parcelas ? ` ${c.parcelas}` : ''}{c.cartao ? ` · ${c.cartao}` : ''}
          </span>
          {c.descricao && (
            <span className="text-zinc-500 text-xs truncate max-w-[160px]">{c.descricao}</span>
          )}
        </div>
        {/* Linha 2: datas + comprador Dom */}
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600 flex-wrap">
          <span>Venc: {fmtDate(c.vencimento)}</span>
          {c.pagamento && <span>· Pago: {fmtDate(c.pagamento)}</span>}
          {c.fonte === 'dom' && c.domCliente && (
            <span className="text-violet-400/60">
              · {c.domCliente.nome}
              {c.domCliente.documento ? ` (${c.domCliente.documento})` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Valores: total + líquido sempre visíveis */}
      <div className="text-right shrink-0 min-w-[100px] space-y-0.5">
        {temTaxa ? (
          <>
            <p className="text-zinc-500 text-[11px] tabular-nums">
              total {fmt(c.valorTotal)}
            </p>
            <p className={cn('font-semibold text-sm tabular-nums',
              isPago ? 'text-emerald-400' : isAtraso ? 'text-red-400' : 'text-zinc-300'
            )}>
              {fmt(c.valorLiquido)}
              <span className="text-[10px] font-normal opacity-50 ml-0.5">líq.</span>
            </p>
          </>
        ) : (
          <p className={cn('font-semibold text-sm tabular-nums',
            isPago ? 'text-emerald-400' : isAtraso ? 'text-red-400' : 'text-zinc-300'
          )}>{fmt(c.valorTotal)}</p>
        )}
        {c.invoiceUrl && (
          <a href={c.invoiceUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5 justify-end">
            <ExternalLink className="w-3 h-3" /> Ver
          </a>
        )}
      </div>
    </div>
  )
}

// ── Helpers de pills ─────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  BOLETO: 'Boleto', boleto: 'Boleto',
  PIX: 'Pix', pix: 'Pix',
  CREDIT_CARD: 'Cartão', credit_card: 'Cartão',
  DEBIT_CARD: 'Débito', debit_card: 'Débito',
  UNDEFINED: 'Bol/Pix',
}

function TipoPill({ tipo }: { tipo: string }) {
  const label = TIPO_LABEL[tipo] ?? tipo
  const cfg: Record<string, string> = {
    Boleto:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Pix:      'bg-teal-500/10  text-teal-400  border-teal-500/20',
    Cartão:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Débito:   'bg-cyan-500/10  text-cyan-400  border-cyan-500/20',
    'Bol/Pix':'bg-zinc-500/10  text-zinc-400  border-zinc-500/20',
  }
  return (
    <span className={cn(
      'inline-flex text-[10px] px-1.5 py-0.5 rounded font-semibold border shrink-0',
      cfg[label] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    )}>{label}</span>
  )
}

// ── Bloco por cliente cadastrado ──────────────────────────────────
function ClienteBlock({ grupo }: { grupo: ClienteGroup }) {
  const [open, setOpen] = useState(grupo.emAtraso > 0)
  const totalLiquido = grupo.recebido + grupo.previsto + grupo.emAtraso
  const totalBruto   = grupo.cobranças.reduce((s, c) => s + c.valorTotal, 0)
  const temDesconto  = Math.abs(totalBruto - totalLiquido) > 0.01

  // Pills sempre visíveis no header
  const fontes = [...new Set(grupo.cobranças.map(c => c.fonte))]
  const tipos  = [...new Set(grupo.cobranças.map(c => c.tipo))]

  return (
    <div className={cn('rounded-xl border overflow-hidden',
      grupo.emAtraso > 0 ? 'border-red-500/20 bg-red-500/3' : 'border-zinc-800 bg-zinc-900/40'
    )}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">
          {grupo.clientName.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Linha 1: nome + badge inadimplente */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-zinc-200 text-sm font-medium truncate">{grupo.clientName}</p>
            {grupo.emAtraso > 0 && (
              <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs shrink-0">Inadimplente</Badge>
            )}
          </div>
          {/* Linha 2: valores + origem + tipos de pagamento */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {grupo.recebido > 0 && <span className="text-emerald-400 text-xs">✓ {fmt(grupo.recebido)}</span>}
            {grupo.previsto  > 0 && <span className="text-yellow-400 text-xs">⏳ {fmt(grupo.previsto)}</span>}
            {grupo.emAtraso  > 0 && <span className="text-red-400 text-xs">⚠ {fmt(grupo.emAtraso)}</span>}
            {(grupo.recebido > 0 || grupo.previsto > 0 || grupo.emAtraso > 0) && (
              <span className="text-zinc-700 text-xs">·</span>
            )}
            {fontes.map(f => <FonteBadge key={f} fonte={f} />)}
            {tipos.map(t  => <TipoPill  key={t} tipo={t}  />)}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-zinc-500 text-xs">Total líquido</p>
            <p className="text-zinc-200 text-sm font-semibold tabular-nums">{fmt(totalLiquido)}</p>
            {temDesconto && (
              <p className="text-zinc-600 text-[11px] tabular-nums">bruto {fmt(totalBruto)}</p>
            )}
          </div>
          {grupo.clientId && (
            <Link href={`/clientes/${grupo.clientId}?tab=financeiro`} onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
            </Link>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-zinc-600" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-zinc-800/50">
          {grupo.cobranças.map(c => <CobrancaRow key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}

// ── Card de customer sem identificação ────────────────────────────
function SemIdentCard({
  customer, onVinculado,
}: {
  customer: CustomerSemIdent
  onVinculado: () => void
}) {
  const router = useRouter()
  const [modo, setModo]           = useState<'idle' | 'vincular' | 'vinculando' | 'ok'>('idle')
  const [search, setSearch]       = useState('')
  const [clientes, setClientes]   = useState<ClienteBasico[]>([])
  const [loadingCli, setLoadingCli] = useState(false)
  const [selecionado, setSelecionado] = useState<ClienteBasico | null>(null)
  const [erro, setErro]           = useState<string | null>(null)
  const [openPags, setOpenPags]   = useState(false)

  // Busca clientes para vincular
  useEffect(() => {
    if (modo !== 'vincular') return
    setLoadingCli(true)
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClientes(d.clients ?? []))
      .finally(() => setLoadingCli(false))
  }, [modo])

  const clientesFiltrados = clientes.filter(c => {
    const q = search.toLowerCase()
    return (c.nome_resumido ?? c.name).toLowerCase().includes(q)
  })

  async function handleVincular() {
    if (!selecionado) return
    setModo('vinculando')
    setErro(null)
    try {
      if (customer.fonte === 'dom') {
        // Dom: vincula pelo CPF/CNPJ do comprador
        const res = await fetch(`/api/dom/sync/${selecionado.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: customer.cpfCnpj,
            label:    customer.customerName,
          }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error ?? 'Erro ao vincular')
      } else {
        // Asaas: vincula pelo customerId
        const res = await fetch(`/api/asaas/sync/${selecionado.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asaas_customer_id: customer.customerId,
            customer_name:     customer.customerName,
            label:             customer.customerName,
          }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error ?? 'Erro ao vincular')
      }
      setModo('ok')
      setTimeout(() => onVinculado(), 1200)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao vincular')
      setModo('vincular')
    }
  }

  function handleCadastrar() {
    const base = {
      nome:  customer.customerName,
      ...(customer.email ? { email: customer.email } : {}),
    }
    const params = customer.fonte === 'dom'
      ? new URLSearchParams({ ...base, ...(customer.cpfCnpj ? { documento: customer.cpfCnpj } : {}) })
      : new URLSearchParams({
          ...base,
          asaas_customer_id: customer.customerId,
          ...(customer.cpfCnpj ? { cnpj: customer.cpfCnpj } : {}),
        })
    router.push(`/clientes/novo?${params}`)
  }

  if (modo === 'ok') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-emerald-300 text-sm font-medium">
          {customer.customerName} vinculado com sucesso!
        </p>
      </div>
    )
  }

  const tiposNaCard = [...new Set(customer.pagamentos.map(p => p.tipo))]

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      modo === 'vincular' || modo === 'vinculando'
        ? 'border-blue-500/30 bg-blue-500/5'
        : customer.fonte === 'dom'
          ? 'border-violet-500/20 bg-violet-500/5'
          : 'border-yellow-500/20 bg-yellow-500/5'
    )}>
      {/* Cabeçalho do customer */}
      <div className="flex items-start gap-3 p-4">
        <div className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
          customer.fonte === 'dom'
            ? 'bg-violet-500/10 border-violet-500/20'
            : 'bg-yellow-500/10 border-yellow-500/20'
        )}>
          <HelpCircle className={cn('w-5 h-5', customer.fonte === 'dom' ? 'text-violet-400' : 'text-yellow-400')} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Linha 1: nome + badges de origem e tipo */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-zinc-200 font-semibold text-sm">{customer.customerName}</p>
            <FonteBadge fonte={customer.fonte} />
            {tiposNaCard.map(t => <TipoPill key={t} tipo={t} />)}
          </div>
          {/* Linha 2: documento e e-mail */}
          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
            {customer.cpfCnpj && <span>{fmtDoc(customer.cpfCnpj)}</span>}
            {customer.email   && <span>{customer.email}</span>}
          </div>
          {/* Linha 3: valor + toggle de pagamentos */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-emerald-400 text-xs font-semibold">{fmt(customer.totalValor)}</span>
            <button
              onClick={() => setOpenPags(o => !o)}
              className="text-zinc-600 hover:text-zinc-400 text-xs flex items-center gap-1 transition-colors"
            >
              {customer.pagamentos.length} pagamento{customer.pagamentos.length > 1 ? 's' : ''}
              {openPags ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Ações — modo idle */}
        {modo === 'idle' && (
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModo('vincular')}
              className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 gap-1.5 text-xs"
            >
              <Link2 className="w-3.5 h-3.5" /> Vincular
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCadastrar}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 gap-1.5 text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" /> Cadastrar
            </Button>
          </div>
        )}
      </div>

      {/* Pagamentos expandíveis */}
      {openPags && (
        <div className="px-4 pb-3 border-t border-yellow-500/10">
          {customer.pagamentos.map(p => <CobrancaRow key={p.id} c={p} />)}
        </div>
      )}

      {/* Painel de vinculação inline */}
      {(modo === 'vincular' || modo === 'vinculando') && (
        <div className="px-4 pb-4 border-t border-blue-500/20 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">
              Vincular a cliente existente
            </p>
            <button onClick={() => { setModo('idle'); setSelecionado(null); setSearch('') }}
              className="text-zinc-600 hover:text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 bg-zinc-900 border-zinc-700 text-zinc-200 text-sm h-9"
              autoFocus
            />
          </div>

          {/* Lista de clientes */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loadingCli ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-4">Nenhum cliente encontrado</p>
            ) : (
              clientesFiltrados.map(c => {
                const nome    = c.nome_resumido ?? c.name
                const ativo   = selecionado?.id === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelecionado(ativo ? null : c)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm',
                      ativo
                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-200'
                        : 'hover:bg-zinc-800 text-zinc-300 border border-transparent'
                    )}
                  >
                    <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      ativo ? 'border-blue-400 bg-blue-400' : 'border-zinc-600'
                    )}>
                      {ativo && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1 truncate">{nome}</span>
                  </button>
                )
              })
            )}
          </div>

          {erro && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          {/* Ação confirmar */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleVincular}
              disabled={!selecionado || modo === 'vinculando'}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 flex-1"
            >
              {modo === 'vinculando' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Vinculando...</>
              ) : (
                <><Link2 className="w-3.5 h-3.5" /> Confirmar vínculo</>
              )}
            </Button>
            <Button size="sm" variant="ghost"
              onClick={handleCadastrar}
              className="text-emerald-400 hover:text-emerald-300 gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Cadastrar novo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function FinanceiroPage() {
  const meses = getUltimos12Meses()
  const [mesSelecionado, setMesSelecionado] = useState(meses[0].valor)
  const [filtroStatus, setFiltroStatus]     = useState<'todos' | 'recebido' | 'previsto' | 'emAtraso'>('todos')
  const [dados, setDados]                   = useState<FinanceiroData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true); setError(null)
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

  const clientesFiltrados = (dados?.cobrancasPorCliente ?? []).filter(g => {
    if (filtroStatus === 'recebido') return g.recebido > 0
    if (filtroStatus === 'previsto') return g.previsto > 0
    if (filtroStatus === 'emAtraso') return g.emAtraso > 0
    return true
  })

  const resumo = dados?.resumo ?? {
    recebido: 0, recebidoBruto: 0,
    previsto: 0, previstobruto: 0,
    emAtraso: 0, emAtrasoBruto: 0,
    semIdentificacao: 0,
  }
  const inadimplentes = dados?.cobrancasPorCliente.filter(g => g.emAtraso > 0).length ?? 0
  const semIdent      = dados?.semIdentificacao ?? []

  return (
    <div className="min-h-screen">
      <Header
        title="Financeiro"
        description="Contas a receber — visão consolidada da carteira"
        action={
          <Button variant="ghost" size="icon" onClick={carregar} disabled={loading}
            className="text-zinc-400 hover:text-white w-9 h-9">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">

        {/* ── Filtros ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {([
              { key: 'todos',    label: 'Todos'     },
              { key: 'recebido', label: 'Recebidos' },
              { key: 'previsto', label: 'Previstos' },
              { key: 'emAtraso', label: 'Em atraso' },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFiltroStatus(f.key)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  filtroStatus === f.key ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >{f.label}</button>
            ))}
          </div>

          {dados?.fontes.map(f => (
            <span key={f} className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/60 border border-zinc-700 px-2.5 py-1.5 rounded-lg">
              <CreditCard className="w-3 h-3" />{f}
            </span>
          ))}
        </div>

        {/* ── Loading ──────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-zinc-500 text-sm">Consultando Asaas…</p>
            </div>
          </div>
        )}

        {/* ── Erro ─────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-zinc-400 text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={carregar} className="border-zinc-700 text-zinc-400">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* ── Conteúdo ─────────────────────────────────────────────── */}
        {!loading && !error && dados && (
          <>
            {/* Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ResumoCard label="Recebido (líquido)" value={resumo.recebido}
                sub={resumo.recebidoBruto > resumo.recebido
                  ? `bruto ${fmt(resumo.recebidoBruto)}`
                  : getMesLabel(mesSelecionado)}
                icon={CheckCircle2}
                color="text-emerald-400" bg="bg-emerald-500/5" border="border-emerald-500/20" />
              <ResumoCard label="Previsto (líquido)" value={resumo.previsto}
                sub={resumo.previstobruto > resumo.previsto
                  ? `bruto ${fmt(resumo.previstobruto)}`
                  : 'cobranças em aberto'}
                icon={TrendingUp}
                color="text-blue-400" bg="bg-blue-500/5" border="border-blue-500/20" />
              <ResumoCard label="Em atraso (líquido)" value={resumo.emAtraso}
                sub={resumo.emAtraso > 0
                  ? (resumo.emAtrasoBruto > resumo.emAtraso
                    ? `bruto ${fmt(resumo.emAtrasoBruto)}`
                    : `${inadimplentes} cliente${inadimplentes > 1 ? 's' : ''}`)
                  : 'nenhum'}
                icon={AlertTriangle}
                color={resumo.emAtraso > 0 ? 'text-red-400' : 'text-zinc-500'}
                bg={resumo.emAtraso > 0 ? 'bg-red-500/5' : 'bg-zinc-900'}
                border={resumo.emAtraso > 0 ? 'border-red-500/20' : 'border-zinc-800'} />
              <ResumoCard label="Sem identificação" value={resumo.semIdentificacao}
                sub={semIdent.length > 0 ? `${semIdent.length} transação${semIdent.length > 1 ? 'ões' : ''} não reconhecida${semIdent.length > 1 ? 's' : ''}` : 'todos identificados'}
                icon={HelpCircle}
                color={semIdent.length > 0 ? 'text-yellow-400' : 'text-zinc-500'}
                bg={semIdent.length > 0 ? 'bg-yellow-500/5' : 'bg-zinc-900'}
                border={semIdent.length > 0 ? 'border-yellow-500/20' : 'border-zinc-800'} />
            </div>

            {/* Barra de composição */}
            {(resumo.recebido + resumo.previsto + resumo.emAtraso) > 0 && (() => {
              const total = resumo.recebido + resumo.previsto + resumo.emAtraso
              const pR = (resumo.recebido / total) * 100
              const pP = (resumo.previsto  / total) * 100
              const pA = (resumo.emAtraso  / total) * 100
              return (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-zinc-400 text-xs font-medium">Composição — {getMesLabel(mesSelecionado)}</p>
                      <p className="text-zinc-300 text-xs font-semibold">{fmt(total)}</p>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                      {pR > 0 && <div className="bg-emerald-500 rounded-full" style={{ width: `${pR}%` }} />}
                      {pP > 0 && <div className="bg-blue-500 rounded-full"    style={{ width: `${pP}%` }} />}
                      {pA > 0 && <div className="bg-red-500 rounded-full"     style={{ width: `${pA}%` }} />}
                    </div>
                    <div className="flex items-center gap-4 mt-2.5">
                      {[
                        { color: 'bg-emerald-500', label: 'Recebido',  pct: pR },
                        { color: 'bg-blue-500',    label: 'Previsto',  pct: pP },
                        { color: 'bg-red-500',     label: 'Em atraso', pct: pA },
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

            {/* ── Sem identificação ─────────────────────────────── */}
            {semIdent.length > 0 && (() => {
              const nAsaas = semIdent.filter(c => c.fonte === 'asaas').length
              const nDom   = semIdent.filter(c => c.fonte === 'dom').length
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 flex-wrap">
                    <HelpCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300 text-sm font-semibold">
                      Recebimentos não reconhecidos
                    </span>
                    {nAsaas > 0 && (
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs gap-1">
                        <span className="font-bold">Asaas</span> · {nAsaas}
                      </Badge>
                    )}
                    {nDom > 0 && (
                      <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-xs gap-1">
                        <span className="font-bold">Dom</span> · {nDom}
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs px-1">
                    Transações recebidas que não estão vinculadas a nenhum cliente cadastrado.
                    Vincule a um cliente existente ou cadastre um novo.
                  </p>
                  <div className="space-y-2">
                    {semIdent.map(c => (
                      <SemIdentCard key={`${c.fonte}_${c.customerId}`} customer={c} onVinculado={carregar} />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Clientes cadastrados ───────────────────────────── */}
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
                {inadimplentes > 0 && (
                  <span className="text-red-400 text-xs">{inadimplentes} inadimplente{inadimplentes > 1 ? 's' : ''}</span>
                )}
              </div>

              {clientesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <Filter className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">Nenhum cliente com esse filtro neste período.</p>
                  <button onClick={() => setFiltroStatus('todos')}
                    className="text-zinc-400 hover:text-white text-xs mt-2 underline">Ver todos</button>
                </div>
              ) : (
                clientesFiltrados.map(g => <ClienteBlock key={g.clientId} grupo={g} />)
              )}
            </div>

            {/* Estado vazio — sem integração */}
            {dados.fontes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
                <DollarSign className="w-12 h-12 text-zinc-700 mb-4" />
                <p className="text-zinc-300 font-semibold mb-1">Nenhuma conta financeira conectada</p>
                <p className="text-zinc-500 text-sm mb-4">Conecte uma conta Asaas para visualizar os dados financeiros.</p>
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
