'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Check, CreditCard, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  clientId: string
  clientName: string
  clientCnpj?: string
  onSuccess: () => void
  onClose: () => void
}

export function AsaasLinkModal({ clientId, clientName, clientCnpj, onSuccess, onClose }: Props) {
  const [customers, setCustomers]   = useState<AsaasCustomer[]>([])
  const [filtered, setFiltered]     = useState<AsaasCustomer[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<AsaasCustomer | null>(null)
  const [linking, setLinking]       = useState(false)
  const [linked, setLinked]         = useState(false)

  // Busca customers do Asaas
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/asaas/customers')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setFiltered(data.customers ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filtra por nome ou CNPJ
  useEffect(() => {
    if (!search.trim()) { setFiltered(customers); return }
    const q = search.toLowerCase().replace(/\D/g, '') || search.toLowerCase()
    setFiltered(customers.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(search.toLowerCase())
      const cnpjMatch = c.cpfCnpj?.replace(/\D/g, '').includes(q)
      return nameMatch || cnpjMatch
    }))
  }, [search, customers])

  // Pré-seleciona pelo CNPJ do cliente se bater
  useEffect(() => {
    if (!clientCnpj || customers.length === 0) return
    const cleaned = clientCnpj.replace(/\D/g, '')
    const match = customers.find(c => c.cpfCnpj?.replace(/\D/g, '') === cleaned)
    if (match) setSelected(match)
  }, [clientCnpj, customers])

  async function handleLink() {
    if (!selected) return
    setLinking(true)
    try {
      const res = await fetch(`/api/asaas/sync/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asaas_customer_id: selected.id,
          customer_name: selected.name,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      setLinked(true)
      setTimeout(() => { onSuccess() }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular')
    } finally {
      setLinking(false)
    }
  }

  function fmtCnpj(v: string | null) {
    if (!v) return '—'
    const d = v.replace(/\D/g, '')
    if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
    if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
    return v
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold text-sm">Vincular ao Asaas</p>
              <p className="text-zinc-500 text-xs">{clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800">
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
            <p className="text-zinc-600 text-xs mt-2">
              {filtered.length} de {customers.length} customers
              {clientCnpj && selected && (
                <span className="text-emerald-400 ml-2">✓ Match automático pelo CNPJ</span>
              )}
            </p>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando customers do Asaas...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-sm">
              Nenhum customer encontrado para "{search}"
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = selected?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isSelected ? 'text-blue-300' : 'text-zinc-200')}>
                        {c.name}
                      </p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {fmtCnpj(c.cpfCnpj)}
                        {c.cityName && ` · ${c.cityName}/${c.state}`}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            Cancelar
          </Button>

          <Button
            onClick={handleLink}
            disabled={!selected || linking || linked}
            className={cn(
              'gap-2',
              linked
                ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {linked ? (
              <><Check className="w-4 h-4" /> Vinculado!</>
            ) : linking ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Vinculando...</>
            ) : (
              <>Vincular {selected ? `— ${selected.name.split(' ')[0]}` : ''}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
