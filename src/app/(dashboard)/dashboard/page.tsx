'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { PortfolioHealthHero } from '@/components/dashboard/portfolio-health-hero'
import { KpiCardRow } from '@/components/dashboard/kpi-card-row'
import { ActionQueue } from '@/components/dashboard/action-queue'
import { ClientListSection } from '@/components/dashboard/client-list-section'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { useClients } from '@/hooks/use-clients'

export default function DashboardPage() {
  const { clients: allClients, loading, error, refetch } = useClients()

  // Fire-and-forget: detecta não-respostas de formulários e cria alertas
  useEffect(() => {
    fetch('/api/forms/check-nonresponse', { method: 'POST' }).catch(() => {})
  }, [])

  // Filtra só ativos
  const clients = allClients.filter(c => c.status !== 'inactive')

  if (loading) return (
    <div className="min-h-screen">
      <Header title="Visão Geral" description="Saúde da carteira" />
      <DashboardSkeleton />
    </div>
  )

  if (error) return (
    <div className="min-h-screen">
      <Header title="Visão Geral" description="Saúde da carteira" />
      <div className="p-6 text-center">
        <p className="text-red-400 text-sm mb-3">Erro ao carregar dados</p>
        <Button variant="outline" size="sm" onClick={refetch}>Tentar novamente</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Visão Geral"
        description="Saúde da carteira"
        action={
          <Link href="/clientes/novo">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo cliente</span>
            </Button>
          </Link>
        }
      />

      <div className="p-5 lg:p-6 space-y-5 stagger-children">
        {/* Above the fold: Hero + KPIs + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <PortfolioHealthHero clients={clients} />
          </div>
          <div className="lg:col-span-8 space-y-4">
            <KpiCardRow clients={clients} />
            <ActionQueue clients={clients} maxItems={4} />
          </div>
        </div>

        {/* Below the fold: Client list with search + filters */}
        <ClientListSection clients={clients} />
      </div>
    </div>
  )
}
