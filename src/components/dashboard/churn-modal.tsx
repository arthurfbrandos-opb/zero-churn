'use client'

import { useState } from 'react'
import {
  X, DollarSign, TrendingDown, MessageCircle,
  Building2, Trophy, RefreshCw, CheckCircle2,
  HelpCircle, ArrowLeft, AlertTriangle, UserMinus,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChurnCategory, ChurnRecord } from '@/types'
import { cn } from '@/lib/utils'

// ── Config das categorias ─────────────────────────────────────────

export const CHURN_CATEGORIES: {
  id: ChurnCategory
  label: string
  description: string
  icon: React.ElementType
  color: string
}[] = [
  {
    id: 'price',
    label: 'Preço / Custo-benefício',
    description: 'Cliente considerou o investimento alto para os resultados obtidos',
    icon: DollarSign,
    color: 'border-yellow-500/30 bg-yellow-500/8 text-yellow-400 hover:border-yellow-500/60',
  },
  {
    id: 'results',
    label: 'Resultados abaixo do esperado',
    description: 'Os entregáveis não atingiram as expectativas do cliente',
    icon: TrendingDown,
    color: 'border-red-500/30 bg-red-500/8 text-red-400 hover:border-red-500/60',
  },
  {
    id: 'communication',
    label: 'Comunicação / Atendimento',
    description: 'Problemas na frequência, clareza ou qualidade do relacionamento',
    icon: MessageCircle,
    color: 'border-orange-500/30 bg-orange-500/8 text-orange-400 hover:border-orange-500/60',
  },
  {
    id: 'competitor',
    label: 'Migrou para concorrente',
    description: 'Cliente foi captado por outra agência ou fornecedor',
    icon: Trophy,
    color: 'border-blue-500/30 bg-blue-500/8 text-blue-400 hover:border-blue-500/60',
  },
  {
    id: 'closed',
    label: 'Empresa encerrou / pausou',
    description: 'O negócio do cliente foi fechado, vendido ou entrou em pausa',
    icon: Building2,
    color: 'border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500',
  },
  {
    id: 'internal',
    label: 'Mudança interna do cliente',
    description: 'Troca de equipe, gestão, diretriz estratégica ou sócio',
    icon: RefreshCw,
    color: 'border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500',
  },
  {
    id: 'project_end',
    label: 'Projeto TCV encerrado',
    description: 'Contrato por escopo concluído sem renovação ou expansão',
    icon: CheckCircle2,
    color: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400 hover:border-emerald-500/60',
  },
  {
    id: 'other',
    label: 'Outro motivo',
    description: 'Motivo não listado — descreva nos detalhes abaixo',
    icon: HelpCircle,
    color: 'border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500',
  },
]

// ─────────────────────────────────────────────────────────────────

interface ChurnModalProps {
  clientName: string
  clientType: 'mrr' | 'tcv'
  onConfirm: (record: ChurnRecord) => void
  onClose: () => void
}

