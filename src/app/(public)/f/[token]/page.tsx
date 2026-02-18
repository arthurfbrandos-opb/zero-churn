'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Zap, Star, Send, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────

interface FormData {
  tokenId:        string
  token:          string
  expired:        boolean
  alreadyResponded: boolean
  clientName:     string
  agencyName:     string
  agencyLogoUrl:  string | null
  expiresAt:      string | null
  sentAt:         string | null
}

// ── Componente de escala 0-10 ─────────────────────────────────────

function ScaleInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  const getColor = (n: number) => {
    if (value === null)
      return 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
    if (n !== value)
      return 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700'
    if (n >= 9)
      return 'bg-emerald-500 border-emerald-400 text-white scale-110 shadow-lg shadow-emerald-500/20'
    if (n >= 7)
      return 'bg-yellow-500 border-yellow-400 text-white scale-110 shadow-lg shadow-yellow-500/20'
    return 'bg-red-500 border-red-400 text-white scale-110 shadow-lg shadow-red-500/20'
  }

  const label =
    value === null       ? null
    : value >= 9  ? '😊 Muito provável'
    : value >= 7  ? '😐 Possível'
    : value >= 5  ? '😕 Pouco provável'
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
        <p
          className={cn(
            'text-sm font-medium',
            value! >= 9 ? 'text-emerald-400' : value! >= 7 ? 'text-yellow-400' : 'text-red-400'
          )}
        >
          {label}
        </p>
      )}
    </div>
  )
}

// ── Layout wrapper ────────────────────────────────────────────────

function FormLayout({
  agencyName,
  children,
}: {
  agencyName: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-lg mx-auto">
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
        Suas respostas são confidenciais e serão usadas apenas para melhorar os
        serviços prestados. Em conformidade com a{' '}
        <span className="text-zinc-600">LGPD</span>.
      </p>
    </div>
  )
}

// ── Perguntas do formulário ───────────────────────────────────────

interface Question {
  id:       string
  type:     'scale' | 'text'
  text:     string
  required: boolean
}

function buildQuestions(agencyName: string, clientName: string): Question[] {
  return [
    {
      id:       'nps',
      type:     'scale',
      text:     `Em uma escala de 0 a 10, o quanto você indicaria a ${agencyName} para um amigo ou colega de negócios?`,
      required: true,
    },
    {
      id:       'resultado',
      type:     'scale',
      text:     `Em uma escala de 0 a 10, qual o impacto que os serviços da ${agencyName} estão tendo nos resultados de ${clientName}?`,
      required: true,
    },
    {
      id:       'comentario',
      type:     'text',
      text:     'O que podemos fazer para melhorar nossos serviços?',
      required: false,
    },
  ]
}

// ── Página principal ──────────────────────────────────────────────

type PageState = 'loading' | 'form' | 'sending' | 'done' | 'expired' | 'already_responded' | 'error'

