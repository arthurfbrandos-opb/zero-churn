'use client'

import { useState, useEffect } from 'react'
import {
  X, CreditCard, CheckCircle2, ExternalLink,
  Copy, Check, AlertCircle, RefreshCw, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Mode  = 'unica' | 'recorrente'
type Pay   = 'BOLETOEPIX' | 'CREDIT_CARD'
type Cycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'

interface Props {
  customerId:        string
  customerName:      string
  clientType:        'mrr' | 'tcv'
  defaultValue?:     number
  contractMonths?:   number   // para calcular data fim da assinatura
  contractStartDate?: string  // 'YYYY-MM-DD'
  onClose:           () => void
}

const CYCLE_LABELS: Record<Cycle, string> = {
  MONTHLY:      'Mensal',
  QUARTERLY:    'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY:       'Anual',
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function AsaasCobrancaModal({
  customerId, customerName, clientType, defaultValue,
  contractMonths, contractStartDate, onClose,
}: Props) {

  const today     = new Date().toISOString().slice(0, 10)
  const defaultDue = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10) })()

  const [mode, setMode]     = useState<Mode>(clientType === 'mrr' ? 'recorrente' : 'unica')
  const [pay, setPay]       = useState<Pay>('BOLETOEPIX')
  const [value, setValue]   = useState(defaultValue ? String(defaultValue) : '')
  const [dueDate, setDue]   = useState(defaultDue)
  const [cycle, setCycle]   = useState<Cycle>('MONTHLY')
  const [desc, setDesc]     = useState('')
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [result, setResult] = useState<{ url?: string | null; id: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Assinatura duplicada
  const [existingSubs, setExisting]     = useState<{ id: string; value: number; cycle: string }[]>([])
  const [checkingSubs, setChecking]     = useState(false)
  const [subsChecked, setChecked]       = useState(false)
  const [confirmDup, setConfirmDup]     = useState(false)

  useEffect(() => {
    if (mode !== 'recorrente' || subsChecked || !customerId) return
    setChecking(true)
    fetch(`/api/asaas/subscriptions?customer=${customerId}`)
      .then(r => r.json())
      .then(d => { setExisting(d.subscriptions ?? []); setChecked(true) })
      .catch(() => setChecked(true))
      .finally(() => setChecking(false))
  }, [mode, customerId, subsChecked])

  // Data fim calculada pelo contrato
  const endDate = (mode === 'recorrente' && contractStartDate && contractMonths)
    ? addMonths(contractStartDate, contractMonths)
    : undefined

  const parsedValue   = parseFloat(String(value).replace(',', '.')) || 0
  const hasDupSub     = mode === 'recorrente' && existingSubs.length > 0 && !confirmDup
  const isCreditCard  = pay === 'CREDIT_CARD'
  const canSubmit     = !loading && parsedValue > 0 && !hasDupSub && !isCreditCard

  async function handleSubmit() {
    if (dueDate < today) { setError('A data de vencimento não pode ser no passado'); return }
    setLoad(true); setError(null)
    try {
      // Boleto + PIX = billingType 'UNDEFINED' no Asaas
      const billingType = 'UNDEFINED'

      if (mode === 'unica') {
        const res = await fetch('/api/asaas/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: customerId, billingType, value: parsedValue, dueDate, description: desc || undefined }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar cobrança'); return }
        setResult({ id: d.payment.id, url: d.payment.invoiceUrl ?? d.payment.bankSlipUrl })
      } else {
        const res = await fetch('/api/asaas/subscriptions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: customerId, billingType, value: parsedValue,
            nextDueDate: dueDate, endDate, cycle, description: desc || undefined,
          }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar assinatura'); return }
        setResult({ id: d.subscription.id, url: null })
      }
    } finally { setLoad(false) }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ─── Tela de Sucesso ─────────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold">
                {mode === 'unica' ? 'Cobrança criada!' : 'Assinatura criada!'}
              </p>
              <p className="text-zinc-500 text-sm mt-0.5">
                {customerName} · {fmtBRL(parsedValue)}
                {mode === 'recorrente' && ` · ${CYCLE_LABELS[cycle]}`}
              </p>
              {endDate && mode === 'recorrente' && (
                <p className="text-zinc-600 text-xs mt-1">
                  Vigência até {fmtDate(endDate)}
                </p>
              )}
            </div>
          </div>

          {result.url ? (
            <div className="space-y-2">
              <p className="text-zinc-500 text-xs">Link de pagamento (Boleto / PIX):</p>
              <div className="flex items-center gap-2">
                <input readOnly value={result.url}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-xs truncate" />
                <Button size="sm" variant="outline" className="border-zinc-700 shrink-0"
                  onClick={() => copyUrl(result.url!)}>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <a href={result.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="border-zinc-700 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center">
              As cobranças serão geradas automaticamente pelo Asaas conforme o ciclo definido.
            </p>
          )}

          <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
            Fechar
          </Button>
        </div>
      </div>
    )
  }

  // ─── Formulário ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold text-sm">Nova cobrança</p>
              <p className="text-zinc-500 text-xs truncate max-w-[240px]">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">

          {/* Tipo */}
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {(['unica', 'recorrente'] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setConfirmDup(false) }}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {m === 'unica' ? 'Cobrança única' : 'Assinatura'}
                </button>
              ))}
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-2 gap-2">

              {/* Boleto + PIX */}
              <button onClick={() => setPay('BOLETOEPIX')}
                className={`py-3 rounded-xl border text-sm font-medium transition-all text-left px-3 ${
                  pay === 'BOLETOEPIX'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}>
                <span className="block font-semibold">Boleto / PIX</span>
                <span className="text-xs text-zinc-500 font-normal">Cliente escolhe</span>
              </button>

              {/* Cartão — bloqueado */}
              <div className={`py-3 rounded-xl border px-3 cursor-not-allowed select-none ${
                pay === 'CREDIT_CARD'
                  ? 'bg-zinc-800 border-zinc-600'
                  : 'bg-zinc-800/40 border-zinc-700/50'
              }`}
                onClick={() => setPay('CREDIT_CARD')}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-500">Cartão</span>
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <span className="text-xs text-zinc-600 font-normal">Via Asaas</span>
              </div>
            </div>

            {/* Aviso cartão */}
            {isCreditCard && (
              <div className="mt-3 flex items-start gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-zinc-300 text-sm font-medium">Cartão gerenciado pelo Asaas</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Cobranças em cartão de crédito precisam ser configuradas diretamente na plataforma Asaas,
                    onde o cliente cadastra e autoriza o uso do cartão.
                  </p>
                  <a href="https://app.asaas.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 text-xs hover:text-blue-300 transition-colors font-medium">
                    <ExternalLink className="w-3 h-3" />
                    Acessar painel Asaas
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Campos — só quando não é cartão */}
          {!isCreditCard && (
            <>
              {/* Valor */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Valor (R$)</p>
                <input type="number" min="0.01" step="0.01"
                  value={value} onChange={e => setValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              {/* Data */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">
                  {mode === 'unica' ? 'Vencimento' : 'Primeiro vencimento'}
                </p>
                <input type="date" min={today}
                  value={dueDate} onChange={e => setDue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              {/* Ciclo + data fim (só assinatura) */}
              {mode === 'recorrente' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Ciclo</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(CYCLE_LABELS) as [Cycle, string][]).map(([c, label]) => (
                        <button key={c} onClick={() => setCycle(c)}
                          className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                            cycle === c
                              ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                              : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data fim calculada */}
                  {endDate ? (
                    <div className="flex items-center justify-between bg-zinc-800/40 border border-zinc-700/50 rounded-xl px-4 py-2.5">
                      <span className="text-zinc-500 text-xs">Vigência do contrato</span>
                      <span className="text-zinc-300 text-xs font-medium">{fmtDate(dueDate)} → {fmtDate(endDate)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-zinc-800/40 border border-zinc-700/50 rounded-xl px-4 py-2.5">
                      <span className="text-zinc-500 text-xs">Sem data de término</span>
                      <span className="text-zinc-600 text-xs">Assinatura contínua</span>
                    </div>
                  )}

                  {/* Aviso duplicata */}
                  {checkingSubs && (
                    <div className="flex items-center gap-2 text-zinc-600 text-xs">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Verificando assinaturas existentes…
                    </div>
                  )}
                  {hasDupSub && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-amber-300 text-xs font-medium">
                          {existingSubs.length} assinatura{existingSubs.length > 1 ? 's' : ''} ativa{existingSubs.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ul className="space-y-1 pl-6">
                        {existingSubs.map(s => (
                          <li key={s.id} className="text-zinc-400 text-xs">
                            {fmtBRL(s.value ?? 0)} · {({ MONTHLY:'Mensal', QUARTERLY:'Trimestral', SEMIANNUALLY:'Semestral', YEARLY:'Anual' } as Record<string,string>)[s.cycle] ?? s.cycle}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => setConfirmDup(true)}
                        className="text-amber-400 text-xs underline hover:text-amber-300 pl-6">
                        Criar mesmo assim
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Descrição */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">
                  Descrição <span className="normal-case text-zinc-600">(opcional)</span>
                </p>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Ex: Mensalidade de marketing digital"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-3">
          <Button variant="outline" onClick={onClose}
            className="flex-1 border-zinc-700 text-zinc-400 hover:text-white">
            Cancelar
          </Button>
          {isCreditCard ? (
            <a href="https://app.asaas.com" target="_blank" rel="noreferrer" className="flex-1">
              <Button className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir Asaas
              </Button>
            </a>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40">
              {loading ? 'Criando…' : mode === 'unica' ? 'Criar cobrança' : 'Criar assinatura'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
