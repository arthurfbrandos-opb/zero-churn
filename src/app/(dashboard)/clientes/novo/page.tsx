'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2,
  Building2, MapPin, FileText, ClipboardList,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCep } from '@/hooks/use-cep'
import { cn } from '@/lib/utils'

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
  serviceSold: string
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
  // Step 4
  notes: string
}

const INITIAL: FormData = {
  razaoSocial: '', nomeResumido: '', cnpjCpf: '', nomeDecisor: '',
  telefone: '', email: '', emailFinanceiro: '', segment: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '',
  clientType: 'mrr', serviceSold: '',
  contractValue: '', contractMonths: '12',
  hasImplementationFee: false, implementationFeeValue: '', implementationFeeDate: '',
  totalProjectValue: '', projectDeadlineDays: '90',
  hasInstallments: false, installmentsType: 'equal',
  installmentsCount: '3', firstInstallmentDate: '',
  parcelas: [],
  notes: '',
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

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2')
}

function calcEndDate(startDays: string, months: string) {
  if (!months) return ''
  const d = new Date()
  d.setMonth(d.getMonth() + parseInt(months))
  return d.toLocaleDateString('pt-BR')
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
  { label: 'Identificação', icon: Building2 },
  { label: 'Endereço', icon: MapPin },
  { label: 'Contrato', icon: FileText },
  { label: 'Observações', icon: ClipboardList },
]

// ── Componente de campo ───────────────────────────────────────────
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300 text-sm">
        {label} {optional && <span className="text-zinc-500 text-xs">(opcional)</span>}
      </Label>
      {children}
    </div>
  )
}

const inputCls = "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500"

