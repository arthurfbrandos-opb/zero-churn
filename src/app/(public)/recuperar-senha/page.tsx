import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RecuperarSenhaPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-white text-2xl font-bold">Recuperar senha</h1>
        <p className="text-zinc-400 text-sm mt-1 text-center">
          Informe seu e-mail e enviaremos um link de redefinição
        </p>
      </div>

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

        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium">
          Enviar link de recuperação
        </Button>
      </div>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mt-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o login
      </Link>
    </div>
  )
}