export default function FormularioPublicoPage() {
  const params = useParams()
  const token  = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [formData,  setFormData]  = useState<FormData | null>(null)
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)

  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string | null>>({
    nps:        null,
    resultado:  null,
    comentario: '',
  })

  // Busca dados do token
  useEffect(() => {
    if (!token) return
    fetch(`/api/forms/${token}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          if (data.code === 'NOT_FOUND') { setPageState('error'); setErrorMsg('Formulário não encontrado.') }
          else { setPageState('error'); setErrorMsg(data.error ?? 'Erro ao carregar formulário.') }
          return
        }
        setFormData(data as FormData)
        if (data.expired)          setPageState('expired')
        else if (data.alreadyResponded) setPageState('already_responded')
        else                       setPageState('form')
      })
      .catch(() => {
        setPageState('error')
        setErrorMsg('Não foi possível carregar o formulário. Tente novamente.')
      })
  }, [token])

  const questions = formData
    ? buildQuestions(formData.agencyName, formData.clientName)
    : []

  const currentQ   = questions[step]
  const isLastStep = step === questions.length - 1
  const canAdvance = currentQ?.required
    ? answers[currentQ.id] !== null && answers[currentQ.id] !== '' && answers[currentQ.id] !== undefined
    : true

  function setAnswer(id: string, val: number | string) {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  async function handleSubmit() {
    if (!formData) return
    setPageState('sending')

    try {
      const res = await fetch(`/api/forms/${token}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          npsScore:       answers.nps       as number,
          scoreResultado: answers.resultado as number,
          comment:        answers.comentario || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'EXPIRED')           { setPageState('expired'); return }
        if (data.code === 'ALREADY_RESPONDED') { setPageState('already_responded'); return }
        setPageState('error')
        setErrorMsg(data.error ?? 'Erro ao enviar resposta.')
        return
      }

      setPageState('done')
    } catch {
      setPageState('error')
      setErrorMsg('Não foi possível enviar sua resposta. Verifique sua conexão e tente novamente.')
    }
  }

  const agencyName = formData?.agencyName ?? '...'
  const clientName = formData?.clientName ?? ''

  // ── Loading ──────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <FormLayout agencyName="Carregando...">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-zinc-500 text-sm">Carregando formulário…</p>
        </div>
      </FormLayout>
    )
  }

  // ── Erro ─────────────────────────────────────────────────────────

  if (pageState === 'error') {
    return (
      <FormLayout agencyName="Zero Churn">
        <div className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <p className="text-white text-xl font-semibold">Algo deu errado</p>
            <p className="text-zinc-400 text-sm mt-2">
              {errorMsg ?? 'Não foi possível carregar este formulário.'}
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Entre em contato com a agência para obter um novo link.
            </p>
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Expirado ─────────────────────────────────────────────────────

  if (pageState === 'expired') {
    return (
      <FormLayout agencyName={agencyName}>
        <div className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <p className="text-white text-xl font-semibold">Link expirado</p>
            <p className="text-zinc-400 text-sm mt-2">
              Este link de pesquisa não é mais válido.
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Entre em contato com a agência para receber um novo link.
            </p>
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Já respondido ────────────────────────────────────────────────

  if (pageState === 'already_responded') {
    return (
      <FormLayout agencyName={agencyName}>
        <div className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-white text-xl font-semibold">Você já respondeu!</p>
            <p className="text-zinc-400 text-sm mt-2">
              Sua resposta já foi registrada. Obrigado!
            </p>
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Enviando ─────────────────────────────────────────────────────

  if (pageState === 'sending') {
    return (
      <FormLayout agencyName={agencyName}>
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Send className="w-7 h-7 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-zinc-300 text-sm">Enviando suas respostas…</p>
        </div>
      </FormLayout>
    )
  }

  // ── Concluído ────────────────────────────────────────────────────

  if (pageState === 'done') {
    return (
      <FormLayout agencyName={agencyName}>
        <div className="flex flex-col items-center text-center py-10 gap-5">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-2xl font-bold">Obrigado! 🎉</p>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed max-w-sm mx-auto">
              Seu feedback é muito importante para nós. Em breve entraremos em contato.
            </p>
          </div>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>
      </FormLayout>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────

  return (
    <FormLayout agencyName={agencyName}>
      {/* Boas-vindas (só no step 0) */}
      {step === 0 && (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Olá{clientName ? `, ${clientName}` : ''}! Gostaríamos de entender sua
            experiência com a {agencyName}. Sua opinião é fundamental para continuarmos
            evoluindo. Leva menos de 2 minutos. 🙏
          </p>
        </div>
      )}

      {/* Progresso */}
      <div className="space-y-1.5 mb-6">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Pergunta {step + 1} de {questions.length}</span>
          <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Pergunta atual */}
      <div className="space-y-5">
        <div>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">
            {currentQ?.required ? 'Obrigatória' : 'Opcional'}
          </p>
          <p className="text-white text-base font-medium leading-snug">
            {currentQ?.text}
          </p>
        </div>

        {currentQ?.type === 'scale' && (
          <ScaleInput
            value={answers[currentQ.id] as number | null}
            onChange={v => setAnswer(currentQ.id, v)}
          />
        )}

        {currentQ?.type === 'text' && (
          <textarea
            value={(answers[currentQ.id] as string) ?? ''}
            onChange={e => setAnswer(currentQ.id, e.target.value)}
            placeholder="Escreva sua resposta aqui (opcional)…"
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
