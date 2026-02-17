'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Loader2, Check, CreditCard, X,
  AlertTriangle, CheckSquare, Square, Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AsaasCustomer {
  id: string
  name: string
  cpfCnpj: string | null
  email: string | null
  cityName?: string
  state?: string
}

interface Props {
  onSuccess: (count: number) => void
  onClose: () => void
}

function fmtCnpj(v: string | null) {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return v
}

export function AsaasImportModal({ onSuccess, onClose }: Props) {
  const [customers, setCustomers]   = useState<AsaasCustomer[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [importing, setImporting]   = useState(false)
  const [done, setDone]             = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/asaas/customers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setCustomers(data.customers ?? [])
      // Seleciona todos por padrão
      setSelected(new Set((data.customers ?? []).map((c: AsaasCustomer) => c.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.cpfCnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ?? false)
    )
  }, [search, customers])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/asaas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setImportResult({ created: data.created, skipped: data.skipped })
      setDone(true)
      setTimeout(() => onSuccess(data.created), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setImporting(false)
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold">Importar clientes do Asaas</p>
              <p className="text-zinc-500 text-xs">
                {loading ? 'Carregando...' : `${customers.length} customers encontrados`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sucesso */}
        {done && importResult ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Importação concluída!</p>
              <p className="text-zinc-400 text-sm mt-1">
                <span className="text-emerald-400 font-semibold">{importResult.created} clientes</span> criados
                {importResult.skipped > 0 && ` · ${importResult.skipped} já existiam`}
              </p>
              <p className="text-zinc-600 text-xs mt-2">Redirecionando para sua carteira...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Busca + selecionar todos */}
            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou CNPJ..."
                  className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500"
                />
              </div>
              {!loading && !error && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                  >
                    {allFilteredSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-400" />
                      : <Square className="w-4 h-4" />}
                    {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  <span className="text-zinc-500 text-sm">
                    <span className="text-blue-400 font-semibold">{selected.size}</span> selecionados
                  </span>
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Buscando seus clientes no Asaas...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="text-red-300 text-sm font-medium">Erro ao carregar</p>
                    <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
                    <button onClick={load} className="text-red-400 text-xs underline mt-1">Tentar novamente</button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm">
                  Nenhum customer encontrado para "{search}"
                </div>
              ) : (
                filtered.map(c => {
                  const isSelected = selected.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all',
                        isSelected
                          ? 'border-blue-500/40 bg-blue-500/8'
                          : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium truncate', isSelected ? 'text-zinc-100' : 'text-zinc-300')}>
                            {c.name}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {fmtCnpj(c.cpfCnpj)}
                            {c.email && ` · ${c.email}`}
                          </p>
                        </div>
                        {c.cityName && (
                          <span className="text-zinc-600 text-xs shrink-0">{c.cityName}/{c.state}</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {!loading && !error && (
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={onClose} className="text-zinc-500">
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selected.size === 0 || importing}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Importar {selected.size} cliente{selected.size !== 1 ? 's' : ''}</>
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
