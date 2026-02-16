import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-white text-2xl font-bold">Zero Churn</h1>
        <p className="text-zinc-400 text-sm mt-1">Entre na sua conta</p>
      </div>

      {/* Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@agencia.com"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-zinc-300">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs text-emerald-400 hover:text-emerald-300">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          />
        </div>

        <Link href="/dashboard">
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium mt-2">
            Entrar
          </Button>
        </Link>
      </div>

      <p className="text-center text-zinc-500 text-sm mt-4">
        Não tem uma conta?{' '}
        <Link href="/cadastro" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Criar conta grátis
        </Link>
      </p>
    </div>
  )
}
