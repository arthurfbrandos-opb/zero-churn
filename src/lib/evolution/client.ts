/**
 * Evolution API — cliente HTTP (per-agency config)
 *
 * Cada agência configura sua própria instância via Configurações → Integrações.
 * As credenciais ficam em agency_integrations (type = 'evolution_api'), criptografadas.
 *
 * Docs: https://doc.evolution-api.com
 */

// ── Tipos ─────────────────────────────────────────────────────────

export interface EvolutionConfig {
  url:          string   // https://evolution.seudominio.com
  apiKey:       string   // API key global da instância
  instanceName: string   // nome da instância ativa
}

export interface EvolutionMessage {
  key: {
    remoteJid:    string        // "120363xxxxx@g.us" para grupos
    fromMe:       boolean
    id:           string
    participant?: string        // remetente dentro do grupo
  }
  message?: {
    conversation?:         string
    extendedTextMessage?:  { text: string }
    imageMessage?:         { caption?: string }
    documentMessage?:      { title?: string }
    audioMessage?:         Record<string, unknown>
  }
  messageType:       string    // "conversation" | "extendedTextMessage" | ...
  messageTimestamp:  number    // unix timestamp em segundos
  pushName?:         string    // nome de exibição do remetente
}

export interface EvolutionGroupInfo {
  id:           string   // "120363xxxxx@g.us"
  subject:      string   // nome do grupo
  creation:     number   // unix timestamp
  owner?:       string
  desc?:        string
  participants: { id: string; admin?: string }[]
}

export interface EvolutionInstanceStatus {
  connected: boolean
  state:     string       // "open" | "close" | "connecting"
  qrcode?:   string       // base64 do QR quando desconectado
}

// ── Helper de request ─────────────────────────────────────────────

async function evolutionRequest<T>(
  config:  EvolutionConfig,
  method:  'GET' | 'POST' | 'PUT' | 'DELETE',
  path:    string,
  body?:   unknown,
): Promise<T> {
  const { url, apiKey, instanceName: _ } = config

  if (!url || !apiKey) {
    throw new Error('Evolution API não configurada. Acesse Configurações → Integrações para configurar.')
  }

  const res = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    method,
    headers: {
      apikey:           apiKey,
      'Content-Type':   'application/json',
    },
    body:   body ? JSON.stringify(body) : undefined,
    next:   { revalidate: 0 },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution API ${res.status}: ${JSON.stringify(err).slice(0, 300)}`)
  }

  return res.json()
}

// ── Funções públicas ──────────────────────────────────────────────

/**
 * Verifica se a instância está conectada (online).
 */
export async function checkInstanceStatus(config: EvolutionConfig): Promise<EvolutionInstanceStatus> {
  const data = await evolutionRequest<{ instance: { state: string } }>(
    config, 'GET',
    `/instance/connectionState/${config.instanceName}`,
  )
  const state = data.instance?.state ?? 'unknown'
  return { connected: state === 'open', state }
}

/**
 * Lista todos os grupos que a instância participa.
 */
export async function listGroups(config: EvolutionConfig): Promise<EvolutionGroupInfo[]> {
  const data = await evolutionRequest<EvolutionGroupInfo[] | { groups: EvolutionGroupInfo[] }>(
    config, 'GET',
    `/group/findGroupInfos/${config.instanceName}`,
  )
  return Array.isArray(data) ? data : (data as { groups: EvolutionGroupInfo[] }).groups ?? []
}

/**
 * Valida se um group_id existe e a instância tem acesso.
 */
export async function validateGroup(groupId: string, config: EvolutionConfig): Promise<EvolutionGroupInfo> {
  const jid  = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`
  const data = await evolutionRequest<EvolutionGroupInfo[] | { groups: EvolutionGroupInfo[] }>(
    config, 'GET',
    `/group/findGroupInfos/${config.instanceName}?groupJid=${encodeURIComponent(jid)}`,
  )
  const groups = Array.isArray(data) ? data : (data as { groups: EvolutionGroupInfo[] }).groups ?? []
  const group  = groups.find(g => g.id === jid || g.id === groupId)

  if (!group) {
    throw new Error(`Grupo "${groupId}" não encontrado. Verifique se o número está neste grupo.`)
  }
  return group
}

/**
 * Registra (ou atualiza) o webhook da instância para receber mensagens.
 * Zero Churn receberá events de MESSAGES_UPSERT.
 */
export async function registerWebhook(config: EvolutionConfig, webhookUrl: string): Promise<void> {
  await evolutionRequest(
    config, 'POST',
    `/webhook/set/${config.instanceName}`,
    {
      webhook: {
        enabled:    true,
        url:        webhookUrl,
        webhookByEvents: false,
        webhookBase64:   false,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
        ],
      },
    },
  )
}

/**
 * Busca mensagens de texto de um grupo num período de dias.
 * Usado como FALLBACK quando não há mensagens no banco local.
 *
 * @param groupId  ID do grupo (com ou sem @g.us)
 * @param config   Credenciais da Evolution API
 * @param days     Quantos dias retroativos (padrão: 60)
 * @param maxMsgs  Limite de mensagens (padrão: 1000)
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
  const limit = 100

  while (msgs.length < maxMsgs) {
    let data: EvolutionMessage[] | { messages: { records: EvolutionMessage[] } }

    try {
      data = await evolutionRequest<typeof data>(
        config, 'GET',
        `/chat/findMessages/${config.instanceName}?where[key.remoteJid]=${encodeURIComponent(jid)}&limit=${limit}&page=${page}`,
      )
    } catch {
      if (page > 1) break
      throw new Error(`Não foi possível buscar mensagens do grupo ${jid}`)
    }

    const records: EvolutionMessage[] = Array.isArray(data)
      ? data
      : (data as { messages?: { records: EvolutionMessage[] } }).messages?.records ?? []

    if (records.length === 0) break

    let hitCutoff = false
    for (const msg of records) {
      if (msg.messageTimestamp < cutoff) { hitCutoff = true; break }
      msgs.push(msg)
      if (msgs.length >= maxMsgs) break
    }

    if (hitCutoff || msgs.length >= maxMsgs || records.length < limit) break
    page++
  }

  return msgs
}

/**
 * Extrai o texto de uma mensagem (suporta os tipos mais comuns).
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