export function ChurnModal({ clientName, clientType, onConfirm, onClose }: ChurnModalProps) {
  const [step, setStep] = useState<'category' | 'detail' | 'confirm'>('category')
  const [category, setCategory] = useState<ChurnCategory | null>(null)
  const [detail, setDetail]     = useState('')

  const selectedCat = CHURN_CATEGORIES.find(c => c.id === category)

  function handleConfirm() {
    if (!category) return
    onConfirm({
      category,
      detail,
      inactivatedAt: new Date().toISOString().split('T')[0],
      inactivatedBy: 'Você',
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden mx-2 sm:mx-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <UserMinus className="w-4.5 h-4.5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Inativar cliente</p>
              <p className="text-zinc-500 text-xs">{clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progresso */}
        <div className="flex gap-0">
          {(['category', 'detail', 'confirm'] as const).map((s, i) => (
            <div key={s} className={cn('h-0.5 flex-1 transition-all',
              step === 'category' && i === 0 ? 'bg-red-500' :
              step === 'detail'   && i <= 1 ? 'bg-red-500' :
              step === 'confirm'             ? 'bg-red-500' : 'bg-zinc-800'
            )} />
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* ── Step 1: Categoria ────────────────────────────── */}
          {step === 'category' && (
            <>
              <div>
                <p className="text-zinc-200 text-sm font-semibold">Qual é o motivo do churn?</p>
                <p className="text-zinc-500 text-xs mt-0.5">Selecione a categoria que melhor descreve a saída.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CHURN_CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const isSelected = category === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all group',
                        isSelected
                          ? cat.color + ' ring-1 ring-offset-0 ring-offset-zinc-950'
                          : cat.color
                      )}
                    >
                      <Icon className="w-4 h-4 mb-1.5" />
                      <p className="text-xs font-semibold leading-tight">{cat.label}</p>
                      <p className="text-zinc-600 text-xs mt-0.5 leading-tight group-hover:text-zinc-500 transition-colors">
                        {cat.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!category}
                  onClick={() => setStep('detail')}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white gap-1 disabled:opacity-40"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Detalhe ──────────────────────────────── */}
          {step === 'detail' && selectedCat && (
            <>
              <div>
                <button
                  onClick={() => setStep('category')}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>

                <div className={cn('flex items-center gap-2 p-2.5 rounded-xl border mb-3', selectedCat.color)}>
                  {(() => { const Icon = selectedCat.icon; return <Icon className="w-4 h-4 shrink-0" /> })()}
                  <p className="text-sm font-medium">{selectedCat.label}</p>
                </div>

                <p className="text-zinc-200 text-sm font-semibold">Detalhe o motivo</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Explique com suas palavras o que aconteceu. Isso ajuda a melhorar o serviço e identificar padrões.
                </p>
              </div>

              <textarea
                autoFocus
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder={
                  category === 'price'         ? 'Ex: O cliente mencionou que o valor está acima do orçamento após a troca de sócio...' :
                  category === 'results'       ? 'Ex: As metas de leads não foram atingidas nos últimos 3 meses...' :
                  category === 'communication' ? 'Ex: O cliente reclamou que os relatórios mensais chegavam com atraso...' :
                  category === 'competitor'    ? 'Ex: Foram abordados por uma agência que ofereceu pacote mais completo...' :
                  category === 'closed'        ? 'Ex: A empresa foi vendida e os novos donos não querem continuar...' :
                  category === 'internal'      ? 'Ex: Houve troca de CEO e o novo não conhecia o histórico do contrato...' :
                  category === 'project_end'   ? 'Ex: O projeto de funil foi entregue e o cliente não tem orçamento para renovar...' :
                  'Descreva o motivo aqui...'
                }
                rows={5}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-200 text-sm placeholder-zinc-700 focus:outline-none focus:border-red-500/50 resize-none"
              />

              <div className="flex items-center justify-between">
                <span className={cn('text-xs', detail.length < 20 ? 'text-zinc-700' : 'text-zinc-500')}>
                  {detail.length < 20 ? `Mínimo ${20 - detail.length} caracteres restantes` : `${detail.length} caracteres`}
                </span>
                <Button
                  size="sm"
                  disabled={detail.length < 20}
                  onClick={() => setStep('confirm')}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white gap-1 disabled:opacity-40"
                >
                  Revisar <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}

          {/* ── Step 3: Confirmação ──────────────────────────── */}
          {step === 'confirm' && selectedCat && (
            <>
              <div>
                <button
                  onClick={() => setStep('detail')}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>
                <p className="text-zinc-200 text-sm font-semibold">Confirmar inativação</p>
                <p className="text-zinc-500 text-xs mt-0.5">Revise as informações antes de confirmar.</p>
              </div>

              {/* Resumo */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {(() => { const Icon = selectedCat.icon; return <Icon className="w-4 h-4 text-zinc-400" /> })()}
                  <p className="text-zinc-300 text-sm font-medium">{selectedCat.label}</p>
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Detalhe</p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{detail}</p>
                </div>
                <div className="border-t border-zinc-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-600">Data de inativação</span>
                  <span className="text-zinc-400 font-medium">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300 leading-relaxed space-y-1">
                  <p className="font-semibold">O que acontece ao inativar:</p>
                  <ul className="text-red-400 space-y-0.5 ml-2">
                    <li>· O cliente sai da carteira ativa e dos cálculos de MRR</li>
                    <li>· O histórico e análises são preservados</li>
                    <li>· Você pode reativar o cliente a qualquer momento</li>
                  </ul>
                </div>
              </div>

              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white gap-2"
                onClick={handleConfirm}
              >
                <UserMinus className="w-4 h-4" />
                Confirmar inativação de {clientName.split(' ').slice(0, 2).join(' ')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
