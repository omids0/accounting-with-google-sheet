import { decryptJson, encryptJson, type EncryptedPayload, isEncryptedPayload } from './appLockVault'

/**
 * Shape written to IndexedDB. `lastSyncedAt` is intentionally excluded so that
 * refreshing the sync timestamp never rewrites the whole sheet mirror.
 */
export interface PersistedSnapshot {
  spreadsheetId: string
  sheets: Record<string, string[][]>
}

/** A record holds either plaintext `sheets` (no app lock) or `enc` (app lock on). */
export interface StoredSnapshotRecord {
  spreadsheetId: string
  sheets?: Record<string, string[][]>
  enc?: EncryptedPayload
}

export type DecodedSnapshot =
  | { status: 'ok'; snapshot: PersistedSnapshot; encrypted: boolean }
  | { status: 'locked' }
  | { status: 'unreadable' }

/**
 * Encrypts with `key`, or stores plaintext when `key` is null. Serialisation
 * happens synchronously, so later edits to the live store cannot leak in.
 */
export function encodeSnapshot(
  snapshot: PersistedSnapshot,
  key: CryptoKey | null
): Promise<StoredSnapshotRecord> {
  const { spreadsheetId, sheets } = snapshot

  if (!key) return Promise.resolve({ spreadsheetId, sheets })

  return encryptJson(key, sheets, spreadsheetId).then(enc => ({ spreadsheetId, enc }))
}

export async function decodeSnapshot(
  record: StoredSnapshotRecord | null,
  key: CryptoKey | null
): Promise<DecodedSnapshot> {
  if (!record?.spreadsheetId) return { status: 'unreadable' }

  const { spreadsheetId } = record

  if (isEncryptedPayload(record.enc)) {
    if (!key) return { status: 'locked' }

    try {
      const sheets = await decryptJson<Record<string, string[][]>>(key, record.enc, spreadsheetId)

      return { status: 'ok', snapshot: { spreadsheetId, sheets }, encrypted: true }
    } catch {
      return { status: 'unreadable' }
    }
  }

  if (record.sheets) {
    return { status: 'ok', snapshot: { spreadsheetId, sheets: record.sheets }, encrypted: false }
  }

  return { status: 'unreadable' }
}
