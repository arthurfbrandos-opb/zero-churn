'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()

  const [agencyName, setAgencyName] = useState('')
  const [ownerName, setOwnerName]   = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [terms, setTerms]           = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)

  const canSubmit = agencyName && ownerName && email && password.length >= 8 && terms && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)

    try {
      // 1. Criar agência + usuário via API route (usa service_role)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, agencyName, ownerName }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Mostra a mensagem real do servidor para facilitar debug
        setError(data.error ?? `Erro ${res.status} ao criar conta.`)
        return
      }

      // 2. Logar automaticamente após cadastro
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

      if (loginError) {
        // Conta criada mas login falhou — redireciona pro login
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      router.push('/dashboard')
      router.refresh()

    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="text-white font-semibold">Conta criada com sucesso!</p>
          <p className="text-zinc-400 text-sm">Redirecionando para o login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Zero Churn</h1>
          <p className="text-zinc-400 text-sm mt-1">Crie sua conta grátis</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="agency" className="text-zinc-300">Nome da agência</Label>
            <Input id="agency" placeholder="Minha Agência Digital"
              value={agencyName} onChange={e => setAgencyName(e.target.value)}
              required disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Seu nome</Label>
            <Input id="name" placeholder="João Silva"
              value={ownerName} onChange={e => setOwnerName(e.target.value)}
              required disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
            <Input id="email" type="email" placeholder="voce@agencia.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Senha</Label>
            <Input id="password" type="password" placeholder="Mínimo 8 caracteres"
              value={password} onChange={e => setPassword(e.target.value)}
              required disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500" />
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-amber-400">Mínimo 8 caracteres</p>
            )}
          </div>

          {/* LGPD */}
          <div className="flex items-start gap-3 pt-1">
            <input type="checkbox" id="terms"
              checked={terms} onChange={e => setTerms(e.target.checked)}
              disabled={loading}
              className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0 cursor-pointer" />
            <label htmlFor="terms" className="text-zinc-400 text-xs leading-relaxed cursor-pointer">
              Li e aceito os{' '}
              <span className="text-emerald-400 hover:underline">Termos de Uso</span>
              {' '}e a{' '}
              <span className="text-emerald-400 hover:underline">Política de Privacidade</span>
              , incluindo o processamento de dados dos meus clientes conforme a LGPD.
            </label>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando conta...</>
              : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
