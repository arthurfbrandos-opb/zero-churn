'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

function VerificarEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [resending, setResending] = useState(false)
  const [resent,    setResent]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleReenviar() {
    if (!email || resending) return
    setResending(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) throw err
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit')) {
        setError('Aguarde alguns minutos antes de reenviar.')
      } else {
        setError('Erro ao reenviar. Tente novamente.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">

        {/* Ícone animado */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Mail className="w-9 h-9 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold mb-2">Verifique seu e-mail</h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Enviamos um link de confirmação para{' '}
          {email
            ? <span className="text-zinc-200 font-medium">{email}</span>
            : 'seu e-mail'
          }.
          <br />
          Clique no link para ativar sua conta.
        </p>

        {/* Checklist de próximos passos */}
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-3">
          {[
            'Abra sua caixa de entrada (e a pasta de spam)',
            'Clique em "Confirmar e-mail" no e-mail da Zero Churn',
            'Você será redirecionado ao dashboard automaticamente',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-emerald-400 text-[10px] font-bold">{i + 1}</span>
              </div>
              <p className="text-zinc-400 text-sm">{step}</p>
            </div>
          ))}
        </div>

        {/* Reenviar */}
        <div className="mt-5 space-y-2">
          {resent && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>E-mail reenviado!</span>
            </div>
          )}
          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}
          <Button
            variant="outline"
            onClick={handleReenviar}
            disabled={resending || resent}
            className="w-full border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 gap-2"
          >
            {resending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Reenviando...</>
              : <><RefreshCw className="w-4 h-4" />Reenviar e-mail</>}
          </Button>
        </div>

        <Link href="/login"
          className="mt-4 flex items-center justify-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
        </Link>
      </div>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    }>
      <VerificarEmailContent />
    </Suspense>
  )
}
