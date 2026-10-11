import { describe, expect, it } from 'vitest'

import { FULL_SYNC_MAX_AGE_MS, planSheetFetch } from './sheetSyncPlan'

const ALL = ['هزینه', 'درآمد', 'چک‌ها']

const NOW = 10 * FULL_SYNC_MAX_AGE_MS

function plan(overrides: Partial<Parameters<typeof planSheetFetch>[0]> = {}) {
  return planSheetFetch({
    allSheets: ALL,
    allowPartial: true,
    hadData: true,
    changed: [],
    driveChanged: false,
    fullSyncAt: NOW - 60_000,
    now: NOW,
    ...overrides
  })
}

describe('planSheetFetch', () => {
  it('downloads nothing when no token moved and Drive is unchanged', () => {
    expect(plan()).toEqual({ sheets: [], full: false })
  })

  it('downloads only the tabs whose token moved', () => {
    expect(plan({ changed: ['هزینه'] })).toEqual({ sheets: ['هزینه'], full: false })
  })

  it('downloads everything when Drive changed but no token moved (hand edit)', () => {
    expect(plan({ driveChanged: true })).toEqual({ sheets: ALL, full: true })
  })

  it('downloads everything when this device knows no tokens yet', () => {
    expect(plan({ changed: null })).toEqual({ sheets: ALL, full: true })
  })

  it('downloads everything once the last full download is a day old', () => {
    expect(plan({ fullSyncAt: NOW - FULL_SYNC_MAX_AGE_MS })).toEqual({ sheets: ALL, full: true })
    expect(plan({ fullSyncAt: null })).toEqual({ sheets: ALL, full: true })
  })

  it('downloads everything without a local mirror or when a partial pull is not allowed', () => {
    expect(plan({ hadData: false })).toEqual({ sheets: ALL, full: true })
    expect(plan({ allowPartial: false })).toEqual({ sheets: ALL, full: true })
  })
})
