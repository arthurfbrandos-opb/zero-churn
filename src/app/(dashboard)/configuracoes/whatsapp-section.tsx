'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Loader2, Check, X, QrCode, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Image from 'next/image'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white font-semibold text-base mb-1.5">{children}</h2>
}

export function WhatsAppSection() {
  const [status, setStatus] = useState<{
    connected: boolean
    phone?: string
    state?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp/agency/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Error loading status:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    setQrCode(null)

    try {
      const res = await fetch('/api/whatsapp/agency/connect', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        if (data.connected) {
          // Já está conectado
          await loadStatus()
        } else {
          setError(data.error || 'Erro ao conectar')
        }
        return
      }

      if (data.qrCode) {
        setQrCode(data.qrCode)
        
        // Poll status a cada 3s até conectar
        const intervalId = setInterval(async () => {
          const statusRes = await fetch('/api/whatsapp/agency/status')
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            if (statusData.connected) {
              clearInterval(intervalId)
              setQrCode(null)
              setStatus(statusData)
              setConnecting(false)
            }
          }
        }, 3000)

        // Timeout de 2 minutos
        setTimeout(() => {
          clearInterval(intervalId)
          if (qrCode) {
            setQrCode(null)
            setError('Timeout: QR Code expirou. Tente novamente.')
            setConnecting(false)
          }
        }, 120000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar WhatsApp da agência? Isso afetará todos os clientes.')) return

    setLoading(true)
    try {
      await fetch('/api/whatsapp/agency/disconnect', { method: 'DELETE' })
      setStatus({ connected: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <SectionTitle>WhatsApp da Agência</SectionTitle>
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando status...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SectionTitle>WhatsApp da Agência</SectionTitle>
      
      <p className="text-zinc-500 text-sm">
        Conecte o WhatsApp da sua agência para monitorar grupos de clientes e análise de sentimento.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Status */}
      <div className={cn(
        'rounded-xl border p-4',
        status?.connected
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-zinc-900 border-zinc-800'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              status?.connected ? 'bg-emerald-500/15' : 'bg-zinc-800'
            )}>
              <MessageCircle className={cn(
                'w-5 h-5',
                status?.connected ? 'text-emerald-400' : 'text-zinc-600'
              )} />
            </div>
            <div>
              <p className="text-zinc-200 font-medium text-sm">
                {status?.connected ? 'WhatsApp Conectado' : 'Não Conectado'}
              </p>
              {status?.phone && (
                <p className="text-zinc-500 text-xs">
                  Número: {status.phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn(
            'text-xs',
            status?.connected
              ? 'text-emerald-400 border-emerald-500/30'
              : 'text-zinc-500 border-zinc-700'
          )}>
            {status?.connected ? '✓ Online' : 'Offline'}
          </Badge>
        </div>

        {/* QR Code Modal */}
        {qrCode && (
          <div className="border-t border-emerald-500/20 pt-4 mt-2">
            <div className="bg-white rounded-xl p-4 inline-block">
              <Image src={qrCode} alt="QR Code" width={256} height={256} />
            </div>
            <p className="text-zinc-400 text-xs mt-2">
              Escaneie com WhatsApp → Menu (⋮) → Aparelhos Conectados → Conectar Aparelho
            </p>
            <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Aguardando escaneamento...
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-zinc-800">
          {status?.connected ? (
            <>
              <Button size="sm" variant="outline" onClick={loadStatus}
                className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar Status
              </Button>
              <Button size="sm" variant="outline" onClick={handleDisconnect}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs">
                <X className="w-3.5 h-3.5" /> Desconectar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={connecting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
              {connecting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando...</>
              ) : (
                <><QrCode className="w-3.5 h-3.5" /> Conectar WhatsApp</>
              )}
            </Button>
          )}
        </div>
      </div>

      {status?.connected && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-blue-300 text-xs">
          ✅ Agora você pode selecionar grupos nos clientes de forma rápida!
        </div>
      )}
    </div>
  )
}