// ── Página principal ──────────────────────────────────────────────
export default function NovoClientePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [saving, setSaving] = useState(false)
  const { fetchCep, loading: loadingCep, error: cepError } = useCep()

  const set = useCallback((field: keyof FormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

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

  // Total de parcelas customizadas
  const totalParcelas = form.parcelas.reduce((s, p) => s + parseFloat(p.valor || '0'), 0)
  const totalProjeto = parseFloat(form.totalProjectValue.replace(',', '.') || '0')
  const diffParcelas = totalProjeto - totalParcelas

  async function handleSubmit() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaving(false)
    router.push('/clientes')
  }

  const canNext = [
    // Step 0
    form.razaoSocial && form.nomeResumido && form.cnpjCpf && form.nomeDecisor && form.telefone && form.email && form.segment,
    // Step 1
    form.cep && form.logradouro && form.numero && form.bairro && form.cidade && form.estado,
    // Step 2
    form.serviceSold && (
      form.clientType === 'mrr'
        ? !!form.contractValue && !!form.contractMonths
        : !!form.totalProjectValue && !!form.projectDeadlineDays
    ),
    // Step 3
    true,
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Novo Cliente"
        description="Cadastre as informações completas do cliente"
        action={
          <Link href="/clientes">
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-white gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-2xl mx-auto space-y-6">

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
                    done ? 'bg-emerald-500 border-emerald-500 text-white'
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
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-white font-semibold">Dados da empresa</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Razão Social">
                    <Input value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)}
                      placeholder="Empresa Ltda." className={inputCls} />
                  </Field>
                </div>

                <Field label="Nome Resumido">
                  <Input value={form.nomeResumido} onChange={e => set('nomeResumido', e.target.value)}
                    placeholder="Nome exibido no sistema" className={inputCls} />
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
        )}

        {/* ── STEP 1 — Endereço ────────────────────────────────── */}
        {step === 1 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-white font-semibold">Endereço de cobrança</h2>

              <div className="grid grid-cols-2 gap-4">
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

                <Field label="Número">
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
                    <button key={t} onClick={() => set('clientType', t)}
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

                <Field label="Serviço vendido">
                  <Input value={form.serviceSold} onChange={e => set('serviceSold', e.target.value)}
                    placeholder="Ex: Tráfego Pago + Social Media" className={inputCls} />
                </Field>
              </CardContent>
            </Card>

            {/* MRR */}
            {form.clientType === 'mrr' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-white font-semibold">Detalhes MRR</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Valor da mensalidade (R$)">
                      <Input value={form.contractValue} onChange={e => set('contractValue', e.target.value)}
                        placeholder="3.500,00" className={inputCls} />
                    </Field>

                    <Field label="Prazo do contrato (meses)">
                      <Input type="number" value={form.contractMonths}
                        onChange={e => set('contractMonths', e.target.value)}
                        placeholder="12" className={inputCls} min={1} />
                    </Field>
                  </div>

                  {form.contractMonths && (
                    <p className="text-zinc-500 text-xs">
                      Vigência até: <span className="text-zinc-300">{calcEndDate('', form.contractMonths)}</span>
                    </p>
                  )}

                  {/* Implementação */}
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-zinc-300">Houve cobrança de implementação?</Label>
                      <button onClick={() => set('hasImplementationFee', !form.hasImplementationFee)}
                        className={cn('w-10 h-6 rounded-full transition-all relative', form.hasImplementationFee ? 'bg-emerald-500' : 'bg-zinc-700')}>
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', form.hasImplementationFee ? 'left-5' : 'left-1')} />
                      </button>
                    </div>
                    {form.hasImplementationFee && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Valor da implementação (R$)">
                          <Input value={form.implementationFeeValue}
                            onChange={e => set('implementationFeeValue', e.target.value)}
                            placeholder="2.000,00" className={inputCls} />
                        </Field>
                        <Field label="Data de pagamento">
                          <Input type="date" value={form.implementationFeeDate}
                            onChange={e => set('implementationFeeDate', e.target.value)}
                            className={inputCls} />
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

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Valor total do projeto (R$)">
                      <Input value={form.totalProjectValue}
                        onChange={e => set('totalProjectValue', e.target.value)}
                        placeholder="18.000,00" className={inputCls} />
                    </Field>
                    <Field label="Prazo do projeto (dias)">
                      <Input type="number" value={form.projectDeadlineDays}
                        onChange={e => set('projectDeadlineDays', e.target.value)}
                        placeholder="90" className={inputCls} />
                    </Field>
                  </div>

                  {/* Parcelamento */}
                  <div className="pt-2 border-t border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300">Houve parcelamento?</Label>
                      <button onClick={() => set('hasInstallments', !form.hasInstallments)}
                        className={cn('w-10 h-6 rounded-full transition-all relative', form.hasInstallments ? 'bg-emerald-500' : 'bg-zinc-700')}>
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', form.hasInstallments ? 'left-5' : 'left-1')} />
                      </button>
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
                            <div className="grid grid-cols-2 gap-4">
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
                              <div className="space-y-1">
                                <p className="text-zinc-500 text-xs font-medium mb-2">Parcelas geradas:</p>
                                {gerarParcelas(form.totalProjectValue, form.installmentsCount, form.firstInstallmentDate).map((p, i) => (
                                  <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-1.5 text-xs">
                                    <span className="text-zinc-400">{i + 1}ª parcela</span>
                                    <span className="text-zinc-500">{new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-600 text-xs">A vencer</Badge>
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
                                Total inserido:{' '}
                                <span className={cn('font-bold', Math.abs(diffParcelas) < 0.01 ? 'text-emerald-400' : diffParcelas < 0 ? 'text-red-400' : 'text-zinc-300')}>
                                  R$ {totalParcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {' / '}
                                <span className="text-zinc-300">R$ {totalProjeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                {Math.abs(diffParcelas) >= 0.01 && (
                                  <span className={cn('ml-2', diffParcelas > 0 ? 'text-zinc-500' : 'text-red-400')}>
                                    ({diffParcelas > 0 ? `faltam R$ ${diffParcelas.toFixed(2)}` : `excede R$ ${Math.abs(diffParcelas).toFixed(2)}`})
                                  </span>
                                )}
                              </p>
                              <Button size="sm" variant="outline"
                                className="border-zinc-700 text-zinc-400 hover:text-white text-xs gap-1"
                                onClick={addParcela}>
                                <Plus className="w-3 h-3" /> Adicionar parcela
                              </Button>
                            </div>

                            {form.parcelas.length === 0 && (
                              <p className="text-zinc-600 text-xs text-center py-3">
                                Clique em "Adicionar parcela" para inserir cada vencimento
                              </p>
                            )}

                            {form.parcelas.map((p, i) => (
                              <div key={p.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
                                <span className="text-zinc-500 text-xs w-6 shrink-0">{i + 1}ª</span>
                                <div className="flex-1">
                                  <Input type="date" value={p.vencimento}
                                    onChange={e => updateParcela(p.id, 'vencimento', e.target.value)}
                                    className={cn(inputCls, 'h-8 text-xs')} />
                                </div>
                                <div className="flex-1">
                                  <Input placeholder="Valor (R$)" value={p.valor}
                                    onChange={e => updateParcela(p.id, 'valor', e.target.value)}
                                    className={cn(inputCls, 'h-8 text-xs')} />
                                </div>
                                <Badge variant="outline" className="text-zinc-400 border-zinc-600 text-xs shrink-0">A vencer</Badge>
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

        {/* ── STEP 3 — Observações ─────────────────────────────── */}
        {step === 3 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-white font-semibold">Observações</h2>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
                <p>• <span className="text-zinc-400">Cliente:</span> {form.nomeResumido}</p>
                <p>• <span className="text-zinc-400">Tipo:</span> {form.clientType.toUpperCase()} · {form.serviceSold}</p>
                {form.clientType === 'mrr' && <p>• <span className="text-zinc-400">MRR:</span> R$ {form.contractValue}/mês · {form.contractMonths} meses</p>}
                {form.clientType === 'tcv' && <p>• <span className="text-zinc-400">TCV:</span> R$ {form.totalProjectValue} · {form.projectDeadlineDays} dias</p>}
              </div>
              <Field label="Observações" optional>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Informações relevantes sobre o cliente, expectativas, contexto do fechamento..."
                  className={cn(inputCls, 'min-h-32 resize-none')} />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-white gap-1"
            onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/clientes')}
            disabled={saving}>
            <ArrowLeft className="w-3.5 h-3.5" />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext[step]}>
              Próximo <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 min-w-32"
              onClick={handleSubmit}
              disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : <><Check className="w-3.5 h-3.5" /> Cadastrar cliente</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
