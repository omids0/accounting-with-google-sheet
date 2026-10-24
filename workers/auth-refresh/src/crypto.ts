/**
 * Pure helpers: base64url, AES-GCM sealing of the refresh token and the opaque
 * session id. They use only Web Crypto, so they run in a worker and in tests.
 */

const IV_BYTES = 12

const KEY_BYTES = 32

const SESSION_ID_BYTES = 32

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Accepts base64url and plain base64, with or without padding. */
export function fromBase64Url(text: string) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')

  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))

  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

/** `TOKEN_ENC_KEY` is 32 random bytes in base64 (`openssl rand -base64 32`). */
export async function importEncryptionKey(base64Key: string): Promise<CryptoKey> {
  const raw = fromBase64Url(base64Key.trim())

  if (raw.length !== KEY_BYTES) throw new Error('TOKEN_ENC_KEY must be 32 bytes')

  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/**
 * Returns base64url(iv + ciphertext). `aad` (the session id) is authenticated, so a
 * sealed token copied under another session id no longer opens.
 */
export async function sealText(plain: string, key: CryptoKey, aad: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))

  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) },
    key,
    new TextEncoder().encode(plain)
  )

  const out = new Uint8Array(IV_BYTES + cipher.byteLength)

  out.set(iv)
  out.set(new Uint8Array(cipher), IV_BYTES)

  return toBase64Url(out)
}

/** Null when the blob is malformed, was sealed with another key or for another session id. */
export async function openText(blob: string, key: CryptoKey, aad: string): Promise<string | null> {
  try {
    const bytes = fromBase64Url(blob)

    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bytes.slice(0, IV_BYTES),
        additionalData: new TextEncoder().encode(aad)
      },
      key,
      bytes.slice(IV_BYTES)
    )

    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

/** 32 random bytes, 43 base64url characters. */
export function newSessionId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_ID_BYTES)))
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}
