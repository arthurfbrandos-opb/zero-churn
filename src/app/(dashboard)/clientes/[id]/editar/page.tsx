'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2,
  Building2, MapPin, FileText, ClipboardList,
  CreditCard, X, Search, ChevronDown,
  MessageCircle, Link2, Users, AlertCircle, SkipForward,
  AlertTriangle, Plug, RefreshCw,
} from 'lucide-react'
import { useClient } from '@/hooks/use-client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { AsaasCobrancaModal } from '@/components/integracoes/asaas-cobranca-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCep } from '@/hooks/use-cep'
import { mockServices } from '@/lib/mock-data'
import { ServiceItem } from '@/types'
import { cn } from '@/lib/utils'

// ── Tipos para import do Asaas ────────────────────────────────────
interface AsaasCustomerBasic {
  id:               string
  name:             string
  cpfCnpj:          string | null
  email:            string | null
  mobilePhone:      string | null
  phone:            string | null
  additionalEmails: string | null
  address:          string | null
  addressNumber:    string | null
  complement:       string | null
  province:         string | null
  postalCode:       string | null
  city:             string | null   // ID numérico — não usar
  cityName:         string | null   // nome legível — usar este
  state:            string | null
}

// ── Tipos internos do formulário ─────────────────────────────────
interface Parcela { id: string; vencimento: string; valor: string }

interface FormData {
  // Step 1
  razaoSocial: string
  nomeResumido: string
  cnpjCpf: string
  nomeDecisor: string
  telefone: string
  email: string
  emailFinanceiro: string
  segment: string
  enrichingCnpj: boolean
  // Step 2
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  // Step 3
  clientType: 'mrr' | 'tcv'
  serviceId: string
  entregaveisIncluidos: string[]   // ids dos entregáveis que ficaram no contrato
  bonusIncluidos: string[]          // ids dos bônus incluídos
  // Compartilhado MRR + TCV
  contractStartDate: string
  // MRR
  contractValue: string
  contractMonths: string
  hasImplementationFee: boolean
  implementationFeeValue: string
  implementationFeeDate: string
  // TCV
  totalProjectValue: string
  projectDeadlineDays: string
  hasInstallments: boolean
  installmentsType: 'equal' | 'custom'
  installmentsCount: string
  firstInstallmentDate: string
  parcelas: Parcela[]
  // Step 3 — WhatsApp
  whatsappStatus: 'none' | 'has_group' | 'create_group'
  whatsappGroupLink: string
  whatsappGroupName: string
  whatsappConnected: boolean

  // Step 4
  nichoEspecifico: string
  resumoReuniao: string
  expectativasCliente: string
  principaisDores: string
  notes: string
}

const INITIAL: FormData = {
  razaoSocial: '', nomeResumido: '', cnpjCpf: '', nomeDecisor: '',
  telefone: '', email: '', emailFinanceiro: '', segment: '', enrichingCnpj: false,
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '',
  clientType: 'mrr', serviceId: '', entregaveisIncluidos: [], bonusIncluidos: [],
  contractStartDate: '',
  contractValue: '', contractMonths: '12',
  hasImplementationFee: false, implementationFeeValue: '', implementationFeeDate: '',
  totalProjectValue: '', projectDeadlineDays: '90',
  hasInstallments: false, installmentsType: 'equal',
  installmentsCount: '3', firstInstallmentDate: '',
  parcelas: [],
  whatsappStatus: 'none', whatsappGroupLink: '', whatsappGroupName: '', whatsappConnected: false,
  nichoEspecifico: '', resumoReuniao: '', expectativasCliente: '',
  principaisDores: '', notes: '',
}

// ── Helpers ───────────────────────────────────────────────────────
function maskCpfCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

/** #9 — parse robusto de valor monetário */
function parseMoney(v: string): number {
  const s = String(v).trim().replace(/[R$\s]/g, '')
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s))
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(s.replace(',', '.')) || 0
}

function formatMoney(v: string): string {
  const n = parseMoney(v)
  if (!n) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isValidDate(iso: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return false
  const y = d.getFullYear()
  return y >= 1990 && y <= 2100
}

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2')
}

function calcEndDate(startDate: string, months: string) {
  if (!months) return ''
  const base = startDate ? new Date(startDate + 'T00:00:00') : new Date()
  base.setMonth(base.getMonth() + parseInt(months))
  return base.toLocaleDateString('pt-BR')
}

function calcEndDateTCV(startDate: string, days: string) {
  if (!days) return ''
  const base = startDate ? new Date(startDate + 'T00:00:00') : new Date()
  base.setDate(base.getDate() + parseInt(days))
  return base.toLocaleDateString('pt-BR')
}

function calcInstallmentValue(total: string, count: string) {
  const t = parseFloat(total.replace(',', '.'))
  const c = parseInt(count)
  if (!t || !c) return ''
  return (t / c).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function gerarParcelas(total: string, count: string, firstDate: string): Parcela[] {
  const t = parseFloat(total.replace(',', '.'))
  const c = parseInt(count)
  if (!t || !c || !firstDate) return []
  const valorParcela = (t / c).toFixed(2)
  return Array.from({ length: c }, (_, i) => {
    const d = new Date(firstDate + 'T00:00:00')
    d.setMonth(d.getMonth() + i)
    return {
      id: String(i),
      vencimento: d.toISOString().split('T')[0],
      valor: valorParcela,
    }
  })
}

// ── Steps config ──────────────────────────────────────────────────
const STEPS = [
  { label: 'Identificação', icon: Building2    },
  { label: 'Endereço',      icon: MapPin       },
  { label: 'Contrato',      icon: FileText     },
  { label: 'Integrações',   icon: Plug         },
  { label: 'WhatsApp',      icon: MessageCircle },
  { label: 'Contexto',      icon: ClipboardList },
]

// ── Campo base ────────────────────────────────────────────────────
function Field({ label, optional, hint, children }: {
  label: string; optional?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300 text-sm">
        {label} {optional && <span className="text-zinc-500 text-xs">(opcional)</span>}
      </Label>
      {children}
      {hint && <p className="text-zinc-600 text-xs">{hint}</p>}
    </div>
  )
}

const inputCls = "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
const textareaCls = "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500 min-h-24 resize-none"

// ── Modal de importação ───────────────────────────────────────────
type ImportSource = 'asaas' | 'dom'

interface ImportModalProps {
  source: ImportSource
  onSelect: (client: AsaasCustomerBasic) => void
  onClose: () => void
}

function ImportModal({ source, onSelect, onClose }: ImportModalProps) {
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(source === 'asaas')
  const [customers, setCustomers] = useState<AsaasCustomerBasic[]>([])
  const [error, setError]       = useState<string | null>(null)

  // Busca customers reais do Asaas ao abrir
  useEffect(() => {
    if (source !== 'asaas') return
    fetch('/api/asaas/customers')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setCustomers(d.customers ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [source])

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.cpfCnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    )
  })

  function fmtCnpj(v: string | null) {
    if (!v) return ''
    const d = v.replace(/\D/g, '')
    if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
    return v
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-white font-semibold text-sm">
                Importar do {source === 'asaas' ? 'Asaas' : 'Dom Pagamentos'}
              </p>
              {!loading && !error && (
                <p className="text-zinc-600 text-xs">{customers.length} clientes disponíveis</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Busca */}
        {!loading && !error && (
          <div className="p-4 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                className={cn(inputCls, 'pl-9')}
              />
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Buscando clientes no Asaas...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-zinc-600 text-xs mt-1">Configure o Asaas em Configurações → Integrações</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">Nenhum cliente encontrado</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); onClose() }}
                className="w-full text-left p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600 transition-all"
              >
                <p className="text-zinc-200 text-sm font-medium">{c.name}</p>
                {c.cpfCnpj && <p className="text-zinc-500 text-xs mt-0.5">{fmtCnpj(c.cpfCnpj)}</p>}
                {c.email && <p className="text-zinc-600 text-xs">{c.email}</p>}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <p className="text-zinc-600 text-xs text-center">
            Os dados serão pré-preenchidos no formulário. Revise antes de salvar.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Toggle simples ────────────────────────────────────────────────
function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={cn('w-10 h-6 rounded-full transition-all relative shrink-0', checked ? 'bg-emerald-500' : 'bg-zinc-700')}>
      <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', checked ? 'left-5' : 'left-1')} />
    </button>
  )
}

