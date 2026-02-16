// ── Classificação NPS ─────────────────────────────────────────────

export type NpsClassification = 'promotor' | 'neutro' | 'detrator'

export function getNpsClassification(score: number): {
  label: string
  type: NpsClassification
  color: string
  bg: string
  border: string
} {
  if (score >= 9) return {
    label: 'Promotor',  type: 'promotor',
    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
  }
  if (score >= 7) return {
    label: 'Neutro',    type: 'neutro',
    color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',
  }
  return {
    label: 'Detrator',  type: 'detrator',
    color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',
  }
}

// ── Período de observação ─────────────────────────────────────────

const OBS_DAYS_KEY = 'zc_observation_days'

export function getObservationDays(): number {
  if (typeof window === 'undefined') return 60
  const v = localStorage.getItem(OBS_DAYS_KEY)
  return v ? parseInt(v) : 60
}

export function setObservationDays(days: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(OBS_DAYS_KEY, String(days))
}

// ── Toggle: enviar NPS pra clientes em observação ────────────────

const NPS_ALLOW_OBS_KEY = 'zc_nps_allow_observation'

export function getNpsAllowObservation(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(NPS_ALLOW_OBS_KEY) === 'true'
}

export function setNpsAllowObservation(v: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(NPS_ALLOW_OBS_KEY, v ? 'true' : 'false')
}

// ─────────────────────────────────────────────────────────────────

export function isInObservation(createdAt: string, observationDays?: number): boolean {
  const days = observationDays ?? getObservationDays()
  const created = new Date(createdAt)
  const elapsed = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
  return elapsed < days
}
