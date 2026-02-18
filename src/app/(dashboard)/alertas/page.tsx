'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell, BellOff, CheckCheck, Filter, ChevronRight,
  AlertTriangle, Zap, MessageCircle, BarChart2,
  CreditCard, ClipboardList, Plug, ShieldCheck,
  Check, X, Search,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert } from '@/types'
import { cn } from '@/lib/utils'

// ── Tipos de alerta ───────────────────────────────────────────────

type SeverityFilter = 'all' | 'high' | 'medium' | 'low'
type ReadFilter     = 'all' | 'unread' | 'read'

const ALERT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  chargeback:              { label: 'Chargeback',            icon: CreditCard,   color: 'text-red-400 bg-red-500/10'      },
  silence:                 { label: 'Silêncio WhatsApp',     icon: MessageCircle,color: 'text-red-400 bg-red-500/10'      },
  integration_error:       { label: 'Erro de Integração',    icon: Plug,         color: 'text-orange-400 bg-orange-500/10' },
  nps_drop:                { label: 'Queda de NPS',          icon: BarChart2,    color: 'text-yellow-400 bg-yellow-500/10' },
  form_no_response:        { label: 'Sem Resposta',          icon: ClipboardList,color: 'text-yellow-400 bg-yellow-500/10' },
  score_drop:              { label: 'Queda de Score',        icon: AlertTriangle,color: 'text-orange-400 bg-orange-500/10' },
  renewal_soon:            { label: 'Renovação Próxima',     icon: Zap,          color: 'text-blue-400 bg-blue-500/10'    },
  registration_incomplete: { label: 'Cadastro Incompleto',   icon: ShieldCheck,  color: 'text-yellow-400 bg-yellow-500/10' },
}

