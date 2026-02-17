/**
 * S1-03 — Criptografia AES-256-GCM para credenciais de integrações
 * Usa a Web Crypto API (disponível em Edge Runtime e Node.js 18+)
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

function getSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET deve ter no mínimo 32 caracteres')
  }
  return secret
}

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret()
  const encoded = new TextEncoder().encode(secret.slice(0, 32))
  return crypto.subtle.importKey('raw', encoded, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt'])
}

/** Criptografa um objeto JSON → string base64 (iv:ciphertext) */
export async function encrypt(data: Record<string, unknown>): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)

  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

/** Descriptografa string base64 → objeto JSON */
export async function decrypt<T = Record<string, unknown>>(encrypted: string): Promise<T> {
  const key = await getKey()
  const [ivB64, ctB64] = encrypted.split(':')

  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(decrypted)) as T
}
