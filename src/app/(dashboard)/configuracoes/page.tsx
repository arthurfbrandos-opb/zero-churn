'use client'

import { useState } from 'react'
import {
  Building2, Briefcase, Plug, Users, Bot, Bell,
  Plus, Trash2, Check, X, Eye, EyeOff, Loader2,
  ChevronRight, Shield, AlertTriangle, RefreshCw,
  MessageCircle, CreditCard, BarChart2, Zap,
  GripVertical,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockServices } from '@/lib/mock-data'
import { Service } from '@/types'
import { cn } from '@/lib/utils'

// ── Nav sections ──────────────────────────────────────────────────
const NAV = [
  { id: 'agencia',       label: 'Agência',       icon: Building2 },
  { id: 'servicos',      label: 'Serviços',       icon: Briefcase },
  { id: 'integracoes',   label: 'Integrações',    icon: Plug      },
  { id: 'usuarios',      label: 'Usuários',       icon: Users     },
  { id: 'analisador',    label: 'Analisador',     icon: Bot       },
  { id: 'notificacoes',  label: 'Notificações',   icon: Bell      },
]

// ── Helpers ───────────────────────────────────────────────────────
const inputCls = "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white font-semibold text-base mb-4">{children}</h2>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300 text-sm">{label}</Label>
      {children}
      {hint && <p className="text-zinc-600 text-xs">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onToggle, label, sub }: { checked: boolean; onToggle: () => void; label?: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      {(label || sub) && (
        <div>
          {label && <p className="text-zinc-300 text-sm">{label}</p>}
          {sub && <p className="text-zinc-500 text-xs">{sub}</p>}
        </div>
      )}
      <button onClick={onToggle}
        className={cn('w-10 h-6 rounded-full transition-all relative shrink-0', checked ? 'bg-emerald-500' : 'bg-zinc-700')}>
        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all', checked ? 'left-5' : 'left-1')} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: AGÊNCIA
// ─────────────────────────────────────────────────────────────────
function AgenciaSection() {
  const [name, setName] = useState('Agência Demo')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Perfil da agência</SectionTitle>

      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-zinc-600" />
        </div>
        <div>
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white text-xs">
            Enviar logotipo
          </Button>
          <p className="text-zinc-600 text-xs mt-1">PNG ou SVG · máx. 1MB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Nome da agência">
            <Input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Fuso horário">
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            className={cn(inputCls, 'w-full h-10 rounded-md border px-3 text-sm')}>
            <option value="America/Sao_Paulo">Brasília (UTC-3)</option>
            <option value="America/Manaus">Manaus (UTC-4)</option>
            <option value="America/Belem">Belém (UTC-3)</option>
            <option value="America/Fortaleza">Fortaleza (UTC-3)</option>
          </select>
        </Field>

        <div>
          <Label className="text-zinc-300 text-sm block mb-1.5">Plano atual</Label>
          <div className="h-10 flex items-center">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm px-3">
              Starter
            </Badge>
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white text-xs ml-2 gap-1">
              Fazer upgrade <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <Button size="sm" onClick={handleSave}
        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
        {saved ? <><Check className="w-3.5 h-3.5" /> Salvo!</> : 'Salvar alterações'}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: SERVIÇOS
// ─────────────────────────────────────────────────────────────────
function ServicosSection() {
  const [services, setServices] = useState<Service[]>(mockServices)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'mrr' | 'tcv' | 'both'>('mrr')

  function toggleActive(id: string) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s))
  }

  function startEdit(s: Service) {
    setEditingId(s.id)
    setEditName(s.name)
  }

  function saveEdit(id: string) {
    if (!editName.trim()) return
    setServices(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s))
    setEditingId(null)
  }

  function deleteService(id: string) {
    setServices(prev => prev.filter(s => s.id !== id))
  }

  function addService() {
    if (!newName.trim()) return
    const novo: Service = {
      id: `srv-${Date.now()}`,
      agencyId: 'agency-001',
      name: newName.trim(),
      type: newType,
      isActive: true,
    }
    setServices(prev => [...prev, novo])
    setNewName('')
    setNewType('mrr')
    setAdding(false)
  }

  const typeBadge = (t: 'mrr' | 'tcv' | 'both') => ({
    mrr:  'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    tcv:  'text-blue-400 border-blue-500/30 bg-blue-500/10',
    both: 'text-zinc-400 border-zinc-600 bg-zinc-800',
  }[t])

  const typeLabel = (t: 'mrr' | 'tcv' | 'both') => ({ mrr: 'MRR', tcv: 'TCV', both: 'Ambos' }[t])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Serviços oferecidos</SectionTitle>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 -mt-4">
          <Plus className="w-3.5 h-3.5" /> Novo serviço
        </Button>
      </div>

      <p className="text-zinc-500 text-sm -mt-2">
        Esses serviços aparecem no seletor durante o cadastro de clientes. O tipo define em qual modalidade de contrato o serviço pode ser vendido.
      </p>

      {/* Formulário de novo serviço */}
      {adding && (
        <Card className="bg-zinc-800/60 border-emerald-500/30 border-dashed">
          <CardContent className="p-4 space-y-3">
            <p className="text-zinc-300 text-sm font-medium">Novo serviço</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nome do serviço" className={inputCls}
                  onKeyDown={e => { if (e.key === 'Enter') addService(); if (e.key === 'Escape') setAdding(false) }}
                />
              </div>
              <select value={newType} onChange={e => setNewType(e.target.value as 'mrr' | 'tcv' | 'both')}
                className={cn(inputCls, 'w-full h-10 rounded-md border px-3 text-sm')}>
                <option value="mrr">MRR</option>
                <option value="tcv">TCV</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addService} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                <Check className="w-3.5 h-3.5" /> Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-zinc-400">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id}
            className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all',
              s.isActive ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-900/40 border-zinc-800/50 opacity-60'
            )}>
            <GripVertical className="w-4 h-4 text-zinc-700 shrink-0 cursor-grab" />

            {/* Nome */}
            <div className="flex-1 min-w-0">
              {editingId === s.id ? (
                <Input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  className={cn(inputCls, 'h-7 text-sm')}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(s.id); if (e.key === 'Escape') setEditingId(null) }}
                />
              ) : (
                <p className="text-zinc-200 text-sm truncate">{s.name}</p>
              )}
            </div>

            {/* Badge tipo */}
            <Badge variant="outline" className={cn('text-xs shrink-0', typeBadge(s.type))}>
              {typeLabel(s.type)}
            </Badge>

            {/* Ações */}
            <div className="flex items-center gap-1.5 shrink-0">
              {editingId === s.id ? (
                <>
                  <button onClick={() => saveEdit(s.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-800 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button onClick={() => startEdit(s)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2">
                  Editar
                </button>
              )}

              {/* Toggle ativo */}
              <button onClick={() => toggleActive(s.id)}
                className={cn('w-9 h-5 rounded-full transition-all relative shrink-0', s.isActive ? 'bg-emerald-500' : 'bg-zinc-700')}>
                <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', s.isActive ? 'left-4' : 'left-0.5')} />
              </button>

              <button onClick={() => deleteService(s.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: INTEGRAÇÕES
// ─────────────────────────────────────────────────────────────────

interface IntegCardProps {
  icon: React.ElementType
  name: string
  description: string
  color: string
  connected?: boolean
  children: React.ReactNode
}

function IntegCard({ icon: Icon, name, description, color, connected, children }: IntegCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-zinc-200 font-medium text-sm">{name}</p>
              <p className="text-zinc-500 text-xs">{description}</p>
            </div>
          </div>
          {connected !== undefined && (
            <Badge className={cn('text-xs shrink-0', connected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-500 border border-zinc-700')}>
              {connected ? '● Conectado' : '○ Desconectado'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">{children}</CardContent>
    </Card>
  )
}

function ApiKeyField({ label, placeholder }: { label: string; placeholder: string }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    await new Promise(r => setTimeout(r, 1400))
    setTestResult(value.length > 5 ? 'ok' : 'error')
    setTesting(false)
  }

  return (
    <div className="space-y-2">
      <Label className="text-zinc-400 text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); setTestResult(null) }}
            placeholder={placeholder}
            className={cn(inputCls, 'pr-9 text-sm')}
          />
          <button onClick={() => setShow(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <Button size="sm" variant="outline" onClick={handleTest} disabled={!value || testing}
          className="border-zinc-700 text-zinc-400 hover:text-white gap-1 shrink-0">
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          {testing ? 'Testando' : 'Testar'}
        </Button>
      </div>
      {testResult === 'ok' && <p className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Conexão bem-sucedida</p>}
      {testResult === 'error' && <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Falha na conexão — verifique a chave</p>}
    </div>
  )
}

function IntegracoesSection() {
  const [waUrl, setWaUrl] = useState('')
  const [waEnv, setWaEnv] = useState<'sandbox' | 'production'>('sandbox')

  return (
    <div className="space-y-4">
      <SectionTitle>Integrações</SectionTitle>

      {/* WhatsApp */}
      <IntegCard icon={MessageCircle} name="WhatsApp (Evolution API)" color="bg-emerald-500/15 text-emerald-400"
        description="Análise de sentimento e proximidade via grupos do WhatsApp">
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">URL do servidor Evolution</Label>
            <Input value={waUrl} onChange={e => setWaUrl(e.target.value)}
              placeholder="https://evolution.suaagencia.com.br" className={cn(inputCls, 'text-sm')} />
          </div>
          <ApiKeyField label="API Key" placeholder="evo_xxxxxxxxxxxxxxxx" />
        </div>
      </IntegCard>

      {/* Asaas */}
      <IntegCard icon={CreditCard} name="Asaas" color="bg-blue-500/15 text-blue-400"
        description="Cobranças, pagamentos e gestão financeira dos clientes MRR">
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            {(['sandbox', 'production'] as const).map(env => (
              <button key={env} onClick={() => setWaEnv(env)}
                className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  waEnv === env
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600')}>
                {env === 'sandbox' ? '🧪 Sandbox' : '🚀 Produção'}
              </button>
            ))}
          </div>
          <ApiKeyField label="API Key" placeholder="$aact_xxxxxxxxxxxxxxxxxx" />
        </div>
      </IntegCard>

      {/* Dom Pagamentos */}
      <IntegCard icon={CreditCard} name="Dom Pagamentos" color="bg-violet-500/15 text-violet-400"
        description="Integração com gateway Dom para cobranças e conciliação">
        <div className="pt-1">
          <ApiKeyField label="API Key" placeholder="dom_live_xxxxxxxxxxxxxxxx" />
        </div>
      </IntegCard>

      {/* Meta Ads */}
      <IntegCard icon={BarChart2} name="Meta Ads (Facebook)" color="bg-blue-600/15 text-blue-500"
        description="Dados de performance de campanhas do cliente no Meta">
        <div className="pt-1">
          <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2 text-sm">
            <BarChart2 className="w-4 h-4" /> Conectar com Meta
          </Button>
          <p className="text-zinc-600 text-xs mt-2">Redireciona para autenticação OAuth do Meta Business</p>
        </div>
      </IntegCard>

      {/* Google Ads */}
      <IntegCard icon={BarChart2} name="Google Ads" color="bg-red-500/15 text-red-400"
        description="Dados de performance de campanhas do cliente no Google">
        <div className="pt-1">
          <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2 text-sm">
            <BarChart2 className="w-4 h-4" /> Conectar com Google
          </Button>
          <p className="text-zinc-600 text-xs mt-2">Redireciona para autenticação OAuth do Google Ads</p>
        </div>
      </IntegCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: USUÁRIOS
// ─────────────────────────────────────────────────────────────────

interface TeamMember { id: string; name: string; email: string; role: 'admin' | 'viewer'; initials: string }

const MOCK_TEAM: TeamMember[] = [
  { id: 'u1', name: 'Arthur Ferreira', email: 'arthur@agencia.com', role: 'admin', initials: 'AF' },
  { id: 'u2', name: 'Carla Souza',     email: 'carla@agencia.com',  role: 'viewer', initials: 'CS' },
]

function UsuariosSection() {
  const [team, setTeam] = useState<TeamMember[]>(MOCK_TEAM)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState(false)

  async function handleInvite() {
    if (!inviteEmail.includes('@')) return
    setInviting(true)
    await new Promise(r => setTimeout(r, 1200))
    setInviting(false)
    setInvited(true)
    setInviteEmail('')
    setTimeout(() => setInvited(false), 3000)
  }

  function removeUser(id: string) {
    setTeam(prev => prev.filter(u => u.id !== id))
  }

  function toggleRole(id: string) {
    setTeam(prev => prev.map(u => u.id === id ? { ...u, role: u.role === 'admin' ? 'viewer' : 'admin' } : u))
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Equipe</SectionTitle>

      {/* Membros */}
      <div className="space-y-2">
        {team.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0">
              {u.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-200 text-sm font-medium">{u.name}</p>
              <p className="text-zinc-500 text-xs">{u.email}</p>
            </div>
            <button onClick={() => toggleRole(u.id)}
              className={cn('px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                u.role === 'admin'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
              {u.role === 'admin' ? 'Admin' : 'Viewer'}
            </button>
            <button onClick={() => removeUser(u.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Convite */}
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <p className="text-zinc-300 text-sm font-medium">Convidar novo membro</p>
        <div className="flex gap-2">
          <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="email@agencia.com" className={cn(inputCls, 'flex-1 text-sm')} />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'viewer')}
            className={cn(inputCls, 'h-10 rounded-md border px-3 text-sm w-28')}>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shrink-0">
            {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {inviting ? '' : 'Convidar'}
          </Button>
        </div>
        {invited && <p className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Convite enviado!</p>}
        <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
          <p><span className="text-zinc-400 font-medium">Admin</span> — acesso completo, pode editar clientes e configurações</p>
          <p><span className="text-zinc-400 font-medium">Viewer</span> — somente leitura, não pode editar dados</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: ANALISADOR
// ─────────────────────────────────────────────────────────────────
function AnalisadorSection() {
  const [day, setDay] = useState(5)
  const [npsGrace, setNpsGrace] = useState<7 | 15>(7)
  const [saved, setSaved] = useState(false)

  const PILLARS = [
    { label: 'Financeiro',            weight: 35, color: 'bg-emerald-500' },
    { label: 'Proximidade (WhatsApp)', weight: 30, color: 'bg-blue-500'   },
    { label: 'Resultado / Expectativa', weight: 25, color: 'bg-violet-500' },
    { label: 'NPS',                    weight: 10, color: 'bg-yellow-500' },
  ]

  async function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Configurações do analisador</SectionTitle>

      {/* Agendamento */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-zinc-200 text-sm font-medium">Análise automática mensal</p>
              <p className="text-zinc-500 text-xs mt-0.5">O sistema roda a análise de todos os clientes neste dia todo mês. Você pode acionar manualmente a qualquer momento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-zinc-400 text-sm shrink-0">Todo dia</Label>
            <Input type="number" value={day} onChange={e => setDay(Math.min(28, Math.max(1, +e.target.value)))}
              className={cn(inputCls, 'w-20 text-center')} min={1} max={28} />
            <Label className="text-zinc-400 text-sm">de cada mês</Label>
          </div>
          <p className="text-zinc-600 text-xs">Próxima análise: <span className="text-zinc-400">01/03/2026</span></p>
        </CardContent>
      </Card>

      {/* NPS grace period */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-zinc-200 text-sm font-medium">Tolerância para não-resposta do formulário</p>
            <p className="text-zinc-500 text-xs mt-0.5">Após envio do formulário, quantos dias sem resposta penaliza o score do cliente?</p>
          </div>
          <div className="flex gap-2">
            {([7, 15] as const).map(d => (
              <button key={d} onClick={() => setNpsGrace(d)}
                className={cn('px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  npsGrace === d
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
                {d} dias
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pilares */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-zinc-200 text-sm font-medium">Pesos dos pilares do health score</p>
            <p className="text-zinc-500 text-xs mt-0.5">Os pesos atuais do algoritmo de análise de risco. (Edição disponível no plano Growth+)</p>
          </div>
          <div className="space-y-3">
            {PILLARS.map(p => (
              <div key={p.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">{p.label}</span>
                  <span className="text-zinc-300 font-medium">{p.weight}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', p.color)} style={{ width: `${p.weight}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-zinc-600 text-xs flex items-center gap-1">
            <Shield className="w-3 h-3" /> Total: 100% — os pesos garantem consistência do score
          </p>
        </CardContent>
      </Card>

      <Button size="sm" onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
        {saved ? <><Check className="w-3.5 h-3.5" /> Salvo!</> : 'Salvar configurações'}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: NOTIFICAÇÕES
// ─────────────────────────────────────────────────────────────────
function NotificacoesSection() {
  const [prefs, setPrefs] = useState({
    highRisk: true,
    integrationError: true,
    npsPending: true,
    renewalSoon: true,
    tcvExpiring: true,
    analysisComplete: false,
    newFormResponse: true,
  })

  const toggle = (key: keyof typeof prefs) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }))

  const [saved, setSaved] = useState(false)

  const ITEMS = [
    { key: 'highRisk',          label: 'Cliente em alto risco',           sub: 'Quando um cliente atingir score crítico' },
    { key: 'integrationError',  label: 'Erro de integração',              sub: 'WhatsApp, Asaas ou Dom com falha de conexão' },
    { key: 'npsPending',        label: 'Formulário sem resposta',         sub: 'Cliente não respondeu dentro do prazo de tolerância' },
    { key: 'renewalSoon',       label: 'Renovação próxima',              sub: 'Contrato MRR vencendo nos próximos 45 dias' },
    { key: 'tcvExpiring',       label: 'Projeto TCV próximo do prazo',   sub: 'Projeto com menos de 15 dias para encerrar' },
    { key: 'analysisComplete',  label: 'Análise mensal concluída',        sub: 'Notificar quando o analisador terminar' },
    { key: 'newFormResponse',   label: 'Nova resposta de formulário',     sub: 'Cliente respondeu NPS ou avaliação de resultado' },
  ] as const

  return (
    <div className="space-y-4">
      <SectionTitle>Preferências de notificação</SectionTitle>
      <p className="text-zinc-500 text-sm -mt-2">
        Controle quais eventos geram alertas na Central de Alertas e notificações no sistema.
      </p>

      <div className="space-y-2">
        {ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-zinc-200 text-sm">{item.label}</p>
              <p className="text-zinc-500 text-xs">{item.sub}</p>
            </div>
            <button onClick={() => toggle(item.key)}
              className={cn('w-10 h-6 rounded-full transition-all relative shrink-0', prefs[item.key] ? 'bg-emerald-500' : 'bg-zinc-700')}>
              <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all', prefs[item.key] ? 'left-5' : 'left-1')} />
            </button>
          </div>
        ))}
      </div>

      <Button size="sm" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
        {saved ? <><Check className="w-3.5 h-3.5" /> Salvo!</> : 'Salvar preferências'}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [active, setActive] = useState('agencia')

  const SECTIONS: Record<string, React.ReactNode> = {
    agencia:      <AgenciaSection />,
    servicos:     <ServicosSection />,
    integracoes:  <IntegracoesSection />,
    usuarios:     <UsuariosSection />,
    analisador:   <AnalisadorSection />,
    notificacoes: <NotificacoesSection />,
  }

  return (
    <div className="min-h-screen">
      <Header title="Configurações" description="Gerencie sua agência, integrações e preferências" />

      <div className="p-6 flex gap-6 max-w-5xl mx-auto">

        {/* Nav lateral */}
        <aside className="w-48 shrink-0">
          <nav className="space-y-1 sticky top-6">
            {NAV.map(item => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                    isActive
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-emerald-400' : '')} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Conteúdo */}
        <main className="flex-1 min-w-0">
          {SECTIONS[active]}
        </main>
      </div>
    </div>
  )
}
