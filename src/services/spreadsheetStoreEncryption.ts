import {
  decodeSnapshot,
  encodeSnapshot,
  type PersistedSnapshot,
  type StoredSnapshotRecord
} from './spreadsheetStoreCodec'
import {
  type LegacySnapshot,
  LEGACY_KEY_PREFIX,
  legacySnapshotKeys,
  snapshotDb
} from './spreadsheetStoreDb'
import { getLiveSnapshot, writeLastSyncedAt } from './spreadsheetStorePersist'
import { getItem, removeItem } from './storage'

/**
 * Moves every legacy localStorage mirror into IndexedDB (encoded with `toKey`)
 * and deletes the plaintext blob, so no sheet data stays in localStorage.
 */
async function moveLegacySnapshots(toKey: CryptoKey | null): Promise<void> {
  for (const key of legacySnapshotKeys()) {
    const spreadsheetId = key.slice(LEGACY_KEY_PREFIX.length)

    const legacy = getItem<LegacySnapshot>(key)

    const usable = !!legacy?.sheets && legacy.spreadsheetId === spreadsheetId

    if (usable && !(await snapshotDb.get(spreadsheetId))) {
      const snapshot: PersistedSnapshot = { spreadsheetId, sheets: legacy.sheets }

      await snapshotDb.put(await encodeSnapshot(snapshot, toKey))
    }
    if (usable && typeof legacy.lastSyncedAt === 'number') {
      writeLastSyncedAt(spreadsheetId, legacy.lastSyncedAt)
    }
    removeItem(key)
  }
}

/**
 * Re-writes every stored mirror: decoded with `fromKey` (plaintext needs none),
 * encoded with `toKey` (null = plaintext). Used when the lock is switched on
 * (null → key) or off (key → null). Records that cannot be decoded are dropped;
 * they are only a cache and are downloaded again. The live in-memory mirror is
 * written last so it wins over any older copy.
 */
export async function reencodeAllSnapshots(
  fromKey: CryptoKey | null,
  toKey: CryptoKey | null,
  live: PersistedSnapshot | null = getLiveSnapshot()
): Promise<void> {
  for (const record of await snapshotDb.getAll<StoredSnapshotRecord>()) {
    const decoded = await decodeSnapshot(record, fromKey)

    if (decoded.status === 'ok') {
      await snapshotDb.put(await encodeSnapshot(decoded.snapshot, toKey))
    } else {
      await snapshotDb.delete(record.spreadsheetId)
    }
  }

  await moveLegacySnapshots(toKey)

  if (live && Object.keys(live.sheets).length) {
    await snapshotDb.put(await encodeSnapshot(live, toKey))
  }
}

/**
 * After an unlock: encrypts any plaintext left behind (a migration that was
 * interrupted, a legacy localStorage blob). Encrypted records are untouched.
 */
export async function sealPlaintextSnapshots(key: CryptoKey): Promise<void> {
  for (const record of await snapshotDb.getAll<StoredSnapshotRecord>()) {
    if (record.enc) continue

    const decoded = await decodeSnapshot(record, null)

    if (decoded.status === 'ok') await snapshotDb.put(await encodeSnapshot(decoded.snapshot, key))
  }

  await moveLegacySnapshots(key)
}
