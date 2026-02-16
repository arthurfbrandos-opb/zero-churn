'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getUnreadAlertsCount } from '@/lib/mock-data'

interface HeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function Header({ title, description, action }: HeaderProps) {
  const unreadCount = getUnreadAlertsCount()

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 gap-4 sticky top-0 z-30">
      <div className="flex-1 min-w-0">
        <h1 className="text-white font-semibold text-lg leading-tight truncate">{title}</h1>
        {description && (
          <p className="text-zinc-400 text-sm leading-tight truncate">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        <Link href="/alertas">
          <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Button>
        </Link>
      </div>
    </header>
  )
}
