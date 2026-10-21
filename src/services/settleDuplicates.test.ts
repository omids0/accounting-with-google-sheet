import { describe, expect, it, vi } from 'vitest'

import { SMS_RECORD_NOTE } from './bankSmsApply'
import type { LedgerEntry } from './recordDuplicates'
import { describeDuplicate, findSettleDuplicate, SETTLE_DUPLICATE_DAYS } from './settleDuplicates'
import { formatPersianNumber } from '../utils/formatMoney'
import { addDaysToIso, getTodayIso } from '../utils/jalaliDate'

vi.mock('./bankSmsApply', () => ({ SMS_RECORD_NOTE: 'ثبت از پیامک' }))

const today = getTodayIso()

const candidate = { type: 'expense' as const, amount: 3_000_000, date: today }

function entry(overrides: Partial<LedgerEntry>): LedgerEntry {
  return {
    type: 'expense',
    amount: 3_000_000,
    date: today,
    accountId: 'acc-1',
    id: 'r1',
    title: 'برداشت',
    createdAtMs: 1_000,
    ...overrides
  }
}

describe('findSettleDuplicate', () => {
  it('matches the exact amount within ±3 days, both ends included', () => {
    expect(SETTLE_DUPLICATE_DAYS).toBe(3)
    expect(
      findSettleDuplicate(candidate, [entry({ date: addDaysToIso(today, -3) })], new Set())?.id
    ).toBe('r1')
    expect(
      findSettleDuplicate(candidate, [entry({ date: addDaysToIso(today, 3) })], new Set())?.id
    ).toBe('r1')
    expect(
      findSettleDuplicate(candidate, [entry({ date: addDaysToIso(today, -4) })], new Set())
    ).toBeNull()
  })

  it('needs the same amount and the same direction', () => {
    expect(findSettleDuplicate(candidate, [entry({ amount: 3_000_001 })], new Set())).toBeNull()
    expect(findSettleDuplicate(candidate, [entry({ type: 'income' })], new Set())).toBeNull()
  })

  it('skips records already tied to a settlement', () => {
    expect(findSettleDuplicate(candidate, [entry({ id: 'r1' })], new Set(['r1']))).toBeNull()
  })

  it('skips records this app created for another settlement', () => {
    for (const title of [
      'بدهی: علی',
      'بازپرداخت به مدیر · لامپ',
      'چک: ۱۲۳ — رضا',
      'قسط: وام (#2)',
      'طلب: سارا'
    ]) {
      expect(findSettleDuplicate(candidate, [entry({ title })], new Set())).toBeNull()
    }
  })

  it('prefers a bank-SMS record, then the newest', () => {
    const ledger = [
      entry({ id: 'old', createdAtMs: 1_000 }),
      entry({ id: 'new', createdAtMs: 9_000 }),
      entry({ id: 'sms', createdAtMs: 500, note: SMS_RECORD_NOTE })
    ]

    expect(findSettleDuplicate(candidate, ledger, new Set())?.id).toBe('sms')
    expect(findSettleDuplicate(candidate, ledger.slice(0, 2), new Set())?.id).toBe('new')
  })
})

describe('describeDuplicate', () => {
  const accounts = [{ id: 'acc-1', title: 'ملت' }]

  it('names the direction, amount, account, day and the SMS origin', () => {
    const createdAtMs = new Date(`${today}T10:15:00`).getTime()
    const text = describeDuplicate(entry({ createdAtMs, note: SMS_RECORD_NOTE }), accounts)

    expect(text).toContain(`هزینهٔ ${formatPersianNumber(3_000_000)} از ملت، امروز`)
    expect(text).toContain('۱۰:۱۵')
    expect(text.endsWith(`(${SMS_RECORD_NOTE})`)).toBe(true)
  })

  it('says «به» for income and leaves out an unknown account and an unreadable time', () => {
    const income = describeDuplicate(entry({ type: 'income', createdAtMs: null }), accounts)

    expect(income).toContain('درآمد')
    expect(income).toContain('به ملت')
    expect(income).not.toContain(':')
    expect(describeDuplicate(entry({ accountId: 'gone' }), accounts)).not.toContain(' از ')
  })
})
