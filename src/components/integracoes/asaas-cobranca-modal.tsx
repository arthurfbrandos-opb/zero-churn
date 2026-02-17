'use client'

import { useState, useMemo } from 'react'
import { X, CreditCard, CheckCircle2, ExternalLink, Copy, Check, AlertCircle, Lock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Mode  = 'unica' | 'recorrente'
type Cycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'

interface Props {
  customerId:         string
  customerName:       string
  clientType:         'mrr' | 'tcv'
  defaultValue?:      number
  contractMonths?:    number
  contractStartDate?: string
  onClose:            () => void
}

const CYCLE_LABELS: Record<Cycle, string> = {
  MONTHLY:      'Mensal',
  QUARTERLY:    'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY:       'Anual',
}

const CYCLE_MONTHS: Record<Cycle, number> = {
  MONTHLY: 1, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12,
}

/** Gera todas as datas de vencimento entre firstDate e endDate pelo ciclo */
function calcDates(firstDate: string, cycle: Cycle, endDate?: string, maxCount = 120): string[] {
  const dates: string[] = []
  const cur = new Date(firstDate + 'T12:00:00')
  const end = endDate ? new Date(endDate + 'T12:00:00') : null
  for (let i = 0; i < maxCount; i++) {
    if (end && cur > end) break
    dates.push(cur.toISOString().slice(0, 10))
    cur.setMonth(cur.getMonth() + CYCLE_MONTHS[cycle])
  }
  return dates
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', day: '2-digit' })
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function AsaasCobrancaModal({
  customerId, customerName, clientType, defaultValue,
  contractMonths, contractStartDate, onClose,
}: Props) {
  const today      = new Date().toISOString().slice(0, 10)
  const defaultDue = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10) })()

  const [mode, setMode]   = useState<Mode>(clientType === 'mrr' ? 'recorrente' : 'unica')
  const [billing, setBill] = useState<'BOLETOEPIX' | 'CREDIT_CARD'>('BOLETOEPIX')
  const [value, setValue] = useState(defaultValue ? String(defaultValue) : '')
  const [dueDate, setDue] = useState(defaultDue)
  const [cycle, setCycle] = useState<Cycle>('MONTHLY')
  const [desc, setDesc]   = useState('')
  const [loading, setLoad] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ count: number; singleUrl?: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const parsedValue = parseFloat(String(value).replace(',', '.')) || 0
  const isCreditCard = billing === 'CREDIT_CARD'

  // Calcula data fim pelo contrato
  const endDate = contractStartDate && contractMonths
    ? addMonths(contractStartDate, contractMonths)
    : undefined

  // Preview das datas que serão criadas
  const futureDates = useMemo(() => {
    if (mode !== 'recorrente' || !dueDate) return []
    return calcDates(dueDate, cycle, endDate)
  }, [mode, dueDate, cycle, endDate])

  const canSubmit = !loading && parsedValue > 0 && !isCreditCard

  async function handleSubmit() {
    if (dueDate < today) { setError('A data de vencimento não pode ser no passado'); return }
    setLoad(true); setError(null)
    const billingType = 'UNDEFINED' // Boleto + PIX juntos

    try {
      if (mode === 'unica') {
        // Cobrança única
        const res = await fetch('/api/asaas/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: customerId, billingType, value: parsedValue, dueDate, description: desc || undefined }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar cobrança'); return }
        setResult({ count: 1, singleUrl: d.payment.invoiceUrl ?? d.payment.bankSlipUrl })

      } else {
        // Lançamentos futuros — cria um boleto individual por data
        const payments = futureDates.map((date, i) => ({
          customer: customerId,
          billingType,
          value: parsedValue,
          dueDate: date,
          description: desc
            ? `${desc} (${i + 1}/${futureDates.length})`
            : `Parcela ${i + 1}/${futureDates.length}`,
        }))
        const res = await fetch('/api/asaas/payments/batch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payments }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar cobranças'); return }
        if (d.failed > 0) {
          setError(`${d.created} criadas, ${d.failed} falharam. Verifique o Asaas.`)
          if (d.created > 0) setResult({ count: d.created })
          return
        }
        setResult({ count: d.created })
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
                {result.count === 1 ? 'Cobrança criada!' : `${result.count} cobranças criadas!`}
              </p>
              <p className="text-zinc-500 text-sm mt-0.5">
                {customerName} · {fmtBRL(parsedValue)}
                {mode === 'recorrente' && ` · ${CYCLE_LABELS[cycle]}`}
              </p>
              {mode === 'recorrente' && endDate && (
                <p className="text-zinc-600 text-xs mt-1">
                  {fmtDate(dueDate)} → {fmtDate(futureDates[futureDates.length - 1] ?? endDate)}
                </p>
              )}
            </div>
          </div>

          {result.singleUrl && (
            <div className="space-y-1.5">
              <p className="text-zinc-500 text-xs">Link de pagamento:</p>
              <div className="flex items-center gap-2">
                <input readOnly value={result.singleUrl}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-xs truncate" />
                <Button size="sm" variant="outline" className="border-zinc-700 shrink-0"
                  onClick={() => copyUrl(result.singleUrl!)}>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <a href={result.singleUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="border-zinc-700 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          )}

          {mode === 'recorrente' && (
            <p className="text-zinc-500 text-sm text-center">
              Os boletos foram lançados individualmente no Asaas com as datas de vencimento de cada período.
            </p>
          )}

          <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">Fechar</Button>
        </div>
      </div>
    )
  }

  // ─── Formulário ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold text-sm">Nova cobrança</p>
              <p className="text-zinc-500 text-xs truncate max-w-[220px]">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">

          {/* Tipo */}
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {([['unica', 'Cobrança única'], ['recorrente', 'Lançamentos futuros']] as [Mode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    mode === m ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                               : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Forma de pagamento */}
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBill('BOLETOEPIX')}
                className={`py-3 px-3 rounded-xl border text-left transition-all ${
                  billing === 'BOLETOEPIX' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600'
                }`}>
                <p className={`text-sm font-semibold ${billing === 'BOLETOEPIX' ? 'text-blue-300' : 'text-zinc-300'}`}>Boleto / PIX</p>
                <p className="text-zinc-500 text-xs mt-0.5">Cliente escolhe</p>
              </button>
              <button onClick={() => setBill('CREDIT_CARD')}
                className={`py-3 px-3 rounded-xl border text-left transition-all ${
                  billing === 'CREDIT_CARD' ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-800/40 border-zinc-700/50'
                }`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-500">Cartão</p>
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <p className="text-zinc-600 text-xs mt-0.5">Via Asaas</p>
              </button>
            </div>

            {isCreditCard && (
              <div className="mt-3 flex items-start gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-zinc-300 text-sm font-medium">Gerenciado pelo Asaas</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">Cobranças em cartão são configuradas diretamente no Asaas, onde o cliente cadastra e autoriza o cartão.</p>
                  <a href="https://app.asaas.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 text-xs hover:text-blue-300 font-medium">
                    <ExternalLink className="w-3 h-3" /> Acessar painel Asaas
                  </a>
                </div>
              </div>
            )}
          </div>

          {!isCreditCard && (
            <>
              {/* Valor */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Valor (R$)</p>
                <input type="number" min="0.01" step="0.01" value={value} onChange={e => setValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              {/* Primeiro vencimento */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">
                  {mode === 'unica' ? 'Data de vencimento' : 'Primeiro vencimento'}
                </p>
                <input type="date" min={today} value={dueDate} onChange={e => setDue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>

              {/* Recorrente: ciclo + preview */}
              {mode === 'recorrente' && (
                <>
                  <div>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Periodicidade</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(CYCLE_LABELS) as [Cycle, string][]).map(([c, label]) => (
                        <button key={c} onClick={() => setCycle(c)}
                          className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                            cycle === c ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                                        : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview das cobranças */}
                  {futureDates.length > 0 && (
                    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                        <p className="text-zinc-300 text-sm font-medium">
                          {futureDates.length} boleto{futureDates.length > 1 ? 's' : ''} · {fmtBRL(parsedValue || 0)} cada
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Primeiro: <span className="text-zinc-300">{fmtDate(futureDates[0])}</span></span>
                        {futureDates.length > 1 && (
                          <span>Último: <span className="text-zinc-300">{fmtDate(futureDates[futureDates.length - 1])}</span></span>
                        )}
                      </div>
                      {parsedValue > 0 && (
                        <div className="border-t border-zinc-700/50 pt-2 flex items-center justify-between text-xs">
                          <span className="text-zinc-500">Total lançado</span>
                          <span className="text-zinc-300 font-semibold">{fmtBRL(parsedValue * futureDates.length)}</span>
                        </div>
                      )}
                      {/* Mini lista das primeiras datas */}
                      {futureDates.length <= 8 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {futureDates.map(d => (
                            <span key={d} className="px-2 py-0.5 bg-zinc-700/60 rounded-md text-zinc-400 text-xs">{fmtDate(d)}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {futureDates.slice(0, 4).map(d => (
                            <span key={d} className="px-2 py-0.5 bg-zinc-700/60 rounded-md text-zinc-400 text-xs">{fmtDate(d)}</span>
                          ))}
                          <span className="px-2 py-0.5 bg-zinc-700/40 rounded-md text-zinc-600 text-xs">
                            +{futureDates.length - 4} mais
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {futureDates.length === 0 && dueDate && (
                    <p className="text-zinc-600 text-xs text-center">
                      Defina a data de início do contrato no step Contrato para calcular automaticamente as datas.
                    </p>
                  )}
                </>
              )}

              {/* Descrição */}
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">
                  Descrição <span className="normal-case text-zinc-600 font-normal">(opcional)</span>
                </p>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Ex: Mensalidade de marketing digital"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-zinc-400 hover:text-white">
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
              {loading
                ? 'Criando…'
                : mode === 'unica'
                  ? 'Criar cobrança'
                  : `Lançar ${futureDates.length} boleto${futureDates.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
