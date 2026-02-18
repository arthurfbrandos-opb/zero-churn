'use client'

import { useCallback } from 'react'

/**
 * Hook de créditos de análise.
 * Por ora, todas as contas têm análises ilimitadas.
 * Quando o sistema de billing for implementado, este hook será atualizado
 * para consultar o plano real da agência via /api/agency.
 */
export function useAnalysisCredits(_plan?: string) {
  // Sempre ilimitado até o sistema de billing estar implementado
  const consume = useCallback(() => true, [])

  return {
    total:      999,
    used:       0,
    remaining:  999,
    canAnalyze: true,
    unlimited:  true,
    consume,
  }
}
