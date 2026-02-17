'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Loader2, Check, CreditCard, X,
  AlertTriangle, CheckSquare, Square, Download, Clock, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface AsaasCustomer {
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

interface Props {
  /** 'single' = seleciona 1 cliente → redireciona para wizard de edição
   *  'bulk'   = multi-select → importa → cria alertas → aviso (default) */
  mode?:     'single' | 'bulk'
  onSuccess: (count: number, clientIds?: string[]) => void
  onClose:   () => void
}

function fmtCnpj(v: string | null) {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return v
}

export function AsaasImportModal({ mode = 'bulk', onSuccess, onClose }: Props) {
  const router = useRouter()
  const [customers, setCustomers]     = useState<AsaasCustomer[]>([])
  const [activeIds, setActiveIds]     = useState<Set<string>>(new Set())
  const [totalAll, setTotalAll]       = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [onlyActive, setOnlyActive]   = useState(false)    // toggle filtro 90 dias
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [importing, setImporting]     = useState(false)
  const [done, setDone]               = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: number; errorDetails?: string[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/asaas/customers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setCustomers(data.customers ?? [])
      setActiveIds(new Set(data.activeIds ?? []))
      setTotalAll(data.total ?? 0)
      setActiveCount(data.activeCount ?? 0)
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Lista filtrada (busca + toggle ativo)
  const filtered = useMemo(() => {
    let list = customers
    if (onlyActive) list = list.filter(c => activeIds.has(c.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.cpfCnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ?? false)
      )
    }
    return list
  }, [customers, search, onlyActive, activeIds])

  function toggle(id: string) {
    if (mode === 'single') {
      // Single: substitui seleção (radio behavior) → importa imediatamente
      setSelected(new Set([id]))
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const allFilteredIds = filtered.map(c => c.id)
    const allSelected = allFilteredIds.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        allFilteredIds.forEach(id => next.delete(id))
      } else {
        allFilteredIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)
    try {
      const selectedCustomers = customers.filter(c => selected.has(c.id))
      const res = await fetch('/api/asaas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: selectedCustomers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      const clientIds: string[] = data.clientIds ?? []

      if (mode === 'single' && clientIds.length > 0) {
        // Single: redireciona direto para o wizard de edição do cliente criado
        onSuccess(data.created, clientIds)
        router.push(`/clientes/${clientIds[0]}/editar`)
        return
      }

      // Bulk: mostra tela de sucesso com aviso de pendências
      setImportResult({
        created:      data.created ?? 0,
        skipped:      data.skipped ?? 0,
        errors:       data.errors  ?? 0,
        errorDetails: data.errorDetails ?? [],
      })
      setDone(true)
      // Não redireciona automaticamente — deixa o usuário ver o aviso
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar')
      setImporting(false)
    }
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every(c => selected.has(c.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              {mode === 'single' ? <UserPlus className="w-5 h-5 text-blue-400" /> : <CreditCard className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <p className="text-zinc-100 font-semibold">
                {mode === 'single' ? 'Selecionar cliente do Asaas' : 'Importar clientes do Asaas'}
              </p>
              <p className="text-zinc-500 text-xs">
                {loading
                  ? 'Carregando clientes...'
                  : mode === 'single'
                    ? `Selecione 1 cliente para preencher o cadastro`
                    : `${totalAll} clientes no total · ${activeCount} com pagamento nos últimos 90 dias`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sucesso (bulk) */}
        {done && importResult ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-1.5">
              <p className="text-white font-semibold text-lg">Importação concluída!</p>
              <p className="text-zinc-400 text-sm">
                <span className="text-emerald-400 font-semibold">{importResult.created} clientes</span> criados
                {importResult.skipped > 0 && <span className="text-zinc-500"> · {importResult.skipped} já existiam</span>}
                {importResult.errors > 0 && <span className="text-red-400"> · {importResult.errors} com erro</span>}
              </p>
              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <div className="mt-3 text-left bg-red-500/5 border border-red-500/20 rounded-xl p-3 max-h-32 overflow-y-auto">
                  {importResult.errorDetails.map((e, i) => (
                    <p key={i} className="text-red-400/80 text-xs leading-relaxed">{e}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Aviso de cadastros pendentes */}
            {importResult.created > 0 && (
              <div className="w-full max-w-sm bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3 text-left space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-yellow-300 text-sm font-medium">Cadastros incompletos</p>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  {importResult.created === 1
                    ? 'O cliente importado precisa ter o cadastro confirmado.'
                    : `Os ${importResult.created} clientes importados precisam ter o cadastro confirmado.`}
                  {' '}Acesse cada perfil e preencha: contrato, cobranças, WhatsApp e contexto.
                </p>
                <p className="text-zinc-500 text-xs">
                  Alertas criados na aba <span className="text-yellow-400 font-medium">Alertas</span> para cada cliente.
                </p>
              </div>
            )}

            <div className="flex gap-3 w-full max-w-sm">
              <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-zinc-400 hover:text-white">
                Fechar
              </Button>
              <Button onClick={() => { onSuccess(importResult.created); router.push('/clientes') }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
                Ver clientes
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Busca + controles */}
            <div className="p-4 border-b border-zinc-800 space-y-3">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou CNPJ..."
                  className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500"
                />
              </div>

              {/* Selecionar todos + filtro 90 dias */}
              {!loading && !error && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Selecionar todos (só no modo bulk) */}
                  {mode === 'bulk' && (
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                    >
                      {allFilteredSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-400" />
                        : <Square className="w-4 h-4" />}
                      {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                      <span className="text-zinc-600 text-xs">({filtered.length})</span>
                    </button>
                  )}
                  {mode === 'single' && (
                    <p className="text-zinc-500 text-xs">Clique no cliente para selecioná-lo</p>
                  )}

                  {/* Toggle: filtrar apenas ativos nos últimos 90 dias */}
                  <button
                    onClick={() => setOnlyActive(v => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      onlyActive
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                    )}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Últimos 90 dias
                    {!loading && (
                      <span className={cn(
                        'ml-0.5 px-1.5 py-0.5 rounded-full text-xs',
                        onlyActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400'
                      )}>
                        {activeCount}
                      </span>
                    )}
                  </button>

                  {/* Contador de selecionados */}
                  {selected.size > 0 && (
                    <span className="text-zinc-500 text-sm ml-auto">
                      <span className="text-blue-400 font-semibold">{selected.size}</span> selecionados
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <div className="text-center">
                    <p className="text-sm">Buscando clientes no Asaas...</p>
                    <p className="text-xs text-zinc-600 mt-1">Verificando pagamentos dos últimos 90 dias</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 text-sm font-medium">Erro ao carregar</p>
                    <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
                    <button onClick={load} className="text-red-400 text-xs underline mt-2">
                      Tentar novamente
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <p className="text-sm">
                    {search
                      ? `Nenhum cliente encontrado para "${search}"`
                      : 'Nenhum cliente com pagamento nos últimos 90 dias'}
                  </p>
                  {onlyActive && (
                    <button
                      onClick={() => setOnlyActive(false)}
                      className="text-zinc-500 text-xs underline mt-2"
                    >
                      Ver todos os clientes
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(c => {
                  const isSelected = selected.has(c.id)
                  const isActive = activeIds.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all',
                        isSelected
                          ? 'border-blue-500/40 bg-blue-500/8'
                          : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            isSelected ? 'text-zinc-100' : 'text-zinc-300'
                          )}>
                            {c.name}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {fmtCnpj(c.cpfCnpj)}
                            {c.email && ` · ${c.email}`}
                          </p>
                        </div>

                        {/* Badge ativo */}
                        <div className="shrink-0 flex items-center gap-2">
                          {isActive ? (
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              ativo
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                              inativo
                            </span>
                          )}
                          {c.cityName && (
                            <span className="text-zinc-600 text-xs hidden sm:block">
                              {c.cityName}/{c.state}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {!loading && !error && (
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selected.size === 0 || importing}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                  ) : mode === 'single' ? (
                    <><UserPlus className="w-4 h-4" />
                      {selected.size === 0 ? 'Selecione um cliente' : 'Importar e completar cadastro'}
                    </>
                  ) : (
                    <><Download className="w-4 h-4" />
                      {selected.size === 0
                        ? 'Selecione clientes para importar'
                        : `Importar ${selected.size} cliente${selected.size !== 1 ? 's' : ''}`}
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
