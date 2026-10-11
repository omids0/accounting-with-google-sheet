import { decryptJson, encryptJson, type EncryptedPayload, isEncryptedPayload } from './appLockVault'

/**
 * What this device knows about the remote copy its mirror was taken from. It
 * lives in the same record as the sheets, so the two can never disagree after
 * a restart. Change tokens are random ids, not data, so they stay plaintext.
 */
export interface SyncMeta {
  /** Change token per tab as of its last download; null when unknown. */
  tokens: Record<string, string> | null
  /** Drive modifiedTime the mirror matches. */
  modifiedTime: string | null
  /** When every tab was last downloaded. */
  fullSyncAt: number | null
  /** When a partial pull accepted a Drive change that may hide a hand edit. */
  absorbedAt?: number | null
  /** When every yearly archive tab was last downloaded. */
  coldSyncAt?: number | null
}

/**
 * Shape written to IndexedDB. `lastSyncedAt` is intentionally excluded so that
 * refreshing the sync timestamp never rewrites the whole sheet mirror.
 */
export interface PersistedSnapshot {
  spreadsheetId: string
  sheets: Record<string, string[][]>
  sync?: SyncMeta | null
}

/** A record holds either plaintext `sheets` (no app lock) or `enc` (app lock on). */
export interface StoredSnapshotRecord {
  spreadsheetId: string
  sheets?: Record<string, string[][]>
  enc?: EncryptedPayload
  sync?: SyncMeta | null
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

  const meta = snapshot.sync ? { sync: structuredClone(snapshot.sync) } : {}

  if (!key) return Promise.resolve({ spreadsheetId, sheets, ...meta })

  return encryptJson(key, sheets, spreadsheetId).then(enc => ({ spreadsheetId, enc, ...meta }))
}

export async function decodeSnapshot(
  record: StoredSnapshotRecord | null,
  key: CryptoKey | null
): Promise<DecodedSnapshot> {
  if (!record?.spreadsheetId) return { status: 'unreadable' }

  const { spreadsheetId } = record

  const sync = record.sync ?? null

  if (isEncryptedPayload(record.enc)) {
    if (!key) return { status: 'locked' }

    try {
      const sheets = await decryptJson<Record<string, string[][]>>(key, record.enc, spreadsheetId)

      return { status: 'ok', snapshot: { spreadsheetId, sheets, sync }, encrypted: true }
    } catch {
      return { status: 'unreadable' }
    }
  }

  if (record.sheets) {
    return {
      status: 'ok',
      snapshot: { spreadsheetId, sheets: record.sheets, sync },
      encrypted: false
    }
  }

  return { status: 'unreadable' }
}
