'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Bell, Settings,
  Activity, Zap, Kanban, ChevronRight, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAlertsCount } from '@/hooks/use-alerts-count'
import { useAgency } from '@/hooks/use-agency'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: 'alerts'
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Monitorar',
    items: [
      { href: '/dashboard',  label: 'Visão Geral',  icon: LayoutDashboard },
      { href: '/clientes',   label: 'Clientes',      icon: Users },
      { href: '/alertas',    label: 'Alertas',        icon: Bell, badge: 'alerts' },
    ],
  },
  {
    title: 'Gerenciar',
    items: [
      { href: '/financeiro',   label: 'Financeiro',   icon: DollarSign },
      { href: '/operacional',  label: 'Operacional',  icon: Activity },
      { href: '/planejamento', label: 'Planejamento', icon: Kanban },
    ],
  },
  {
    title: 'Configurar',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const unreadCount = useAlertsCount()
  const { agency, user } = useAgency()

  const initials = agency?.name
    ? agency.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const planLabel: Record<string, string> = {
    starter:    'Starter',
    growth:     'Growth',
    agency:     'Agency',
    enterprise: 'Enterprise',
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-zinc-950 border-r border-zinc-800/60 flex-col z-40">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-800/60">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight tracking-tight">Zero Churn</p>
            <p className="text-zinc-600 text-[10px]">Retenção inteligente</p>
          </div>
        </Link>
      </div>

      {/* Grouped navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5">
        {navGroups.map(group => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-zinc-600 text-[10px] font-semibold uppercase tracking-widest">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative',
                      active
                        ? 'bg-emerald-500/10 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-500 rounded-r-full" />
                    )}
                    <Icon className={cn('w-4 h-4 shrink-0 transition-colors duration-200', active ? 'text-emerald-400' : 'text-zinc-500')} />
                    <span className="flex-1">{label}</span>
                    {badge === 'alerts' && unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center rounded-full">
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — agency */}
      <div className="px-4 py-4 border-t border-zinc-800/60">
        <Link href="/configuracoes" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0 ring-1 ring-emerald-500/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-xs font-medium truncate group-hover:text-white transition-colors duration-200">
              {agency?.name ?? user?.email ?? 'Carregando...'}
            </p>
            <p className="text-zinc-600 text-[10px]">{planLabel[agency?.plan ?? ''] ?? ''}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors duration-200" />
        </Link>
      </div>
    </aside>
  )
}
