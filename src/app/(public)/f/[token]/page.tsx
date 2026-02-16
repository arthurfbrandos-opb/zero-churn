'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Zap, Star, Send, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Mock — em produção virá do Supabase via token ─────────────────

const MOCK_FORM = {
  token:        'tok-abc',
  agencyName:   'Agência Exemplo',
  clientName:   'Clínica Estética Bella Forma',
  decidorName:  'Maria Silva',
  expired:      false,
  alreadySent:  false,
  introText:    'Olá, Maria Silva! Gostaríamos de entender sua experiência com a Agência Exemplo. Sua opinião é fundamental para continuarmos evoluindo. Leva menos de 2 minutos. 🙏',
  thankText:    'Muito obrigado pelo seu feedback! Ele é muito importante para toda a nossa equipe. Em breve entraremos em contato.',
  questions: [
    {
      id: 'q-nps',
      type: 'scale' as const,
      text: 'Em uma escala de 0 a 10, o quanto você indicaria a Agência Exemplo para um amigo ou colega de negócios?',
      required: true,
    },
    {
      id: 'q-result',
      type: 'scale' as const,
      text: 'Em uma escala de 0 a 10, qual o impacto que os serviços da Agência Exemplo estão tendo nos resultados da sua empresa?',
      required: true,
    },
    {
      id: 'q-c1',
      type: 'text' as const,
      text: 'O que podemos fazer para melhorar nossos serviços?',
      required: false,
    },
  ],
}

// ── Componente de escala 0-10 ─────────────────────────────────────

function ScaleInput({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const getColor = (n: number) => {
    if (value === null) return 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
    if (n !== value) return 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700'
    if (n >= 9)  return 'bg-emerald-500 border-emerald-400 text-white scale-110 shadow-lg shadow-emerald-500/20'
    if (n >= 7)  return 'bg-yellow-500 border-yellow-400 text-white scale-110 shadow-lg shadow-yellow-500/20'
    return 'bg-red-500 border-red-400 text-white scale-110 shadow-lg shadow-red-500/20'
  }

  const label = value === null ? null
    : value >= 9 ? '😊 Muito provável'
    : value >= 7 ? '😐 Possível'
    : value >= 5 ? '😕 Pouco provável'
    : '😞 Muito improvável'

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={cn(
              'w-10 h-10 rounded-xl border-2 font-bold text-sm transition-all',
              getColor(i)
            )}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-zinc-600">
        <span>0 — Definitivamente não</span>
        <span>10 — Com certeza sim</span>
      </div>
      {label && (
        <p className={cn('text-sm font-medium',
          value! >= 9 ? 'text-emerald-400' : value! >= 7 ? 'text-yellow-400' : 'text-red-400')}>
          {label}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────

type FormState = 'form' | 'sending' | 'done' | 'expired' | 'already_sent'

export default function FormularioPublicoPage() {
  const params = useParams()
  const token  = params.token as string

  // Em produção buscaria do banco pelo token
  const form = MOCK_FORM

  const initialState: FormState =
    form.expired     ? 'expired'      :
    form.alreadySent ? 'already_sent' : 'form'

  const [state, setState] = useState<FormState>(initialState)
  const [step,  setStep]  = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string | null>>(
    Object.fromEntries(form.questions.map(q => [q.id, null]))
  )

  const currentQ   = form.questions[step]
  const isLastStep = step === form.questions.length - 1
  const canAdvance = currentQ?.required
    ? answers[currentQ.id] !== null && answers[currentQ.id] !== ''
    : true

  function setAnswer(qId: string, val: number | string) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  async function handleSubmit() {
    setState('sending')
    // Simula envio
    await new Promise(r => setTimeout(r, 1800))
    setState('done')
  }

  // ── Estado: expirado ─────────────────────────────────────────

  if (state === 'expired') {
    return (
      <FormLayout agencyName={form.agencyName}>
        <div className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <p className="text-white text-xl font-semibold">Link expirado</p>
            <p className="text-zinc-400 text-sm mt-2">Este link de pesquisa já não é mais válido.</p>
            <p className="text-zinc-500 text-xs mt-1">Entre em contato com a agência para receber um novo link.</p>
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Estado: já respondido ────────────────────────────────────

  if (state === 'already_sent') {
    return (
      <FormLayout agencyName={form.agencyName}>
        <div className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-white text-xl font-semibold">Você já respondeu!</p>
            <p className="text-zinc-400 text-sm mt-2">Sua resposta já foi registrada. Obrigado!</p>
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Estado: enviando ─────────────────────────────────────────

  if (state === 'sending') {
    return (
      <FormLayout agencyName={form.agencyName}>
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Send className="w-7 h-7 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-zinc-300 text-sm">Enviando suas respostas...</p>
        </div>
      </FormLayout>
    )
  }

  // ── Estado: concluído ────────────────────────────────────────

  if (state === 'done') {
    return (
      <FormLayout agencyName={form.agencyName}>
        <div className="flex flex-col items-center text-center py-10 gap-5">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-2xl font-bold">Obrigado! 🎉</p>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed max-w-sm mx-auto">
              {form.thankText}
            </p>
          </div>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Estado: formulário ───────────────────────────────────────

  const progress = ((step) / form.questions.length) * 100

  return (
    <FormLayout agencyName={form.agencyName}>
      {/* Boas vindas (só no step 0) */}
      {step === 0 && (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <p className="text-zinc-300 text-sm leading-relaxed">{form.introText}</p>
        </div>
      )}

      {/* Progresso */}
      <div className="space-y-1.5 mb-6">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Pergunta {step + 1} de {form.questions.length}</span>
          <span>{Math.round(((step + 1) / form.questions.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / form.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Pergunta atual */}
      <div className="space-y-5">
        <div>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">
            {currentQ.required ? 'Obrigatória' : 'Opcional'}
          </p>
          <p className="text-white text-base font-medium leading-snug">{currentQ.text}</p>
        </div>

        {currentQ.type === 'scale' && (
          <ScaleInput
            value={answers[currentQ.id] as number | null}
            onChange={v => setAnswer(currentQ.id, v)}
          />
        )}

        {currentQ.type === 'text' && (
          <textarea
            value={(answers[currentQ.id] as string) ?? ''}
            onChange={e => setAnswer(currentQ.id, e.target.value)}
            placeholder="Escreva sua resposta aqui (opcional)..."
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
          />
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="text-zinc-500 hover:text-zinc-200 gap-1 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>

          {isLastStep ? (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canAdvance}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 disabled:opacity-40 px-6"
            >
              <Send className="w-3.5 h-3.5" /> Enviar respostas
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance}
              className="bg-zinc-700 hover:bg-zinc-600 text-white gap-1 disabled:opacity-40"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </FormLayout>
  )
}

// ── Layout wrapper ────────────────────────────────────────────────

function FormLayout({ agencyName, children }: { agencyName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{agencyName}</span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {children}
        </div>

        {/* Rodapé LGPD */}
        <p className="text-zinc-700 text-xs text-center mt-4 leading-relaxed">
          Suas respostas são confidenciais e serão usadas apenas para melhorar os serviços prestados.
          Em conformidade com a <span className="text-zinc-600">LGPD</span>.
        </p>
      </div>
    </div>
  )
}
