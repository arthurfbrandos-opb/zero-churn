'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, CreditCard, CheckCircle2, ExternalLink, Copy, Check,
  AlertCircle, Lock, Calendar, Plus, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Mode  = 'unica' | 'recorrente'
type Cycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'

interface Installment {
  id:      string
  dueDate: string
  value:   string
}

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
  MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', SEMIANNUALLY: 'Semestral', YEARLY: 'Anual',
}
const CYCLE_MONTHS: Record<Cycle, number> = {
  MONTHLY: 1, QUARTERLY: 3, SEMIANNUALLY: 6, YEARLY: 12,
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

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

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function uid() {
  return Math.random().toString(36).slice(2)
}

export function AsaasCobrancaModal({
  customerId, customerName, clientType, defaultValue,
  contractMonths, contractStartDate, onClose,
}: Props) {
  const today      = new Date().toISOString().slice(0, 10)
  const defaultDue = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10) })()

  const [mode, setMode]     = useState<Mode>(clientType === 'mrr' ? 'recorrente' : 'unica')
  const [billing, setBill]  = useState<'BOLETOEPIX' | 'CREDIT_CARD'>('BOLETOEPIX')

  // ── Cobrança única ────────────────────────────────────────────
  const [uValue, setUValue]   = useState(defaultValue ? String(defaultValue) : '')
  const [uDue,   setUDue]     = useState(defaultDue)
  const [uDesc,  setUDesc]    = useState('')

  // ── Lançamentos futuros ───────────────────────────────────────
  const [cycle,      setCycle]      = useState<Cycle>('MONTHLY')
  const [firstDue,   setFirstDue]   = useState(defaultDue)
  const [qtdManual,  setQtdManual]  = useState(contractMonths ? String(contractMonths) : '12')
  const [installments, setInst]     = useState<Installment[]>([])
  const [desc,       setDesc]       = useState('')

  const isCreditCard = billing === 'CREDIT_CARD'

  // Enddate calculado do contrato
  const endDate = contractStartDate && contractMonths
    ? addMonths(contractStartDate, contractMonths)
    : undefined

  // Gera lista de parcelas
  const generate = useCallback(() => {
    const defVal = defaultValue ? String(defaultValue) : ''
    let dates: string[]
    if (endDate) {
      dates = calcDates(firstDue, cycle, endDate)
    } else {
      const n = parseInt(qtdManual) || 1
      dates = calcDates(firstDue, cycle, undefined, n)
    }
    setInst(dates.map(d => ({ id: uid(), dueDate: d, value: defVal })))
  }, [firstDue, cycle, endDate, qtdManual, defaultValue])

  // Gera automaticamente ao mudar firstDue, cycle ou qtdManual
  useEffect(() => {
    if (mode === 'recorrente') generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, firstDue, cycle, qtdManual, endDate])

  // Mutações individuais
  function updateInst(id: string, field: 'value' | 'dueDate', val: string) {
    setInst(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i))
  }
  function removeInst(id: string) {
    setInst(prev => prev.filter(i => i.id !== id))
  }
  function addInst() {
    const lastDate = installments.at(-1)?.dueDate ?? firstDue
    setInst(prev => [...prev, {
      id: uid(),
      dueDate: addMonths(lastDate, CYCLE_MONTHS[cycle]),
      value: defaultValue ? String(defaultValue) : '',
    }])
  }
  function applyValueToAll() {
    const defVal = defaultValue ? String(defaultValue) : ''
    setInst(prev => prev.map(i => ({ ...i, value: defVal })))
  }

  // Total
  const total = installments.reduce((s, i) => s + (parseFloat(i.value.replace(',', '.')) || 0), 0)
  const validCount = installments.filter(i => parseFloat(i.value.replace(',', '.')) > 0 && i.dueDate).length

  // ── Submit ────────────────────────────────────────────────────
  const [loading, setLoad]   = useState(false)
  const [error,   setError]  = useState<string | null>(null)
  const [result,  setResult] = useState<{ count: number; singleUrl?: string | null } | null>(null)
  const [copied,  setCopied] = useState(false)

  async function handleSubmit() {
    setLoad(true); setError(null)
    const billingType = 'UNDEFINED'

    try {
      if (mode === 'unica') {
        const val = parseFloat(uValue.replace(',', '.'))
        if (!val || val <= 0) { setError('Valor inválido'); return }
        if (uDue < today)    { setError('Data de vencimento não pode ser no passado'); return }

        const res = await fetch('/api/asaas/payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: customerId, billingType, value: val, dueDate: uDue, description: uDesc || undefined }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar cobrança'); return }
        setResult({ count: 1, singleUrl: d.payment?.invoiceUrl ?? d.payment?.bankSlipUrl })

      } else {
        const payments = installments
          .map((ins, i) => ({
            customer:    customerId,
            billingType,
            value:       parseFloat(ins.value.replace(',', '.')) || 0,
            dueDate:     ins.dueDate,
            description: desc ? `${desc} (${i + 1}/${installments.length})` : `Parcela ${i + 1}/${installments.length}`,
          }))
          .filter(p => p.value > 0 && p.dueDate)

        if (payments.length === 0) { setError('Nenhum lançamento válido'); return }

        const res = await fetch('/api/asaas/payments/batch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payments }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Erro ao criar cobranças'); return }
        if (d.failed > 0 && d.created === 0) { setError(`Todos os ${d.failed} lançamentos falharam`); return }
        if (d.failed > 0) setError(`${d.created} criados · ${d.failed} falharam`)
        setResult({ count: d.created })
      }
    } finally { setLoad(false) }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Tela de sucesso ───────────────────────────────────────────
  if (result) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-zinc-100 font-semibold text-lg">
              {result.count === 1 ? 'Cobrança criada!' : `${result.count} cobranças criadas!`}
            </p>
            <p className="text-zinc-500 text-sm mt-0.5">{customerName}</p>
            {error && <p className="text-yellow-400 text-xs mt-1">{error}</p>}
          </div>
        </div>
        {result.singleUrl && (
          <div className="space-y-1.5">
            <p className="text-zinc-500 text-xs">Link de pagamento:</p>
            <div className="flex items-center gap-2">
              <input readOnly value={result.singleUrl}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-xs truncate" />
              <Button size="sm" variant="outline" className="border-zinc-700 shrink-0" onClick={() => copyUrl(result.singleUrl!)}>
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
        <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">Fechar</Button>
      </div>
    </div>
  )

  // ── Formulário ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-semibold text-sm">Nova cobrança</p>
              <p className="text-zinc-500 text-xs truncate max-w-[260px]">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Body scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Tipo */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">Tipo</p>
              <div className="grid grid-cols-2 gap-2">
                {([['unica', 'Cobrança única'], ['recorrente', 'Lançamentos futuros']] as [Mode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      mode === m
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                        : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Forma de pagamento */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-2">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setBill('BOLETOEPIX')}
                  className={`py-3 px-3 rounded-xl border text-left transition-all ${
                    billing === 'BOLETOEPIX'
                      ? 'bg-blue-500/10 border-blue-500/40'
                      : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600'
                  }`}>
                  <p className={`text-sm font-semibold ${billing === 'BOLETOEPIX' ? 'text-blue-300' : 'text-zinc-300'}`}>Boleto / PIX</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Cliente escolhe</p>
                </button>
                <button onClick={() => setBill('CREDIT_CARD')}
                  className="py-3 px-3 rounded-xl border border-zinc-700/50 bg-zinc-800/40 text-left">
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
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      Cobranças em cartão são configuradas diretamente no Asaas, onde o cliente autoriza.
                    </p>
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
                {/* ── COBRANÇA ÚNICA ───────────────────────── */}
                {mode === 'unica' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Valor (R$)</p>
                        <input type="number" min="0.01" step="0.01" value={uValue}
                          onChange={e => setUValue(e.target.value)} placeholder="0,00"
                          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Vencimento</p>
                        <input type="date" min={today} value={uDue} onChange={e => setUDue(e.target.value)}
                          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                        Descrição <span className="normal-case font-normal text-zinc-600">(opcional)</span>
                      </p>
                      <input value={uDesc} onChange={e => setUDesc(e.target.value)}
                        placeholder="Ex: Mensalidade marketing digital"
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  </div>
                )}

                {/* ── LANÇAMENTOS FUTUROS ───────────────────── */}
                {mode === 'recorrente' && (
                  <div className="space-y-4">

                    {/* Config: primeiro vencimento + ciclo + qtd manual */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Primeiro vencimento</p>
                        <input type="date" min={today} value={firstDue} onChange={e => setFirstDue(e.target.value)}
                          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Periodicidade</p>
                        <select value={cycle} onChange={e => setCycle(e.target.value as Cycle)}
                          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors">
                          {(Object.entries(CYCLE_LABELS) as [Cycle, string][]).map(([c, label]) => (
                            <option key={c} value={c}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Qtd manual (só mostra se não tem endDate do contrato) */}
                    {!endDate && (
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Número de parcelas</p>
                        <input type="number" min="1" max="120" value={qtdManual}
                          onChange={e => setQtdManual(e.target.value)}
                          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                    )}

                    {/* Descrição */}
                    <div>
                      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                        Descrição <span className="normal-case font-normal text-zinc-600">(opcional)</span>
                      </p>
                      <input value={desc} onChange={e => setDesc(e.target.value)}
                        placeholder="Ex: Mensalidade marketing digital"
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>

                    {/* Lista de lançamentos */}
                    {installments.length > 0 && (
                      <div className="space-y-2">
                        {/* Cabeçalho */}
                        <div className="flex items-center justify-between">
                          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">
                            Lançamentos <span className="text-zinc-600 normal-case font-normal ml-1">(edite se necessário)</span>
                          </p>
                          <div className="flex items-center gap-2">
                            {defaultValue && (
                              <button onClick={applyValueToAll}
                                className="text-zinc-600 hover:text-blue-400 text-xs transition-colors">
                                Aplicar valor a todos
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Grid header */}
                        <div className="grid grid-cols-[1fr_140px_32px] gap-2 px-1">
                          <p className="text-zinc-600 text-xs">Vencimento</p>
                          <p className="text-zinc-600 text-xs">Valor (R$)</p>
                          <span />
                        </div>

                        {/* Linhas scrolláveis */}
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {installments.map((ins, idx) => (
                            <div key={ins.id} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                              {/* Data */}
                              <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                                <input
                                  type="date"
                                  value={ins.dueDate}
                                  onChange={e => updateInst(ins.id, 'dueDate', e.target.value)}
                                  className="w-full pl-8 pr-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                              {/* Valor */}
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder={idx === 0 ? 'R$ 0,00' : ''}
                                value={ins.value}
                                onChange={e => updateInst(ins.id, 'value', e.target.value)}
                                className="w-full px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-blue-500 transition-colors text-right"
                              />
                              {/* Remover */}
                              <button
                                onClick={() => removeInst(ins.id)}
                                className="flex items-center justify-center w-8 h-8 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remover lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Adicionar linha + totais */}
                        <div className="flex items-center justify-between pt-1">
                          <button onClick={addInst}
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-blue-400 text-xs transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Adicionar lançamento
                          </button>
                          <div className="text-right">
                            <p className="text-zinc-500 text-xs">
                              {installments.length} lançamento{installments.length !== 1 ? 's' : ''}
                              {validCount < installments.length && (
                                <span className="text-yellow-500 ml-1">· {installments.length - validCount} sem valor</span>
                              )}
                            </p>
                            {total > 0 && (
                              <p className="text-zinc-300 text-sm font-semibold">
                                Total: {fmtBRL(total)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {installments.length === 0 && (
                      <div className="flex items-center gap-2 text-zinc-600 text-sm py-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Preencha o primeiro vencimento para gerar os lançamentos.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Erro */}
            {error && !result && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 flex gap-3 shrink-0">
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
            <Button
              onClick={handleSubmit}
              disabled={loading || (mode === 'recorrente' && validCount === 0)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
            >
              {loading
                ? 'Criando…'
                : mode === 'unica'
                  ? 'Criar cobrança'
                  : `Lançar ${validCount} boleto${validCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
