'use client'

import { useState } from 'react'
import { X, CreditCard, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD'
type Mode        = 'unica' | 'recorrente'
type Cycle       = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'

interface Props {
  customerId:   string
  customerName: string
  clientType:   'mrr' | 'tcv'
  defaultValue?: number
  onClose: () => void
}

const BILLING_LABELS: Record<BillingType, string> = {
  BOLETO:      'Boleto',
  PIX:         'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
}

const CYCLE_LABELS: Record<Cycle, string> = {
  MONTHLY:      'Mensal',
  QUARTERLY:    'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY:       'Anual',
}

export function AsaasCobrancaModal({ customerId, customerName, clientType, defaultValue, onClose }: Props) {
  const [mode, setMode]         = useState<Mode>(clientType === 'mrr' ? 'recorrente' : 'unica')
  const [billing, setBilling]   = useState<BillingType>('PIX')
  const [value, setValue]       = useState(defaultValue ? String(defaultValue) : '')
  const [dueDate, setDueDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 5)
    return d.toISOString().slice(0, 10)
  })
  const [cycle, setCycle]       = useState<Cycle>('MONTHLY')
  const [description, setDesc]  = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<{ url?: string | null; id: string } | null>(null)
  const [copied, setCopied]     = useState(false)

  const parsedValue = parseFloat(value.replace(',', '.')) || 0

  async function handleSubmit() {
    if (!parsedValue || parsedValue <= 0) { setError('Informe um valor válido'); return }
    setLoading(true); setError(null)

    try {
      if (mode === 'unica') {
        const res = await fetch('/api/asaas/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: customerId,
            billingType: billing,
            value: parsedValue,
            dueDate,
            description: description || undefined,
          }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar cobrança'); return }
        setResult({ id: d.payment.id, url: d.payment.invoiceUrl ?? d.payment.bankSlipUrl })
      } else {
        const res = await fetch('/api/asaas/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer:    customerId,
            billingType: billing,
            value:       parsedValue,
            nextDueDate: dueDate,
            cycle,
            description: description || undefined,
          }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar assinatura'); return }
        setResult({ id: d.subscription.id, url: null })
      }
    } finally {
      setLoading(false)
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ─── Sucesso ───────────────────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-zinc-100 font-semibold text-base">
              {mode === 'unica' ? 'Cobrança criada!' : 'Assinatura criada!'}
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              {customerName} — R$ {parsedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {result.url && (
            <div className="space-y-2">
              <p className="text-zinc-400 text-sm">Link de pagamento:</p>
              <div className="flex items-center gap-2">
                <input readOnly value={result.url}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-xs truncate" />
                <Button size="sm" variant="outline" className="border-zinc-700 shrink-0 gap-1.5"
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
          )}

          {!result.url && mode === 'recorrente' && (
            <p className="text-zinc-500 text-sm">
              A assinatura foi criada. O cliente receberá cobranças automaticamente conforme o ciclo configurado.
            </p>
          )}

          <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
            Fechar
          </Button>
        </div>
      </div>
    )
  }

  // ─── Formulário ────────────────────────────────────────────────
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
              <p className="text-zinc-100 font-semibold text-sm">Criar cobrança no Asaas</p>
              <p className="text-zinc-500 text-xs truncate max-w-[220px]">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">

          {/* Tipo */}
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Tipo de cobrança</p>
            <div className="grid grid-cols-2 gap-2">
              {(['unica', 'recorrente'] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {m === 'unica' ? 'Cobrança única' : 'Assinatura recorrente'}
                </button>
              ))}
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {((['PIX', 'BOLETO', 'CREDIT_CARD'] as BillingType[])).map(b => (
                <button key={b} onClick={() => setBilling(b)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                    billing === b
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {BILLING_LABELS[b]}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Valor (R$)</p>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Data */}
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">
              {mode === 'unica' ? 'Data de vencimento' : 'Primeiro vencimento'}
            </p>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Ciclo (só recorrente) */}
          {mode === 'recorrente' && (
            <div>
              <p className="text-zinc-400 text-xs font-medium mb-2">Ciclo de cobrança</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CYCLE_LABELS) as [Cycle, string][]).map(([c, label]) => (
                  <button key={c} onClick={() => setCycle(c)}
                    className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                      cycle === c
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          <div>
            <p className="text-zinc-400 text-xs font-medium mb-2">Descrição <span className="text-zinc-600">(opcional)</span></p>
            <input
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Mensalidade de marketing digital"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-3">
          <Button variant="outline" onClick={onClose}
            className="flex-1 border-zinc-700 text-zinc-400 hover:text-white">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !parsedValue}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white">
            {loading ? 'Criando…' : mode === 'unica' ? 'Criar cobrança' : 'Criar assinatura'}
          </Button>
        </div>
      </div>
    </div>
  )
}
