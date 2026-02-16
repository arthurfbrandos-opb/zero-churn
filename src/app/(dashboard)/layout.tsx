import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-900">
      <Sidebar />
      <div className="ml-60">
        {children}
      </div>
    </div>
  )
}
