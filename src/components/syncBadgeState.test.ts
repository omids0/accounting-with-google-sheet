import { describe, expect, it } from 'vitest'

import { getSyncBadgeState } from './syncBadgeState'
import type { SyncStatusSnapshot } from '../services/syncStatus'

const NOW = 1_000_000

function status(patch: Partial<SyncStatusSnapshot>): SyncStatusSnapshot {
  return {
    connection: 'online',
    syncState: 'idle',
    lastSyncedAt: NOW,
    pendingWrites: 0,
    failedWrites: 0,
    conflicts: 0,
    lastError: null,
    ...patch
  }
}

describe('getSyncBadgeState', () => {
  it('names waiting edit conflicts and opens the details', () => {
    const state = getSyncBadgeState(status({ conflicts: 2 }), NOW)

    expect(state.label).toBe('۲ تعارض')
    expect(state.showDetails).toBe(true)
  })

  it('says the queue stopped, with the cause, instead of «در حال ذخیره»', () => {
    const state = getSyncBadgeState(
      status({ syncState: 'error', pendingWrites: 3, lastError: 'backend error 503' }),
      NOW
    )

    expect(state.label).toBe('ذخیره متوقف شد (3 در انتظار)')
    expect(state.tone).toBe('error')
    expect(state.cause).toBeTruthy()
    expect(state.showDetails).toBe(true)
  })

  it('lets parked writes outrank pending and syncing', () => {
    const state = getSyncBadgeState(
      status({ syncState: 'syncing', pendingWrites: 2, failedWrites: 1 }),
      NOW
    )

    expect(state.label).toBe('1 تغییر اعمال نشد')
    expect(state.tone).toBe('error')
    expect(state.showDetails).toBe(true)
  })

  it('shows plain progress when nothing is wrong', () => {
    expect(getSyncBadgeState(status({ pendingWrites: 2 }), NOW)).toMatchObject({
      label: 'در حال ذخیره (2)',
      tone: 'syncing',
      showDetails: false
    })
    expect(getSyncBadgeState(status({ syncState: 'syncing' }), NOW).label).toBe('در حال بروزرسانی…')
    expect(getSyncBadgeState(status({}), NOW)).toMatchObject({ label: 'همین الان', tone: 'online' })
  })

  it('keeps offline first', () => {
    expect(
      getSyncBadgeState(status({ connection: 'offline', pendingWrites: 1, lastError: 'x' }), NOW)
    ).toMatchObject({ label: 'آفلاین (1 در انتظار)', tone: 'offline' })
  })
})
