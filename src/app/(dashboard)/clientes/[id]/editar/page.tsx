'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Trash2, AlertTriangle, Check,
  Building2, FileText, MessageCircle, ChevronLeft, ChevronRight,
  User, Phone, Mail, MapPin, Calendar, DollarSign,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClientById, mockServices } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: 'Identificação',  icon: Building2    },
  { id: 1, label: 'Contrato',       icon: FileText     },
  { id: 2, label: 'Contexto',       icon: MessageCircle },
]

export default function EditarClientePage() {
  const params = useParams()
  const router = useRouter()
  const client = getClientById(params.id as string)

  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Form state — pré-preenchido com dados do cliente ──────────

  const [form, setForm] = useState({
    // Step 0 — Identificação
    name:         client?.name ?? '',
    nomeResumido: client?.nomeResumido ?? '',
    nomeDecisor:  client?.nomeDecisor ?? '',
    segment:      client?.segment ?? '',
    email:        '',
    phone:        '',
    cnpj:         '',
    // Step 1 — Contrato
    serviceName:  client?.serviceSold ?? '',
    clientType:   client?.clientType ?? 'mrr',
    contractValue: String(client?.contractValue ?? ''),
    totalProjectValue: String(client?.totalProjectValue ?? ''),
    contractStartDate: client?.contractStartDate ?? '',
    contractEndDate:   client?.contractEndDate ?? '',
    paymentDay:   '',
    // Step 2 — Contexto
    resumoReuniao:        (client as any)?.resumoReuniao ?? '',
    expectativasCliente:  (client as any)?.expectativasCliente ?? '',
    principaisDores:      (client as any)?.principaisDores ?? '',
    notes:                client?.notes ?? '',
  })

  function set(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Cliente não encontrado.</p>
          <Link href="/clientes">
            <Button variant="ghost" className="mt-3 text-zinc-500">← Voltar para clientes</Button>
          </Link>
        </div>
      </div>
    )
  }

  function handleSave() {
    // Simula salvamento
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push(`/clientes/${client!.id}`) }, 1500)
  }

  function handleDelete() {
    // Em produção: DELETE no banco
    router.push('/clientes')
  }

  // ── STEP 0 — Identificação ────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome completo da empresa *">
          <Input value={form.name} onChange={e => set('name', e.target.value)}
            className={inputCls} placeholder="Ex: Clínica Estética Bella Forma" />
        </Field>
        <Field label="Nome resumido (exibição)">
          <Input value={form.nomeResumido} onChange={e => set('nomeResumido', e.target.value)}
            className={inputCls} placeholder="Ex: Bella Forma" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome do decisor *">
          <Input value={form.nomeDecisor} onChange={e => set('nomeDecisor', e.target.value)}
            className={inputCls} placeholder="Ex: Maria Silva" />
        </Field>
        <Field label="Segmento *">
          <Input value={form.segment} onChange={e => set('segment', e.target.value)}
            className={inputCls} placeholder="Ex: Clínica Estética, Imobiliária..." />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="E-mail de contato">
          <Input value={form.email} type="email" onChange={e => set('email', e.target.value)}
            className={inputCls} placeholder="contato@empresa.com.br" />
        </Field>
        <Field label="WhatsApp do decisor">
          <Input value={form.phone} onChange={e => set('phone', e.target.value)}
            className={inputCls} placeholder="(11) 99999-9999" />
        </Field>
      </div>

      <Field label="CNPJ">
        <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)}
          className={inputCls} placeholder="00.000.000/0001-00" />
      </Field>
    </div>
  )

  // ── STEP 1 — Contrato ─────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-5">
      <Field label="Serviço / Método contratado *">
        <div className="grid grid-cols-2 gap-2">
          {mockServices.map(srv => (
            <button key={srv.id}
              onClick={() => set('serviceName', srv.name)}
              className={cn('p-3 rounded-xl border text-left transition-all',
                form.serviceName === srv.name
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600')}>
              <p className={cn('text-sm font-medium', form.serviceName === srv.name ? 'text-emerald-400' : 'text-zinc-300')}>
                {srv.name}
              </p>
              <Badge variant="outline" className={cn('text-xs mt-1',
                srv.type === 'mrr' ? 'text-emerald-400 border-emerald-500/30' : 'text-blue-400 border-blue-500/30')}>
                {srv.type.toUpperCase()}
              </Badge>
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
        <p className="text-zinc-400 text-sm flex-1">Tipo de contrato</p>
        <div className="flex gap-2">
          {(['mrr', 'tcv'] as const).map(t => (
            <button key={t}
              onClick={() => set('clientType', t)}
              className={cn('px-4 py-1.5 rounded-lg border text-xs font-bold transition-all',
                form.clientType === t
                  ? t === 'mrr' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : 'border-blue-500 bg-blue-500/15 text-blue-400'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-600')}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {form.clientType === 'mrr' ? (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor mensal (R$) *">
            <Input value={form.contractValue} type="number" onChange={e => set('contractValue', e.target.value)}
              className={inputCls} placeholder="5000" />
          </Field>
          <Field label="Dia de vencimento">
            <Input value={form.paymentDay} type="number" min="1" max="28" onChange={e => set('paymentDay', e.target.value)}
              className={inputCls} placeholder="10" />
          </Field>
        </div>
      ) : (
        <Field label="Valor total do projeto (R$) *">
          <Input value={form.totalProjectValue} type="number" onChange={e => set('totalProjectValue', e.target.value)}
            className={inputCls} placeholder="25000" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label={form.clientType === 'mrr' ? 'Início do contrato *' : 'Início do projeto *'}>
          <Input value={form.contractStartDate} type="date" onChange={e => set('contractStartDate', e.target.value)}
            className={inputCls} />
        </Field>
        <Field label={form.clientType === 'mrr' ? 'Vencimento / Renovação' : 'Entrega prevista *'}>
          <Input value={form.contractEndDate} type="date" onChange={e => set('contractEndDate', e.target.value)}
            className={inputCls} />
        </Field>
      </div>
    </div>
  )

  // ── STEP 2 — Contexto ─────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-5">
      <p className="text-zinc-500 text-sm">
        Essas informações alimentam o diagnóstico da IA e ajudam a equipe a entender o contexto do cliente.
      </p>
      <Field label="Resumo da última reunião">
        <textarea value={form.resumoReuniao} onChange={e => set('resumoReuniao', e.target.value)}
          className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-24 resize-none')}
          placeholder="O que foi discutido, decisões tomadas, próximos passos..." />
      </Field>
      <Field label="Expectativas do cliente">
        <textarea value={form.expectativasCliente} onChange={e => set('expectativasCliente', e.target.value)}
          className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-20 resize-none')}
          placeholder="O que o cliente espera alcançar com os serviços..." />
      </Field>
      <Field label="Principais dores">
        <textarea value={form.principaisDores} onChange={e => set('principaisDores', e.target.value)}
          className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-20 resize-none')}
          placeholder="Problemas e desafios que motivaram a contratação..." />
      </Field>
      <Field label="Notas internas">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-16 resize-none')}
          placeholder="Observações gerais da equipe..." />
      </Field>
    </div>
  )

  const inputCls = 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600 focus-visible:ring-emerald-500'

  return (
    <div className="min-h-screen">
      <Header
        title={`Editar: ${client.nomeResumido ?? client.name}`}
        description={`${client.segment} · ${client.clientType.toUpperCase()}`}
        action={
          <Link href={`/clientes/${client.id}`}>
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Steps */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = step === s.id
              const isDone   = step > s.id
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button onClick={() => setStep(s.id)}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive ? 'text-white bg-zinc-800' : isDone ? 'text-emerald-400' : 'text-zinc-600')}>
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      isActive ? 'bg-emerald-500 text-white' : isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600')}>
                      {isDone ? <Check className="w-3 h-3" /> : s.id + 1}
                    </div>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px bg-zinc-800 mx-2" />}
                </div>
              )
            })}
          </div>

          {/* Conteúdo do step */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              {step === 0 && renderStep0()}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button size="sm" variant="ghost"
                  onClick={() => setStep(s => s - 1)}
                  className="text-zinc-400 hover:text-white gap-1">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
              )}

              {/* Excluir cliente */}
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xs">Confirmar exclusão?</span>
                  <Button size="sm" onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs h-7">
                    Sim, excluir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}
                    className="text-zinc-400 text-xs h-7">Cancelar</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir cliente
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <Button size="sm"
                  onClick={() => setStep(s => s + 1)}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white gap-1">
                  Próximo <ChevronRight className="w-4 h-4" />
                </Button>
              ) : null}

              <Button size="sm"
                onClick={handleSave}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                {saved
                  ? <><Check className="w-3.5 h-3.5" /> Salvo!</>
                  : <><Save className="w-3.5 h-3.5" /> Salvar alterações</>}
              </Button>
            </div>
          </div>

          {/* Aviso de LGPD */}
          <div className="flex items-start gap-2 p-3 bg-zinc-800/40 rounded-xl border border-zinc-800">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
            <p className="text-zinc-600 text-xs leading-relaxed">
              Alterações são registradas com data, hora e usuário responsável. A exclusão remove permanentemente todos os dados do cliente, incluindo histórico de análises.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-400 text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}
