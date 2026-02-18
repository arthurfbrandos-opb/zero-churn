/**
 * Cliente Resend para e-mails transacionais.
 *
 * Se RESEND_API_KEY não estiver definido, o envio é simulado no console
 * (modo dev gracioso — não quebra o sistema).
 *
 * Docs: https://resend.com/docs
 */
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

// Se a key não estiver configurada, cria um cliente que loga em vez de enviar
const resend = apiKey && apiKey !== 'COLE_AQUI_QUANDO_CRIAR_CONTA_NO_RESEND'
  ? new Resend(apiKey)
  : null

// Permite sobrescrever o remetente via variável de ambiente
// Ex: RESEND_FROM_EMAIL="Zero Churn <notificacoes@seudominio.com>"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Zero Churn <notificacoes@zerochurn.app>'

// ── Tipos ─────────────────────────────────────────────────────────

interface SendResult {
  ok:    boolean
  id?:   string
  error?: string
}

// ── Função genérica de envio ──────────────────────────────────────

async function sendEmail(payload: {
  to:       string | string[]
  subject:  string
  html:     string
  text?:    string
}): Promise<SendResult> {
  if (!resend) {
    // Modo dev: só loga
    console.log('[email] DEV — não enviado (RESEND_API_KEY não configurado)')
    console.log('[email] Para:', payload.to)
    console.log('[email] Assunto:', payload.subject)
    return { ok: true, id: 'dev-mock-id' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html:    payload.html,
      text:    payload.text,
    })

    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email] Unexpected error:', msg)
    return { ok: false, error: msg }
  }
}

// ── Templates ─────────────────────────────────────────────────────

/**
 * Lembrete para agência enviar formulário de satisfação
 * ao cliente (5 dias antes da análise mensal).
 */
