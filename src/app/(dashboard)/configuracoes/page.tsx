'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Briefcase, Plug, Users, Bot, Bell,
  Plus, Trash2, Check, X, Eye, EyeOff, Loader2, Save,
  ChevronRight, Shield, AlertTriangle, RefreshCw,
  MessageCircle, CreditCard, BarChart2, Zap,
  GripVertical, FileText, Lock, AlignLeft, ListChecks, Hash,
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
  { id: 'agencia',       label: 'Agência',        icon: Building2 },
  { id: 'servicos',      label: 'Serviços',        icon: Briefcase },
  { id: 'formulario',    label: 'Formulário NPS',  icon: FileText  },
  { id: 'integracoes',   label: 'Integrações',     icon: Plug      },
  { id: 'usuarios',      label: 'Usuários',        icon: Users     },
  { id: 'analisador',    label: 'Analisador',      icon: Bot       },
  { id: 'notificacoes',  label: 'Notificações',    icon: Bell      },
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

function ServicosSection() {
  const [services, setServices] = useState<Service[]>(mockServices)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingService | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [draft, setDraft] = useState<EditingService>({
    id: '', agencyId: 'agency-001', name: '', type: 'mrr',
    entregaveis: [], bonus: [], isActive: true,
    newItemName: '', newItemKind: 'entregavel',
  })

  const typeBadge = (t: 'mrr' | 'tcv') =>
    t === 'mrr'
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : 'text-blue-400 border-blue-500/30 bg-blue-500/10'

  function startEdit(s: Service) {
    setEditing({ ...s, newItemName: '', newItemKind: 'entregavel' })
    setExpandedId(s.id)
    setCreatingNew(false)
  }

  function toggleActive(id: string) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s))
  }

  function deleteService(id: string) {
    setServices(prev => prev.filter(s => s.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  // Funções de edição de items
  function addItem(target: EditingService, kind: ItemKind, name: string): EditingService {
    if (!name.trim()) return target
    const item: ServiceItem = { id: `item-${Date.now()}`, name: name.trim() }
    return kind === 'entregavel'
      ? { ...target, entregaveis: [...target.entregaveis, item], newItemName: '' }
      : { ...target, bonus: [...target.bonus, item], newItemName: '' }
  }

  function removeItem(target: EditingService, kind: ItemKind, id: string): EditingService {
    return kind === 'entregavel'
      ? { ...target, entregaveis: target.entregaveis.filter(i => i.id !== id) }
      : { ...target, bonus: target.bonus.filter(i => i.id !== id) }
  }

  function saveEditing() {
    if (!editing || !editing.name.trim()) return
    const { newItemName: _, newItemKind: __, ...clean } = editing
    setServices(prev => prev.map(s => s.id === clean.id ? clean : s))
    setEditing(null)
    setExpandedId(clean.id)
  }

  function saveNew() {
    if (!draft.name.trim()) return
    const { newItemName: _, newItemKind: __, ...clean } = draft
    const novo: Service = { ...clean, id: `srv-${Date.now()}` }
    setServices(prev => [...prev, novo])
    setCreatingNew(false)
    setDraft({ id: '', agencyId: 'agency-001', name: '', type: 'mrr', entregaveis: [], bonus: [], isActive: true, newItemName: '', newItemKind: 'entregavel' })
  }

  // Componente de lista de itens inline
  function ItemList({ target, setTarget, kind, label, color }: {
    target: EditingService
    setTarget: (v: EditingService) => void
    kind: ItemKind
    label: string
    color: string
  }) {
    const items = kind === 'entregavel' ? target.entregaveis : target.bonus
    return (
      <div className="space-y-2">
        <p className={cn('text-xs font-semibold uppercase tracking-wider', color)}>{label}</p>
        {items.length === 0 && (
          <p className="text-zinc-600 text-xs italic">Nenhum item. Adicione abaixo.</p>
        )}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 bg-zinc-800/40 rounded-lg px-3 py-1.5">
            <span className="flex-1 text-zinc-300 text-sm">{item.name}</span>
            <button onClick={() => setTarget(removeItem(target, kind, item.id))}
              className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder={`+ Novo ${kind === 'entregavel' ? 'entregável' : 'bônus'}...`}
            value={target.newItemKind === kind ? target.newItemName : ''}
            onChange={e => setTarget({ ...target, newItemName: e.target.value, newItemKind: kind })}
            onKeyDown={e => {
              if (e.key === 'Enter') setTarget(addItem({ ...target, newItemKind: kind }, kind, target.newItemName))
            }}
            className={cn(inputCls, 'h-8 text-xs flex-1')}
          />
          <Button size="sm" variant="outline"
            className="border-zinc-700 text-zinc-400 hover:text-white h-8 px-2"
            onClick={() => setTarget(addItem({ ...target, newItemKind: kind }, kind, target.newItemName))}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // Form de criação/edição compartilhado
  function MetodoForm({ data, setData, onSave, onCancel }: {
    data: EditingService
    setData: (v: EditingService) => void
    onSave: () => void
    onCancel: () => void
  }) {
    return (
      <div className="space-y-4 pt-3 border-t border-zinc-800">
        {/* Nome + tipo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Nome do método / produto">
              <Input autoFocus value={data.name} onChange={e => setData({ ...data, name: e.target.value })}
                placeholder="Ex: Tríade Gestão Comercial" className={inputCls} />
            </Field>
          </div>
          <Field label="Tipo de contrato">
            <div className="flex gap-2 pt-0.5">
              {(['mrr', 'tcv'] as const).map(t => (
                <button key={t} onClick={() => setData({ ...data, type: t })}
                  className={cn('flex-1 py-2 rounded-lg border text-xs font-bold transition-all',
                    data.type === t
                      ? t === 'mrr' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600')}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Entregáveis */}
        <ItemList target={data} setTarget={setData} kind="entregavel"
          label="Entregáveis" color="text-zinc-300" />

        {/* Bônus */}
        <ItemList target={data} setTarget={setData} kind="bonus"
          label="Bônus" color="text-yellow-500" />

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onSave} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
            <Check className="w-3.5 h-3.5" /> Salvar método
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="text-zinc-400">Cancelar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Métodos e Produtos</SectionTitle>
        </div>
        <Button size="sm" onClick={() => { setCreatingNew(true); setExpandedId(null); setEditing(null) }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 -mt-4">
          <Plus className="w-3.5 h-3.5" /> Novo método
        </Button>
      </div>

      <p className="text-zinc-500 text-sm -mt-2">
        Cada método é um produto vendido pela agência. No cadastro do cliente você escolhe o método e personaliza os entregáveis e bônus da negociação.
      </p>

      {/* Formulário de novo método */}
      {creatingNew && (
        <Card className="bg-zinc-900 border-emerald-500/30 border-dashed">
          <CardContent className="p-4">
            <p className="text-zinc-300 font-medium text-sm mb-3">Novo método</p>
            <MetodoForm
              data={draft}
              setData={setDraft}
              onSave={saveNew}
              onCancel={() => setCreatingNew(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Lista de métodos */}
      <div className="space-y-3">
        {services.map(s => {
          const isExpanded = expandedId === s.id
          const isEditing = editing?.id === s.id

          return (
            <Card key={s.id}
              className={cn('bg-zinc-900 border-zinc-800 transition-all', !s.isActive && 'opacity-50')}>
              <CardContent className="p-4">

                {/* Cabeçalho do card */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-zinc-200 text-sm font-semibold">{s.name}</p>
                      <Badge variant="outline" className={cn('text-xs', typeBadge(s.type))}>
                        {s.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {s.entregaveis.length} entregável{s.entregaveis.length !== 1 ? 'is' : ''}
                      {s.bonus.length > 0 && ` · ${s.bonus.length} bônus`}
                    </p>
                  </button>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => isEditing ? (setEditing(null)) : startEdit(s)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2">
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                    <button onClick={() => toggleActive(s.id)}
                      className={cn('w-9 h-5 rounded-full transition-all relative', s.isActive ? 'bg-emerald-500' : 'bg-zinc-700')}>
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', s.isActive ? 'left-4' : 'left-0.5')} />
                    </button>
                    <button onClick={() => deleteService(s.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Modo edição */}
                {isEditing && editing && (
                  <MetodoForm
                    data={editing}
                    setData={setEditing}
                    onSave={saveEditing}
                    onCancel={() => setEditing(null)}
                  />
                )}

                {/* Modo visualização expandida */}
                {isExpanded && !isEditing && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Entregáveis</p>
                      <div className="space-y-1.5">
                        {s.entregaveis.map(e => (
                          <div key={e.id} className="flex items-center gap-2 text-xs text-zinc-400">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            {e.name}
                          </div>
                        ))}
                        {s.entregaveis.length === 0 && <p className="text-zinc-600 text-xs italic">Nenhum entregável</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wider mb-2">Bônus</p>
                      <div className="space-y-1.5">
                        {s.bonus.map(b => (
                          <div key={b.id} className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="text-yellow-400 shrink-0">⭐</span>
                            {b.name}
                          </div>
                        ))}
                        {s.bonus.length === 0 && <p className="text-zinc-600 text-xs italic">Sem bônus</p>}
                      </div>
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

// Tipos para o estado do webhook Dom
interface DomWebhookInfo {
  configured:  boolean
  active:      boolean
  webhook_url: string
  agency_id:   string
  has_token:   boolean
  last_event:  { message: string; event: string; received_at: string } | null
}

function DomIntegCard() {
  const [info, setInfo]           = useState<DomWebhookInfo | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activating, setActivating] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null)
  const [copied, setCopied]       = useState(false)
  const [msg, setMsg]             = useState('')

  // Token opcional (colapsado)
  const [showTokenSection, setShowTokenSection] = useState(false)
  const [token, setToken]         = useState('')
  const [showToken, setShowToken] = useState(false)
  const [savingToken, setSavingToken] = useState(false)

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(''), 4000) }

  // Carrega status atual
  async function loadInfo() {
    setLoading(true)
    try {
      const res = await fetch('/api/dom/webhook')
      if (res.ok) setInfo(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadInfo() }, [])

  // Gera / ativa a URL de webhook
  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch('/api/dom/webhook', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) { await loadInfo(); showMsg('Webhook ativado! Copie a URL abaixo.') }
      else { const d = await res.json(); showMsg(d.error ?? 'Erro ao ativar') }
    } catch { showMsg('Erro de conexão') }
    setActivating(false)
  }

  // Desativa
  async function handleDeactivate() {
    if (!confirm('Desativar o webhook Dom Pagamentos? Eventos deixarão de ser recebidos.')) return
    setDeactivating(true)
    try {
      await fetch('/api/dom/webhook', { method: 'DELETE' })
      await loadInfo()
      showMsg('Integração desativada.')
    } catch { showMsg('Erro ao desativar') }
    setDeactivating(false)
  }

  // Testa o webhook (GET na URL pública)
  async function handleTest() {
    if (!info?.webhook_url) return
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch(info.webhook_url, { method: 'GET' })
      const d   = await res.json()
      setTestResult(d.ok ? 'ok' : 'error')
    } catch { setTestResult('error') }
    setTesting(false)
    setTimeout(() => setTestResult(null), 5000)
  }

  // Copia URL
  function handleCopy() {
    if (!info?.webhook_url) return
    navigator.clipboard.writeText(info.webhook_url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // Salva token opcional
  async function handleSaveToken() {
    if (!token.trim()) return
    setSavingToken(true)
    try {
      const res = await fetch('/api/dom/webhook', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }) })
      if (res.ok) {
        await loadInfo(); setToken(''); setShowTokenSection(false)
        showMsg('Token salvo. Histórico disponível na página Financeiro.')
      } else { const d = await res.json(); showMsg(d.error ?? 'Erro ao salvar token') }
    } catch { showMsg('Erro de conexão') }
    setSavingToken(false)
  }

  // ── Formata tempo relativo ──
  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 1)  return 'agora mesmo'
    if (min < 60) return `há ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24)   return `há ${h}h`
    return `há ${Math.floor(h / 24)}d`
  }

  const isActive = info?.active === true
  const cardStatus = loading ? 'disconnected' : isActive ? 'connected' : 'disconnected'

  return (
    <IntegCard icon={CreditCard} name="Dom Pagamentos" color="bg-violet-500/15 text-violet-400"
      description="Receba eventos de pagamento em tempo real via webhook"
      status={cardStatus}>
      <div className="space-y-4 pt-1">

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-xs py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando...
          </div>
        ) : !isActive ? (
          /* ── Estado: não configurado ── */
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 space-y-2">
              <p className="text-zinc-400 text-xs">
                Gere sua URL de webhook exclusiva. Cole-a no painel da Dom Pagamentos e escolha
                os eventos — o Zero Churn processará tudo automaticamente.
              </p>
              <p className="text-zinc-600 text-xs">Nenhum token necessário para começar.</p>
            </div>
            <Button onClick={handleActivate} disabled={activating} size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
              {activating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                : <><Check className="w-3.5 h-3.5" /> Gerar URL de Webhook</>}
            </Button>
          </div>
        ) : (
          /* ── Estado: ativo ── */
          <div className="space-y-3">

            {/* URL do webhook */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Sua URL de Webhook</Label>
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5">
                <code className="text-violet-300 text-xs flex-1 break-all leading-relaxed">
                  {info?.webhook_url}
                </code>
                <button onClick={handleCopy}
                  className={cn('shrink-0 text-xs flex items-center gap-1 transition-colors',
                    copied ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300')}>
                  {copied ? <><Check className="w-3 h-3" /> Copiado</> : 'Copiar'}
                </button>
              </div>
              <p className="text-zinc-600 text-xs">
                Cole esta URL no painel Dom Pagamentos → Webhooks. Sugerimos eventos:
                <span className="text-zinc-500"> CHARGE-APPROVED, CHARGE-CHARGEBACK, SIGNATURE-INVOICE-PAID, SIGNATURE-INVOICE-FAILED</span>
              </p>
            </div>

            {/* Último evento recebido */}
            <div className={cn('flex items-start gap-3 p-3 rounded-xl border text-xs',
              info?.last_event
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-zinc-800/40 border-zinc-700/50')}>
              {info?.last_event ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-emerald-400 font-medium">Funcionando</p>
                    <p className="text-zinc-400 mt-0.5">{info.last_event.message}</p>
                    <p className="text-zinc-600 mt-0.5">{timeAgo(info.last_event.received_at)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/70 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400/80 font-medium">Aguardando primeiro evento</p>
                    <p className="text-zinc-500 mt-0.5">
                      Configure o webhook no painel Dom e aguarde o próximo pagamento.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Botão de testar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 text-xs h-8">
                {testing
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Testando...</>
                  : 'Testar conexão'}
              </Button>

              {testResult === 'ok' && (
                <span className="text-emerald-400 text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Endpoint ativo e respondendo
                </span>
              )}
              {testResult === 'error' && (
                <span className="text-red-400 text-xs flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Falha ao conectar
                </span>
              )}

              <button onClick={handleDeactivate} disabled={deactivating}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors ml-auto">
                {deactivating ? 'Desativando...' : 'Desativar'}
              </button>
            </div>

            {/* Token opcional — para puxar histórico */}
            <div className="border-t border-zinc-800 pt-3">
              <button onClick={() => setShowTokenSection(v => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors">
                <Plus className={cn('w-3.5 h-3.5 transition-transform', showTokenSection && 'rotate-45')} />
                {info?.has_token
                  ? 'Token API configurado (histórico ativo)'
                  : 'Adicionar Token API (opcional — para histórico na Financeiro)'}
              </button>

              {showTokenSection && (
                <div className="mt-3 space-y-2">
                  <p className="text-zinc-600 text-xs">
                    Token Bearer fornecido pelo suporte Dom. Permite buscar histórico de transações
                    na página Financeiro (além dos eventos em tempo real).
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input type={showToken ? 'text' : 'password'} value={token}
                        onChange={e => setToken(e.target.value)}
                        placeholder={info?.has_token ? '••••••••• (já configurado)' : 'Token do suporte Dom'}
                        className={cn(inputCls, 'text-sm pr-10')} />
                      <button type="button" onClick={() => setShowToken(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button size="sm" onClick={handleSaveToken} disabled={!token.trim() || savingToken}
                      className="bg-violet-600 hover:bg-violet-500 text-white shrink-0">
                      {savingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mensagem de feedback */}
        {msg && (
          <p className="text-xs px-3 py-2 rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            {msg}
          </p>
        )}
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

      {/* WhatsApp — em breve */}
      <IntegCard icon={MessageCircle} name="WhatsApp (Evolution API)" color="bg-emerald-500/15 text-emerald-400"
        description="Análise de sentimento e proximidade via grupos do WhatsApp" status="coming">
        <p className="text-zinc-600 text-xs pt-1">Em breve — Sprint 2</p>
      </IntegCard>

      {/* Dom Pagamentos — funcional */}
      <DomIntegCard />
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
  const [observationDays, setObservationDays] = useState(60)
  const [saved, setSaved] = useState(false)

  const PILLARS = [
    { label: 'Financeiro',            weight: 35, color: 'bg-emerald-500' },
    { label: 'Proximidade (WhatsApp)', weight: 30, color: 'bg-blue-500'   },
    { label: 'Resultado / Expectativa', weight: 25, color: 'bg-violet-500' },
    { label: 'NPS',                    weight: 10, color: 'bg-yellow-500' },
  ]

  function handleSave() {
    // Persiste o período de observação
    try { persistObsDays(observationDays) } catch {}
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
    formulario:   <FormularioSection />,
    integracoes:  <IntegracoesSection />,
    usuarios:     <UsuariosSection />,
    analisador:   <AnalisadorSection />,
    notificacoes: <NotificacoesSection />,
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
