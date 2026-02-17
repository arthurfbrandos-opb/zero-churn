'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Agency {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  analysis_day: number
  plan: 'starter' | 'growth' | 'enterprise'
  onboarding_done: boolean
  created_at: string
}

interface AgencyUser {
  id: string
  email: string
  full_name?: string
}

export function useAgency() {
  const [agency, setAgency]   = useState<Agency | null>(null)
  const [user, setUser]       = useState<AgencyUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()

        // Usuário logado
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email ?? '',
            full_name: authUser.user_metadata?.full_name,
          })
        }

        // Dados da agência
        const res = await fetch('/api/agency')
        if (res.ok) {
          const data = await res.json()
          setAgency(data.agency)
        }
      } catch (err) {
        setError('Erro ao carregar dados da agência')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { agency, user, loading, error }
}
