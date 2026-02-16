import { Sidebar } from '@/components/layout/sidebar'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Sidebar — só desktop */}
      <Sidebar />

      {/* Conteúdo principal */}
      <div className="lg:ml-60 pb-20 lg:pb-0">
        {children}
      </div>

      {/* Bottom nav — só mobile */}
      <MobileBottomNav />
    </div>
  )
}
