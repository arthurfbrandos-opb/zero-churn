'use client'

import { useState, useEffect, useCallback } from 'react'

// Créditos por plano (análises manuais/dia)
const PLAN_CREDITS: Record<string, number> = {
  starter:    2,
  growth:     5,
  agency:     10,
  enterprise: 999,
}

const STORAGE_KEY = 'zc_analysis_credits'

interface CreditsState {
  used: number
  date: string // YYYY-MM-DD
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function useAnalysisCredits(plan: string = 'starter') {
  const total = PLAN_CREDITS[plan] ?? 2
  const unlimited = plan === 'enterprise'

  const [used, setUsed] = useState(0)

  // Carrega do localStorage e verifica se é um novo dia
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved: CreditsState = JSON.parse(raw)
        if (saved.date === todayStr()) {
          setUsed(saved.used)
        } else {
          // Novo dia — reseta
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ used: 0, date: todayStr() }))
          setUsed(0)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const remaining = unlimited ? 999 : Math.max(0, total - used)
  const canAnalyze = unlimited || remaining > 0

  const consume = useCallback(() => {
    if (!canAnalyze) return false
    const next = used + 1
    setUsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ used: next, date: todayStr() }))
    } catch { /* ignore */ }
    return true
  }, [canAnalyze, used])

  return { total, used, remaining, canAnalyze, unlimited, consume }
}
