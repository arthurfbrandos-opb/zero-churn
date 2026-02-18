'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Zap, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ── Força da senha ────────────────────────────────────────────────
function calcStrength(pw: string): { score: number; label: string; bars: string[] } {
  if (!pw) return { score: 0, label: '', bars: [] }
  let score = 0
  if (pw.length >= 8)                                  score++
  if (pw.length >= 12)                                 score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))          score++
  if (/\d/.test(pw))                                   score++
  if (/[^A-Za-z0-9]/.test(pw))                        score++
  score = Math.min(4, score)

  const config = [
    { label: 'Muito fraca', color: 'bg-red-500'     },
    { label: 'Fraca',       color: 'bg-orange-500'  },
    { label: 'Razoável',    color: 'bg-yellow-500'  },
    { label: 'Boa',         color: 'bg-blue-400'    },
    { label: 'Forte',       color: 'bg-emerald-500' },
  ]
  const { label, color } = config[score]
  const bars = Array.from({ length: 4 }, (_, i) =>
    i < score ? color : 'bg-zinc-700'
  )
  return { score, label, bars }
}

// ── Tradução de erros ─────────────────────────────────────────────
function translateError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('e-mail já'))
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.'
  if (lower.includes('password') && lower.includes('weak'))
    return 'Senha muito fraca. Use letras, números e símbolos.'
  if (lower.includes('invalid email'))
    return 'E-mail inválido.'
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Muitas tentativas. Aguarde alguns minutos.'
  return msg
}

export default function CadastroPage() {
  const router = useRouter()

  const [agencyName,    setAgencyName]    = useState('')
  const [ownerName,     setOwnerName]     = useState('')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [terms,         setTerms]         = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const strength   = calcStrength(password)
  const pwMatch    = confirmPw.length > 0 && password === confirmPw
  const pwMismatch = confirmPw.length > 0 && password !== confirmPw

  const canSubmit = !!(
    agencyName && ownerName && email &&
    password.length >= 8 && pwMatch &&
    terms && !loading
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (password !== confirmPw) { setError('As senhas não coincidem.'); return }
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, agencyName, ownerName }),
      })

      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        setError(`Erro do servidor (HTTP ${res.status}). Tente novamente.`)
        return
      }

      const data = await res.json()
      if (!res.ok) {
        setError(translateError(data.error ?? `Erro ${res.status}`))
        return
      }

      // Sucesso → redireciona para tela "verifique seu e-mail"
      router.push(`/verificar-email?email=${encodeURIComponent(email)}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
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
          <p className="text-zinc-400 text-sm mt-1">Crie sua conta grátis</p>
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

          {/* Agência */}
          <div className="space-y-2">
            <Label htmlFor="agency" className="text-zinc-300">Nome da agência</Label>
            <Input id="agency" placeholder="Minha Agência Digital"
              value={agencyName} onChange={e => setAgencyName(e.target.value)}
              required disabled={loading} autoComplete="organization"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Seu nome</Label>
            <Input id="name" placeholder="João Silva"
              value={ownerName} onChange={e => setOwnerName(e.target.value)}
              required disabled={loading} autoComplete="name"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          {/* E-mail */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
            <Input id="email" type="email" placeholder="voce@agencia.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required disabled={loading} autoComplete="email"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Senha</Label>
            <div className="relative">
              <Input id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password} onChange={e => setPassword(e.target.value)}
                required disabled={loading} autoComplete="new-password"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500 pr-10" />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicador de força */}
            {password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {strength.bars.map((color, i) => (
                    <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-300', color)} />
                  ))}
                </div>
                <p className={cn('text-xs', {
                  'text-red-400':     strength.score === 0,
                  'text-orange-400':  strength.score === 1,
                  'text-yellow-400':  strength.score === 2,
                  'text-blue-400':    strength.score === 3,
                  'text-emerald-400': strength.score === 4,
                })}>{strength.label}</p>
                {strength.score < 3 && (
                  <p className="text-zinc-600 text-xs">
                    Dica: misture maiúsculas, números e símbolos (!@#)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPw" className="text-zinc-300">Confirmar senha</Label>
            <div className="relative">
              <Input id="confirmPw"
                type={showConfirmPw ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                required disabled={loading} autoComplete="new-password"
                className={cn(
                  'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500 pr-10',
                  pwMismatch && 'border-red-500/60',
                  pwMatch    && 'border-emerald-500/60',
                )} />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={showConfirmPw ? 'Ocultar senha' : 'Mostrar senha'}>
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwMismatch && <p className="text-xs text-red-400">As senhas não coincidem.</p>}
            {pwMatch    && <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Senhas conferem
            </p>}
          </div>

          {/* LGPD */}
          <div className="flex items-start gap-3 pt-1">
            <input type="checkbox" id="terms"
              checked={terms} onChange={e => setTerms(e.target.checked)}
              disabled={loading}
              className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0 cursor-pointer" />
            <label htmlFor="terms" className="text-zinc-400 text-xs leading-relaxed cursor-pointer">
              Li e aceito os{' '}
              <span className="text-emerald-400 hover:underline cursor-pointer">Termos de Uso</span>{' '}
              e a{' '}
              <span className="text-emerald-400 hover:underline cursor-pointer">Política de Privacidade</span>,
              incluindo o tratamento de dados dos meus clientes conforme a LGPD.
            </label>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando conta...</>
              : <><ShieldCheck className="w-4 h-4 mr-2" />Criar conta</>}
          </Button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
