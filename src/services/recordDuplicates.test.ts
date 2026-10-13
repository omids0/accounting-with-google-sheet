import { describe, expect, it } from 'vitest'

import {
  createdAgoLabel,
  findRecentEntryDuplicate,
  matchesDuplicate,
  parseCreatedAtMs,
  type LedgerEntry
} from './recordDuplicates'

const NOW = new Date(2026, 9, 12, 14, 30).getTime()

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    type: 'expense',
    amount: 480_000,
    date: '2026-10-12',
    accountId: '',
    id: 'r1',
    category: 'قبوض',
    createdAtMs: NOW - 12 * 60_000,
    ...overrides
  }
}

const candidate = {
  type: 'expense' as const,
  amount: 480_000,
  date: '2026-10-12',
  category: 'قبوض'
}

describe('parseCreatedAtMs', () => {
  it('reads the fa-IR timestamp the app writes', () => {
    // ۱۴۰۵/۷/۲۰ is 2026-10-12.
    expect(parseCreatedAtMs('۱۴۰۵/۷/۲۰, ۱۴:۱۸:۰۵')).toBe(new Date(2026, 9, 12, 14, 18, 5).getTime())
    expect(parseCreatedAtMs('۱۴۰۵/۷/۲۰، ۹:۰۵')).toBe(new Date(2026, 9, 12, 9, 5).getTime())
  })

  it('reads Gregorian and ISO timestamps', () => {
    expect(parseCreatedAtMs('2026/10/12 08:00')).toBe(new Date(2026, 9, 12, 8).getTime())
    expect(parseCreatedAtMs('2026-10-12T08:00:00.000Z')).toBe(Date.UTC(2026, 9, 12, 8))
  })

  it('gives null without a time of day', () => {
    expect(parseCreatedAtMs('۱۴۰۵/۷/۲۰')).toBeNull()
    expect(parseCreatedAtMs('')).toBeNull()
  })
})

describe('matchesDuplicate (bank SMS rule)', () => {
  it('accepts the same direction and amount within a day', () => {
    expect(matchesDuplicate(candidate, entry({ date: '2026-10-11' }), { dayTolerance: 1 })).toBe(
      true
    )
    expect(matchesDuplicate(candidate, entry({ date: '2026-10-10' }), { dayTolerance: 1 })).toBe(
      false
    )
    expect(matchesDuplicate(candidate, entry({ type: 'income' }), { dayTolerance: 1 })).toBe(false)
  })
})

describe('findRecentEntryDuplicate', () => {
  it('finds a record with the same amount, category and date created in the last hour', () => {
    expect(findRecentEntryDuplicate(candidate, [entry()], NOW)?.id).toBe('r1')
  })

  it('ignores records created more than 60 minutes ago or without a readable time', () => {
    expect(
      findRecentEntryDuplicate(candidate, [entry({ createdAtMs: NOW - 61 * 60_000 })], NOW)
    ).toBeNull()
    expect(findRecentEntryDuplicate(candidate, [entry({ createdAtMs: null })], NOW)).toBeNull()
  })

  it('needs the same category, amount and date', () => {
    expect(findRecentEntryDuplicate(candidate, [entry({ category: 'خوراک' })], NOW)).toBeNull()
    expect(findRecentEntryDuplicate(candidate, [entry({ amount: 1 })], NOW)).toBeNull()
    expect(findRecentEntryDuplicate(candidate, [entry({ date: '2026-10-11' })], NOW)).toBeNull()
  })

  it('returns the newest match and nothing for an empty amount', () => {
    const older = entry({ id: 'old', createdAtMs: NOW - 50 * 60_000 })
    const newer = entry({ id: 'new', createdAtMs: NOW - 5 * 60_000 })

    expect(findRecentEntryDuplicate(candidate, [older, newer], NOW)?.id).toBe('new')
    expect(
      findRecentEntryDuplicate({ ...candidate, amount: 0 }, [entry({ amount: 0 })], NOW)
    ).toBeNull()
  })
})

describe('createdAgoLabel', () => {
  it('reads minutes in Persian', () => {
    expect(createdAgoLabel(NOW - 12 * 60_000, NOW)).toBe('۱۲ دقیقه پیش')
    expect(createdAgoLabel(NOW - 20_000, NOW)).toBe('همین الان')
  })
})
