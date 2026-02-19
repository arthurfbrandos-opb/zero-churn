'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Briefcase, Plug, Users, Bot, Bell,
  Plus, Trash2, Check, X, Eye, EyeOff, Loader2, Save,
  ChevronRight, Shield, AlertTriangle, RefreshCw,
  MessageCircle, CreditCard, BarChart2, Zap,
  GripVertical, FileText, Lock, AlignLeft, ListChecks, Hash,
  ExternalLink, Package, Wrench, Mail,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockServices } from '@/lib/mock-data'
import { Service, ServiceItem, FormQuestion, FormQuestionType } from '@/types'
import { setObservationDays as persistObsDays, getNpsAllowObservation, setNpsAllowObservation } from '@/lib/nps-utils'
import { cn } from '@/lib/utils'

// ── Nav sections ──────────────────────────────────────────────────
const NAV = [
  { id: 'agencia',       label: 'Agência',           icon: Building2 },
  { id: 'servicos',      label: 'Serviços',           icon: Wrench    },
  { id: 'produtos',      label: 'Produtos',           icon: Package   },
  { id: 'formulario',    label: 'Formulário NPS',     icon: FileText  },
  { id: 'integracoes',   label: 'Integrações',        icon: Plug      },
  { id: 'usuarios',      label: 'Usuários',           icon: Users     },
  { id: 'analisador',    label: 'Analisador',         icon: Bot       },
  { id: 'email-templates', label: 'Templates de E-mail', icon: Mail  },
  { id: 'notificacoes',  label: 'Notificações',       icon: Bell      },
  { id: 'privacidade',   label: 'Privacidade',        icon: Shield    },
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
// SEÇÃO: SERVIÇOS (Métodos / Produtos)
// ─────────────────────────────────────────────────────────────────

type ItemKind = 'entregavel' | 'bonus'

interface EditingService extends Service {
  newItemName: string
  newItemKind: ItemKind
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: SERVIÇOS (itens atômicos — ex: SEO, Social Media, Relatório)
// ─────────────────────────────────────────────────────────────────
interface ServicoItem { id: string; name: string; description?: string; isActive: boolean }

function ServicosSection() {
  const [items, setItems] = useState<ServicoItem[]>(() => loadServicos())

  // Persiste no localStorage sempre que a lista mudar
  useEffect(() => {
    try { localStorage.setItem(LS_SERVICES_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')
  const [editDesc, setEditDesc]   = useState('')

  function addItem() {
    if (!newName.trim()) return
    setItems(prev => [...prev, { id: `s-${Date.now()}`, name: newName.trim(), description: newDesc.trim(), isActive: true }])
    setNewName(''); setNewDesc('')
  }

  function startEdit(item: ServicoItem) {
    setEditingId(item.id); setEditName(item.name); setEditDesc(item.description ?? '')
  }

  function saveEdit() {
    if (!editName.trim()) return
    setItems(prev => prev.map(i => i.id === editingId ? { ...i, name: editName.trim(), description: editDesc.trim() } : i))
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Serviços</SectionTitle>
          <p className="text-zinc-500 text-sm -mt-3 mb-4">
            Cadastre os serviços/entregáveis que sua agência oferece. Eles serão usados para montar os Produtos.
          </p>
        </div>
      </div>

      {/* Lista de serviços */}
      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className={cn('bg-zinc-900 border-zinc-800', !item.isActive && 'opacity-50')}>
            <CardContent className="p-3">
              {editingId === item.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Nome do serviço" className={cn(inputCls, 'flex-1 text-sm')} />
                    <Button size="sm" onClick={saveEdit} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-zinc-400 shrink-0">
                      Cancelar
                    </Button>
                  </div>
                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                    placeholder="Descrição (opcional)" className={cn(inputCls, 'text-sm')} />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm font-medium">{item.name}</p>
                    {item.description && <p className="text-zinc-500 text-xs">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(item)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Editar</button>
                    <button onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i))}
                      className={cn('w-9 h-5 rounded-full transition-all relative', item.isActive ? 'bg-emerald-500' : 'bg-zinc-700')}>
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', item.isActive ? 'left-4' : 'left-0.5')} />
                    </button>
                    <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Adicionar novo serviço */}
      <Card className="bg-zinc-900 border-zinc-800 border-dashed">
        <CardContent className="p-4 space-y-2">
          <p className="text-zinc-400 text-xs font-medium">Novo serviço</p>
          <div className="flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Ex: Produção de Conteúdo" className={cn(inputCls, 'flex-1 text-sm')} />
            <Button size="sm" onClick={addItem} disabled={!newName.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>
          <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={cn(inputCls, 'text-sm')} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CHAVE localStorage para compartilhar serviços entre seções
// ─────────────────────────────────────────────────────────────────
const LS_SERVICES_KEY = 'zc_servicos_v1'

const INITIAL_SERVICES: ServicoItem[] = [
  { id: 's1', name: 'SEO On-page e Off-page',  description: 'Otimização para mecanismos de busca', isActive: true },
  { id: 's2', name: 'Gestão de Redes Sociais', description: 'Instagram, Facebook, LinkedIn', isActive: true },
  { id: 's3', name: 'Relatório Mensal',         description: 'Relatório de desempenho e métricas', isActive: true },
  { id: 's4', name: 'Google Ads',               description: 'Gestão de campanhas pagas', isActive: true },
  { id: 's5', name: 'E-mail Marketing',         description: '', isActive: false },
]

function loadServicos(): ServicoItem[] {
  try {
    const raw = localStorage.getItem(LS_SERVICES_KEY)
    if (raw) return JSON.parse(raw) as ServicoItem[]
  } catch { /* ignore */ }
  return INITIAL_SERVICES
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: PRODUTOS (pacotes que agrupam serviços como entregável/bônus)
// ─────────────────────────────────────────────────────────────────

// Produto sem campo type — MRR/TCV fica no contrato do cliente
interface Produto {
  id:          string
  name:        string
  entregaveis: ServiceItem[]   // serviços marcados como entregável
  bonus:       ServiceItem[]   // serviços marcados como bônus
  isActive:    boolean
}

const INITIAL_PRODUTOS: Produto[] = [
  {
    id: 'p1', name: 'Tríade Gestão Comercial', isActive: true,
    entregaveis: [{ id: 's1', name: 'SEO On-page e Off-page' }, { id: 's2', name: 'Gestão de Redes Sociais' }],
    bonus:       [{ id: 's3', name: 'Relatório Mensal' }],
  },
]

function ProdutosSection() {
  const [produtos,     setProdutos]     = useState<Produto[]>(INITIAL_PRODUTOS)
  const [allServicos,  setAllServicos]  = useState<ServicoItem[]>(INITIAL_SERVICES)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [creatingNew,  setCreatingNew]  = useState(false)
  const [draftName,    setDraftName]    = useState('')
  const [draftEntregs, setDraftEntregs] = useState<ServiceItem[]>([])
  const [draftBonus,   setDraftBonus]   = useState<ServiceItem[]>([])

  // Carrega serviços do localStorage ao montar
  useEffect(() => {
    setAllServicos(loadServicos())
  }, [])

  const activeServicos = allServicos.filter(s => s.isActive)

  // Verifica se um serviço já está em entregáveis ou bônus
  function isUsed(sid: string, entregs: ServiceItem[], bon: ServiceItem[]) {
    return entregs.some(e => e.id === sid) || bon.some(b => b.id === sid)
  }

  function toggleItem(
    svc: ServicoItem,
    kind: 'entregavel' | 'bonus',
    entregs: ServiceItem[], setEntregs: (v: ServiceItem[]) => void,
    bon:     ServiceItem[], setBonus:   (v: ServiceItem[]) => void,
  ) {
    const item: ServiceItem = { id: svc.id, name: svc.name }
    if (kind === 'entregavel') {
      // remove de bônus se estiver lá
      setBonus(bon.filter(b => b.id !== svc.id))
      setEntregs(entregs.some(e => e.id === svc.id)
        ? entregs.filter(e => e.id !== svc.id)
        : [...entregs, item])
    } else {
      setEntregs(entregs.filter(e => e.id !== svc.id))
      setBonus(bon.some(b => b.id === svc.id)
        ? bon.filter(b => b.id !== svc.id)
        : [...bon, item])
    }
  }

  function saveNew() {
    if (!draftName.trim()) return
    setProdutos(prev => [...prev, {
      id: `p-${Date.now()}`, name: draftName.trim(),
      entregaveis: draftEntregs, bonus: draftBonus, isActive: true,
    }])
    setCreatingNew(false); setDraftName(''); setDraftEntregs([]); setDraftBonus([])
  }

  // Estado para edição inline
  const [editName,    setEditName]    = useState('')
  const [editEntregs, setEditEntregs] = useState<ServiceItem[]>([])
  const [editBonus,   setEditBonus]   = useState<ServiceItem[]>([])

  function startEdit(p: Produto) {
    setEditingId(p.id); setEditName(p.name)
    setEditEntregs([...p.entregaveis]); setEditBonus([...p.bonus])
    setExpandedId(null); setCreatingNew(false)
  }

  function saveEdit() {
    setProdutos(prev => prev.map(p => p.id === editingId
      ? { ...p, name: editName.trim(), entregaveis: editEntregs, bonus: editBonus }
      : p))
    setEditingId(null)
  }

  // Seletor de serviços para entregáveis/bônus
  function ServicePicker({ entregs, setEntregs, bon, setBonus }: {
    entregs: ServiceItem[]; setEntregs: (v: ServiceItem[]) => void
    bon:     ServiceItem[]; setBonus:   (v: ServiceItem[]) => void
  }) {
    if (activeServicos.length === 0) {
      return (
        <div className="text-center py-6 text-zinc-600 text-sm border border-dashed border-zinc-700 rounded-xl">
          Nenhum serviço ativo cadastrado. Vá em <strong className="text-zinc-500">Serviços</strong> para adicionar.
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Selecione os serviços e classifique cada um</p>
        <div className="space-y-2">
          {activeServicos.map(svc => {
            const isEntregavel = entregs.some(e => e.id === svc.id)
            const isBonus      = bon.some(b => b.id === svc.id)
            return (
              <div key={svc.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                isEntregavel ? 'border-emerald-500/40 bg-emerald-500/5'
                  : isBonus  ? 'border-yellow-500/40 bg-yellow-500/5'
                  : 'border-zinc-700 bg-zinc-800/40'
              )}>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', isEntregavel ? 'text-emerald-300' : isBonus ? 'text-yellow-300' : 'text-zinc-400')}>
                    {svc.name}
                  </p>
                  {svc.description && <p className="text-zinc-600 text-xs">{svc.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleItem(svc, 'entregavel', entregs, setEntregs, bon, setBonus)}
                    className={cn('px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all',
                      isEntregavel
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-400')}>
                    ✓ Entregável
                  </button>
                  <button
                    onClick={() => toggleItem(svc, 'bonus', entregs, setEntregs, bon, setBonus)}
                    className={cn('px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all',
                      isBonus
                        ? 'border-yellow-500 bg-yellow-500/15 text-yellow-400'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-500 hover:border-yellow-500/50 hover:text-yellow-400')}>
                    ★ Bônus
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 text-xs text-zinc-600 pt-1">
          <span><span className="text-emerald-400 font-semibold">{entregs.length}</span> entregável{entregs.length !== 1 ? 'is' : ''}</span>
          <span><span className="text-yellow-400 font-semibold">{bon.length}</span> bônus</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Produtos</SectionTitle>
          <p className="text-zinc-500 text-sm -mt-3 mb-4">
            Monte pacotes combinando os serviços cadastrados. O tipo de contrato (Recorrente/Projeto) é definido na negociação com o cliente.
          </p>
        </div>
        <Button size="sm" onClick={() => { setCreatingNew(true); setEditingId(null); setExpandedId(null) }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 -mt-4 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Novo produto
        </Button>
      </div>

      {/* Form de novo produto */}
      {creatingNew && (
        <Card className="bg-zinc-900 border-emerald-500/30 border-dashed">
          <CardContent className="p-4 space-y-4">
            <Field label="Nome do produto">
              <Input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)}
                placeholder="Ex: Tríade Gestão Comercial" className={inputCls} />
            </Field>
            <ServicePicker
              entregs={draftEntregs} setEntregs={setDraftEntregs}
              bon={draftBonus}       setBonus={setDraftBonus}
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={saveNew} disabled={!draftName.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                <Check className="w-3.5 h-3.5" /> Salvar produto
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreatingNew(false); setDraftName(''); setDraftEntregs([]); setDraftBonus([]) }}
                className="text-zinc-400">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de produtos */}
      <div className="space-y-3">
        {produtos.map(p => {
          const isExpanded = expandedId === p.id
          const isEditing  = editingId  === p.id
          return (
            <Card key={p.id} className={cn('bg-zinc-900 border-zinc-800', !p.isActive && 'opacity-50')}>
              <CardContent className="p-4">
                {/* Cabeçalho */}
                <div className="flex items-start gap-3">
                  <button onClick={() => !isEditing && setExpandedId(isExpanded ? null : p.id)}
                    className="flex-1 text-left min-w-0">
                    <p className="text-zinc-200 text-sm font-semibold">{isEditing ? editName : p.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {(isEditing ? editEntregs : p.entregaveis).length} entregável{(isEditing ? editEntregs : p.entregaveis).length !== 1 ? 'is' : ''}
                      {(isEditing ? editBonus : p.bonus).length > 0 && ` · ${(isEditing ? editBonus : p.bonus).length} bônus`}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => isEditing ? setEditingId(null) : startEdit(p)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1">
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                    <button onClick={() => setProdutos(prev => prev.map(pp => pp.id === p.id ? { ...pp, isActive: !pp.isActive } : pp))}
                      className={cn('w-9 h-5 rounded-full transition-all relative', p.isActive ? 'bg-emerald-500' : 'bg-zinc-700')}>
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', p.isActive ? 'left-4' : 'left-0.5')} />
                    </button>
                    <button onClick={() => setProdutos(prev => prev.filter(pp => pp.id !== p.id))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Modo edição */}
                {isEditing && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-zinc-800">
                    <Field label="Nome do produto">
                      <Input value={editName} onChange={e => setEditName(e.target.value)}
                        className={inputCls} />
                    </Field>
                    <ServicePicker
                      entregs={editEntregs} setEntregs={setEditEntregs}
                      bon={editBonus}       setBonus={setEditBonus}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                        <Check className="w-3.5 h-3.5" /> Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-zinc-400">Cancelar</Button>
                    </div>
                  </div>
                )}

                {/* Modo visualização expandida */}
                {isExpanded && !isEditing && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Entregáveis</p>
                      {p.entregaveis.length === 0
                        ? <p className="text-zinc-600 text-xs italic">Nenhum</p>
                        : p.entregaveis.map(e => (
                          <div key={e.id} className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" /> {e.name}
                          </div>
                        ))}
                    </div>
                    <div>
                      <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wider mb-2">Bônus</p>
                      {p.bonus.length === 0
                        ? <p className="text-zinc-600 text-xs italic">Nenhum</p>
                        : p.bonus.map(b => (
                          <div key={b.id} className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                            <span className="text-yellow-400 shrink-0">⭐</span> {b.name}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: TEMPLATES DE E-MAIL
// ─────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id:       string
  label:    string
  desc:     string
  subject:  string
  body:     string
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'email_confirmation',
    label: 'Confirmação de cadastro',
    desc: 'Enviado ao novo usuário logo após criar a conta.',
    subject: '✅ Confirme seu e-mail — {{agencia}}',
    body: `Olá, {{nome}}!

Sua conta para a agência "{{agencia}}" foi criada com sucesso.
Confirme seu e-mail acessando o link abaixo:

{{link_confirmacao}}

O link expira em 24 horas.`,
  },
  {
    id: 'nps_form_to_client',
    label: 'Formulário NPS para o cliente',
    desc: 'Enviado diretamente ao cliente da agência com o link do NPS.',
    subject: '⭐ {{agencia}} quer saber sua opinião — 2 minutinhos',
    body: `Olá, {{cliente}}!

A {{agencia}} gostaria de saber sua opinião sobre os serviços prestados.

Responda a pesquisa (leva menos de 2 minutos):
{{link_formulario}}

Link válido até {{data_expiracao}}.`,
  },
  {
    id: 'form_reminder',
    label: 'Lembrete de NPS (para a agência)',
    desc: 'Enviado 5 dias antes da data de análise mensal.',
    subject: '⏰ Envie o formulário para {{cliente}} — análise em {{dias}} dias',
    body: `Olá!

A análise mensal de {{cliente}} está programada para {{data_analise}} — faltam {{dias}} dias.

Para que o pilar de NPS seja calculado corretamente, envie o formulário de satisfação antes da análise.

{{link_formulario}}`,
  },
  {
    id: 'payment_alert',
    label: 'Alerta de inadimplência',
    desc: 'Enviado quando um cliente entra em status vencendo ou inadimplente.',
    subject: '🚨 Alerta financeiro: {{cliente}} — {{agencia}}',
    body: `Atenção!

O cliente {{cliente}} possui cobranças em atraso.

Acesse o painel para verificar: {{link_cliente}}`,
  },
  {
    id: 'integration_alert',
    label: 'Alerta de integração offline',
    desc: 'Enviado quando Asaas, Dom ou WhatsApp fica com erro.',
    subject: '🔌 Integração offline: {{integracao}} ({{cliente}}) — {{agencia}}',
    body: `A integração {{integracao}} do cliente {{cliente}} está com problema:

{{motivo}}

Sem dados desta integração, o Health Score pode ficar incompleto.

Verifique em: {{link_cliente}}`,
  },
  {
    id: 'analysis_completed',
    label: 'Análise concluída',
    desc: 'Enviado após a análise semanal de todos os clientes.',
    subject: '✅ Análise semanal: {{sucesso}}/{{total}} clientes analisados',
    body: `A análise semanal da {{agencia}} foi executada.

Total: {{total}} clientes
Analisados: {{sucesso}}
Falhas: {{falhas}}

Acesse o painel: {{link_dashboard}}`,
  },
]

// Variáveis por template
const TEMPLATE_VARS: Record<string, { v: string; d: string }[]> = {
  email_confirmation: [
    { v: '{{agencia}}',         d: 'Nome da agência' },
    { v: '{{nome}}',            d: 'Nome do responsável' },
    { v: '{{link_confirmacao}}',d: 'Link de confirmação' },
  ],
  nps_form_to_client: [
    { v: '{{agencia}}',         d: 'Nome da agência' },
    { v: '{{cliente}}',         d: 'Nome do cliente' },
    { v: '{{link_formulario}}', d: 'Link do formulário NPS' },
    { v: '{{data_expiracao}}',  d: 'Data de expiração do link' },
  ],
  form_reminder: [
    { v: '{{cliente}}',         d: 'Nome do cliente' },
    { v: '{{data_analise}}',    d: 'Data da próxima análise' },
    { v: '{{dias}}',            d: 'Dias até a análise' },
    { v: '{{link_formulario}}', d: 'Link do formulário NPS' },
  ],
  payment_alert: [
    { v: '{{agencia}}',         d: 'Nome da agência' },
    { v: '{{cliente}}',         d: 'Nome do cliente' },
    { v: '{{link_cliente}}',    d: 'Link do cliente no painel' },
  ],
  integration_alert: [
    { v: '{{agencia}}',         d: 'Nome da agência' },
    { v: '{{cliente}}',         d: 'Nome do cliente' },
    { v: '{{integracao}}',      d: 'Nome da integração' },
    { v: '{{motivo}}',          d: 'Motivo do erro' },
    { v: '{{link_cliente}}',    d: 'Link do cliente no painel' },
  ],
  analysis_completed: [
    { v: '{{agencia}}',         d: 'Nome da agência' },
    { v: '{{total}}',           d: 'Total de clientes' },
    { v: '{{sucesso}}',         d: 'Análises com sucesso' },
    { v: '{{falhas}}',          d: 'Análises com falha' },
    { v: '{{link_dashboard}}',  d: 'Link do dashboard' },
  ],
}

function EmailTemplatesSection() {
  const [templates,   setTemplates]   = useState<EmailTemplate[]>(DEFAULT_TEMPLATES)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [saved,       setSaved]       = useState(false)
  const [copiedVar,   setCopiedVar]   = useState<string | null>(null)
  // Refs para inserir variável na posição do cursor
  const subjectRef = useRef<HTMLInputElement | null>(null)
  const bodyRef    = useRef<HTMLTextAreaElement | null>(null)

  function update(id: string, field: 'subject' | 'body', value: string) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  function handleSave() {
    setSaved(true); setEditingId(null)
    setTimeout(() => setSaved(false), 2500)
  }

  function reset(id: string) {
    const def = DEFAULT_TEMPLATES.find(t => t.id === id)
    if (def) setTemplates(prev => prev.map(t => t.id === id ? { ...def } : t))
  }

  // Insere variável na posição do cursor do campo ativo (subject ou body)
  function insertVar(variable: string, templateId: string) {
    const tpl = templates.find(t => t.id === templateId)
    if (!tpl) return

    const subEl = subjectRef.current
    const bodEl = bodyRef.current

    // Tenta inserir no campo que está com foco
    if (document.activeElement === subEl && subEl) {
      const start = subEl.selectionStart ?? tpl.subject.length
      const end   = subEl.selectionEnd   ?? tpl.subject.length
      const next  = tpl.subject.slice(0, start) + variable + tpl.subject.slice(end)
      update(templateId, 'subject', next)
      setTimeout(() => { subEl.setSelectionRange(start + variable.length, start + variable.length); subEl.focus() }, 0)
    } else if (bodEl) {
      const start = bodEl.selectionStart ?? tpl.body.length
      const end   = bodEl.selectionEnd   ?? tpl.body.length
      const next  = tpl.body.slice(0, start) + variable + tpl.body.slice(end)
      update(templateId, 'body', next)
      setTimeout(() => { bodEl.setSelectionRange(start + variable.length, start + variable.length); bodEl.focus() }, 0)
    } else {
      // fallback: copia para área de transferência
      navigator.clipboard.writeText(variable).catch(() => {})
    }
    setCopiedVar(variable)
    setTimeout(() => setCopiedVar(null), 1500)
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>Templates de E-mail</SectionTitle>
        <p className="text-zinc-500 text-sm -mt-3 mb-4">
          Personalize o conteúdo dos e-mails enviados pelo sistema. Clique em uma variável para inseri-la no campo que está editando.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
          <Check className="w-4 h-4" /> Templates salvos com sucesso!
        </div>
      )}

      <div className="space-y-3">
        {templates.map(t => {
          const vars = TEMPLATE_VARS[t.id] ?? []
          return (
            <Card key={t.id} className={cn('bg-zinc-900', editingId === t.id ? 'border-emerald-500/30' : 'border-zinc-800')}>
              <CardContent className="p-4 space-y-3">
                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-zinc-200 text-sm font-medium">{t.label}</p>
                    <p className="text-zinc-500 text-xs">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === t.id ? (
                      <>
                        <Button size="sm" onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                          <Check className="w-3.5 h-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-zinc-400">Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingId(t.id)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Editar</button>
                        <button onClick={() => reset(t.id)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Restaurar padrão</button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === t.id ? (
                  <div className="space-y-4">
                    {/* Variáveis clicáveis */}
                    <div className="space-y-1.5">
                      <p className="text-zinc-500 text-xs font-medium">Variáveis disponíveis — clique para inserir no campo ativo:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vars.map(({ v, d }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertVar(v, t.id)}
                            title={d}
                            className={cn(
                              'px-2 py-1 rounded-md border text-xs font-mono transition-all',
                              copiedVar === v
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-300 hover:bg-emerald-500/5'
                            )}>
                            {copiedVar === v ? '✓ ' : ''}{v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label="Assunto">
                      <Input
                        ref={subjectRef}
                        value={t.subject}
                        onChange={e => update(t.id, 'subject', e.target.value)}
                        className={cn(inputCls, 'text-sm font-mono')}
                      />
                    </Field>
                    <Field label="Corpo do e-mail" hint="Texto simples. Variáveis entre {{chaves}} são substituídas automaticamente no envio.">
                      <textarea
                        ref={bodyRef}
                        value={t.body}
                        onChange={e => update(t.id, 'body', e.target.value)}
                        rows={9}
                        className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm font-mono resize-y leading-relaxed')}
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 text-xs shrink-0">Assunto:</span>
                      <span className="text-zinc-400 text-xs truncate font-mono">{t.subject}</span>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3">
                      <pre className="text-zinc-500 text-xs whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">{t.body}</pre>
                    </div>
                    {/* Badge das variáveis no modo visualização */}
                    {vars.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {vars.map(({ v }) => (
                          <span key={v} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-600 border border-zinc-700">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SEÇÃO: FORMULÁRIO NPS
// ─────────────────────────────────────────────────────────────────

const MANDATORY_QUESTIONS: FormQuestion[] = [
  {
    id: 'q-nps', type: 'scale', locked: true, required: true,
    text: 'Em uma escala de 0 a 10, o quanto você indicaria [Agência] para um amigo ou colega de negócios?',
    placeholder: 'Esta é a pergunta de NPS padrão — não pode ser removida.',
  },
  {
    id: 'q-result', type: 'scale', locked: true, required: true,
    text: 'Em uma escala de 0 a 10, qual o impacto que os serviços da [Agência] estão tendo nos resultados da sua empresa?',
    placeholder: 'Esta é a pergunta de resultado padrão — não pode ser removida.',
  },
]

const QUESTION_TYPE_CONFIG: Record<FormQuestionType, { label: string; icon: React.ElementType; hint: string }> = {
  scale:           { label: 'Escala 0-10',      icon: Hash,       hint: 'O cliente responde com um número de 0 a 10' },
  text:            { label: 'Texto livre',        icon: AlignLeft,  hint: 'Campo aberto para o cliente escrever' },
  multiple_choice: { label: 'Múltipla escolha',  icon: ListChecks, hint: 'O cliente escolhe uma ou mais opções' },
}

function FormularioSection() {
  const [customQuestions, setCustomQuestions] = useState<FormQuestion[]>([
    { id: 'q-c1', type: 'text', locked: false, required: false, text: 'O que podemos fazer para melhorar nossos serviços?', placeholder: '' },
  ])
  const [addingType, setAddingType] = useState<FormQuestionType | null>(null)
  const [newText, setNewText] = useState('')
  const [newOptions, setNewOptions] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [introText, setIntroText] = useState('Olá, [Nome do Decisor]! Gostaríamos de entender sua experiência com a [Agência]. Sua opinião é fundamental para continuarmos evoluindo. Leva menos de 2 minutos. 🙏')
  const [thankText, setThankText] = useState('Muito obrigado pelo seu feedback! Ele é muito importante para toda a nossa equipe. Em breve entraremos em contato.')
  const [allowObservation, setAllowObservation] = useState(false)
  const [saved, setSaved] = useState(false)

  function addQuestion() {
    if (!newText.trim() || !addingType) return
    const novo: FormQuestion = {
      id: `q-c${Date.now()}`, type: addingType, locked: false, required: false,
      text: newText.trim(),
      options: addingType === 'multiple_choice' ? newOptions.split('\n').filter(Boolean) : undefined,
    }
    setCustomQuestions(prev => [...prev, novo])
    setNewText(''); setNewOptions(''); setAddingType(null)
  }

  function removeQuestion(id: string) {
    setCustomQuestions(prev => prev.filter(q => q.id !== id))
  }

  function saveEdit(id: string) {
    setCustomQuestions(prev => prev.map(q => q.id === id ? { ...q, text: editText } : q))
    setEditingId(null)
  }

  function handleSave() {
    try { setNpsAllowObservation(allowObservation) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Formulário NPS</SectionTitle>
      <p className="text-zinc-500 text-sm -mt-2">
        Configure as perguntas do formulário enviado aos clientes. As duas perguntas obrigatórias não podem ser removidas.
      </p>

      {/* Perguntas obrigatórias */}
      <div className="space-y-3">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Perguntas obrigatórias
        </p>
        {MANDATORY_QUESTIONS.map((q, i) => (
          <Card key={q.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-violet-400 border-violet-500/30 bg-violet-500/10 text-xs">
                      Escala 0-10
                    </Badge>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Obrigatória
                    </Badge>
                  </div>
                  <p className="text-zinc-200 text-sm leading-relaxed">{q.text}</p>
                  <p className="text-zinc-600 text-xs mt-1 italic">{q.placeholder}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Perguntas customizadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            Perguntas adicionais ({customQuestions.length})
          </p>
        </div>

        {customQuestions.length === 0 && !addingType && (
          <p className="text-zinc-600 text-xs italic">Nenhuma pergunta adicional. Adicione abaixo.</p>
        )}

        {customQuestions.map((q, i) => (
          <Card key={q.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold shrink-0 mt-0.5">
                  {MANDATORY_QUESTIONS.length + i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs mb-1.5">
                    {QUESTION_TYPE_CONFIG[q.type].label}
                  </Badge>
                  {editingId === q.id ? (
                    <div className="space-y-2">
                      <Input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                        className={cn(inputCls, 'text-sm')}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(q.id); if (e.key === 'Escape') setEditingId(null) }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(q.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs">
                          <Check className="w-3 h-3" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-zinc-400 text-xs">Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-200 text-sm leading-relaxed">{q.text}</p>
                  )}
                  {q.options && q.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {q.options.map((opt, j) => (
                        <span key={j} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {editingId !== q.id && (
                    <button onClick={() => { setEditingId(q.id); setEditText(q.text) }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors">
                      Editar
                    </button>
                  )}
                  <button onClick={() => removeQuestion(q.id)}
                    className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Formulário de nova pergunta */}
        {addingType ? (
          <Card className="bg-zinc-900 border-emerald-500/30 border-dashed">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                {(() => { const Icon = QUESTION_TYPE_CONFIG[addingType].icon; return <Icon className="w-4 h-4 text-zinc-400" /> })()}
                <p className="text-zinc-300 text-sm font-medium">{QUESTION_TYPE_CONFIG[addingType].label}</p>
                <p className="text-zinc-600 text-xs">— {QUESTION_TYPE_CONFIG[addingType].hint}</p>
              </div>
              <Input autoFocus value={newText} onChange={e => setNewText(e.target.value)}
                placeholder="Digite a pergunta..." className={cn(inputCls, 'text-sm')}
                onKeyDown={e => { if (e.key === 'Escape') setAddingType(null) }}
              />
              {addingType === 'multiple_choice' && (
                <div>
                  <Label className="text-zinc-400 text-xs mb-1 block">Opções (uma por linha)</Label>
                  <textarea value={newOptions} onChange={e => setNewOptions(e.target.value)}
                    placeholder={"Sim, estou satisfeito\nNão, preciso de melhorias\nParcialmente"}
                    className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-20 resize-none')}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={addQuestion} disabled={!newText.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingType(null); setNewText(''); setNewOptions('') }}
                  className="text-zinc-400 text-xs">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-zinc-500 text-xs mr-1">+ Adicionar:</p>
            {(Object.keys(QUESTION_TYPE_CONFIG) as FormQuestionType[]).map(type => {
              const { label, icon: Icon } = QUESTION_TYPE_CONFIG[type]
              return (
                <button key={type} onClick={() => setAddingType(type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 text-xs transition-all">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Textos do formulário */}
      <div className="space-y-4 border-t border-zinc-800 pt-5">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Mensagens do formulário</p>
        <p className="text-zinc-600 text-xs">Use [Agência] e [Nome do Decisor] como variáveis — serão substituídas automaticamente.</p>

        <Field label="Mensagem de abertura">
          <textarea value={introText} onChange={e => setIntroText(e.target.value)}
            className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-20 resize-none')}
          />
        </Field>

        <Field label="Mensagem de agradecimento">
          <textarea value={thankText} onChange={e => setThankText(e.target.value)}
            className={cn(inputCls, 'w-full rounded-md border px-3 py-2 text-sm min-h-16 resize-none')}
          />
        </Field>
      </div>

      {/* Toggle — clientes em observação */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-zinc-200 text-sm font-medium">Enviar NPS para clientes em observação</p>
              <p className="text-zinc-500 text-xs mt-1">
                Por padrão, clientes cadastrados recentemente ficam em <span className="text-zinc-300">período de observação</span> e não recebem o formulário NPS.
                Ative esta opção para enviar mesmo assim.
              </p>
              <div className={cn('mt-3 flex items-center gap-2 text-xs font-medium',
                allowObservation ? 'text-yellow-400' : 'text-zinc-500')}>
                <div className={cn('w-1.5 h-1.5 rounded-full',
                  allowObservation ? 'bg-yellow-400' : 'bg-zinc-600')} />
                {allowObservation
                  ? 'Ativo — NPS será enviado a todos os clientes, incluindo os em observação'
                  : 'Inativo — clientes em observação são excluídos automaticamente do envio de NPS'}
              </div>
            </div>
            {/* Toggle visual */}
            <button
              onClick={() => setAllowObservation(v => !v)}
              className={cn('relative w-11 h-6 rounded-full transition-all shrink-0 mt-0.5',
                allowObservation ? 'bg-yellow-500' : 'bg-zinc-700')}
            >
              <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                allowObservation ? 'left-6' : 'left-1')} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Button size="sm" onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
        {saved ? <><Check className="w-3.5 h-3.5" /> Salvo!</> : 'Salvar configurações'}
      </Button>
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
  status?: 'connected' | 'disconnected' | 'error' | 'coming'
  children: React.ReactNode
}

function IntegCard({ icon: Icon, name, description, color, connected, status, children }: IntegCardProps) {
  const badgeMap = {
    connected:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    disconnected: 'bg-zinc-800 text-zinc-500 border-zinc-700',
    error:        'bg-red-500/10 text-red-400 border-red-500/30',
    coming:       'bg-zinc-800 text-zinc-600 border-zinc-800',
  }
  const badgeLabelMap = {
    connected: '● Conectado', disconnected: '○ Desconectado',
    error: '⚠ Erro', coming: '🔒 Em breve',
  }
  const resolvedStatus = status ?? (connected === true ? 'connected' : connected === false ? 'disconnected' : undefined)

  return (
    <Card className={cn('bg-zinc-900', resolvedStatus === 'error' ? 'border-red-500/20' : 'border-zinc-800')}>
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
          {resolvedStatus && (
            <Badge className={cn('text-xs shrink-0 border', badgeMap[resolvedStatus])}>
              {badgeLabelMap[resolvedStatus]}
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

// ─────────────────────────────────────────────────────────────────
// CARD: WhatsApp via QR Code
// ─────────────────────────────────────────────────────────────────

function EvolutionIntegCard() {
  type ViewState = 'loading' | 'connected' | 'disconnected' | 'qrcode' | 'error'
  type Group = { id: string; name: string; participants: number }

  const [view,          setView]          = useState<ViewState>('loading')
  const [phone,         setPhone]         = useState<string | null>(null)
  const [qrCode,        setQrCode]        = useState<string | null>(null)
  const [qrAge,         setQrAge]         = useState(0)
  const [errMsg,        setErrMsg]        = useState('')
  const [connecting,    setConnecting]    = useState(false)
  const [polling,       setPolling]       = useState(false)
  const [groups,        setGroups]        = useState<Group[] | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupSearch,   setGroupSearch]   = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleLoadGroups() {
    setLoadingGroups(true)
    try {
      const r = await fetch('/api/whatsapp/groups')
      const d = await r.json()
      setGroups(d.groups ?? [])
    } catch {
      setGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }

  // Verifica status inicial
  useEffect(() => {
    fetch('/api/whatsapp/instance/status')
      .then(r => r.json())
      .then(d => {
        if (d.connected) { setPhone(d.phone); setView('connected') }
        else setView('disconnected')
      })
      .catch(() => setView('disconnected'))
  }, [])

  // Inicia polling quando QR está exibido
  useEffect(() => {
    if (view !== 'qrcode') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    setPolling(true)
    const qrStart = Date.now()

    const tick = () => setQrAge(Math.floor((Date.now() - qrStart) / 1000))
    const ageTimer = setInterval(tick, 1000)

    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/whatsapp/instance/status')
        const d = await r.json()
        if (d.connected) {
          clearInterval(pollRef.current!)
          clearInterval(ageTimer)
          setPolling(false)
          setPhone(d.phone)
          setView('connected')
        }
      } catch { /* continua polling */ }
    }, 3000)

    return () => {
      clearInterval(pollRef.current!)
      clearInterval(ageTimer)
      setPolling(false)
    }
  }, [view])

  async function handleConnect() {
    setConnecting(true)
    setErrMsg('')
    try {
      const res = await fetch('/api/whatsapp/instance/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? 'Erro ao conectar'); setView('error'); return }
      if (data.connected) { setPhone(data.phone); setView('connected'); return }
      setQrCode(data.qrCode)
      setQrAge(0)
      setView('qrcode')
    } catch { setErrMsg('Erro de rede'); setView('error') }
    finally { setConnecting(false) }
  }

  async function handleRefreshQR() {
    setQrCode(null)
    await handleConnect()
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar o número? Ele deixará de monitorar os grupos.')) return
    await fetch('/api/whatsapp/instance/disconnect', { method: 'DELETE' })
    setPhone(null)
    setView('disconnected')
  }

  const cardStatus = view === 'connected' ? 'connected' : view === 'error' ? 'error' : 'disconnected'

  return (
    <IntegCard
      icon={MessageCircle}
      name="WhatsApp"
      color="bg-emerald-500/15 text-emerald-400"
      description="Análise de sentimento — somente mensagens de grupos vinculados"
      status={cardStatus}>

      {/* Loading */}
      {view === 'loading' && (
        <div className="flex items-center gap-2 pt-1 text-zinc-500 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando conexão...
        </div>
      )}

      {/* Conectado */}
      {view === 'connected' && (
        <div className="space-y-3 pt-1">
          <p className="text-emerald-400 text-xs flex items-center gap-1.5 font-medium">
            <Check className="w-3.5 h-3.5" />
            Número conectado{phone ? `: +${phone}` : ''}
          </p>
          {/* Aviso: somente grupos */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs space-y-1">
            <p className="text-amber-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Somente mensagens de grupos são coletadas
            </p>
            <p className="text-amber-400/70 leading-relaxed">
              Mensagens privadas (conversas individuais) <strong className="text-amber-400">nunca</strong> são lidas.
              O histórico de análise depende exclusivamente dos grupos vinculados — quanto mais
              ativo o grupo, mais precisa a análise de sentimento.
            </p>
          </div>
          <p className="text-zinc-500 text-xs">
            Vincule cada grupo no cadastro do cliente em{' '}
            <span className="text-zinc-300">Clientes → Integrações</span>.
          </p>

          {/* Botão ver grupos */}
          {groups === null ? (
            <Button size="sm" variant="outline" onClick={handleLoadGroups}
              disabled={loadingGroups}
              className="border-zinc-600 text-zinc-300 hover:text-white text-xs gap-1.5 w-full">
              {loadingGroups
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando grupos...</>
                : <><MessageCircle className="w-3.5 h-3.5" /> Ver grupos ativos</>}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-medium">
                  {groups.length} grupo{groups.length !== 1 ? 's' : ''} encontrado{groups.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => setGroups(null)}
                  className="text-zinc-600 hover:text-zinc-400 text-xs">ocultar</button>
              </div>

              {/* Busca */}
              {groups.length > 5 && (
                <input
                  type="text"
                  placeholder="Buscar grupo..."
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500"
                />
              )}

              {/* Lista */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                {groups
                  .filter(g => !groupSearch || g.name.toLowerCase().includes(groupSearch.toLowerCase()))
                  .map(g => (
                    <div key={g.id}
                      className="flex items-center justify-between bg-zinc-800/60 rounded-md px-2.5 py-1.5 text-xs">
                      <span className="text-zinc-200 truncate flex-1">{g.name}</span>
                      <span className="text-zinc-500 ml-2 shrink-0">{g.participants} membros</span>
                    </div>
                  ))}
                {groups.filter(g => !groupSearch || g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                  <p className="text-zinc-600 text-xs text-center py-2">Nenhum grupo encontrado</p>
                )}
              </div>

              <Button size="sm" variant="outline" onClick={handleLoadGroups}
                disabled={loadingGroups}
                className="border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs gap-1 w-full">
                {loadingGroups
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Atualizando...</>
                  : <><RefreshCw className="w-3 h-3" /> Atualizar lista</>}
              </Button>
            </div>
          )}

          <Button size="sm" variant="outline" onClick={handleDisconnect}
            className="border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500/50 text-xs gap-1 w-full">
            Desconectar número
          </Button>
        </div>
      )}

      {/* Desconectado */}
      {(view === 'disconnected' || view === 'error') && (
        <div className="space-y-3 pt-1">
          <div className="bg-zinc-800/60 rounded-lg p-3 text-xs text-zinc-500 space-y-1.5">
            <p className="text-zinc-300 font-medium">Como conectar:</p>
            <p>1. Clique em <span className="text-zinc-200">"Gerar QR Code"</span> abaixo</p>
            <p>2. Abra WhatsApp no celular do número dedicado</p>
            <p>3. Vá em <span className="text-zinc-200">Dispositivos vinculados → Vincular dispositivo</span></p>
            <p>4. Aponte a câmera para o QR Code</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs space-y-1">
            <p className="text-amber-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Somente grupos são monitorados
            </p>
            <p className="text-amber-400/70 leading-relaxed">
              Apenas mensagens de <strong className="text-amber-400">grupos vinculados</strong> a clientes são coletadas.
              Conversas privadas são ignoradas. Quanto mais ativo o grupo, mais rico o histórico de análise.
            </p>
          </div>
          {errMsg && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errMsg}
            </p>
          )}
          <Button size="sm" onClick={handleConnect} disabled={connecting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 w-full disabled:opacity-50">
            {connecting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando QR Code...</>
              : <><MessageCircle className="w-3.5 h-3.5" /> Gerar QR Code</>}
          </Button>
        </div>
      )}

      {/* QR Code */}
      {view === 'qrcode' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-col items-center gap-3 bg-zinc-800/50 rounded-xl p-4">
            {qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 rounded-lg" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
              </div>
            )}

            {/* Timer de expiração */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Expira em</span>
                <span className={qrAge > 35 ? 'text-red-400' : 'text-zinc-400'}>
                  {Math.max(0, 45 - qrAge)}s
                </span>
              </div>
              <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', qrAge > 35 ? 'bg-red-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.max(0, ((45 - qrAge) / 45) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-xs flex items-center gap-1">
              {polling && <Loader2 className="w-3 h-3 animate-spin" />}
              {polling ? 'Aguardando conexão...' : 'Polling pausado'}
            </p>
            <Button size="sm" variant="outline" onClick={handleRefreshQR}
              className="border-zinc-700 text-zinc-400 hover:text-white text-xs gap-1">
              <RefreshCw className="w-3 h-3" /> Novo QR
            </Button>
          </div>
        </div>
      )}
    </IntegCard>
  )
}

function AsaasIntegCard() {
  const [apiKey, setApiKey]   = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [status, setStatus]   = useState<'idle' | 'active' | 'error'>('idle')
  const [msg, setMsg]         = useState('')

  // Carrega status atual
  useEffect(() => {
    fetch('/api/agency/integrations')
      .then(r => r.json())
      .then(d => {
        const asaas = (d.integrations ?? []).find((i: { type: string; status: string }) => i.type === 'asaas')
        if (asaas) setStatus(asaas.status === 'active' ? 'active' : 'error')
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/agency/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'asaas', credentials: { api_key: apiKey.trim() } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMsg(data.error ?? 'Erro ao salvar')
      } else {
        setStatus('active')
        setMsg('Conectado com sucesso!')
        setApiKey('')
        setTimeout(() => setMsg(''), 3000)
      }
    } catch {
      setStatus('error')
      setMsg('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  return (
    <IntegCard icon={CreditCard} name="Asaas" color="bg-blue-500/15 text-blue-400"
      description="Cobranças, pagamentos e status financeiro dos clientes MRR"
      status={status === 'active' ? 'connected' : status === 'error' ? 'error' : 'disconnected'}>
      <div className="space-y-3 pt-1">
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">API Key do Asaas</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={status === 'active' ? '••••••••••••• (já configurada)' : '$aact_prod_...'}
                className={cn(inputCls, 'text-sm pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim() || saving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0">
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando...</>
                : <><Save className="w-3.5 h-3.5" /> Salvar</>}
            </Button>
          </div>
          <p className="text-zinc-600 text-xs">
            Encontre em: app.asaas.com → Minha Conta → Integrações → API Key
          </p>
        </div>
        {msg && (
          <p className={cn('text-xs flex items-center gap-1.5', status === 'active' ? 'text-emerald-400' : 'text-red-400')}>
            {status === 'active' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {msg}
          </p>
        )}
      </div>
    </IntegCard>
  )
}

function DomIntegCard() {
  const [token, setToken]         = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [status, setStatus]       = useState<'idle' | 'active' | 'error'>('idle')
  const [msg, setMsg]             = useState('')
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean; message?: string; error?: string
    transactions_found?: number; period?: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/agency/integrations')
      .then(r => r.json())
      .then(d => {
        const dom = (d.integrations ?? []).find((i: { type: string; status: string }) => i.type === 'dom_pagamentos')
        if (dom) setStatus(dom.status === 'active' ? 'active' : 'error')
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!token.trim()) return
    setSaving(true); setMsg(''); setTestResult(null)
    try {
      const res = await fetch('/api/agency/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dom_pagamentos',
          credentials: {
            token:       token.trim(),
            public_key:  publicKey.trim() || undefined,
            environment: 'production',
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMsg(data.error ?? 'Erro ao salvar')
      } else {
        setStatus('active')
        setMsg('Salvo! Clique em "Testar conexão" para confirmar.')
        setToken(''); setPublicKey('')
      }
    } catch {
      setStatus('error')
      setMsg('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/dom/test')
      const data = await res.json()
      setTestResult(data)
      // Se funcionou, garante status verde
      if (data.ok) setStatus('active')
      else setStatus('error')
    } catch {
      setTestResult({ ok: false, error: 'Erro de rede ao testar.' })
      setStatus('error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <IntegCard icon={CreditCard} name="Dom Pagamentos" color="bg-violet-500/15 text-violet-400"
      description="Histórico de transações e vendas via gateway Dom Pagamentos"
      status={status === 'active' ? 'connected' : status === 'error' ? 'error' : 'disconnected'}>
      <div className="space-y-3 pt-1">

        {/* Token */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Token de API</Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={status === 'active' ? '••••••••••••• (já configurado)' : 'Token fornecido pelo suporte Dom'}
              className={cn(inputCls, 'text-sm pr-10')}
            />
            <button type="button" onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-zinc-600 text-xs">
            Solicite ao suporte da Dom Pagamentos — tipo <span className="text-zinc-500">Checkout</span>.
          </p>
        </div>

        {/* Chave pública */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">
            Chave Pública <span className="text-zinc-600 font-normal">(opcional)</span>
          </Label>
          <Input
            value={publicKey}
            onChange={e => setPublicKey(e.target.value)}
            placeholder={status === 'active' ? 'pk_••••••••••••• (já configurada)' : 'pk_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
            className={cn(inputCls, 'text-sm font-mono text-xs')}
          />
          <p className="text-zinc-600 text-xs">
            Encontrada no painel Dom Pagamentos. Formato: <code className="text-zinc-500">pk_xxxxxxxx-...</code>
          </p>
        </div>

        {/* Feedback de salvar */}
        {msg && (
          <p className={cn('text-xs px-3 py-2 rounded-lg border',
            status === 'active'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20')}>
            {msg}
          </p>
        )}

        {/* Resultado do teste */}
        {testResult && (
          <div className={cn('p-3 rounded-xl border text-xs space-y-1',
            testResult.ok
              ? 'bg-emerald-500/8 border-emerald-500/25'
              : 'bg-red-500/8 border-red-500/25')}>
            <div className="flex items-center gap-2">
              {testResult.ok
                ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <X     className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              <span className={testResult.ok ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {testResult.ok ? 'Conexão OK — Dom Pagamentos funcionando!' : 'Falha na conexão'}
              </span>
            </div>
            {testResult.ok && testResult.transactions_found !== undefined && (
              <p className="text-zinc-400 pl-5">
                {testResult.transactions_found > 0
                  ? `${testResult.transactions_found} transação(ões) encontrada(s) nos últimos 30 dias`
                  : 'Nenhuma transação nos últimos 30 dias — mas a conexão está ativa'}
                {testResult.period && (
                  <span className="text-zinc-600"> · {testResult.period}</span>
                )}
              </p>
            )}
            {!testResult.ok && testResult.error && (
              <p className="text-red-300/80 pl-5">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleSave} disabled={!token.trim() || saving} size="sm"
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              : <><Check className="w-3.5 h-3.5" /> {status === 'active' ? 'Atualizar' : 'Conectar Dom Pagamentos'}</>}
          </Button>

          {/* Testar — só aparece quando tem credenciais salvas */}
          {status === 'active' && (
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
              {testing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando...</>
                : 'Testar conexão'}
            </Button>
          )}
        </div>
      </div>
    </IntegCard>
  )
}

function ResendIntegCard() {
  const [apiKey,    setApiKey]    = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [showKey,   setShowKey]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [status,    setStatus]    = useState<'idle' | 'active' | 'error'>('idle')
  const [msg,       setMsg]       = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; domains?: number; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/agency/integrations')
      .then(r => r.json())
      .then(d => {
        const resend = (d.integrations ?? []).find((i: { type: string; status: string }) => i.type === 'resend')
        if (resend) setStatus(resend.status === 'active' ? 'active' : 'error')
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!apiKey.trim() || !fromEmail.trim()) return
    setSaving(true); setMsg(''); setTestResult(null)
    try {
      const res = await fetch('/api/agency/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'resend',
          credentials: { api_key: apiKey.trim(), from_email: fromEmail.trim() },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMsg(data.error ?? 'Erro ao salvar')
      } else {
        setStatus('active')
        setMsg('Configuração salva e validada!')
        setApiKey('')
        setTimeout(() => setMsg(''), 3000)
      }
    } catch {
      setStatus('error')
      setMsg('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      // Testa listando domínios do Resend via backend
      const res = await fetch('/api/agency/integrations/test-resend')
      const data = await res.json()
      setTestResult(data)
      if (data.ok) setStatus('active')
      else setStatus('error')
    } catch {
      setTestResult({ ok: false, error: 'Erro de rede ao testar.' })
      setStatus('error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <IntegCard
      icon={Zap}
      name="Resend (E-mail)"
      color="bg-orange-500/15 text-orange-400"
      description="Envio de e-mails NPS, alertas de cobrança e notificações com seu próprio domínio"
      status={status === 'active' ? 'connected' : status === 'error' ? 'error' : 'disconnected'}
    >
      <div className="space-y-3 pt-1">
        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">API Key do Resend</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={status === 'active' ? '••••••••••••• (já configurada)' : 're_xxxxxxxxxxxxxxxxxxxx'}
              className={cn(inputCls, 'text-sm pr-10')}
            />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-zinc-600 text-xs">
            Crie em <span className="text-zinc-500">resend.com → API Keys</span> com permissão Full Access.
          </p>
        </div>

        {/* From Email */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">E-mail remetente</Label>
          <Input
            type="email"
            value={fromEmail}
            onChange={e => setFromEmail(e.target.value)}
            placeholder={status === 'active' ? '(já configurado)' : 'nps@suaagencia.com.br'}
            className={cn(inputCls, 'text-sm')}
          />
          <p className="text-zinc-600 text-xs">
            Use um domínio verificado no Resend. Ex: <code className="text-zinc-500">Agência Gama {'<'}nps@agencia.com.br{'>'}</code>
          </p>
        </div>

        {/* Feedback salvar */}
        {msg && (
          <p className={cn('text-xs px-3 py-2 rounded-lg border',
            status === 'active'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20')}>
            {msg}
          </p>
        )}

        {/* Resultado do teste */}
        {testResult && (
          <div className={cn('p-3 rounded-xl border text-xs space-y-1',
            testResult.ok
              ? 'bg-emerald-500/8 border-emerald-500/25'
              : 'bg-red-500/8 border-red-500/25')}>
            <div className="flex items-center gap-2">
              {testResult.ok
                ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <X     className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              <span className={testResult.ok ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {testResult.ok ? 'Resend conectado!' : 'Falha na conexão'}
              </span>
            </div>
            {testResult.ok && testResult.domains !== undefined && (
              <p className="text-zinc-400 pl-5">
                {testResult.domains === 0
                  ? 'Nenhum domínio verificado ainda — adicione um domínio no Resend para melhor entregabilidade'
                  : `${testResult.domains} domínio(s) verificado(s) na sua conta`}
              </p>
            )}
            {!testResult.ok && testResult.error && (
              <p className="text-red-300/80 pl-5">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleSave}
            disabled={(!apiKey.trim() || !fromEmail.trim()) || saving}
            size="sm"
            className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              : <><Check className="w-3.5 h-3.5" /> {status === 'active' ? 'Atualizar' : 'Conectar Resend'}</>}
          </Button>

          {status === 'active' && (
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
              {testing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando...</>
                : 'Testar conexão'}
            </Button>
          )}

          <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 ml-auto transition-colors">
            resend.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </IntegCard>
  )
}

function IntegracoesSection() {
  return (
    <div className="space-y-4">
      <SectionTitle>Integrações</SectionTitle>

      {/* Asaas — funcional */}
      <AsaasIntegCard />

      {/* WhatsApp — Evolution API */}
      <EvolutionIntegCard />

      {/* Dom Pagamentos — funcional */}
      <DomIntegCard />

      {/* Resend — e-mail por agência */}
      <ResendIntegCard />
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

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira'   },
  { value: 3, label: 'Quarta-feira'  },
  { value: 4, label: 'Quinta-feira'  },
  { value: 5, label: 'Sexta-feira'   },
  { value: 6, label: 'Sábado'        },
  { value: 0, label: 'Domingo'       },
]

function nextWeekdayDate(weekday: number): string {
  const today  = new Date()
  const todayW = today.getDay()
  let   diff   = (weekday - todayW + 7) % 7
  if (diff === 0) diff = 7
  const next = new Date(today.getTime() + diff * 86400000)
  return next.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

function nextMonthDay(day: number): string {
  const today = new Date()
  const yr    = today.getFullYear()
  const mo    = today.getMonth()
  let next    = new Date(yr, mo, day)
  if (next <= today) next = new Date(yr, mo + 1, day)
  return next.toLocaleDateString('pt-BR')
}

function AnalisadorSection() {
  const [weekday, setWeekday]       = useState(1)   // 0=Dom..6=Sáb, padrão: Segunda
  const [npsDay, setNpsDay]         = useState(5)   // dia do mês para NPS mensal
  const [npsGrace, setNpsGrace]     = useState<7 | 15>(7)
  const [observationDays, setObservationDays] = useState(60)
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)

  const PILLARS = [
    { label: 'Financeiro',            weight: 35, color: 'bg-emerald-500' },
    { label: 'Proximidade (WhatsApp)', weight: 30, color: 'bg-blue-500'   },
    { label: 'Resultado / Expectativa', weight: 25, color: 'bg-violet-500' },
    { label: 'NPS',                    weight: 10, color: 'bg-yellow-500' },
  ]

  // Carrega configurações do banco ao montar
  useEffect(() => {
    fetch('/api/agency')
      .then(r => r.json())
      .then(d => {
        const agency = d?.agency ?? d
        if (agency?.analysis_day    !== undefined) setWeekday(Number(agency.analysis_day))
        if (agency?.analysis_nps_day !== undefined) setNpsDay(Number(agency.analysis_nps_day))
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      try { persistObsDays(observationDays) } catch {}
      await fetch('/api/agency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_day: weekday, analysis_nps_day: npsDay }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Configurações do analisador</SectionTitle>

      {/* Análise semanal de sentimento */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-zinc-200 text-sm font-medium">Análise semanal de sentimento</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Todo semana neste dia o sistema analisa o sentimento do grupo de WhatsApp e atualiza o Health Score de todos os clientes. Mantém histórico de 60 dias, com ênfase na semana mais recente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-zinc-400 text-sm shrink-0">Todo</Label>
            <select
              value={weekday}
              onChange={e => setWeekday(Number(e.target.value))}
              className={cn(inputCls, 'h-10 rounded-md border px-3 text-sm')}>
              {WEEKDAYS.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <p className="text-zinc-600 text-xs">
            Próxima análise: <span className="text-zinc-400">{nextWeekdayDate(weekday)}</span>
          </p>
        </CardContent>
      </Card>

      {/* NPS mensal */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-zinc-200 text-sm font-medium">Lembrete de NPS mensal</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                5 dias antes desta data você recebe um e-mail lembrando de enviar o formulário de satisfação para os clientes. O NPS é coletado mensalmente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-zinc-400 text-sm shrink-0">Todo dia</Label>
            <Input
              type="number"
              value={npsDay}
              onChange={e => setNpsDay(Math.min(28, Math.max(1, +e.target.value)))}
              className={cn(inputCls, 'w-20 text-center')}
              min={1} max={28}
            />
            <Label className="text-zinc-400 text-sm">de cada mês</Label>
          </div>
          <p className="text-zinc-600 text-xs">
            Próximo lembrete de NPS: <span className="text-zinc-400">{nextMonthDay(npsDay)}</span>
          </p>
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

      {/* Período de observação */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-zinc-200 text-sm font-medium">Período de observação de novos clientes</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              Clientes cadastrados há menos desse período ficam em status <span className="text-zinc-300 font-medium">"Em Observação"</span>:
              não recebem health score, não aparecem no ranking de risco e não podem receber formulário NPS.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[30, 45, 60, 90].map(d => (
              <button key={d} onClick={() => setObservationDays(d)}
                className={cn('px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  observationDays === d
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
                {d} dias
              </button>
            ))}
            <div className="flex items-center gap-2">
              <Input
                type="number" value={observationDays}
                onChange={e => setObservationDays(Math.max(7, Math.min(180, +e.target.value)))}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 w-20 text-center focus-visible:ring-emerald-500 h-9"
                min={7} max={180}
              />
              <span className="text-zinc-500 text-sm">dias (personalizado)</span>
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-500">
            ⚠️ Com <span className="text-zinc-300 font-medium">{observationDays} dias</span> configurado,
            o botão NPS fica bloqueado para clientes cadastrados há menos de {observationDays} dias.
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

      <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
         : saved  ? <><Check className="w-3.5 h-3.5" /> Salvo!</>
         : 'Salvar configurações'}
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
    { key: 'renewalSoon',       label: 'Renovação próxima',              sub: 'Contrato Recorrente vencendo nos próximos 45 dias' },
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
// PRIVACIDADE E LGPD
// ─────────────────────────────────────────────────────────────────
function PrivacidadeSection() {
  const router = useRouter()
  const [step, setStep]           = useState<'idle' | 'confirm1' | 'confirm2' | 'deleting' | 'done'>('idle')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setStep('deleting')
    setDeleteError(null)
    try {
      const res  = await fetch('/api/account/delete', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Erro ao excluir conta')
        setStep('confirm2')
        return
      }
      setStep('done')
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setDeleteError('Erro inesperado. Tente novamente.')
      setStep('confirm2')
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Privacidade e Dados (LGPD)</SectionTitle>

      {/* Documentos */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-3">
          <p className="text-zinc-300 text-sm font-semibold">Documentos legais</p>
          <p className="text-zinc-500 text-xs">
            Consulte nossa política de privacidade e termos de uso para entender como seus dados são coletados e utilizados.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href="/privacidade" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Política de Privacidade
            </a>
            <span className="hidden sm:inline text-zinc-700">·</span>
            <a href="/termos" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Termos de Uso
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Seus dados */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-5 space-y-3">
          <p className="text-zinc-300 text-sm font-semibold">Seus dados</p>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Conforme a LGPD (Lei Geral de Proteção de Dados), você tem direito de:
            solicitar acesso, correção ou exclusão dos seus dados a qualquer momento.
          </p>
          <div className="space-y-1.5 text-zinc-500 text-xs">
            {[
              '✓ Dados da agência e usuários',
              '✓ Clientes e contratos',
              '✓ Histórico de análises e health scores',
              '✓ Respostas de formulários',
              '✓ Integrações (chaves criptografadas)',
            ].map(item => <p key={item}>{item}</p>)}
          </div>
        </CardContent>
      </Card>

      {/* Exclusão de conta */}
      <Card className="bg-red-500/5 border-red-500/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-red-300 text-sm font-semibold">Excluir conta e todos os dados</p>
              <p className="text-red-400/70 text-xs mt-1 leading-relaxed">
                Esta ação é irreversível. Todos os dados da agência (clientes, análises,
                formulários, integrações) serão permanentemente excluídos.
              </p>
            </div>
          </div>

          {step === 'done' && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <Check className="w-4 h-4 text-emerald-400" />
              <p className="text-emerald-300 text-sm">Conta excluída. Redirecionando...</p>
            </div>
          )}

          {step === 'idle' && (
            <Button variant="outline"
              onClick={() => setStep('confirm1')}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 gap-1.5 text-sm">
              <Trash2 className="w-3.5 h-3.5" /> Solicitar exclusão de dados
            </Button>
          )}

          {step === 'confirm1' && (
            <div className="space-y-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-red-300 text-sm font-semibold">⚠️ Tem certeza absoluta?</p>
              <p className="text-red-400/70 text-xs">
                Isso excluirá permanentemente toda a conta da agência, incluindo todos os clientes,
                análises e integrações. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"
                  onClick={() => setStep('confirm2')}
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
                  Sim, quero excluir
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => setStep('idle')}
                  className="text-zinc-500 text-xs">Cancelar</Button>
              </div>
            </div>
          )}

          {(step === 'confirm2' || step === 'deleting') && (
            <div className="space-y-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-red-300 text-sm font-semibold">🔐 Confirme sua senha</p>
              <p className="text-red-400/70 text-xs">
                Para confirmar a exclusão, insira sua senha atual.
              </p>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  className="bg-zinc-900 border-red-500/30 text-zinc-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {deleteError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {deleteError}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm"
                  onClick={handleDelete}
                  disabled={step === 'deleting' || !password.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
                  {step === 'deleting'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Excluindo...</>
                    : <><Trash2 className="w-3.5 h-3.5" /> Excluir permanentemente</>
                  }
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => { setStep('idle'); setPassword(''); setDeleteError(null) }}
                  disabled={step === 'deleting'}
                  className="text-zinc-500 text-xs">Cancelar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [active, setActive] = useState('agencia')

  const SECTIONS: Record<string, React.ReactNode> = {
    agencia:           <AgenciaSection />,
    servicos:          <ServicosSection />,
    produtos:          <ProdutosSection />,
    formulario:        <FormularioSection />,
    integracoes:       <IntegracoesSection />,
    usuarios:          <UsuariosSection />,
    analisador:        <AnalisadorSection />,
    'email-templates': <EmailTemplatesSection />,
    notificacoes:      <NotificacoesSection />,
    privacidade:       <PrivacidadeSection />,
  }

  return (
    <div className="min-h-screen">
      <Header title="Configurações" description="Gerencie sua agência, integrações e preferências" />

      {/* Nav mobile: tabs horizontais com scroll */}
      <div className="lg:hidden border-b border-zinc-800 overflow-x-auto scrollbar-none">
        <div className="flex px-4 gap-1 min-w-max pb-0">
          {NAV.map(item => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all',
                  isActive
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                )}>
                <Icon className={cn('w-3.5 h-3.5', isActive && 'text-emerald-400')} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 lg:p-6 lg:flex lg:gap-6 max-w-5xl mx-auto">

        {/* Nav lateral — só desktop */}
        <aside className="hidden lg:block w-48 shrink-0">
          <nav className="space-y-1 sticky top-20">
            {NAV.map(item => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => setActive(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                    isActive
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  )}>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-emerald-400' : '')} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Conteúdo */}
        <main className="flex-1 min-w-0 mt-4 lg:mt-0">
          {SECTIONS[active]}
        </main>
      </div>
    </div>
  )
}
