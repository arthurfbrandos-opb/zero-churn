'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Bell, Settings,
  Activity, Zap, Kanban, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getUnreadAlertsCount } from '@/lib/mock-data'

const mainNav = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/clientes',      label: 'Clientes',     icon: Users           },
  { href: '/alertas',       label: 'Alertas',      icon: Bell            },
  { href: '/operacional',   label: 'Operacional',  icon: Activity        },
  { href: '/configuracoes', label: 'Configurações',icon: Settings        },
]

export function Sidebar() {
  const pathname = usePathname()
  const unreadCount = getUnreadAlertsCount()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-zinc-950 border-r border-zinc-800 flex-col z-40">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight tracking-tight">Zero Churn</p>
            <p className="text-zinc-600 text-xs">Retenção inteligente</p>
          </div>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const isAlertas = href === '/alertas'

          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-zinc-500')} />
              <span className="flex-1">{label}</span>
              {isAlertas && unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          )
        })}

        {/* Separador — ferramentas internas */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-zinc-700 text-xs font-semibold uppercase tracking-widest">
            Equipe
          </p>
        </div>

        <Link href="/planejamento"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isActive('/planejamento')
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
          )}
        >
          <Kanban className={cn('w-4 h-4 shrink-0',
            isActive('/planejamento') ? 'text-white' : 'text-zinc-600')} />
          <span className="flex-1">Planejamento</span>
        </Link>
      </nav>

      {/* Footer — agência */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <Link href="/configuracoes" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
            AG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-xs font-medium truncate group-hover:text-white transition-colors">
              Agência Exemplo
            </p>
            <p className="text-zinc-600 text-xs">Plano Growth</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
        </Link>
      </div>
    </aside>
  )
}