export async function sendFormReminder(payload: {
  to:          string    // email da agência
  agencyName:  string
  clientName:  string
  analysisDate: string   // "dd/mm/aaaa"
  daysLeft:    number    // quantos dias até a análise (ex: 5)
  formUrl?:    string    // link do formulário (se já gerado)
}): Promise<SendResult> {
  const { to, agencyName, clientName, analysisDate, daysLeft, formUrl } = payload

  const linkSection = formUrl
    ? `<p style="margin:16px 0">
         <a href="${formUrl}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
           Abrir formulário de ${clientName}
         </a>
       </p>`
    : `<p style="margin:16px 0;color:#6b7280;font-size:14px">
         Acesse o painel e gere o link do formulário para <strong>${clientName}</strong>.
       </p>`

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <div style="background:#10b981;padding:24px;text-align:center">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">⚡ Zero Churn</p>
        </div>
        <!-- Body -->
        <div style="padding:32px">
          <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px">Para: <strong style="color:#e4e4e7">${agencyName}</strong></p>
          <h1 style="color:#f4f4f5;font-size:22px;margin:0 0 16px;line-height:1.3">
            📋 Lembrete: envie o formulário para <span style="color:#10b981">${clientName}</span>
          </h1>
          <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 16px">
            A análise mensal de <strong style="color:#e4e4e7">${clientName}</strong> está
            programada para <strong style="color:#e4e4e7">${analysisDate}</strong>
            — faltam <strong style="color:#10b981">${daysLeft} dias</strong>.
          </p>
          <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px">
            Para que o pilar de NPS e Resultado seja calculado corretamente,
            envie o formulário de satisfação ao cliente antes da análise.
          </p>
          ${linkSection}
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
          <p style="color:#52525b;font-size:13px;margin:0;line-height:1.5">
            Este lembrete foi enviado automaticamente pelo Zero Churn.
            <br>Você pode desativar os lembretes nas configurações da agência.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
[Zero Churn] Lembrete: envie o formulário para ${clientName}

A análise mensal está programada para ${analysisDate} — faltam ${daysLeft} dias.

Para que o pilar de NPS e Resultado seja calculado corretamente,
envie o formulário de satisfação ao cliente antes da análise.

${formUrl ? `Link do formulário: ${formUrl}` : 'Acesse o painel para gerar o link.'}
  `.trim()

  return sendEmail({
    to:      to,
    subject: `⏰ Envie o formulário para ${clientName} — análise em ${daysLeft} dias`,
    html,
    text,
  })
}

/**
 * Notificação: análise mensal concluída.
 * (Para Sprint 4 — scheduler)
 */
export async function sendAnalysisCompleted(payload: {
  to:        string
  agencyName: string
  total:     number
  success:   number
  failed:    number
  dashboardUrl: string
}): Promise<SendResult> {
  const { to, agencyName, total, success, failed, dashboardUrl } = payload

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:24px;text-align:center">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">⚡ Zero Churn</p>
        </div>
        <div style="padding:32px">
          <h1 style="color:#f4f4f5;font-size:22px;margin:0 0 16px">
            ${failed === 0 ? '✅' : '⚠️'} Análise mensal ${failed === 0 ? 'concluída' : 'concluída com erros'}
          </h1>
          <p style="color:#a1a1aa;font-size:15px;margin:0 0 24px">
            A análise mensal da <strong style="color:#e4e4e7">${agencyName}</strong> foi executada.
          </p>
          <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px">
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <div style="text-align:center;flex:1">
                <p style="color:#f4f4f5;font-size:28px;font-weight:700;margin:0">${total}</p>
                <p style="color:#71717a;font-size:13px;margin:4px 0 0">total</p>
              </div>
              <div style="text-align:center;flex:1">
                <p style="color:#10b981;font-size:28px;font-weight:700;margin:0">${success}</p>
                <p style="color:#71717a;font-size:13px;margin:4px 0 0">analisados</p>
              </div>
              ${failed > 0 ? `
              <div style="text-align:center;flex:1">
                <p style="color:#f87171;font-size:28px;font-weight:700;margin:0">${failed}</p>
                <p style="color:#71717a;font-size:13px;margin:4px 0 0">falhas</p>
              </div>` : ''}
            </div>
          </div>
          <p style="margin:0 0 24px">
            <a href="${dashboardUrl}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              Ver resultados no painel
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
[Zero Churn] Análise mensal ${failed === 0 ? 'concluída' : 'concluída com erros'}

Total: ${total} clientes | Analisados: ${success} | Falhas: ${failed}

Acesse o painel: ${dashboardUrl}
  `.trim()

  return sendEmail({
    to,
    subject: `${failed === 0 ? '✅' : '⚠️'} Análise mensal: ${success}/${total} clientes analisados`,
    html,
    text,
  })
}

/**
 * E-mail de confirmação de cadastro.
 * Enviado logo após criar a conta, com o link gerado pelo admin API.
 */