const SEVERITY_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  high:   { label: 'Alta',  dot: 'bg-red-500',    badge: 'text-red-400 border-red-500/30 bg-red-500/10'       },
  medium: { label: 'Média', dot: 'bg-yellow-500', badge: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'},
  low:    { label: 'Baixa', dot: 'bg-zinc-500',   badge: 'text-zinc-400 border-zinc-600 bg-zinc-800'          },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRelative(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}

// ─────────────────────────────────────────────────────────────────

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [severity, setSeverity] = useState<SeverityFilter>('all')

  // Carrega alertas reais do banco
  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.alerts?.length) {
          const dbAlerts: Alert[] = d.alerts.map((a: {
            id: string; client_id: string | null; type: string; severity: string
            message: string; is_read: boolean; created_at: string
            clients?: { name: string; nome_resumido: string | null }
          }) => ({
            id:         a.id,
            clientId:   a.client_id ?? '',
            clientName: a.clients?.nome_resumido ?? a.clients?.name ?? 'Cliente',
            type:       a.type,
            severity:   a.severity as 'high' | 'medium' | 'low',
            message:    a.message,
            isRead:     a.is_read,
            createdAt:  a.created_at,
          }))
          setAlerts(dbAlerts)
        }
      })
      .catch(() => { /* mantém array vazio */ })
      .finally(() => setLoadingAlerts(false))
  }, [])

  void loadingAlerts // evita lint warning
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = alerts.filter(a => {
    if (severity !== 'all' && a.severity !== severity) return false
    if (readFilter === 'unread' && a.isRead)  return false
    if (readFilter === 'read'   && !a.isRead) return false
    if (search && !a.clientName.toLowerCase().includes(search.toLowerCase())
               && !a.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const unreadCount = alerts.filter(a => !a.isRead).length

  function markRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
  }

  function markAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
  }

  // Agrupa por data
  const grouped: Record<string, Alert[]> = {}
  filtered.forEach(a => {
    const key = a.createdAt
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(a)
  })
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div className="min-h-screen">
      <Header
        title="Central de Alertas"
        description={unreadCount > 0 ? `${unreadCount} alerta${unreadCount > 1 ? 's' : ''} não lido${unreadCount > 1 ? 's' : ''}` : 'Todos os alertas lidos'}
        action={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline"
              onClick={markAllRead}
              className="border-zinc-700 text-zinc-400 hover:text-white gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todos como lidos
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">

        {/* ── Resumo por severidade ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['high', 'medium', 'low'] as const).map(sev => {
            const count = alerts.filter(a => a.severity === sev).length
            const unread = alerts.filter(a => a.severity === sev && !a.isRead).length
            const cfg = SEVERITY_CONFIG[sev]
            return (
              <button key={sev}
                onClick={() => setSeverity(severity === sev ? 'all' : sev)}
                className={cn('p-4 rounded-xl border text-left transition-all',
                  severity === sev ? 'border-zinc-600 bg-zinc-800' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700')}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                  <span className="text-zinc-400 text-xs font-medium">Severidade {cfg.label}</span>
                </div>
                <p className="text-white text-2xl font-bold">{count}</p>
                {unread > 0 && (
                  <p className="text-zinc-500 text-xs mt-0.5">{unread} não lido{unread > 1 ? 's' : ''}</p>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Filtros ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              placeholder="Buscar por cliente ou mensagem..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-200 pl-8 text-sm focus-visible:ring-emerald-500 h-9"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {([
              { value: 'all',    label: 'Todos'      },
              { value: 'unread', label: 'Não lidos'  },
              { value: 'read',   label: 'Lidos'      },
            ] as const).map(opt => (
              <button key={opt.value}
                onClick={() => setReadFilter(opt.value)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  readFilter === opt.value ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                {opt.label}
              </button>
            ))}
          </div>

          {(severity !== 'all' || readFilter !== 'all' || search) && (
            <Button size="sm" variant="ghost"
              onClick={() => { setSeverity('all'); setReadFilter('all'); setSearch('') }}
              className="text-zinc-500 hover:text-white gap-1 text-xs">
              <X className="w-3 h-3" /> Limpar filtros
            </Button>
          )}
        </div>

        {/* ── Lista de alertas ──────────────────────────────────── */}
        {filtered.length === 0 ? (
          /* Estado vazio */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-zinc-300 font-semibold text-base">Tudo limpo por aqui!</p>
            <p className="text-zinc-500 text-sm mt-1">
              {search || severity !== 'all' || readFilter !== 'all'
                ? 'Nenhum alerta encontrado com os filtros atuais.'
                : 'Nenhum alerta no momento. Sua carteira está saudável 🎉'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                {/* Separador de data */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-zinc-500 text-xs font-medium">{formatDate(date)}</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-zinc-700 text-xs">{formatRelative(date)}</span>
                </div>

                <div className="space-y-2">
                  {grouped[date].map(alert => {
                    const typeCfg = ALERT_TYPE_CONFIG[alert.type] ?? {
                      label: alert.type, icon: Bell, color: 'text-zinc-400 bg-zinc-800'
                    }
                    const sevCfg = SEVERITY_CONFIG[alert.severity]
                    const Icon = typeCfg.icon

                    return (
                      <Card key={alert.id}
                        className={cn('border transition-all',
                          !alert.isRead
                            ? alert.severity === 'high'   ? 'bg-red-500/5 border-red-500/20'
                            : alert.severity === 'medium' ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-zinc-900 border-zinc-700'
                            : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                        )}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Ícone do tipo */}
                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', typeCfg.color)}>
                              <Icon className="w-4 h-4" />
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={cn('text-xs', sevCfg.badge)}>
                                  {sevCfg.label}
                                </Badge>
                                <span className="text-zinc-500 text-xs">{typeCfg.label}</span>
                                {!alert.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" title="Não lido" />
                                )}
                              </div>
                              <p className={cn('text-sm leading-snug', alert.isRead ? 'text-zinc-500' : 'text-zinc-200')}>
                                {alert.message}
                              </p>
                            </div>

                            {/* Ações */}
                            <div className="flex items-center gap-2 shrink-0">
                              {!alert.isRead && (
                                <button onClick={() => markRead(alert.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                  title="Marcar como lido">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <Link href={`/clientes/${alert.clientId}`}>
                                <button className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800">
                                  {alert.clientName.split(' ').slice(0, 2).join(' ')}
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
