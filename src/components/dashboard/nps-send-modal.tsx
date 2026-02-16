'use client'

import { useState } from 'react'
import {
  X, MessageCircle, Mail, Send, Check, Loader2,
  Users, ChevronDown, ChevronUp, CheckSquare, Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ClientWithScore } from '@/types'
import { cn } from '@/lib/utils'

interface NpsSendModalProps {
  clients: ClientWithScore[]
  onClose: () => void
}

type Channel = 'whatsapp_group' | 'whatsapp_private' | 'email'

const CHANNEL_CONFIG: Record<Channel, { label: string; sub: string; icon: React.ElementType; color: string }> = {
  whatsapp_group:   { label: 'WhatsApp Grupo',   sub: 'Envia no grupo do cliente',          icon: MessageCircle, color: 'emerald' },
  whatsapp_private: { label: 'WhatsApp Privado', sub: 'Envia direto pro decisor',           icon: MessageCircle, color: 'green'   },
  email:            { label: 'E-mail',            sub: 'Para o e-mail cadastrado',           icon: Mail,          color: 'blue'    },
}

type Step = 'config' | 'sending' | 'done'

export function NpsSendModal({ clients, onClose }: NpsSendModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(clients.map(c => c.id)))
  const [channels, setChannels] = useState<Set<Channel>>(new Set(['whatsapp_group', 'whatsapp_private', 'email']))
  const [followup1, setFollowup1] = useState('3')
  const [followup2, setFollowup2] = useState('7')
  const [step, setStep] = useState<Step>('config')
  const [sendingMsg, setSendingMsg] = useState('')
  const [expandClients, setExpandClients] = useState(false)

  const allSelected = selectedIds.size === clients.length
  const selectedClients = clients.filter(c => selectedIds.has(c.id))

  function toggleClient(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(clients.map(c => c.id)))
  }

  function toggleChannel(ch: Channel) {
    setChannels(prev => {
      const next = new Set(prev)
      next.has(ch) ? next.delete(ch) : next.add(ch)
      return next
    })
  }

  async function handleSend() {
    if (selectedIds.size === 0 || channels.size === 0) return
    setStep('sending')

    const msgs = [
      'Preparando os formulários...',
      'Enviando pelo WhatsApp...',
      'Enviando por e-mail...',
      'Agendando follow-ups...',
      'Concluído!',
    ]

    for (const msg of msgs) {
      setSendingMsg(msg)
      await new Promise(r => setTimeout(r, 900))
    }

    setStep('done')
  }

  const inputCls = "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500 h-9 w-16 text-center"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-white font-semibold">Enviar formulários NPS</p>
            <p className="text-zinc-500 text-xs mt-0.5">NPS + avaliação de resultado</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Enviando ───────────────────────────────────────── */}
          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              </div>
              <p className="text-zinc-300 font-medium">{sendingMsg}</p>
              <p className="text-zinc-600 text-xs">{selectedIds.size} clientes · {channels.size} canais</p>
            </div>
          )}

          {/* ── Concluído ──────────────────────────────────────── */}
          {step === 'done' && (
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-semibold">Formulários enviados!</p>
                <p className="text-zinc-500 text-sm text-center">
                  {selectedIds.size} clientes receberão o formulário nos canais selecionados.
                  Follow-ups agendados para {followup1} e {followup2} dias.
                </p>
              </div>
              <div className="space-y-2">
                {selectedClients.map(c => (
                  <div key={c.id} className="flex items-center gap-2.5 bg-zinc-800/50 rounded-lg px-3 py-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-zinc-300 text-sm flex-1">{c.nomeResumido ?? c.name}</span>
                    <div className="flex gap-1">
                      {channels.has('whatsapp_group') && <MessageCircle className="w-3 h-3 text-emerald-500" />}
                      {channels.has('whatsapp_private') && <MessageCircle className="w-3 h-3 text-green-500" />}
                      {channels.has('email') && <Mail className="w-3 h-3 text-blue-400" />}
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={onClose} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                Fechar
              </Button>
            </div>
          )}

          {/* ── Configuração ───────────────────────────────────── */}
          {step === 'config' && (
            <div className="p-5 space-y-5">

              {/* Seleção de clientes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-zinc-300 text-sm font-medium flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-zinc-500" /> Clientes
                    <Badge variant="outline" className="text-zinc-400 border-zinc-600 text-xs ml-1">
                      {selectedIds.size}/{clients.length}
                    </Badge>
                  </p>
                  <button onClick={toggleAll}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                    {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                {/* Preview compacto + expandir */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    {clients.map(c => {
                      const sel = selectedIds.has(c.id)
                      return (
                        <button key={c.id} onClick={() => toggleClient(c.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 border-b border-zinc-800/50 last:border-0 text-left transition-all',
                            sel ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'
                          )}>
                          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                            sel ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600')}>
                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="flex-1 text-sm text-zinc-300">{c.nomeResumido ?? c.name}</span>
                          <Badge variant="outline" className={cn('text-xs shrink-0',
                            c.clientType === 'mrr'
                              ? 'text-emerald-400 border-emerald-500/30'
                              : 'text-blue-400 border-blue-500/30')}>
                            {c.clientType.toUpperCase()}
                          </Badge>
                          {/* NPS mais recente */}
                          {c.lastFormSubmission?.npsScore !== undefined && (
                            <span className="text-zinc-500 text-xs">NPS: {c.lastFormSubmission.npsScore}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Canais */}
              <div className="space-y-2">
                <p className="text-zinc-300 text-sm font-medium">Canais de envio</p>
                <div className="space-y-2">
                  {(Object.keys(CHANNEL_CONFIG) as Channel[]).map(ch => {
                    const { label, sub, icon: Icon, color } = CHANNEL_CONFIG[ch]
                    const active = channels.has(ch)
                    const colorMap: Record<string, string> = {
                      emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
                      green:   'border-green-500/40 bg-green-500/10 text-green-400',
                      blue:    'border-blue-500/40 bg-blue-500/10 text-blue-400',
                    }
                    return (
                      <button key={ch} onClick={() => toggleChannel(ch)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                          active ? colorMap[color] : 'border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:border-zinc-600'
                        )}>
                        <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                          active ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600')}>
                          {active && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <Icon className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className={cn('text-xs', active ? 'opacity-70' : 'text-zinc-600')}>{sub}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Follow-ups */}
              <div className="space-y-2">
                <p className="text-zinc-300 text-sm font-medium">Follow-ups automáticos</p>
                <p className="text-zinc-600 text-xs">Se o cliente não responder, o sistema envia lembretes automaticamente.</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-zinc-400 text-xs whitespace-nowrap">1º lembrete em</span>
                    <Input value={followup1} onChange={e => setFollowup1(e.target.value)}
                      type="number" min={1} max={14} className={inputCls} />
                    <span className="text-zinc-400 text-xs">dias</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-zinc-400 text-xs whitespace-nowrap">2º lembrete em</span>
                    <Input value={followup2} onChange={e => setFollowup2(e.target.value)}
                      type="number" min={1} max={21} className={inputCls} />
                    <span className="text-zinc-400 text-xs">dias</span>
                  </div>
                </div>
                <p className="text-zinc-600 text-xs">
                  Clientes que responderem param de receber lembretes automaticamente.
                </p>
              </div>

              {/* Aviso sobre canais */}
              {channels.size === 0 && (
                <p className="text-yellow-400 text-xs flex items-center gap-1.5">
                  ⚠️ Selecione pelo menos um canal de envio
                </p>
              )}
              {selectedIds.size === 0 && (
                <p className="text-yellow-400 text-xs flex items-center gap-1.5">
                  ⚠️ Selecione pelo menos um cliente
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'config' && (
          <div className="p-5 border-t border-zinc-800 shrink-0">
            <div className="flex items-center justify-between mb-3 text-xs text-zinc-600">
              <span>{selectedIds.size} clientes · {channels.size} canais · 2 follow-ups</span>
              <span>Envio imediato</span>
            </div>
            <Button
              onClick={handleSend}
              disabled={selectedIds.size === 0 || channels.size === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar para {selectedIds.size} {selectedIds.size === 1 ? 'cliente' : 'clientes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
