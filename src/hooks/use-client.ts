'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Client } from '@/types'

interface UseClientReturn {
  client: Client | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function mapDbClient(row: Record<string, unknown>): Client {
  const integrations = ((row.client_integrations as Record<string, unknown>[]) ?? []).map(i => ({
    id:         String(i.id),
    clientId:   String(row.id),
    type:       i.type as Client['integrations'][0]['type'],
    status:     (i.status ?? 'disconnected') as 'connected' | 'disconnected' | 'error',
    lastSyncAt: i.last_sync_at ? String(i.last_sync_at).slice(0, 10) : undefined,
  }))

  const scores = ((row.health_scores as Record<string, unknown>[]) ?? [])
    .sort((a, b) => String(b.analyzed_at).localeCompare(String(a.analyzed_at)))
  const hs = scores[0]

  const healthScore = hs ? {
    scoreTotal:       Number(hs.score_total),
    scoreFinanceiro:  hs.score_financeiro  != null ? Number(hs.score_financeiro)  : undefined,
    scoreProximidade: hs.score_proximidade != null ? Number(hs.score_proximidade) : undefined,
    scoreResultado:   hs.score_resultado   != null ? Number(hs.score_resultado)   : undefined,
    scoreNps:         hs.score_nps         != null ? Number(hs.score_nps)         : undefined,
    churnRisk:        (hs.churn_risk ?? 'low') as 'low' | 'medium' | 'high',
    diagnosis:        hs.diagnosis ? String(hs.diagnosis) : undefined,
    flags:            Array.isArray(hs.flags)
                        ? (hs.flags as string[])
                        : typeof hs.flags === 'string'
                          ? (() => { try { return JSON.parse(hs.flags as string) } catch { return [] } })()
                          : [],
    analyzedAt:       String(hs.analyzed_at).slice(0, 10),
  } : undefined

  const subs = ((row.form_submissions as Record<string, unknown>[]) ?? [])
    .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
  const lastForm = subs[0]

  const lastFormSubmission = lastForm ? {
    id:          String(lastForm.id),
    sentAt:      String(lastForm.submitted_at).slice(0, 10),
    respondedAt: String(lastForm.submitted_at).slice(0, 10),
    status:      'responded' as const,
    npsScore:    lastForm.nps_score       != null ? Number(lastForm.nps_score)       : undefined,
    resultScore: lastForm.score_resultado != null ? Number(lastForm.score_resultado) : undefined,
    comment:     lastForm.comment ? String(lastForm.comment) : undefined,
  } : undefined

  const mrrVal = row.mrr_value != null ? Number(row.mrr_value) : undefined
  const tcvVal = row.tcv_value != null ? Number(row.tcv_value) : undefined

  return {
    id:                String(row.id),
    name:              String(row.name),
    nomeResumido:      row.nome_resumido      ? String(row.nome_resumido)      : undefined,
    razaoSocial:       row.razao_social       ? String(row.razao_social)       : undefined,
    cnpj:              row.cnpj               ? String(row.cnpj)               : undefined,
    cnpjCpf:           row.cnpj               ? String(row.cnpj)               : undefined,
    nomeDecisor:       row.nome_decisor       ? String(row.nome_decisor)       : undefined,
    email:             row.email              ? String(row.email)              : undefined,
    telefone:          row.telefone           ? String(row.telefone)           : undefined,
    emailFinanceiro:   row.email_financeiro   ? String(row.email_financeiro)   : undefined,
    segment:           row.segment            ? String(row.segment)            : undefined,
    clientType:        (row.client_type ?? 'mrr') as 'mrr' | 'tcv',
    mrrValue:          mrrVal,
    contractValue:     mrrVal,
    tcvValue:          tcvVal,
    totalProjectValue: tcvVal,
    contractStartDate: row.contract_start     ? String(row.contract_start)     : undefined,
    contractEndDate:   row.contract_end       ? String(row.contract_end)       : undefined,
    whatsappGroupId:   row.whatsapp_group_id  ? String(row.whatsapp_group_id)  : undefined,
    observations:      row.observations       ? String(row.observations)       : undefined,
    // Endereço
    cep:               row.cep         ? String(row.cep)         : undefined,
    logradouro:        row.logradouro  ? String(row.logradouro)  : undefined,
    numero:            row.numero      ? String(row.numero)      : undefined,
    complemento:       row.complemento ? String(row.complemento) : undefined,
    bairro:            row.bairro      ? String(row.bairro)      : undefined,
    cidade:            row.cidade      ? String(row.cidade)      : undefined,
    estado:            row.estado      ? String(row.estado)      : undefined,
    paymentStatus:     (row.payment_status ?? 'em_dia') as 'em_dia' | 'vencendo' | 'inadimplente',
    status:            (row.status ?? 'active') as 'active' | 'inactive',
    createdAt:         String(row.created_at).slice(0, 10),
    integrations,
    healthScore,
    lastFormSubmission,
  }
}

export function useClient(id: string): UseClientReturn {
  const [client, setClient]   = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${id}`)
      if (res.status === 404) { setClient(null); return }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setClient(mapDbClient(data.client))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar cliente')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch_() }, [fetch_])

  return { client, loading, error, refetch: fetch_ }
}
