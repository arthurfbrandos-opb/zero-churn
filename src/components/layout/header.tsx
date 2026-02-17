'use client'

import { Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUnreadAlertsCount } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function Header({ title, description, action }: HeaderProps) {
  const unreadCount = getUnreadAlertsCount()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 lg:h-16 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-30">
      <div className="flex-1 min-w-0">
        <h1 className="text-white font-semibold text-base lg:text-lg leading-tight truncate">{title}</h1>
        {description && (
          <p className="text-zinc-400 text-xs lg:text-sm leading-tight truncate hidden sm:block">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {action && <div className="flex items-center gap-2">{action}</div>}

        <Link href="/alertas">
          <Button variant="ghost" size="icon"
            className="relative text-zinc-400 hover:text-white hover:bg-zinc-800 w-9 h-9">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <Button
          variant="ghost" size="icon"
          onClick={handleLogout}
          title="Sair"
          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-9 h-9"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
