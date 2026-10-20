import { beforeEach, describe, expect, it } from 'vitest'

import {
  formatIssueMarker,
  getDeviceId,
  hasAutoIssuedToday,
  isIssueBlocked,
  ISSUE_MARKER_WINDOW_MS,
  markAutoIssuedToday,
  parseIssueMarker
} from './buildingIssueGuard'

const NOW = Date.parse('2026-10-20T10:00:00.000Z')

const marker = (deviceId: string, ageMs: number, monthKey = '1405-07') => ({
  monthKey,
  deviceId,
  at: new Date(NOW - ageMs).toISOString()
})

beforeEach(() => localStorage.clear())

describe('issue marker', () => {
  it('round-trips through the settings cell', () => {
    const value = marker('dev-1', 0)

    expect(formatIssueMarker(value)).toBe(`1405-07@dev-1@${value.at}`)
    expect(parseIssueMarker(formatIssueMarker(value))).toEqual(value)
  })

  it('ignores a cell that is empty or malformed', () => {
    expect(parseIssueMarker(undefined)).toBeNull()
    expect(parseIssueMarker('')).toBeNull()
    expect(parseIssueMarker('1405-07@dev-1')).toBeNull()
    expect(parseIssueMarker('1405-07@dev-1@not-a-date')).toBeNull()
  })

  it('blocks only on another device, the same month, within two minutes', () => {
    expect(isIssueBlocked(marker('dev-2', 30_000), '1405-07', 'dev-1', NOW)).toBe(true)
    expect(
      isIssueBlocked(marker('dev-2', ISSUE_MARKER_WINDOW_MS + 1), '1405-07', 'dev-1', NOW)
    ).toBe(false)
    expect(isIssueBlocked(marker('dev-1', 30_000), '1405-07', 'dev-1', NOW)).toBe(false)
    expect(isIssueBlocked(marker('dev-2', 30_000, '1405-06'), '1405-07', 'dev-1', NOW)).toBe(false)
    expect(isIssueBlocked(null, '1405-07', 'dev-1', NOW)).toBe(false)
  })
})

describe('device and day gates', () => {
  it('keeps one device id once created', () => {
    const id = getDeviceId()

    expect(id).toBeTruthy()
    expect(getDeviceId()).toBe(id)
  })

  it('lets the automatic issue run once per building per day', () => {
    expect(hasAutoIssuedToday('b1', '2026-10-20')).toBe(false)

    markAutoIssuedToday('b1', '2026-10-20')

    expect(hasAutoIssuedToday('b1', '2026-10-20')).toBe(true)
    expect(hasAutoIssuedToday('b2', '2026-10-20')).toBe(false)
    expect(hasAutoIssuedToday('b1', '2026-10-21')).toBe(false)
  })
})