export async function sendEmailConfirmation(payload: {
  to:          string
  ownerName:   string
  agencyName:  string
  confirmUrl:  string
}): Promise<SendResult> {
  const { to, ownerName, agencyName, confirmUrl } = payload

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:24px;text-align:center">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">⚡ Zero Churn</p>
        </div>
        <div style="padding:32px">
          <h1 style="color:#f4f4f5;font-size:22px;margin:0 0 8px">Olá, ${ownerName}! 👋</h1>
          <p style="color:#a1a1aa;font-size:15px;margin:0 0 24px">
            Sua conta para a agência <strong style="color:#e4e4e7">${agencyName}</strong> foi criada com sucesso.
            Confirme seu e-mail para começar a usar o Zero Churn.
          </p>
          <p style="margin:0 0 24px">
            <a href="${confirmUrl}"
              style="background:#10b981;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
              ✅ Confirmar e-mail
            </a>
          </p>
          <p style="color:#52525b;font-size:13px;margin:0 0 8px">
            O link expira em <strong style="color:#71717a">24 horas</strong>.
          </p>
          <p style="color:#52525b;font-size:13px;margin:0">
            Se você não criou esta conta, ignore este e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
          <p style="color:#3f3f46;font-size:12px;margin:0">
            Zero Churn · Sistema de gestão e retenção de clientes para agências
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Olá, ${ownerName}!

Sua conta para a agência "${agencyName}" foi criada. Confirme seu e-mail acessando o link abaixo:

${confirmUrl}

O link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.
  `.trim()

  return sendEmail({
    to,
    subject: '✅ Confirme seu e-mail — Zero Churn',
    html,
    text,
  })
}

/**
 * Envia o link do formulário NPS diretamente para o e-mail do cliente da agência.
 * O cliente clica e responde a pesquisa em /f/[token].
 */
export async function sendNpsFormToClient(payload: {
  to:          string    // e-mail do cliente
  clientName:  string    // nome do cliente (empresa)
  agencyName:  string    // nome da agência que presta serviço
  formUrl:     string    // https://.../f/[token]
  expiresAt:   string    // "dd/mm/aaaa"
}): Promise<SendResult> {
  const { to, clientName, agencyName, formUrl, expiresAt } = payload

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:28px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700">⭐ Sua opinião importa</p>
        </div>
        <div style="padding:36px">
          <h1 style="color:#111827;font-size:20px;margin:0 0 12px;line-height:1.4">
            Olá, <strong>${clientName}</strong>!
          </h1>
          <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px">
            A <strong>${agencyName}</strong> gostaria de saber sua opinião sobre os serviços prestados.
            Leva menos de <strong>2 minutos</strong> e nos ajuda a melhorar continuamente.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:28px">
            <p style="margin:0;color:#166534;font-size:14px;font-weight:600">📋 O que você vai responder:</p>
            <ul style="margin:8px 0 0;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8">
              <li>Uma nota de 0 a 10 (NPS)</li>
              <li>O que está funcionando bem</li>
              <li>O que poderia melhorar</li>
            </ul>
          </div>
          <p style="margin:0 0 28px;text-align:center">
            <a href="${formUrl}"
              style="background:#10b981;color:#fff;padding:16px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
              Responder agora →
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">
            Link válido até ${expiresAt}. Suas respostas são confidenciais.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
          <p style="color:#d1d5db;font-size:11px;margin:0;text-align:center">
            Enviado por Zero Churn em nome de ${agencyName}
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Olá, ${clientName}!

A ${agencyName} gostaria de saber sua opinião sobre os serviços prestados.

Responda a pesquisa (leva menos de 2 minutos):
${formUrl}

Link válido até ${expiresAt}. Suas respostas são confidenciais.
  `.trim()

  return sendEmail({
    to,
    subject: `⭐ ${agencyName} quer saber sua opinião — 2 minutinhos`,
    html,
    text,
  })
}

/**
 * Alerta de inadimplência: enviado à agência quando um cliente
 * entra ou permanece em status 'inadimplente' após análise financeira.
 */
