'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Client } from '@/types'

interface UseClientsReturn {
  clients: Client[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Mapeia o formato do banco (snake_case) para o tipo Client do frontend (camelCase)
function mapDbClient(row: Record<string, unknown>): Client {
  const integrations = ((row.client_integrations as Record<string, unknown>[]) ?? []).map((i) => ({
    id:          String(i.id),
    clientId:    String(row.id),
    type:        i.type as Client['integrations'][0]['type'],
    status:      (i.status ?? 'disconnected') as 'connected' | 'disconnected' | 'error',
    lastSyncAt:  i.last_sync_at ? String(i.last_sync_at).slice(0, 10) : undefined,
  }))

  // Pega o health score mais recente
  const scores = ((row.health_scores as Record<string, unknown>[]) ?? [])
    .sort((a, b) => String(b.analyzed_at).localeCompare(String(a.analyzed_at)))
  const latestScore = scores[0]

  const healthScore = latestScore ? {
    scoreTotal:    Number(latestScore.score_total),
    scoreFinanceiro:  latestScore.score_financeiro != null ? Number(latestScore.score_financeiro) : undefined,
    scoreProximidade: latestScore.score_proximidade != null ? Number(latestScore.score_proximidade) : undefined,
    scoreResultado:   latestScore.score_resultado != null ? Number(latestScore.score_resultado) : undefined,
    scoreNps:         latestScore.score_nps != null ? Number(latestScore.score_nps) : undefined,
    churnRisk:        (latestScore.churn_risk ?? 'low') as 'low' | 'medium' | 'high',
    diagnosis:        latestScore.diagnosis ? String(latestScore.diagnosis) : undefined,
    flags:            (latestScore.flags as string[]) ?? [],
    analyzedAt:       String(latestScore.analyzed_at).slice(0, 10),
  } : undefined

  // Pega o último formulário respondido
  const submissions = ((row.form_submissions as Record<string, unknown>[]) ?? [])
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
  const lastForm = submissions[0]

  const lastFormSubmission = lastForm ? {
    id:             String(lastForm.id),
    sentAt:         String(lastForm.submitted_at).slice(0, 10),
    respondedAt:    String(lastForm.submitted_at).slice(0, 10),
    status:         'responded' as const,
    npsScore:       lastForm.nps_score != null ? Number(lastForm.nps_score) : undefined,
    resultScore:    lastForm.score_resultado != null ? Number(lastForm.score_resultado) : undefined,
    comment:        lastForm.comment ? String(lastForm.comment) : undefined,
  } : undefined

  const mrrVal = row.mrr_value != null ? Number(row.mrr_value) : undefined
  const tcvVal = row.tcv_value != null ? Number(row.tcv_value) : undefined

  return {
    id:                  String(row.id),
    name:                String(row.name),
    nomeResumido:        row.nome_resumido     ? String(row.nome_resumido)     : undefined,
    razaoSocial:         row.razao_social      ? String(row.razao_social)      : undefined,
    cnpj:                row.cnpj              ? String(row.cnpj)              : undefined,
    segment:             row.segment           ? String(row.segment)           : undefined,
    clientType:          (row.client_type ?? 'mrr') as 'mrr' | 'tcv',
    // Campos com alias para compatibilidade
    mrrValue:            mrrVal,
    contractValue:       mrrVal,              // alias para código legado
    tcvValue:            tcvVal,
    totalProjectValue:   tcvVal,              // alias para código legado
    contractStartDate:   row.contract_start  ? String(row.contract_start)  : undefined,
    contractEndDate:     row.contract_end    ? String(row.contract_end)    : undefined,
    whatsappGroupId:     row.whatsapp_group_id ? String(row.whatsapp_group_id) : undefined,
    observations:        row.observations    ? String(row.observations)    : undefined,
    paymentStatus:       (row.payment_status ?? 'em_dia') as 'em_dia' | 'vencendo' | 'inadimplente',
    status:              (row.status ?? 'active') as 'active' | 'inactive',
    createdAt:           String(row.created_at).slice(0, 10),
    integrations:        integrations,
    healthScore:         healthScore,
    lastFormSubmission:  lastFormSubmission,
  }
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setClients((data.clients ?? []).map(mapDbClient))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  return { clients, loading, error, refetch: fetchClients }
}
