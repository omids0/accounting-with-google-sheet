import { base64ToBuffer, bufferToBase64 } from './appLockCrypto'
import type { AppLockVaultConfig } from '../types'

/** OWASP 2023 floor for PBKDF2-HMAC-SHA256. Stored per vault so it can be raised later. */
export const VAULT_PBKDF2_ITERATIONS = 600_000

const AES_GCM = 'AES-GCM'

const IV_BYTES = 12

const SALT_BYTES = 16

/**
 * The data key (DEK) wrapped with a key derived from the PIN. Kept on this
 * device only; a wrong PIN fails the AES-GCM tag check, so no PIN hash is needed.
 */
export type AppLockVault = AppLockVaultConfig

/** One encrypted record as written to IndexedDB. */
export interface EncryptedPayload {
  v: 1
  iv: Uint8Array
  ct: ArrayBuffer
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

function toBase64(bytes: Uint8Array): string {
  return bufferToBase64(new Uint8Array(bytes).buffer)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(base64ToBuffer(value))
}

/** Copies into this realm's Uint8Array; WebCrypto rejects views from a test DOM's realm. */
function encodeText(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(text))
}

export async function generateDataKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey({ name: AES_GCM, length: 256 }, true, [
    'encrypt',
    'decrypt'
  ])
}

async function deriveKeyEncryptionKey(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encodeText(pin), 'PBKDF2', false, [
    'deriveKey'
  ])

  return await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: AES_GCM, length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

/** Wraps an extractable DEK with any AES-GCM wrapping key (PIN-derived or WebAuthn PRF). */
export async function wrapWithKey(
  dataKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ iv: string; wrappedKey: string }> {
  const iv = randomBytes(IV_BYTES)

  const wrapped = await crypto.subtle.wrapKey('raw', dataKey, wrappingKey, { name: AES_GCM, iv })

  return { iv: toBase64(iv), wrappedKey: bufferToBase64(wrapped) }
}

/** Returns null when the wrapping key is wrong (AES-GCM authentication fails). */
export async function unwrapWithKey(
  wrapped: { iv: string; wrappedKey: string },
  wrappingKey: CryptoKey,
  extractable = true
): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(wrapped.wrappedKey),
      wrappingKey,
      { name: AES_GCM, iv: fromBase64(wrapped.iv) },
      { name: AES_GCM, length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    )
  } catch {
    return null
  }
}

export async function wrapDataKey(
  dataKey: CryptoKey,
  pin: string,
  iterations = VAULT_PBKDF2_ITERATIONS
): Promise<AppLockVault> {
  const salt = randomBytes(SALT_BYTES)

  const kek = await deriveKeyEncryptionKey(pin, salt, iterations)

  return { v: 1, salt: toBase64(salt), iterations, ...(await wrapWithKey(dataKey, kek)) }
}

/** The DEK for this PIN, or null when the PIN is wrong. */
export async function unwrapDataKey(vault: AppLockVault, pin: string): Promise<CryptoKey | null> {
  const kek = await deriveKeyEncryptionKey(pin, fromBase64(vault.salt), vault.iterations)

  return await unwrapWithKey(vault, kek)
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  const payload = value as Partial<EncryptedPayload> | null

  return !!payload && payload.v === 1 && !!payload.iv && !!payload.ct
}

/**
 * AES-GCM with a fresh 12-byte IV. `context` is bound as additional data so a
 * record cannot be swapped into another key (e.g. another spreadsheet's slot).
 * The value is serialised synchronously, before the first await.
 */
export function encryptJson(
  key: CryptoKey,
  value: unknown,
  context: string
): Promise<EncryptedPayload> {
  const plaintext = encodeText(JSON.stringify(value))

  const iv = randomBytes(IV_BYTES)

  return crypto.subtle
    .encrypt({ name: AES_GCM, iv, additionalData: encodeText(context) }, key, plaintext)
    .then(ct => ({ v: 1 as const, iv, ct }))
}

/** Throws when the key or context is wrong or the record was tampered with. */
export async function decryptJson<T>(
  key: CryptoKey,
  payload: EncryptedPayload,
  context: string
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: AES_GCM, iv: new Uint8Array(payload.iv), additionalData: encodeText(context) },
    key,
    new Uint8Array(payload.ct)
  )

  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
