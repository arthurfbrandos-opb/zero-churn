'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ── Tradução de erros do Supabase ─────────────────────────────────
function translateError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login') || lower.includes('invalid credentials'))
    return 'E-mail ou senha incorretos.'
  if (lower.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
  if (lower.includes('too many requests') || lower.includes('rate limit'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (lower.includes('user not found'))
    return 'Nenhuma conta encontrada com este e-mail.'
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Falha de conexão. Verifique sua internet e tente novamente.'
  return 'Erro ao entrar. Tente novamente.'
}

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/dashboard'
  const emailParam   = searchParams.get('email') ?? ''
  const errorParam   = searchParams.get('error')
  const verificado   = searchParams.get('verificado') === '1'

  const [email,    setEmail]    = useState(emailParam)
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(
    errorParam ? decodeURIComponent(errorParam) : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(translateError(authError.message))
        return
      }
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Zero Churn</h1>
          <p className="text-zinc-400 text-sm mt-1">Entre na sua conta</p>
        </div>

        {/* Banner: e-mail verificado com sucesso */}
        {verificado && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-emerald-400 text-sm">E-mail confirmado! Faça login para continuar.</p>
          </div>
        )}

        {/* Form */}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-300">Senha</Label>
              <Link href="/recuperar-senha"
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium mt-2 disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</>
              : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          Não tem uma conta?{' '}
          <Link href="/cadastro" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
