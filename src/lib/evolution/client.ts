/**
 * Evolution API — cliente HTTP
 *
 * Evolution API v2 é auto-hospedada.
 * Variáveis de ambiente necessárias:
 *   EVOLUTION_API_URL   = https://evolution.seudominio.com
 *   EVOLUTION_API_KEY   = sua_api_key_global
 *   EVOLUTION_INSTANCE  = nome_da_instancia_ativa
 *
 * Docs: https://doc.evolution-api.com
 */

const BASE_URL  = process.env.EVOLUTION_API_URL  ?? ''
const API_KEY   = process.env.EVOLUTION_API_KEY   ?? ''
const INSTANCE  = process.env.EVOLUTION_INSTANCE  ?? ''

// ── Tipos ─────────────────────────────────────────────────────────

export interface EvolutionMessage {
  key: {
    remoteJid: string   // e.g. "120363xxxxx@g.us" para grupos
    fromMe:    boolean
    id:        string
    participant?: string  // remetente dentro do grupo
  }
  message?: {
    conversation?:         string
    extendedTextMessage?:  { text: string }
    imageMessage?:         { caption?: string }
    documentMessage?:      { title?: string }
    audioMessage?:         Record<string, unknown>
  }
  messageType:    string  // "conversation" | "extendedTextMessage" | ...
  messageTimestamp: number // unix timestamp em segundos
  pushName?: string       // nome de exibição do remetente
}

export interface EvolutionGroupInfo {
  id:          string   // "120363xxxxx@g.us"
  subject:     string   // nome do grupo
  creation:    number   // unix timestamp
  owner?:      string
  desc?:       string
  participants: { id: string; admin?: string }[]
}

// ── Helper de request ─────────────────────────────────────────────

async function evolutionGet<T>(path: string): Promise<T> {
  if (!BASE_URL || !API_KEY || !INSTANCE) {
    throw new Error('Evolution API não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE)')
  }
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Evolution API ${res.status}: ${JSON.stringify(body).slice(0, 200)}`)
  }
  return res.json()
}

// ── Funções públicas ──────────────────────────────────────────────

/**
 * Valida se o group_id existe e a instância tem acesso a ele.
 * Retorna as informações do grupo ou lança erro.
 */
export async function validateGroup(groupId: string): Promise<EvolutionGroupInfo> {
  // Normaliza: aceita "120363xxx@g.us" ou só o número
  const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`

  // A Evolution API v2 usa query param para filtrar por jid
  const data = await evolutionGet<{ groups: EvolutionGroupInfo[] } | EvolutionGroupInfo[]>(
    `/group/findGroupInfos/${INSTANCE}?groupJid=${encodeURIComponent(jid)}`
  )

  // Pode retornar array ou objeto com .groups
  const groups = Array.isArray(data) ? data : (data as { groups: EvolutionGroupInfo[] }).groups ?? []
  const group  = groups.find(g => g.id === jid || g.id === groupId)

  if (!group) {
    throw new Error(`Grupo "${groupId}" não encontrado. Verifique o ID e se o número tem acesso a este grupo.`)
  }

  return group
}

/**
 * Busca mensagens de texto de um grupo num período de dias.
 * Faz paginação automática até atingir o limite ou sair do período.
 *
 * @param groupId  ID do grupo (com ou sem @g.us)
 * @param days     Quantos dias retroativos buscar (padrão: 60)
 * @param maxMsgs  Limite de mensagens (padrão: 1000)
 */
export async function fetchGroupMessages(
  groupId:  string,
  days    = 60,
  maxMsgs = 1000,
): Promise<EvolutionMessage[]> {
  const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`

  const cutoff    = Math.floor(Date.now() / 1000) - days * 86400
  const allMsgs:  EvolutionMessage[] = []
  let   page    = 1
  const limit   = 100

  while (allMsgs.length < maxMsgs) {
    let data: EvolutionMessage[] | { messages: { records: EvolutionMessage[] }; total: number }

    try {
      data = await evolutionGet(
        `/chat/findMessages/${INSTANCE}?where[key.remoteJid]=${encodeURIComponent(jid)}&limit=${limit}&page=${page}`
      )
    } catch (err) {
      // Se falhar na paginação (ex: não tem mais mensagens), para
      if (page > 1) break
      throw err
    }

    // Normaliza formato da resposta (pode variar por versão da Evolution API)
    let records: EvolutionMessage[]
    if (Array.isArray(data)) {
      records = data
    } else if ((data as { messages?: { records: EvolutionMessage[] } }).messages?.records) {
      records = (data as { messages: { records: EvolutionMessage[] } }).messages.records
    } else {
      records = []
    }

    if (records.length === 0) break

    // Filtra e para se saiu do período
    let hitCutoff = false
    for (const msg of records) {
      if (msg.messageTimestamp < cutoff) { hitCutoff = true; break }
      allMsgs.push(msg)
      if (allMsgs.length >= maxMsgs) break
    }

    if (hitCutoff || allMsgs.length >= maxMsgs || records.length < limit) break
    page++
  }

  return allMsgs
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

/**
 * Verifica se a instância está conectada (online).
 */
export async function checkInstanceStatus(): Promise<{ connected: boolean; state: string }> {
  const data = await evolutionGet<{ instance: { state: string } }>(
    `/instance/connectionState/${INSTANCE}`
  )
  const state = data.instance?.state ?? 'unknown'
  return { connected: state === 'open', state }
}
