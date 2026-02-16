'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Bell, Activity, Settings,
} from 'lucide-react'
import { getUnreadAlertsCount } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',     label: 'Início',       icon: LayoutDashboard },
  { href: '/clientes',      label: 'Clientes',     icon: Users           },
  { href: '/alertas',       label: 'Alertas',      icon: Bell            },
  { href: '/operacional',   label: 'Operacional',  icon: Activity        },
  { href: '/configuracoes', label: 'Config',       icon: Settings        },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const unread   = getUnreadAlertsCount()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const isAlertas = href === '/alertas'

          return (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative',
                active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {/* Indicador ativo */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
              )}

              <div className="relative">
                <Icon className={cn('w-5 h-5', active ? 'text-emerald-400' : '')} />
                {isAlertas && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>

              <span className={cn('text-[10px] font-medium leading-none',
                active ? 'text-emerald-400' : '')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
