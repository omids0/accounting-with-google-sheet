import { describe, expect, it } from 'vitest'

import {
  getSyncStatus,
  latestSyncActivity,
  setLastSyncedAt,
  setSyncState,
  type SyncStatusSnapshot
} from './syncStatus'

describe('a push is not a pull', () => {
  it('an emptied outbox moves lastPushedAt and leaves lastSyncedAt for the pull', () => {
    setSyncState('idle', null, true)

    const status = getSyncStatus()

    expect(status.lastPushedAt).toEqual(expect.any(Number))
    // Backups and snapshots wait for `lastSyncedAt` of this session: a push must not open that gate.
    expect(status.lastSyncedAt).toBeNull()
  })

  it('a completed pull sets lastSyncedAt', () => {
    setLastSyncedAt(5_000)

    expect(getSyncStatus().lastSyncedAt).toBe(5_000)
  })

  it('the badge text uses the newer of the two', () => {
    const base = getSyncStatus()

    const at = (lastSyncedAt: number | null, lastPushedAt: number | null): SyncStatusSnapshot => ({
      ...base,
      lastSyncedAt,
      lastPushedAt
    })

    expect(latestSyncActivity(at(null, null))).toBeNull()
    expect(latestSyncActivity(at(10, null))).toBe(10)
    expect(latestSyncActivity(at(10, 30))).toBe(30)
    expect(latestSyncActivity(at(40, 30))).toBe(40)
  })
})
