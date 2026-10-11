import { describe, expect, it } from 'vitest'

import { FULL_SYNC_MAX_AGE_MS, planSheetFetch, SUSPECT_FULL_SYNC_MS } from './sheetSyncPlan'

const ALL = ['هزینه', 'درآمد', 'چک‌ها']

const NOW = 10 * FULL_SYNC_MAX_AGE_MS

const RECENT = NOW - 60_000

function plan(overrides: Partial<Parameters<typeof planSheetFetch>[0]> = {}) {
  return planSheetFetch({
    allSheets: ALL,
    allowPartial: true,
    hadData: true,
    changed: [],
    driveChanged: false,
    fullSyncAt: RECENT,
    absorbedAt: null,
    now: NOW,
    ...overrides
  })
}

const NOTHING = { sheets: [], full: false, absorbs: false }

const EVERYTHING = { sheets: ALL, full: true, absorbs: false }

describe('planSheetFetch', () => {
  it('downloads nothing when no token moved and Drive is unchanged', () => {
    expect(plan()).toEqual(NOTHING)
  })

  it('downloads only the tabs whose token moved', () => {
    expect(plan({ changed: ['هزینه'] })).toEqual({
      sheets: ['هزینه'],
      full: false,
      absorbs: false
    })
  })

  it('downloads everything when Drive changed but no token moved (hand edit)', () => {
    expect(plan({ driveChanged: true })).toEqual(EVERYTHING)
  })

  it('downloads only the moved tabs right after a full sync, flagging a possible hand edit', () => {
    expect(plan({ changed: ['هزینه'], driveChanged: true })).toEqual({
      sheets: ['هزینه'],
      full: false,
      absorbs: true
    })
  })

  it('downloads everything when tokens and Drive moved and the last full sync is older than the suspect window', () => {
    expect(
      plan({ changed: ['هزینه'], driveChanged: true, fullSyncAt: NOW - SUSPECT_FULL_SYNC_MS })
    ).toEqual(EVERYTHING)
  })

  it('catches up on a flagged hand edit once the suspect window has passed', () => {
    expect(plan({ absorbedAt: RECENT })).toEqual(NOTHING)
    expect(plan({ absorbedAt: RECENT, fullSyncAt: NOW - SUSPECT_FULL_SYNC_MS })).toEqual(EVERYTHING)
  })

  it('downloads everything when this device knows no tokens yet', () => {
    expect(plan({ changed: null })).toEqual(EVERYTHING)
  })

  it('downloads everything once the last full download is a day old', () => {
    expect(plan({ fullSyncAt: NOW - FULL_SYNC_MAX_AGE_MS })).toEqual(EVERYTHING)
    expect(plan({ fullSyncAt: null })).toEqual(EVERYTHING)
  })

  it('downloads everything without a local mirror or when a partial pull is not allowed', () => {
    expect(plan({ hadData: false })).toEqual(EVERYTHING)
    expect(plan({ allowPartial: false })).toEqual(EVERYTHING)
  })
})
