import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CadastroPage() {
  return (
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agency" className="text-zinc-300">Nome da agência</Label>
          <Input
            id="agency"
            placeholder="Minha Agência Digital"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300">Seu nome</Label>
          <Input
            id="name"
            placeholder="João Silva"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          />
        </div>

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
          <Label htmlFor="password" className="text-zinc-300">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
          />
        </div>

        {/* LGPD */}
        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            id="terms"
            className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
          />
          <label htmlFor="terms" className="text-zinc-400 text-xs leading-relaxed">
            Li e aceito os{' '}
            <span className="text-emerald-400 cursor-pointer hover:underline">Termos de Uso</span>
            {' '}e a{' '}
            <span className="text-emerald-400 cursor-pointer hover:underline">Política de Privacidade</span>
            , incluindo o processamento de dados dos meus clientes conforme a LGPD.
          </label>
        </div>

        <Link href="/onboarding">
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium">
            Criar conta
          </Button>
        </Link>
      </div>

      <p className="text-center text-zinc-500 text-sm mt-4">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Entrar
        </Link>
      </p>
    </div>
  )
}
