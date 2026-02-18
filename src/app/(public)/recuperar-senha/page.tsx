'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Zap, ArrowLeft, Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

function RecuperarSenhaForm() {
  const searchParams = useSearchParams()
  const errorParam   = searchParams.get('error')

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(
    errorParam === 'link_expirado'
      ? 'Seu link de redefinição expirou ou já foi usado. Solicite um novo abaixo.'
      : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        // O Supabase enviará para este redirectTo
        // Em produção usa NEXT_PUBLIC_APP_URL; em dev usa localhost
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      // Supabase retorna sucesso mesmo se o e-mail não existe (prevenção de enumeração)
      if (err) throw err
      setSent(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit')) {
        setError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
      } else {
        setError('Erro ao enviar. Verifique o e-mail e tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Estado: enviado ──────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Mail className="w-9 h-9 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-white text-2xl font-bold mb-2">Verifique seu e-mail</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-1">
            Se existe uma conta com{' '}
            <span className="text-zinc-200 font-medium">{email}</span>,
            você receberá um link para redefinir sua senha em instantes.
          </p>
          <p className="text-zinc-600 text-xs mt-2">Verifique também a pasta de spam.</p>

          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-3">
            {[
              'Abra o e-mail "Redefinir senha — Zero Churn"',
              'Clique em "Redefinir minha senha"',
              'Crie uma nova senha segura',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-emerald-400 text-[10px] font-bold">{i + 1}</span>
                </div>
                <p className="text-zinc-400 text-sm">{step}</p>
              </div>
            ))}
          </div>

          <Link href="/login"
            className="mt-5 flex items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  // ── Estado: formulário ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Recuperar senha</h1>
          <p className="text-zinc-400 text-sm mt-1 text-center">
            Informe seu e-mail e enviaremos um link de redefinição
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
          autoComplete="on">

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@agencia.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
              : 'Enviar link de recuperação'}
          </Button>
        </form>

        <Link href="/login"
          className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mt-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>
      </div>
    </div>
  )
}

export default function RecuperarSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    }>
      <RecuperarSenhaForm />
    </Suspense>
  )
}