// ── Step Integrações ─────────────────────────────────────────────
interface LinkedIntegration {
  id: string
  label: string | null
  credentials: { customer_id: string; customer_name?: string | null } | null
  status: string
  last_sync_at: string | null
}

function IntegracoesStep({ clientId, clientType, defaultValue, contractMonths, contractStartDate }: {
  clientId: string; clientType?: string; defaultValue?: number
  contractMonths?: number; contractStartDate?: string
}) {
  const [asaasIntegrations, setAsaasIntegrations] = useState<LinkedIntegration[]>([])
  const [loading, setLoading]   = useState(true)
  const [showLinkModal, setShowLinkModal] = useState<'asaas' | 'dom' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [customers, setCustomers] = useState<AsaasCustomerRow[]>([])
  const [searchModal, setSearchModal] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<AsaasCustomerRow | null>(null)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [cobrancaTarget, setCobrancaTarget] = useState<{ id: string; name: string } | null>(null)

  interface AsaasCustomerRow { id: string; name: string; cpfCnpj: string | null }

  async function loadIntegrations() {
    setLoading(true)
    const res = await fetch(`/api/asaas/sync/${clientId}`)
    if (res.ok) {
      const d = await res.json()
      setAsaasIntegrations(d.integrations ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadIntegrations() }, [clientId])

  async function openLinkModal() {
    setShowLinkModal('asaas')
    setSearchModal('')
    setSelectedCustomer(null)
    setLinkError(null)
    setLoadingCustomers(true)
    const res = await fetch('/api/asaas/customers')
    if (res.ok) {
      const d = await res.json()
      setCustomers(d.customers ?? [])
    }
    setLoadingCustomers(false)
  }

  async function handleLink() {
    if (!selectedCustomer) return
    setLinking(true)
    setLinkError(null)
    const res = await fetch(`/api/asaas/sync/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asaas_customer_id: selectedCustomer.id, customer_name: selectedCustomer.name }),
    })
    if (res.ok) {
      setShowLinkModal(null)
      loadIntegrations()
    } else {
      const d = await res.json().catch(() => ({}))
      setLinkError(d.error ?? 'Erro ao vincular')
    }
    setLinking(false)
  }

  async function handleRemove(integrationId: string) {
    setRemoving(integrationId)
    await fetch(`/api/asaas/sync/${clientId}?integrationId=${integrationId}`, { method: 'DELETE' })
    loadIntegrations()
    setRemoving(null)
  }

  const filteredCustomers = customers.filter(c => {
    if (!searchModal.trim()) return true
    const q = searchModal.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.cpfCnpj ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  })

  return (
    <div className="space-y-4">
      {/* Modal de cobrança */}
      {cobrancaTarget && (
        <AsaasCobrancaModal
          customerId={cobrancaTarget.id}
          customerName={cobrancaTarget.name}
          clientType={(clientType ?? 'mrr') as 'mrr' | 'tcv'}
          defaultValue={defaultValue}
          contractMonths={contractMonths}
          contractStartDate={contractStartDate}
          onClose={() => setCobrancaTarget(null)}
        />
      )}

      {/* Modal de busca Asaas */}
      {showLinkModal === 'asaas' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-zinc-100 font-semibold text-sm">Vincular conta Asaas</p>
                  <p className="text-zinc-500 text-xs">Selecione um customer para vincular</p>
                </div>
              </div>
              <button onClick={() => setShowLinkModal(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input value={searchModal} onChange={e => setSearchModal(e.target.value)}
                  placeholder="Buscar por nome ou CNPJ..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-10 gap-2 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando...</span>
                </div>
              ) : filteredCustomers.map(c => (
                <button key={c.id} onClick={() => setSelectedCustomer(c)}
                  className={cn('w-full text-left p-3 rounded-xl border transition-all',
                    selectedCustomer?.id === c.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700')}>
                  <p className={cn('text-sm font-medium', selectedCustomer?.id === c.id ? 'text-blue-300' : 'text-zinc-200')}>
                    {c.name}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">{c.cpfCnpj ?? '—'}</p>
                </button>
              ))}
            </div>
            {linkError && (
              <div className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{linkError}</p>
              </div>
            )}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setShowLinkModal(null)} className="text-zinc-500 hover:text-zinc-300">Cancelar</Button>
              <Button onClick={handleLink} disabled={!selectedCustomer || linking}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                {linking ? <><Loader2 className="w-4 h-4 animate-spin" />Vinculando...</> : <>Vincular conta</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho informativo */}
      <div className="flex items-start gap-3 bg-zinc-800/40 border border-zinc-800 rounded-xl p-4">
        <Plug className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-zinc-300 text-sm font-medium">Integrações de cobrança</p>
          <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
            Vincule uma ou mais contas do Asaas ou Dom Pagamentos a este cliente.
            Cada conta vinculada alimenta o pilar Financeiro do health score automaticamente.
          </p>
        </div>
      </div>

      {/* Seção Asaas */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-zinc-200 font-semibold text-sm">Asaas</p>
              {loading && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
            </div>
            <Button size="sm" variant="outline"
              onClick={openLinkModal}
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Vincular conta
            </Button>
          </div>

          {!loading && asaasIntegrations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">Nenhuma conta Asaas vinculada</p>
              <button onClick={openLinkModal} className="text-blue-400 text-xs hover:underline">
                + Vincular conta Asaas
              </button>
            </div>
          )}

          {asaasIntegrations.map(int => (
            <div key={int.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-sm font-medium truncate">
                  {int.credentials?.customer_name ?? int.label ?? int.credentials?.customer_id}
                </p>
                <p className="text-zinc-500 text-xs">
                  ID: {int.credentials?.customer_id}
                  {int.last_sync_at && (
                    <> · Sync: {new Date(int.last_sync_at).toLocaleDateString('pt-BR')}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    const cid = int.credentials?.customer_id
                    if (!cid) return // guard: sem customer_id não abre o modal
                    setCobrancaTarget({ id: cid, name: int.credentials?.customer_name ?? int.label ?? cid })
                  }}
                  className={`transition-colors p-1 ${int.credentials?.customer_id ? 'text-blue-500 hover:text-blue-300' : 'text-zinc-700 cursor-not-allowed'}`}
                  title={int.credentials?.customer_id ? 'Criar cobrança' : 'customer_id não disponível'}>
                  <CreditCard className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={async () => {
                    await fetch(
                      `/api/asaas/sync/${clientId}?integrationId=${int.id}`,
                      { method: 'PATCH' }
                    )
                    loadIntegrations()
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1" title="Sincronizar">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(int.id)}
                  disabled={removing === int.id}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-1" title="Desvincular">
                  {removing === int.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seção Dom Pagamentos */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-violet-400" />
              </div>
              <p className="text-zinc-200 font-semibold text-sm">Dom Pagamentos</p>
            </div>
            <Button size="sm" variant="outline" disabled
              className="border-zinc-700 text-zinc-600 text-xs gap-1.5 cursor-not-allowed">
              <Plus className="w-3.5 h-3.5" /> Em breve
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center py-4 text-center gap-1.5">
            <p className="text-zinc-600 text-sm">Dom Pagamentos em breve</p>
            <p className="text-zinc-700 text-xs">A integração será habilitada na próxima sprint</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Step WhatsApp ────────────────────────────────────────────────
function WhatsAppStep({
  form,
  setForm,
}: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
}) {
  const [connecting, setConnecting] = useState(false)
  const [creating, setCreating] = useState(false)

  // Nome de grupo sugerido ao abrir "criar"
  const suggestedName = form.nomeResumido
    ? `${form.nomeResumido} × Agência`
    : 'Nome do Grupo'

  function set(field: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Escolha: já tem grupo ou vai criar
  function chooseStatus(s: 'has_group' | 'create_group') {
    setForm(prev => ({
      ...prev,
      whatsappStatus: s,
      whatsappConnected: false,
      whatsappGroupName: s === 'create_group' && !prev.whatsappGroupName ? suggestedName : prev.whatsappGroupName,
    }))
  }

  // Simula integração de grupo existente
  async function handleConnect() {
    if (!form.whatsappGroupLink.trim()) return
    setConnecting(true)
    await new Promise(r => setTimeout(r, 1600))
    setConnecting(false)
    set('whatsappConnected', true)
  }

  // Simula criação de novo grupo
  async function handleCreate() {
    if (!form.whatsappGroupName.trim()) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 1800))
    setCreating(false)
    set('whatsappConnected', true)
  }

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-5">

          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Grupo de WhatsApp</p>
              <p className="text-zinc-500 text-sm mt-0.5">
                O grupo alimenta o pilar de <span className="text-emerald-400 font-medium">Proximidade (30%)</span> do health score.
                Configure agora ou faça depois no perfil do cliente.
              </p>
            </div>
          </div>

          {/* Pergunta */}
          <div className="space-y-2">
            <p className="text-zinc-300 text-sm font-medium">O cliente já tem um grupo com a equipe da agência?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => chooseStatus('has_group')}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  form.whatsappStatus === 'has_group'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                )}
              >
                <Link2 className={cn('w-5 h-5 mb-2', form.whatsappStatus === 'has_group' ? 'text-emerald-400' : 'text-zinc-500')} />
                <p className={cn('font-semibold text-sm', form.whatsappStatus === 'has_group' ? 'text-emerald-400' : 'text-zinc-400')}>
                  Sim, já existe
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">Vou informar o link ou ID do grupo</p>
              </button>

              <button
                onClick={() => chooseStatus('create_group')}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  form.whatsappStatus === 'create_group'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                )}
              >
                <Users className={cn('w-5 h-5 mb-2', form.whatsappStatus === 'create_group' ? 'text-blue-400' : 'text-zinc-500')} />
                <p className={cn('font-semibold text-sm', form.whatsappStatus === 'create_group' ? 'text-blue-400' : 'text-zinc-400')}>
                  Não, criar agora
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">O sistema criará o grupo via Evolution API</p>
              </button>
            </div>
          </div>

          {/* ── Grupo existente ───────────────────────────────── */}
          {form.whatsappStatus === 'has_group' && !form.whatsappConnected && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Link de convite ou Group ID</Label>
                <Input
                  value={form.whatsappGroupLink}
                  onChange={e => set('whatsappGroupLink', e.target.value)}
                  placeholder="https://chat.whatsapp.com/XXXXXXXXXX ou 120363XXXXXXXXX@g.us"
                  className={inputCls}
                />
                <p className="text-zinc-600 text-xs">
                  Abra o grupo no WhatsApp → três pontos → Convidar via link
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={!form.whatsappGroupLink.trim() || connecting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                {connecting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Integrando...</>
                ) : (
                  <><Link2 className="w-3.5 h-3.5" /> Integrar grupo</>
                )}
              </Button>
            </div>
          )}

          {/* ── Criar novo grupo ──────────────────────────────── */}
          {form.whatsappStatus === 'create_group' && !form.whatsappConnected && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Nome do grupo</Label>
                <Input
                  value={form.whatsappGroupName || suggestedName}
                  onChange={e => set('whatsappGroupName', e.target.value)}
                  className={inputCls}
                />
                <p className="text-zinc-600 text-xs">
                  O grupo será criado via Evolution API com você e o cliente como participantes iniciais.
                </p>
              </div>

              {/* Aviso de pré-requisito */}
              <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-400">
                  <span className="text-yellow-400 font-medium">Pré-requisito:</span>{' '}
                  A Evolution API deve estar conectada em{' '}
                  <span className="text-zinc-300">Configurações → Integrações → WhatsApp</span>.
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!form.whatsappGroupName.trim() || creating}
                className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
              >
                {creating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando grupo...</>
                ) : (
                  <><Users className="w-3.5 h-3.5" /> Criar grupo</>
                )}
              </Button>
            </div>
          )}

          {/* ── Sucesso ───────────────────────────────────────── */}
          {form.whatsappConnected && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-emerald-400 font-semibold text-sm">
                  {form.whatsappStatus === 'create_group' ? 'Grupo criado com sucesso!' : 'Grupo integrado com sucesso!'}
                </p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {form.whatsappStatus === 'create_group'
                    ? `"${form.whatsappGroupName || suggestedName}" está pronto. Adicione os participantes pelo WhatsApp.`
                    : 'O grupo já está sincronizado e vai alimentar o pilar de Proximidade.'}
                </p>
              </div>
              <button
                onClick={() => setForm(prev => ({ ...prev, whatsappConnected: false }))}
                className="text-zinc-600 hover:text-zinc-400 transition-colors ml-auto shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pular step */}
      {!form.whatsappConnected && (
        <button
          onClick={() => setForm(prev => ({ ...prev, whatsappStatus: 'none' }))}
          className="w-full flex items-center justify-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs transition-colors py-1"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Configurar WhatsApp depois no perfil do cliente
        </button>
      )}
    </div>
  )
}

// ── Página de EDIÇÃO ──────────────────────────────────────────────
export default function EditarClientePage() {
  const router = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const warnAsaas    = searchParams.get('warn') === 'asaas_sync'
  const initialStep  = Number(searchParams.get('step') ?? 0)
  const clientId = params.id as string

  const { client, loading: loadingClient } = useClient(clientId)

  const [step, setStep] = useState(initialStep)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [formReady, setFormReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [importModal, setImportModal] = useState<ImportSource | null>(null)
  const { fetchCep, loading: loadingCep, error: cepError } = useCep()

  const set = useCallback((field: keyof FormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // Pré-preenche o formulário quando o cliente carrega
  useEffect(() => {
    if (!client || formReady) return
    setFormReady(true)
    setForm(prev => ({
      ...prev,
      // Identificação
      razaoSocial:      client.razaoSocial    ?? client.name ?? '',
      nomeResumido:     client.nomeResumido   ?? '',
      cnpjCpf:          maskCpfCnpj(client.cnpj ?? ''),
      nomeDecisor:      client.nomeDecisor    ?? '',
      email:            client.email          ?? '',
      telefone:         client.telefone       ?? '',
      emailFinanceiro:  client.emailFinanceiro ?? '',
      segment:          client.segment        ?? '',
      // Endereço
      cep:              client.cep            ?? '',
      logradouro:       client.logradouro     ?? '',
      numero:           client.numero         ?? '',
      complemento:      client.complemento    ?? '',
      bairro:           client.bairro         ?? '',
      cidade:           client.cidade         ?? '',
      estado:           client.estado         ?? '',
      // Produto / Serviço
      serviceId:             client.serviceId            ?? '',
      entregaveisIncluidos:  client.entregaveisIncluidos ?? [],
      bonusIncluidos:        client.bonusIncluidos        ?? [],
      // Contrato
      clientType:        client.clientType         ?? 'mrr',
      contractValue:     formatMoney(String(client.mrrValue    ?? client.contractValue    ?? '')),
      totalProjectValue: formatMoney(String(client.tcvValue    ?? client.totalProjectValue ?? '')),
      contractStartDate: client.contractStartDate  ?? '',
      // MRR
      contractMonths:          String(client.contractMonths          ?? '12'),
      hasImplementationFee:    client.hasImplementationFee           ?? false,
      implementationFeeValue:  formatMoney(String(client.implementationFeeValue  ?? '')),
      implementationFeeDate:   client.implementationFeeDate          ?? '',
      // TCV
      projectDeadlineDays:    String(client.projectDeadlineDays     ?? '90'),
      hasInstallments:         client.hasInstallments                ?? false,
      installmentsType:        (client.installmentsType as 'equal' | 'custom') ?? 'equal',
      installmentsCount:       String(client.installmentsCount       ?? '3'),
      firstInstallmentDate:    client.firstInstallmentDate           ?? '',
      parcelas:                client.parcelas                       ?? [],
      // Contexto
      nichoEspecifico:     client.nichoEspecifico    ?? '',
      resumoReuniao:       client.resumoReuniao       ?? '',
      expectativasCliente: client.expectativasCliente ?? '',
      principaisDores:     client.principaisDores     ?? '',
      notes:               client.observations        ?? '',
    }))
  }, [client, formReady])

  // Loading / not found
  if (loadingClient) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
    </div>
  )
  if (!client) return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
      <div className="text-center">
        <p className="text-zinc-300 mb-2">Cliente não encontrado</p>
        <Link href="/clientes" className="text-emerald-400 text-sm hover:underline">← Voltar</Link>
      </div>
    </div>
  )

  async function handleImport(c: AsaasCustomerBasic) {
    const words = c.name.split(' ').filter(Boolean)
    const emailPrincipal  = c.email?.trim() ?? ''
    const emailFinanceiro = (c.additionalEmails ?? '').split(',')[0].trim() || emailPrincipal
    const telefone        = c.mobilePhone?.trim() || c.phone?.trim() || ''
    const cepAsaas = (c.postalCode ?? '').replace(/\D/g, '')
    const cepFmt   = cepAsaas.length === 8 ? `${cepAsaas.slice(0,5)}-${cepAsaas.slice(5)}` : ''

    setForm(prev => ({
      ...prev,
      razaoSocial:    c.name,
      nomeResumido:   words.slice(0, 2).join(' '),
      cnpjCpf:        maskCpfCnpj(c.cpfCnpj ?? ''),
      email:          emailPrincipal,
      emailFinanceiro,
      telefone,
      cep:            cepFmt,
      logradouro:     c.address        ?? '',
      numero:         c.addressNumber  ?? '',
      complemento:    c.complement     ?? '',
      bairro:         c.province       ?? '',
      cidade:         c.cityName        ?? '',
      estado:         c.state          ?? '',
    }))

    const cnpj = (c.cpfCnpj ?? '').replace(/\D/g, '')
    if (cnpj.length === 14) {
      try {
        const res = await fetch(`/api/cnpj/${cnpj}`)
        if (res.ok) {
          const enriched = await res.json()
          setForm(prev => ({
            ...prev,
            razaoSocial:  enriched.razaoSocial  || prev.razaoSocial,
            nomeResumido: enriched.nomeFantasia
              ? enriched.nomeFantasia.split(' ').slice(0, 2).join(' ')
              : prev.nomeResumido,
            nomeDecisor:  enriched.nomeDecisor  || prev.nomeDecisor,
            segment:      enriched.segment       || prev.segment,
            telefone:     prev.telefone || enriched.telefone || '',
            email:        prev.email    || enriched.email    || '',
            cep:          prev.cep         || enriched.cep         || '',
            logradouro:   prev.logradouro  || enriched.logradouro  || '',
            numero:       prev.numero      || enriched.numero       || '',
            complemento:  prev.complemento || enriched.complemento || '',
            bairro:       prev.bairro      || enriched.bairro       || '',
            cidade:       prev.cidade      || enriched.cidade       || '',
            estado:       prev.estado      || enriched.estado       || '',
          }))
        }
      } catch { /* silencioso */ }
    }
  }

  // Busca CEP
  async function handleCep(raw: string) {
    const masked = maskCep(raw)
    set('cep', masked)
    if (raw.replace(/\D/g, '').length === 8) {
      const data = await fetchCep(raw)
      if (data) {
        set('logradouro', data.logradouro)
        set('bairro', data.bairro)
        set('cidade', data.localidade)
        set('estado', data.uf)
      }
    }
  }

  // Parcelas customizadas
  function addParcela() {
    set('parcelas', [...form.parcelas, { id: Date.now().toString(), vencimento: '', valor: '' }])
  }
  function removeParcela(id: string) {
    set('parcelas', form.parcelas.filter(p => p.id !== id))
  }
  function updateParcela(id: string, field: 'vencimento' | 'valor', value: string) {
    set('parcelas', form.parcelas.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  // Serviços filtrados pelo tipo de contrato
  const servicesForType = mockServices.filter(s => s.isActive && s.type === form.clientType)
  const selectedService = mockServices.find(s => s.id === form.serviceId)

  // Ao selecionar um método: pré-marca todos entregáveis e bônus
  function handleSelectService(id: string) {
    const svc = mockServices.find(s => s.id === id)
    if (svc) {
      setForm(prev => ({
        ...prev,
        serviceId: id,
        entregaveisIncluidos: svc.entregaveis.map(e => e.id),
        bonusIncluidos: svc.bonus.map(b => b.id),
      }))
    } else {
      setForm(prev => ({ ...prev, serviceId: id, entregaveisIncluidos: [], bonusIncluidos: [] }))
    }
  }

  function toggleEntregavel(id: string) {
    setForm(prev => ({
      ...prev,
      entregaveisIncluidos: prev.entregaveisIncluidos.includes(id)
        ? prev.entregaveisIncluidos.filter(x => x !== id)
        : [...prev.entregaveisIncluidos, id],
    }))
  }

  function toggleBonus(id: string) {
    setForm(prev => ({
      ...prev,
      bonusIncluidos: prev.bonusIncluidos.includes(id)
        ? prev.bonusIncluidos.filter(x => x !== id)
        : [...prev.bonusIncluidos, id],
    }))
  }

  // Totais de parcelas customizadas
  const totalParcelas = form.parcelas.reduce((s, p) => s + parseFloat(p.valor || '0'), 0)
  const totalProjeto = parseMoney(form.totalProjectValue)
  const diffParcelas = totalProjeto - totalParcelas

  async function handleSubmit() {
    setSaving(true)
    try {
      const body = {
        name:              form.razaoSocial || form.nomeResumido,
        nome_resumido:     form.nomeResumido,
        razao_social:      form.razaoSocial,
        cnpj:              form.cnpjCpf,
        segment:           form.segment,
        nome_decisor:      form.nomeDecisor || null,
        email:             form.email || null,
        telefone:          form.telefone || null,
        email_financeiro:  form.emailFinanceiro || null,
        cep:               form.cep || null,
        logradouro:        form.logradouro || null,
        numero:            form.numero || null,
        complemento:       form.complemento || null,
        bairro:            form.bairro || null,
        cidade:            form.cidade || null,
        estado:            form.estado || null,
        service_id:            form.serviceId            || null,
        entregaveis_incluidos: form.entregaveisIncluidos,
        bonus_incluidos:       form.bonusIncluidos,
        client_type:           form.clientType,
        mrr_value:             form.clientType === 'mrr' ? parseMoney(form.contractValue)     : null,
        tcv_value:             form.clientType === 'tcv' ? parseMoney(form.totalProjectValue) : null,
        contract_start:        form.contractStartDate || null,
        // MRR
        contract_months:          form.clientType === 'mrr' ? (parseInt(form.contractMonths) || null) : null,
        has_implementation_fee:   form.hasImplementationFee,
        implementation_fee_value: form.hasImplementationFee ? parseMoney(form.implementationFeeValue) : null,
        implementation_fee_date:  form.hasImplementationFee ? (form.implementationFeeDate || null) : null,
        // TCV
        project_deadline_days:  form.clientType === 'tcv' ? (parseInt(form.projectDeadlineDays) || null) : null,
        has_installments:       form.hasInstallments,
        installments_type:      form.hasInstallments ? form.installmentsType : null,
        installments_count:     form.hasInstallments ? (parseInt(form.installmentsCount) || null) : null,
        first_installment_date: form.hasInstallments ? (form.firstInstallmentDate || null) : null,
        parcelas:               form.hasInstallments ? form.parcelas : [],
        // Contexto
        nicho_especifico:     form.nichoEspecifico     || null,
        resumo_reuniao:       form.resumoReuniao        || null,
        expectativas_cliente: form.expectativasCliente  || null,
        principais_dores:     form.principaisDores      || null,
        whatsapp_group_id: form.whatsappGroupLink || null,
        observations:      form.notes || null,
      }

      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert('Erro ao salvar: ' + (data.error ?? `HTTP ${res.status}`))
        return
      }

      router.push(`/clientes/${clientId}`)
    } catch (err) {
      alert('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert('Erro ao excluir: ' + (d.error ?? `HTTP ${res.status}`))
        return
      }
      router.push('/clientes')
    } catch (err) {
      alert('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDeleting(false)
    }
  }

  const canNext = [
    // Step 0 — Identificação
    !!(form.razaoSocial && form.nomeResumido && form.cnpjCpf && form.nomeDecisor && form.telefone && form.email && form.segment),
    // Step 1 — Endereço (numero e complemento são opcionais)
    !!(form.cep && form.logradouro && form.bairro && form.cidade && form.estado),
    // Step 2 — Contrato (#6 valor>0, #7 data obrigatória, #9 parse robusto)
    !!(form.serviceId && form.entregaveisIncluidos.length > 0
      && isValidDate(form.contractStartDate)
      && (
        form.clientType === 'mrr'
          ? parseMoney(form.contractValue) > 0 && parseInt(form.contractMonths) > 0
          : parseMoney(form.totalProjectValue) > 0 && parseInt(form.projectDeadlineDays) > 0
      )
      && (!form.hasImplementationFee || (parseMoney(form.implementationFeeValue) > 0 && isValidDate(form.implementationFeeDate)))
    ),
    // Step 3 — Integrações (sempre pode avançar — é opcional)
    true,
    // Step 4 — WhatsApp (sempre pode avançar — é opcional)
    true,
    // Step 5 — Contexto
    true,
  ]

  return (
    <div className="min-h-screen">
      {importModal && (
        <ImportModal
          source={importModal}
          onSelect={handleImport}
          onClose={() => setImportModal(null)}
        />
      )}

      <Header
        title={`Editar: ${client.nomeResumido ?? client.name}`}
        description={`${client.segment ?? ''} · ${client.clientType.toUpperCase()}`}
        action={
          <Link href={`/clientes/${clientId}`}>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-white gap-1">
              <ArrowLeft className="w-3 h-3" /> Cancelar
            </Button>
          </Link>
        }
      />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">

        {/* Banner: sync Asaas falhou ao criar cliente */}
        {warnAsaas && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-medium">Integração Asaas não foi salva</p>
              <p className="text-zinc-400 text-xs mt-0.5">
                O cliente foi criado com sucesso, mas o vínculo com o Asaas falhou.
                Use o botão abaixo para vincular manualmente.
              </p>
            </div>
          </div>
        )}

        {/* Steps indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                    done  ? 'bg-emerald-500 border-emerald-500 text-white'
                    : active ? 'border-emerald-500 text-emerald-400 bg-zinc-900'
                    : 'border-zinc-700 text-zinc-600 bg-zinc-900'
                  )}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn('text-xs hidden sm:block', active ? 'text-zinc-300' : done ? 'text-emerald-400' : 'text-zinc-600')}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-px mx-2 mb-5', done ? 'bg-emerald-500' : 'bg-zinc-700')} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEP 0 — Identificação ───────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">

            {/* Formulário */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-4">
                <h2 className="text-white font-semibold">Dados da empresa</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Razão Social">
                      <Input value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)}
                        placeholder="Empresa Ltda." className={inputCls} />
                    </Field>
                  </div>

                  <Field label="Nome Resumido"
                    hint="É o nome que aparece em todo o sistema">
                    <Input value={form.nomeResumido} onChange={e => set('nomeResumido', e.target.value)}
                      placeholder="Ex: Bella Forma" className={inputCls} />
                  </Field>

                  <Field label="CNPJ / CPF">
                    <Input value={form.cnpjCpf}
                      onChange={e => set('cnpjCpf', maskCpfCnpj(e.target.value))}
                      placeholder="00.000.000/0001-00" className={inputCls} />
                  </Field>

                  <Field label="Nome do Decisor">
                    <Input value={form.nomeDecisor} onChange={e => set('nomeDecisor', e.target.value)}
                      placeholder="João Silva" className={inputCls} />
                  </Field>

                  <Field label="Segmento">
                    <Input value={form.segment} onChange={e => set('segment', e.target.value)}
                      placeholder="Ex: E-commerce, Saúde" className={inputCls} />
                  </Field>

                  <Field label="Telefone">
                    <Input value={form.telefone}
                      onChange={e => set('telefone', maskPhone(e.target.value))}
                      placeholder="(11) 99999-9999" className={inputCls} />
                  </Field>

                  <Field label="E-mail">
                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="contato@empresa.com" className={inputCls} />
                  </Field>

                  <div className="col-span-2">
                    <Field label="E-mail Financeiro" optional>
                      <Input type="email" value={form.emailFinanceiro}
                        onChange={e => set('emailFinanceiro', e.target.value)}
                        placeholder="financeiro@empresa.com" className={inputCls} />
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 1 — Endereço ────────────────────────────────── */}
        {step === 1 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-white font-semibold">Endereço de cobrança</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="CEP">
                  <div className="relative">
                    <Input value={form.cep} onChange={e => handleCep(e.target.value)}
                      placeholder="00000-000" className={inputCls} maxLength={9} />
                    {loadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
                    )}
                  </div>
                  {cepError && <p className="text-red-400 text-xs mt-1">{cepError}</p>}
                </Field>

                <Field label="Estado">
                  <Input value={form.estado} onChange={e => set('estado', e.target.value)}
                    placeholder="SP" className={inputCls} maxLength={2} />
                </Field>

                <div className="col-span-2">
                  <Field label="Logradouro">
                    <Input value={form.logradouro} onChange={e => set('logradouro', e.target.value)}
                      placeholder="Rua das Flores" className={inputCls} />
                  </Field>
                </div>

                <Field label="Número" optional>
                  <Input value={form.numero} onChange={e => set('numero', e.target.value)}
                    placeholder="123" className={inputCls} />
                </Field>

                <Field label="Complemento" optional>
                  <Input value={form.complemento} onChange={e => set('complemento', e.target.value)}
                    placeholder="Sala 4, Apto 12" className={inputCls} />
                </Field>

                <Field label="Bairro">
                  <Input value={form.bairro} onChange={e => set('bairro', e.target.value)}
                    placeholder="Centro" className={inputCls} />
                </Field>

                <Field label="Cidade">
                  <Input value={form.cidade} onChange={e => set('cidade', e.target.value)}
                    placeholder="São Paulo" className={inputCls} />
                </Field>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2 — Contrato ────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-4">
                <h2 className="text-white font-semibold">Tipo de contrato</h2>

                {/* MRR vs TCV */}
                <div className="grid grid-cols-2 gap-3">
                  {(['mrr', 'tcv'] as const).map(t => (
                    <button key={t} onClick={() => {
                      setForm(prev => ({ ...prev, clientType: t, serviceId: '', entregaveisIncluidos: [], bonusIncluidos: [] }))
                    }}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        form.clientType === t
                          ? t === 'mrr' ? 'border-emerald-500 bg-emerald-500/10' : 'border-blue-500 bg-blue-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      )}>
                      <p className={cn('font-bold text-sm', form.clientType === t ? t === 'mrr' ? 'text-emerald-400' : 'text-blue-400' : 'text-zinc-400')}>
                        {t.toUpperCase()}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {t === 'mrr' ? 'Recorrente mensal' : 'Projeto com valor fixo'}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Seletor de método/produto */}
                <Field label="Método / Produto vendido"
                  hint="Gerencie os métodos em Configurações → Métodos e Produtos">
                  <div className="relative">
                    <select
                      value={form.serviceId}
                      onChange={e => handleSelectService(e.target.value)}
                      className={cn(inputCls, 'w-full h-10 rounded-md border px-3 text-sm appearance-none pr-8 cursor-pointer')}
                    >
                      <option value="" className="bg-zinc-800">Selecione o método vendido...</option>
                      {servicesForType.map(s => (
                        <option key={s.id} value={s.id} className="bg-zinc-800">{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                </Field>

                {/* Checklist de entregáveis e bônus */}
                {selectedService && (
                  <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="bg-zinc-800/60 px-4 py-2.5 flex items-center justify-between">
                      <p className="text-zinc-300 text-xs font-semibold">O que está incluído neste contrato?</p>
                      <p className="text-zinc-600 text-xs">Desmarque o que não foi negociado</p>
                    </div>

                    {/* Entregáveis */}
                    {selectedService.entregaveis.length > 0 && (
                      <div className="p-3 space-y-2">
                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider px-1">Entregáveis</p>
                        {selectedService.entregaveis.map((item: ServiceItem) => {
                          const checked = form.entregaveisIncluidos.includes(item.id)
                          return (
                            <button key={item.id} onClick={() => toggleEntregavel(item.id)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all text-left',
                                checked
                                  ? 'bg-zinc-800/60 border-zinc-700 text-zinc-200'
                                  : 'bg-zinc-900 border-zinc-800/50 text-zinc-500 line-through'
                              )}>
                              <div className={cn('w-4 h-4 rounded flex items-center justify-center border shrink-0',
                                checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600')}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              {item.name}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Bônus */}
                    {selectedService.bonus.length > 0 && (
                      <div className="p-3 pt-0 space-y-2">
                        <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wider px-1 pt-2">Bônus</p>
                        {selectedService.bonus.map((item: ServiceItem) => {
                          const checked = form.bonusIncluidos.includes(item.id)
                          return (
                            <button key={item.id} onClick={() => toggleBonus(item.id)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all text-left',
                                checked
                                  ? 'bg-yellow-500/5 border-yellow-500/20 text-zinc-200'
                                  : 'bg-zinc-900 border-zinc-800/50 text-zinc-500 line-through'
                              )}>
                              <div className={cn('w-4 h-4 rounded flex items-center justify-center border shrink-0',
                                checked ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-600')}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-yellow-400 shrink-0">⭐</span>
                              {item.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MRR */}
            {form.clientType === 'mrr' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-white font-semibold">Detalhes MRR</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Data de início do contrato">
                      <Input type="date" value={form.contractStartDate}
                        onChange={e => set('contractStartDate', e.target.value)}
                        className={cn(inputCls, form.contractStartDate && !isValidDate(form.contractStartDate) ? 'border-red-500' : '')} />
                      {form.contractStartDate && !isValidDate(form.contractStartDate) && (
                        <p className="text-red-400 text-xs mt-1">Data inválida</p>
                      )}
                    </Field>

                    <Field label="Prazo do contrato (meses)">
                      <Input type="number" value={form.contractMonths}
                        onChange={e => set('contractMonths', e.target.value)}
                        placeholder="12" className={inputCls} min={1} />
                    </Field>

                    <div className="col-span-2">
                      <Field label="Valor da mensalidade">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none pointer-events-none">R$</span>
                          <Input
                            value={form.contractValue}
                            onChange={e => set('contractValue', e.target.value)}
                            onBlur={e => set('contractValue', formatMoney(e.target.value))}
                            placeholder="3.500,00"
                            className={cn(inputCls, 'pl-9 text-right')}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {form.contractMonths && isValidDate(form.contractStartDate) && (
                    <p className="text-zinc-500 text-xs">
                      Vigência:{' '}
                      <span className="text-zinc-300">
                        {new Date(form.contractStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {' até '}
                        {calcEndDate(form.contractStartDate, form.contractMonths)}
                      </span>
                    </p>
                  )}

                  {/* Implementação */}
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-zinc-300 text-sm">Houve cobrança de implementação?</Label>
                      <Toggle checked={form.hasImplementationFee} onToggle={() => set('hasImplementationFee', !form.hasImplementationFee)} />
                    </div>
                    {form.hasImplementationFee && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Valor da implementação">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none pointer-events-none">R$</span>
                            <Input
                              value={form.implementationFeeValue}
                              onChange={e => set('implementationFeeValue', e.target.value)}
                              onBlur={e => set('implementationFeeValue', formatMoney(e.target.value))}
                              placeholder="2.000,00"
                              className={cn(inputCls, 'pl-9 text-right')}
                            />
                          </div>
                        </Field>
                        <Field label="Data de pagamento">
                          <Input type="date" value={form.implementationFeeDate}
                            onChange={e => set('implementationFeeDate', e.target.value)}
                            className={cn(inputCls, form.implementationFeeDate && !isValidDate(form.implementationFeeDate) ? 'border-red-500' : '')} />
                          {form.implementationFeeDate && !isValidDate(form.implementationFeeDate) && (
                            <p className="text-red-400 text-xs mt-1">Data inválida</p>
                          )}
                        </Field>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TCV */}
            {form.clientType === 'tcv' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-white font-semibold">Detalhes TCV</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Data de início do projeto">
                      <Input type="date" value={form.contractStartDate}
                        onChange={e => set('contractStartDate', e.target.value)}
                        className={cn(inputCls, form.contractStartDate && !isValidDate(form.contractStartDate) ? 'border-red-500' : '')} />
                      {form.contractStartDate && !isValidDate(form.contractStartDate) && (
                        <p className="text-red-400 text-xs mt-1">Data inválida</p>
                      )}
                    </Field>

                    <Field label="Prazo do projeto (dias)">
                      <Input type="number" value={form.projectDeadlineDays}
                        onChange={e => set('projectDeadlineDays', e.target.value)}
                        placeholder="90" className={inputCls} />
                    </Field>

                    <div className="col-span-2">
                      <Field label="Valor total do projeto">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none pointer-events-none">R$</span>
                          <Input
                            value={form.totalProjectValue}
                            onChange={e => set('totalProjectValue', e.target.value)}
                            onBlur={e => set('totalProjectValue', formatMoney(e.target.value))}
                            placeholder="18.000,00"
                            className={cn(inputCls, 'pl-9 text-right')}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {isValidDate(form.contractStartDate) && form.projectDeadlineDays && (
                    <p className="text-zinc-500 text-xs">
                      Entrega prevista:{' '}
                      <span className="text-zinc-300">
                        {calcEndDateTCV(form.contractStartDate, form.projectDeadlineDays)}
                      </span>
                    </p>
                  )}

                  {/* Parcelamento */}
                  <div className="pt-2 border-t border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300 text-sm">Houve parcelamento?</Label>
                      <Toggle checked={form.hasInstallments} onToggle={() => set('hasInstallments', !form.hasInstallments)} />
                    </div>

                    {form.hasInstallments && (
                      <div className="space-y-4">
                        {/* Iguais ou diferentes */}
                        <div className="grid grid-cols-2 gap-3">
                          {(['equal', 'custom'] as const).map(t => (
                            <button key={t} onClick={() => set('installmentsType', t)}
                              className={cn('p-2.5 rounded-lg border text-xs font-medium transition-all',
                                form.installmentsType === t
                                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
                              {t === 'equal' ? '⚖️ Parcelas iguais' : '✏️ Parcelas diferentes'}
                            </button>
                          ))}
                        </div>

                        {/* Parcelas iguais */}
                        {form.installmentsType === 'equal' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Field label="Número de parcelas">
                                <Input type="number" value={form.installmentsCount}
                                  onChange={e => set('installmentsCount', e.target.value)}
                                  placeholder="3" className={inputCls} min={2} />
                              </Field>
                              <Field label="Data da 1ª parcela">
                                <Input type="date" value={form.firstInstallmentDate}
                                  onChange={e => set('firstInstallmentDate', e.target.value)}
                                  className={inputCls} />
                              </Field>
                            </div>
                            {form.totalProjectValue && form.installmentsCount && (
                              <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
                                <span className="text-zinc-300 font-medium">{form.installmentsCount}×</span>{' '}
                                de <span className="text-emerald-400 font-bold">
                                  R$ {calcInstallmentValue(form.totalProjectValue, form.installmentsCount)}
                                </span>
                              </div>
                            )}
                            {form.totalProjectValue && form.installmentsCount && form.firstInstallmentDate && (
                              <div className="space-y-1.5">
                                <p className="text-zinc-500 text-xs font-medium">Parcelas geradas:</p>
                                {gerarParcelas(form.totalProjectValue, form.installmentsCount, form.firstInstallmentDate).map((p, i) => (
                                  <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-1.5 text-xs">
                                    <span className="text-zinc-400">{i + 1}ª parcela</span>
                                    <span className="text-zinc-500">{new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                    <Badge variant="outline" className="text-zinc-500 border-zinc-600 text-xs">A vencer</Badge>
                                    <span className="text-zinc-300 font-medium">R$ {parseFloat(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Parcelas customizadas */}
                        {form.installmentsType === 'custom' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-zinc-400 text-xs">
                                Total:{' '}
                                <span className={cn('font-bold', Math.abs(diffParcelas) < 0.01 ? 'text-emerald-400' : diffParcelas < 0 ? 'text-red-400' : 'text-zinc-300')}>
                                  R$ {totalParcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {' / R$ '}
                                {totalProjeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                {Math.abs(diffParcelas) >= 0.01 && (
                                  <span className={cn('ml-2 font-medium', diffParcelas > 0 ? 'text-zinc-500' : 'text-red-400')}>
                                    ({diffParcelas > 0 ? `faltam R$ ${diffParcelas.toFixed(2)}` : `excede R$ ${Math.abs(diffParcelas).toFixed(2)}`})
                                  </span>
                                )}
                              </p>
                              <Button size="sm" variant="outline"
                                className="border-zinc-700 text-zinc-400 hover:text-white text-xs gap-1"
                                onClick={addParcela}>
                                <Plus className="w-3 h-3" /> Parcela
                              </Button>
                            </div>

                            {form.parcelas.length === 0 && (
                              <p className="text-zinc-600 text-xs text-center py-4 border border-dashed border-zinc-700 rounded-lg">
                                Clique em &quot;Parcela&quot; para inserir cada vencimento
                              </p>
                            )}

                            {form.parcelas.map((p, i) => (
                              <div key={p.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
                                <span className="text-zinc-500 text-xs w-5 shrink-0">{i + 1}ª</span>
                                <div className="flex-1">
                                  <Input type="date" value={p.vencimento}
                                    onChange={e => updateParcela(p.id, 'vencimento', e.target.value)}
                                    className={cn(inputCls, 'h-8 text-xs')} />
                                </div>
                                <div className="flex-1 relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs select-none pointer-events-none">R$</span>
                                  <Input
                                    placeholder="0,00"
                                    value={p.valor}
                                    onChange={e => updateParcela(p.id, 'valor', e.target.value)}
                                    onBlur={e => updateParcela(p.id, 'valor', formatMoney(e.target.value))}
                                    className={cn(inputCls, 'h-8 text-xs pl-8 text-right')}
                                  />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-600 text-xs shrink-0">A vencer</Badge>
                                <button onClick={() => removeParcela(p.id)}
                                  className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── STEP 3 — Integrações ─────────────────────────────── */}
        {step === 3 && (
          <IntegracoesStep
            clientId={clientId}
            clientType={form.clientType}
            defaultValue={
              form.clientType === 'mrr'
                ? parseMoney(form.contractValue) || undefined
                : parseMoney(form.totalProjectValue) || undefined
            }
            contractMonths={parseInt(form.contractMonths) || undefined}
            contractStartDate={form.contractStartDate || undefined}
          />
        )}

        {/* ── STEP 4 — WhatsApp ───────────────────────────────── */}
        {step === 4 && (
          <WhatsAppStep form={form} setForm={setForm} />
        )}

        {/* ── STEP 5 — Contexto & Briefing ────────────────────── */}
        {step === 5 && (
          <div className="space-y-4">

            {/* Info do contexto */}
            <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <ClipboardList className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-300 text-sm font-medium">Por que esse passo importa?</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                  Esse contexto é lido pela equipe de operação e também pela IA do Zero Churn para
                  gerar diagnósticos e planos de ação personalizados desde o primeiro mês do cliente.
                </p>
              </div>
            </div>

            {/* Resumo do contrato */}
            <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
              <p>• <span className="text-zinc-400">Cliente:</span> {form.nomeResumido}</p>
              <p>• <span className="text-zinc-400">Tipo:</span> {form.clientType.toUpperCase()} · {selectedService?.name ?? '—'}</p>
              {selectedService && form.entregaveisIncluidos.length > 0 && (
                <p>• <span className="text-zinc-400">Entregáveis:</span> {form.entregaveisIncluidos.length}/{selectedService.entregaveis.length} incluídos</p>
              )}
              {form.clientType === 'mrr' && <p>• <span className="text-zinc-400">Recorrente:</span> R$ {form.contractValue}/mês · {form.contractMonths} meses</p>}
              {form.clientType === 'tcv' && <p>• <span className="text-zinc-400">TCV:</span> R$ {form.totalProjectValue} · {form.projectDeadlineDays} dias</p>}
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-5">

                <Field
                  label="O que foi discutido na reunião de fechamento"
                  hint="Principais pontos da conversa, objeções superadas, o que foi prometido">
                  <Textarea
                    value={form.resumoReuniao}
                    onChange={e => set('resumoReuniao', e.target.value)}
                    placeholder="Ex: Cliente vinha de experiência ruim com outra agência. Demonstrou interesse por resultado rápido em leads qualificados. Acordamos relatório mensal e reunião quinzenal..."
                    className={textareaCls}
                  />
                </Field>

                <Field
                  label="Expectativas declaradas pelo cliente"
                  hint="O que ele disse que espera alcançar com a contratação">
                  <Textarea
                    value={form.expectativasCliente}
                    onChange={e => set('expectativasCliente', e.target.value)}
                    placeholder="Ex: Quer dobrar o número de novos clientes em 3 meses. Espera reduzir custo por lead de R$80 para R$40. Quer aparecer mais no Instagram..."
                    className={textareaCls}
                  />
                </Field>

                <Field
                  label="Principais dores e motivações"
                  hint="Por que o cliente decidiu contratar? Quais problemas ele estava enfrentando?">
                  <Textarea
                    value={form.principaisDores}
                    onChange={e => set('principaisDores', e.target.value)}
                    placeholder="Ex: Agenda vazia nos meses de baixa temporada. Dependia 100% de indicações. Tentou rodar anúncios sozinho sem resultado..."
                    className={textareaCls}
                  />
                </Field>

                <Field label="Observações adicionais da equipe" optional>
                  <Textarea
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Qualquer outro contexto relevante: perfil do decisor, sensibilidades, parceiros, etc."
                    className={textareaCls}
                  />
                </Field>

              </CardContent>
            </Card>
          </div>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"
              className="border-zinc-700 text-zinc-400 hover:text-white gap-1"
              onClick={() => step > 0 ? setStep(s => s - 1) : router.push(`/clientes/${clientId}`)}
              disabled={saving || deleting}>
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>

            {/* Excluir — apenas no step 0 */}
            {step === 0 && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xs">Confirmar exclusão?</span>
                  <Button size="sm" onClick={handleDelete} disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 gap-1">
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    {deleting ? 'Excluindo...' : 'Sim, excluir'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}
                    className="text-zinc-500 text-xs h-7">Cancelar</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir cliente
                </Button>
              )
            )}
          </div>

          {step < STEPS.length - 1 ? (
            <Button size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
              onClick={() => setStep(s => s + 1)}>
              Próximo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 min-w-40"
              onClick={handleSubmit}
              disabled={saving}>
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                : <><Check className="w-3.5 h-3.5" /> Salvar alterações</>
              }
            </Button>
          )}
        </div>

        {/* LGPD */}
        <div className="flex items-start gap-2 p-3 bg-zinc-800/40 rounded-xl border border-zinc-800">
          <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
          <p className="text-zinc-600 text-xs leading-relaxed">
            Alterações são registradas com data, hora e usuário responsável. A exclusão remove permanentemente todos os dados do cliente, incluindo histórico de análises.
          </p>
        </div>
      </div>
    </div>
  )
}
