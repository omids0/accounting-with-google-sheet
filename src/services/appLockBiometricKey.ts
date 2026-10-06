import { base64ToBuffer, bufferToBase64 } from './appLockCrypto'
import { unwrapWithKey, wrapWithKey } from './appLockVault'
import { createIdbStore } from './idbStore'

/**
 * A biometric unlock has no PIN to derive the key-encryption key from, so the
 * data key needs a second home on this device:
 *  - `prf`: wrapped with a key derived from the WebAuthn PRF output, which only
 *    the authenticator can produce after a successful fingerprint check.
 *  - `device`: a non-extractable CryptoKey kept in IndexedDB (Android APK, and
 *    browsers without PRF). It cannot be exported as bytes, which protects
 *    copied files and backups, but script running in this unlocked browser
 *    profile (e.g. devtools) can still use it.
 */
type BiometricKeyRecord =
  | { kind: 'device'; key: CryptoKey }
  | { kind: 'prf'; salt: string; iv: string; wrappedKey: string }

const keyDb = createIdbStore({ dbName: 'accounting_app_lock_keys', storeName: 'keys' })

const RECORD_ID = 'biometric-data-key'

const PRF_INFO = 'accounting-app-lock-prf-v1'

export function newPrfSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

async function prfWrappingKey(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new Uint8Array(prfOutput), 'HKDF', false, [
    'deriveKey'
  ])

  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new Uint8Array(new TextEncoder().encode(PRF_INFO))
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

async function saveRecord(record: BiometricKeyRecord): Promise<void> {
  if (!(await keyDb.put(record, RECORD_ID))) {
    throw new Error('ذخیرهٔ کلید اثر انگشت روی این دستگاه ناموفق بود')
  }
}

export async function storeDeviceBoundDataKey(dataKey: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey('raw', dataKey)

  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt'
  ])

  await saveRecord({ kind: 'device', key })
}

export async function storePrfWrappedDataKey(
  dataKey: CryptoKey,
  prfOutput: ArrayBuffer,
  prfSalt: Uint8Array
): Promise<void> {
  const wrapped = await wrapWithKey(dataKey, await prfWrappingKey(prfOutput))

  await saveRecord({
    kind: 'prf',
    salt: bufferToBase64(new Uint8Array(prfSalt).buffer),
    ...wrapped
  })
}

export async function loadBiometricKeyRecord(): Promise<BiometricKeyRecord | null> {
  const record = await keyDb.get<BiometricKeyRecord>(RECORD_ID)

  return record?.kind === 'device' || record?.kind === 'prf' ? record : null
}

/** The PRF salt to evaluate during the fingerprint check, or undefined for a device key. */
export function getPrfSalt(record: BiometricKeyRecord): Uint8Array | undefined {
  return record.kind === 'prf' ? new Uint8Array(base64ToBuffer(record.salt)) : undefined
}

/** Opens the stored key after the fingerprint check succeeded. */
export async function openBiometricDataKey(
  record: BiometricKeyRecord,
  prfOutput: ArrayBuffer | null
): Promise<CryptoKey | null> {
  if (record.kind === 'device') return record.key
  if (!prfOutput) return null

  return await unwrapWithKey(record, await prfWrappingKey(prfOutput), false)
}

export async function deleteBiometricDataKey(): Promise<void> {
  await keyDb.delete(RECORD_ID)
}

/** Sign-out and PIN recovery drop the whole key database. */
export async function deleteBiometricKeyDatabase(): Promise<void> {
  await keyDb.deleteDatabase()
}
