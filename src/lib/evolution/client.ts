/**
 * Evolution API — cliente HTTP
 *
 * Zero Churn hospeda um único servidor Evolution API (env vars do sistema).
 * Cada agência tem sua própria "instância" nesse servidor — 1 número de WhatsApp.
 *
 * Variáveis de ambiente (Vercel / .env.local):
 *   EVOLUTION_API_URL   = https://evolution.seudominio.com
 *   EVOLUTION_API_KEY   = chave-global-do-servidor
 *
 * Docs: https://doc.evolution-api.com
 */

// ── Config do sistema ─────────────────────────────────────────────

export interface EvolutionConfig {
  url:          string
  apiKey:       string
  instanceName: string
}

/** Retorna a config do servidor Evolution a partir das env vars do sistema */
export function getSystemEvolutionConfig(instanceName: string): EvolutionConfig {
  const url    = process.env.EVOLUTION_API_URL ?? ''
  const apiKey = process.env.EVOLUTION_API_KEY ?? ''
  if (!url || !apiKey) {
    throw new Error('Evolution API não configurada no servidor. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY nas variáveis de ambiente.')
  }
  return { url: url.replace(/\/$/, ''), apiKey, instanceName }
}

/** Verdade se o servidor Evolution está configurado */
export function isEvolutionConfigured(): boolean {
  return !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY)
}

// ── Tipos ─────────────────────────────────────────────────────────

export interface EvolutionMessage {
  key: {
    remoteJid:    string
    fromMe:       boolean
    id:           string
    participant?: string
  }
  message?: {
    conversation?:         string
    extendedTextMessage?:  { text: string }
    imageMessage?:         { caption?: string }
    documentMessage?:      { title?: string }
    audioMessage?:         Record<string, unknown>
  }
  messageType:       string
  messageTimestamp:  number
  pushName?:         string
}

export interface EvolutionGroupInfo {
  id:           string
  subject:      string
  creation:     number
  owner?:       string
  desc?:        string
  participants: { id: string; admin?: string }[]
}

export interface EvolutionInstanceStatus {
  connected: boolean
  state:     string       // 'open' | 'close' | 'connecting'
  phone?:    string       // número conectado (ex: 5511999999999)
  qrCode?:   string       // base64 do QR quando desconectado
}

// ── Helper HTTP ───────────────────────────────────────────────────

