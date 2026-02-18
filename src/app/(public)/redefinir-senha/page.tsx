'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ── Força da senha (idêntica ao cadastro) ─────────────────────────
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
  const bars = Array.from({ length: 4 }, (_, i) => i < score ? color : 'bg-zinc-700')
  return { score, label, bars }
}

export default function RedefinirSenhaPage() {
  const router = useRouter()

  const [password,      setPassword]      = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [checkingAuth,  setCheckingAuth]  = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [done,          setDone]          = useState(false)

  const strength   = calcStrength(password)
  const pwMatch    = confirmPw.length > 0 && password === confirmPw
  const pwMismatch = confirmPw.length > 0 && password !== confirmPw

  // Verifica se há sessão ativa (o /auth/callback já deve ter feito o exchange)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Sessão não encontrada → link inválido ou expirado → manda para recuperar senha
        router.replace('/recuperar-senha?error=link_expirado')
      }
    }).finally(() => setCheckingAuth(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPw) { setError('As senhas não coincidem.'); return }
    if (password.length < 8)   { setError('A senha precisa ter no mínimo 8 caracteres.'); return }
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      // Redireciona para o dashboard após 2s
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('same password') || msg.toLowerCase().includes('same as')) {
        setError('A nova senha não pode ser igual à atual.')
      } else {
        setError('Erro ao redefinir senha. O link pode ter expirado.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Carregando sessão ───────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }

  // ── Sucesso ─────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-xl font-bold">Senha redefinida!</p>
            <p className="text-zinc-400 text-sm mt-1">Redirecionando para o dashboard...</p>
          </div>
          <Loader2 className="w-4 h-4 text-zinc-600 animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // ── Formulário ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Nova senha</h1>
          <p className="text-zinc-400 text-sm mt-1 text-center">
            Escolha uma senha forte para proteger sua conta
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
          autoComplete="off">

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Nova senha */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Nova senha</Label>
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

            {password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {strength.bars.map((color, i) => (
                    <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', color)} />
                  ))}
                </div>
                <p className={cn('text-xs', {
                  'text-red-400':     strength.score === 0,
                  'text-orange-400':  strength.score === 1,
                  'text-yellow-400':  strength.score === 2,
                  'text-blue-400':    strength.score === 3,
                  'text-emerald-400': strength.score === 4,
                })}>{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPw" className="text-zinc-300">Confirmar nova senha</Label>
            <div className="relative">
              <Input id="confirmPw"
                type={showConfirmPw ? 'text' : 'password'}
                placeholder="Repita a nova senha"
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
            {pwMatch    && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Senhas conferem
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !pwMatch || password.length < 8}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : <><ShieldCheck className="w-4 h-4 mr-2" />Salvar nova senha</>}
          </Button>
        </form>
      </div>
    </div>
  )
}
