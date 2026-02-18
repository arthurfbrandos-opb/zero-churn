import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai mensagem de erro de qualquer tipo de exceção.
 *
 * Cobre:
 *   - Error nativo           → err.message
 *   - PostgrestError Supabase → err.message (não é instanceof Error)
 *   - Objeto com .message    → err.message
 *   - String                 → a própria string
 *   - Qualquer outro         → JSON.stringify ou fallback
 */
export function toErrorMsg(err: unknown, fallback = 'Erro desconhecido'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err || fallback
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string' && e.message) return e.message
    if (typeof e.error === 'string'   && e.error)   return e.error
    if (typeof e.details === 'string' && e.details) return e.details
    try { return JSON.stringify(err) } catch { /* ignore */ }
  }
  return fallback
}