export async function sendPaymentAlert(payload: {
  to:          string   // e-mail da agência
  agencyName:  string
  clientName:  string
  status:      'vencendo' | 'inadimplente'
  daysOverdue?: number  // para inadimplente
  amount?:     string   // valor em atraso formatado (ex: "R$ 1.200,00")
  clientUrl:   string   // link para o cliente no painel
}): Promise<SendResult> {
  const { to, agencyName, clientName, status, daysOverdue, amount, clientUrl } = payload

  const isInad = status === 'inadimplente'
  const color  = isInad ? '#ef4444' : '#f59e0b'
  const emoji  = isInad ? '🚨' : '⚠️'
  const title  = isInad
    ? `${clientName} está inadimplente`
    : `${clientName} tem pagamento vencendo`
  const description = isInad
    ? `O cliente <strong>${clientName}</strong> possui cobranças em atraso${daysOverdue ? ` há ${daysOverdue} dias` : ''}${amount ? ` (${amount})` : ''}. Isso impacta diretamente o Health Score e aumenta o risco de churn.`
    : `O cliente <strong>${clientName}</strong> possui cobranças com vencimento próximo. Entre em contato antes que se tornem inadimplência.`

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden">
        <div style="background:${color};padding:24px;text-align:center">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">⚡ Zero Churn — Alerta Financeiro</p>
        </div>
        <div style="padding:32px">
          <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px">${agencyName}</p>
          <h1 style="color:#f4f4f5;font-size:22px;margin:0 0 16px;line-height:1.3">
            ${emoji} ${title}
          </h1>
          <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 24px">
            ${description}
          </p>
          <p style="margin:0 0 24px">
            <a href="${clientUrl}"
              style="background:${color};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              Ver cliente no painel →
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
          <p style="color:#52525b;font-size:13px;margin:0">
            Alerta gerado automaticamente pelo Zero Churn após análise financeira.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
[Zero Churn] ${emoji} ${title}

${isInad
  ? `${clientName} possui cobranças em atraso${daysOverdue ? ` há ${daysOverdue} dias` : ''}${amount ? ` (${amount})` : ''}.`
  : `${clientName} possui cobranças com vencimento próximo.`}

Ver no painel: ${clientUrl}
  `.trim()

  return sendEmail({
    to,
    subject: `${emoji} Alerta financeiro: ${clientName} — Zero Churn`,
    html,
    text,
  })
}

/**
 * Alerta de integração com erro: enviado à agência quando
 * uma integração (Asaas, Dom ou WhatsApp) fica offline/inativa.
 */
export async function sendIntegrationAlert(payload: {
  to:            string
  agencyName:    string
  clientName:    string
  integration:   'asaas' | 'dom' | 'whatsapp'
  reason:        string   // ex: "Chave API inválida", "Sem mensagens há 35 dias"
  clientUrl:     string
}): Promise<SendResult> {
  const { to, agencyName, clientName, integration, reason, clientUrl } = payload

  const integrationLabel: Record<string, string> = {
    asaas:    'Asaas (financeiro)',
    dom:      'Dom Pagamentos (financeiro)',
    whatsapp: 'WhatsApp',
  }
  const label = integrationLabel[integration] ?? integration

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden">
        <div style="background:#7c3aed;padding:24px;text-align:center">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">⚡ Zero Churn — Alerta de Integração</p>
        </div>
        <div style="padding:32px">
          <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px">${agencyName}</p>
          <h1 style="color:#f4f4f5;font-size:22px;margin:0 0 16px;line-height:1.3">
            🔌 Integração offline: ${label}
          </h1>
          <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px">
            A integração <strong style="color:#e4e4e7">${label}</strong> do cliente
            <strong style="color:#e4e4e7">${clientName}</strong> está com problema:
          </p>
          <div style="background:#3b0764;border:1px solid #6d28d9;border-radius:8px;padding:14px;margin-bottom:24px">
            <p style="color:#c4b5fd;font-size:14px;margin:0">⚠️ ${reason}</p>
          </div>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px">
            Sem dados desta integração, o Health Score de <strong style="color:#e4e4e7">${clientName}</strong>
            pode ficar incompleto na próxima análise.
          </p>
          <p style="margin:0 0 24px">
            <a href="${clientUrl}"
              style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              Verificar integração →
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
          <p style="color:#52525b;font-size:13px;margin:0">
            Alerta gerado automaticamente pelo Zero Churn.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
[Zero Churn] 🔌 Integração offline: ${label} — ${clientName}

Motivo: ${reason}

Sem dados desta integração, o Health Score pode ficar incompleto.

Ver no painel: ${clientUrl}
  `.trim()

  return sendEmail({
    to,
    subject: `🔌 Integração offline: ${label} (${clientName}) — Zero Churn`,
    html,
    text,
  })
}
