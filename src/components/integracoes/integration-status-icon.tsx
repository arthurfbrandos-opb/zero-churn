import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { IntegrationStatus, IntegrationType } from '@/types'
import { cn } from '@/lib/utils'
import { MessageCircle, CreditCard, Building2, BarChart2 } from 'lucide-react'

interface IntegrationStatusIconProps {
  type: IntegrationType
  status: IntegrationStatus
}

const typeConfig: Record<IntegrationType, { label: string; icon: React.ElementType }> = {
  whatsapp:       { label: 'WhatsApp',        icon: MessageCircle },
  asaas:          { label: 'Asaas',           icon: CreditCard    },
  dom_pagamentos: { label: 'Dom Pagamentos',  icon: Building2     },
  meta_ads:       { label: 'Meta Ads',        icon: BarChart2     },
  google_ads:     { label: 'Google Ads',      icon: BarChart2     },
}

const statusColor: Record<IntegrationStatus, string> = {
  connected:    'text-emerald-400',
  error:        'text-red-400',
  expired:      'text-yellow-400',
  disconnected: 'text-zinc-600',
}

export function IntegrationStatusIcon({ type, status }: IntegrationStatusIconProps) {
  const { label, icon: Icon } = typeConfig[type]
  const colorClass = statusColor[status]

  const statusLabel: Record<IntegrationStatus, string> = {
    connected:    'Conectado',
    error:        'Erro',
    expired:      'Expirado',
    disconnected: 'Desconectado',
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('w-5 h-5 flex items-center justify-center', colorClass)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
          {label}: {statusLabel[status]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
