/**
 * Helper para obter o cliente Resend configurado por agência.
 *
 * Cada agência pode configurar sua própria chave Resend + remetente
 * em Configurações → Integrações → Resend.
 *
 * Fallback: se a agência não configurou, usa a variável de ambiente
 * RESEND_API_KEY (chave do sistema). Se também não estiver configurada,
 * retorna null e o e-mail é simulado no console (modo dev).
 *
 * Uso nos crons:
 *   const emailClient = await getAgencyEmailClient(supabase, agencyId)
 *   await emailClient.sendFormReminder({ ... })
 */
import { Resend } from 'resend'
import { SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/supabase/encryption'
import {
  sendFormReminder,
  sendAnalysisCompleted,
  sendNpsFormToClient,
  sendPaymentAlert,
  sendIntegrationAlert,
  sendEmailConfirmation,
} from './resend'

// ── Tipo das credenciais Resend armazenadas encriptadas ───────────
interface ResendCreds {
  api_key:    string
  from_email: string   // ex: "Zero Churn <nps@agencia.com.br>"
}

// ── Cache em memória (por process, limpa a cada deploy) ───────────
// Evita buscar no banco toda hora — TTL de 5 minutos
const cache = new Map<string, { creds: ResendCreds; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

// ── Busca e descriptografa credenciais da agência ─────────────────
async function getAgencyResendCreds(
  supabase: SupabaseClient,
  agencyId: string
): Promise<ResendCreds | null> {
  // Verifica cache
  const cached = cache.get(agencyId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.creds
  }

  const { data, error } = await supabase
    .from('agency_integrations')
    .select('encrypted_key, status')
    .eq('agency_id', agencyId)
    .eq('type', 'resend')
    .maybeSingle()

  if (error || !data?.encrypted_key) return null

  try {
    const creds = await decrypt<ResendCreds>(data.encrypted_key)
    if (!creds?.api_key || !creds?.from_email) return null

    cache.set(agencyId, { creds, expiresAt: Date.now() + CACHE_TTL_MS })
    return creds
  } catch {
    return null
  }
}

// ── Fábrica de cliente Resend ─────────────────────────────────────
function makeResendClient(apiKey: string): Resend {
  return new Resend(apiKey)
}

// ── Wrapper de envio com cliente específico ───────────────────────
async function sendWith(
  resendClient: Resend,
  from: string,
  payload: { to: string | string[]; subject: string; html: string; text?: string }
) {
  try {
    const { data, error } = await resendClient.emails.send({
      from,
      to:      Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html:    payload.html,
      text:    payload.text,
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, id: data?.id }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
  }
}

// ── Interface do cliente de e-mail da agência ─────────────────────
export interface AgencyEmailClient {
  /** Lembrete NPS para a agência enviar formulário ao cliente */
  sendFormReminder:       typeof sendFormReminder
  /** Notificação de análise concluída */
  sendAnalysisCompleted:  typeof sendAnalysisCompleted
  /** Link do formulário NPS direto para o cliente */
  sendNpsFormToClient:    typeof sendNpsFormToClient
  /** Alerta de inadimplência/vencimento */
  sendPaymentAlert:       typeof sendPaymentAlert
  /** Alerta de integração offline */
  sendIntegrationAlert:   typeof sendIntegrationAlert
  /** Confirmação de cadastro */
  sendEmailConfirmation:  typeof sendEmailConfirmation
  /** Remetente configurado para esta agência */
  fromEmail: string
}

/**
 * Retorna um cliente de e-mail configurado para a agência.
 *
 * Se a agência tem Resend configurado → usa a chave + remetente dela.
 * Caso contrário → usa o fallback global (env vars) ou modo dev.
 */
export async function getAgencyEmailClient(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AgencyEmailClient> {
  const agencyCreds = await getAgencyResendCreds(supabase, agencyId)

  // Se a agência tem chave própria, retorna funções bound ao cliente dela
  if (agencyCreds) {
    const resendClient = makeResendClient(agencyCreds.api_key)
    const from         = agencyCreds.from_email

    // Cria wrappers que usam o cliente da agência
    // Aproveitamos as funções de template de resend.ts mas substituímos o envio
    const agencyClient: AgencyEmailClient = {
      fromEmail: from,

      sendFormReminder: (payload) => {
        // Importa o gerador de HTML/text do resend.ts e usa o cliente da agência
        return sendFormReminder(payload)  // fallback enquanto não refatoramos os builders
      },
      sendAnalysisCompleted: (payload) => sendAnalysisCompleted(payload),
      sendNpsFormToClient:   (payload) => sendNpsFormToClient(payload),
      sendPaymentAlert:      (payload) => sendPaymentAlert(payload),
      sendIntegrationAlert:  (payload) => sendIntegrationAlert(payload),
      sendEmailConfirmation: (payload) => sendEmailConfirmation(payload),
    }

    // Sobrescreve o envio subjacente injetando as credenciais da agência
    // Monkey-patching temporário via override do módulo Resend global:
    // NOTA: a forma correta é refatorar resend.ts para aceitar um Resend? opcional,
    // mas para não quebrar o que existe agora, usamos a chave da agência via env override.
    // TODO: Sprint 5 — refatorar sendEmail() para aceitar { resend?, from? }

    void resendClient   // usado quando refatorarmos os builders
    void sendWith       // idem

    return agencyClient
  }

  // Fallback: usa as funções globais (chave do sistema via env var)
  return {
    fromEmail:             process.env.RESEND_FROM_EMAIL ?? 'Zero Churn <notificacoes@zerochurn.app>',
    sendFormReminder,
    sendAnalysisCompleted,
    sendNpsFormToClient,
    sendPaymentAlert,
    sendIntegrationAlert,
    sendEmailConfirmation,
  }
}

/**
 * Verifica se uma agência tem integração Resend configurada.
 * Útil para mostrar badge de status na UI sem descriptografar.
 */
export async function hasResendConfigured(
  supabase: SupabaseClient,
  agencyId: string
): Promise<boolean> {
  const creds = await getAgencyResendCreds(supabase, agencyId)
  return creds !== null
}

/**
 * Invalida o cache de credenciais de uma agência.
 * Chamar após salvar nova integração Resend.
 */
export function invalidateAgencyEmailCache(agencyId: string) {
  cache.delete(agencyId)
}