async function evo<T>(
  config:  EvolutionConfig,
  method:  'GET' | 'POST' | 'PUT' | 'DELETE',
  path:    string,
  body?:   unknown,
): Promise<T> {
  const res = await fetch(`${config.url}${path}`, {
    method,
    headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
    body:    body ? JSON.stringify(body) : undefined,
    next:    { revalidate: 0 },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution ${res.status}: ${JSON.stringify(err).slice(0, 300)}`)
  }
  // Alguns endpoints retornam 204 sem body
  const text = await res.text()
  return text ? JSON.parse(text) : ({} as T)
}

// ── Gerenciamento de instâncias ───────────────────────────────────

/**
 * Cria uma instância nova para a agência.
 * Se já existir, não faz nada (idempotente).
 */
export async function createInstance(config: EvolutionConfig): Promise<void> {
  await evo(config, 'POST', '/instance/create', {
    instanceName: config.instanceName,
    integration:  'WHATSAPP-BAILEYS',
    qrcode:       true,
  })
}

/**
 * Retorna o QR Code da instância (base64 da imagem PNG).
 * Retorna null se a instância já estiver conectada.
 */
export async function getInstanceQRCode(config: EvolutionConfig): Promise<string | null> {
  const data = await evo<{ base64?: string; code?: string }>(
    config, 'GET',
    `/instance/connect/${config.instanceName}`,
  )
  // Pode vir como base64 diretamente ou como campo 'code' (varia por versão)
  return data.base64 ?? data.code ?? null
}

/**
 * Retorna o estado de conexão da instância.
 */
export async function getInstanceStatus(config: EvolutionConfig): Promise<EvolutionInstanceStatus> {
  const data = await evo<{
    instance?: { state?: string; owner?: string }
    state?:    string
  }>(
    config, 'GET',
    `/instance/connectionState/${config.instanceName}`,
  )
  const state = data.instance?.state ?? data.state ?? 'unknown'
  const phone = data.instance?.owner?.replace('@s.whatsapp.net', '') ?? undefined
  return { connected: state === 'open', state, phone }
}

/**
 * Desconecta (logout) a instância.
 * O número é desvinculado do WhatsApp.
 */
export async function logoutInstance(config: EvolutionConfig): Promise<void> {
  await evo(config, 'DELETE', `/instance/logout/${config.instanceName}`)
}

/**
 * Deleta completamente a instância do servidor Evolution.
 */
export async function deleteInstance(config: EvolutionConfig): Promise<void> {
  await evo(config, 'DELETE', `/instance/delete/${config.instanceName}`)
}

/**
 * Registra o webhook da instância para receber eventos.
 */
export async function registerWebhook(config: EvolutionConfig, webhookUrl: string): Promise<void> {
  await evo(config, 'POST', `/webhook/set/${config.instanceName}`, {
    webhook: {
      enabled:         true,
      url:             webhookUrl,
      webhookByEvents: false,
      webhookBase64:   false,
      events:          ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    },
  })
}

// ── Grupos ────────────────────────────────────────────────────────

/**
 * Lista todos os grupos que a instância participa.
 */
export async function listGroups(config: EvolutionConfig): Promise<EvolutionGroupInfo[]> {
  const data = await evo<EvolutionGroupInfo[] | { groups: EvolutionGroupInfo[] }>(
    config, 'GET',
    `/group/findGroupInfos/${config.instanceName}`,
  )
  return Array.isArray(data) ? data : (data as { groups?: EvolutionGroupInfo[] }).groups ?? []
}

/**
 * Valida se um group_id existe e a instância tem acesso.
 */
export async function validateGroup(groupId: string, config: EvolutionConfig): Promise<EvolutionGroupInfo> {
  const jid  = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`
  const data = await evo<EvolutionGroupInfo[] | { groups: EvolutionGroupInfo[] }>(
    config, 'GET',
    `/group/findGroupInfos/${config.instanceName}?groupJid=${encodeURIComponent(jid)}`,
  )
  const groups = Array.isArray(data) ? data : (data as { groups?: EvolutionGroupInfo[] }).groups ?? []
  const group  = groups.find(g => g.id === jid || g.id === groupId)
  if (!group) throw new Error(`Grupo "${groupId}" não encontrado. Verifique se o número está neste grupo.`)
  return group
}

// ── Mensagens ─────────────────────────────────────────────────────

/**
 * Extrai o texto de uma mensagem Evolution.
 */
export function extractMessageText(msg: EvolutionMessage): string | null {
  const m = msg.message
  if (!m) return null
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    null
  )
}

/**
 * Busca mensagens de um grupo (fallback quando banco local está vazio).
 */
export async function fetchGroupMessages(
  groupId:  string,
  config:   EvolutionConfig,
  days    = 60,
  maxMsgs = 1000,
): Promise<EvolutionMessage[]> {
  const jid    = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400
  const msgs:  EvolutionMessage[] = []
  let   page = 1

  while (msgs.length < maxMsgs) {
    let records: EvolutionMessage[]
    try {
      const data = await evo<EvolutionMessage[] | { messages: { records: EvolutionMessage[] } }>(
        config, 'GET',
        `/chat/findMessages/${config.instanceName}?where[key.remoteJid]=${encodeURIComponent(jid)}&limit=100&page=${page}`,
      )
      records = Array.isArray(data)
        ? data
        : (data as { messages?: { records: EvolutionMessage[] } }).messages?.records ?? []
    } catch {
      if (page > 1) break
      throw new Error(`Não foi possível buscar mensagens do grupo ${jid}`)
    }

    if (!records.length) break

    let done = false
    for (const msg of records) {
      if (msg.messageTimestamp < cutoff) { done = true; break }
      msgs.push(msg)
      if (msgs.length >= maxMsgs) { done = true; break }
    }
    if (done || records.length < 100) break
    page++
  }

  return msgs
}
