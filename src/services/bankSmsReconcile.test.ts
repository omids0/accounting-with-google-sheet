import { describe, expect, it } from 'vitest'

import type { ConfirmableSms } from './bankSmsQueue'
import {
  appBalanceAt,
  buildDigestLines,
  correctionRecord,
  isDifferenceIgnored,
  isReconcileCorrection,
  matchSmsToRecords,
  reconcileAccount,
  reconcileRangeStart,
  shouldShowDifference,
  todaysDigestLines,
  withoutDigestLine,
  FIRST_RECONCILE_DAYS
} from './bankSmsReconcile'
import type { LedgerEntry } from './recordDuplicates'
import { toIsoDate } from '../utils/jalaliDate'
import { SMS_RECONCILE_CATEGORY } from '../utils/protectedCategories'

const at = (day: number, hour = 12, minute = 0) => new Date(2026, 9, day, hour, minute).getTime()
const dayIso = (day: number) => toIsoDate(new Date(2026, 9, day))

function sms(
  id: string,
  receivedAt: number,
  amount: number,
  balance: number | null,
  {
    direction = 'debit',
    accountId = 'mellat'
  }: { direction?: 'debit' | 'credit'; accountId?: string } = {}
): ConfirmableSms {
  return {
    sms: { id, sender: 'mellat', body: '', receivedAt, source: 'inbox' },
    result: {
      kind: 'matched',
      templateId: 't',
      accountId,
      direction,
      unit: 'toman',
      amount,
      balance,
      ref: ''
    },
    amount,
    balance
  }
}

function record(id: string, patch: Partial<LedgerEntry> & { date: string }): LedgerEntry {
  return { id, type: 'expense', amount: 0, accountId: 'mellat', createdAtMs: null, ...patch }
}

describe('reconcileAccount — difference at the newest SMS', () => {
  const newest = sms('s8', at(8, 14, 2), 50_000, 3_900_000)

  it('compares the newest SMS «مانده» with the app balance at that moment', () => {
    const result = reconcileAccount(
      'mellat',
      4_250_000,
      [sms('s1', at(1), 10_000, 9_000_000), newest],
      []
    )

    expect(result).toMatchObject({
      smsAt: at(8, 14, 2),
      smsBalance: 3_900_000,
      difference: 350_000
    })
  })

  it('takes out records whose money moved after the SMS time, and only those', () => {
    const records = [
      // A later day: moved after the SMS.
      record('later', { type: 'income', amount: 100_000, date: dayIso(9) }),
      // Same day, entered after the SMS.
      record('evening', { amount: 40_000, date: dayIso(8), createdAtMs: at(8, 18) }),
      // Same day, entered before the SMS.
      record('morning', { amount: 70_000, date: dayIso(8), createdAtMs: at(8, 9) }),
      // Dated before the SMS but typed in later (backfill): the bank already had it.
      record('backfill', { amount: 25_000, date: dayIso(7), createdAtMs: at(10) }),
      // «اثر بر موجودی» = خیر never moved the balance.
      record('unapplied', { amount: 500_000, date: dayIso(9), moved: false }),
      // Another account.
      record('other', { amount: 900_000, date: dayIso(9), accountId: 'saman' })
    ]

    expect(appBalanceAt(4_250_000, records, 'mellat', at(8, 14, 2))).toBe(
      4_250_000 - 100_000 + 40_000
    )
    expect(reconcileAccount('mellat', 4_250_000, [newest], records)?.difference).toBe(
      4_190_000 - 3_900_000
    )
  })

  it('places a record matched to an SMS at that SMS time', () => {
    const later = sms('s9', at(9, 8), 60_000, null)
    const matched = record('r9', { amount: 60_000, date: dayIso(9) })

    // 4,190,000 − (−60,000) = 4,250,000 at the newest «مانده» (the SMS of the 9th has none).
    expect(reconcileAccount('mellat', 4_190_000, [newest, later], [matched])).toMatchObject({
      appBalance: 4_250_000,
      smsAt: at(8, 14, 2)
    })
  })

  it('is null without an SMS that carries a «مانده»', () => {
    expect(reconcileAccount('mellat', 100, [sms('a', at(3), 10, null)], [])).toBeNull()
  })
})

describe('matchSmsToRecords — both directions', () => {
  it('lists SMS without a record and records without an SMS', () => {
    const coffee = record('coffee', { amount: 45_000, date: dayIso(3) })
    const rent = record('rent', { amount: 200_000, date: dayIso(6) })
    const salary = record('salary', { type: 'income', amount: 200_000, date: dayIso(6) })
    const result = matchSmsToRecords(
      [sms('buy', at(6, 9, 15), 200_000, 1), sms('fee', at(7, 18, 40), 150_000, 1)],
      [coffee, rent, salary],
      'mellat'
    )

    expect(result.missingSms.map(item => item.sms.id)).toEqual(['fee'])
    expect(result.unmatchedRecords.map(item => item.id)).toEqual(['coffee', 'salary'])
    expect(result.smsTimeOf.get(rent)).toBe(at(6, 9, 15))
  })

  it('matches one record to one SMS only, on the same account and date', () => {
    const one = record('one', { amount: 20_000, date: dayIso(5) })
    const elsewhere = record('elsewhere', { amount: 20_000, date: dayIso(5), accountId: 'cash' })
    const nextDay = record('next', { amount: 20_000, date: dayIso(6) })
    const result = matchSmsToRecords(
      [sms('a', at(5, 10), 20_000, 1), sms('b', at(5, 11), 20_000, 1)],
      [one, elsewhere, nextDay],
      'mellat'
    )

    expect(result.missingSms.map(item => item.sms.id)).toEqual(['b'])
    expect(result.unmatchedRecords.map(item => item.id)).toEqual(['next'])
  })

  it('never lists a «تطبیق» correction as a record without SMS', () => {
    const fix = record('fix', { amount: 5, date: dayIso(5), category: SMS_RECONCILE_CATEGORY })

    expect(matchSmsToRecords([], [fix], 'mellat').unmatchedRecords).toEqual([])
  })
})

describe('correctionRecord', () => {
  it('is an expense when the app shows more and an income when it shows less', () => {
    expect(correctionRecord(350_000, at(8, 14))).toMatchObject({
      type: 'expense',
      amount: 350_000,
      category: SMS_RECONCILE_CATEGORY,
      date: dayIso(8)
    })
    expect(correctionRecord(-120_000, at(8, 14))).toMatchObject({ type: 'income', amount: 120_000 })
    expect(correctionRecord(1, at(8, 14)).note).toMatch(/^تطبیق با پیامک /)
  })

  it('takes the category and note the user picked, e.g. «کارمزد»', () => {
    const fix = correctionRecord(1_100, at(8, 14), { category: ' کارمزد ', note: 'کارمزد جابجایی' })

    expect(fix).toMatchObject({ type: 'expense', category: 'کارمزد', title: 'کارمزد' })
    expect(fix.note).toMatch(/^تطبیق با پیامک .+ · کارمزد جابجایی$/)
    expect(correctionRecord(1_100, at(8, 14), { category: '  ' }).category).toBe(
      SMS_RECONCILE_CATEGORY
    )
  })

  it('still counts as a correction in a category other than «تطبیق»', () => {
    const fee = record('fee', correctionRecord(1_100, at(8)))
    const picked = record('picked', correctionRecord(1_100, at(8), { category: 'کارمزد' }))

    expect(isReconcileCorrection(fee)).toBe(true)
    expect(isReconcileCorrection(picked)).toBe(true)
    expect(isReconcileCorrection(record('plain', { date: dayIso(8), note: 'قهوه' }))).toBe(false)
    expect(matchSmsToRecords([], [picked], 'mellat').unmatchedRecords).toEqual([])
  })

  it('closes the difference once saved, although it is created after the SMS', () => {
    const newest = sms('s8', at(8, 14), 1, 3_900_000)
    const fix = correctionRecord(350_000, at(8, 14))
    const saved = record('fix', { ...fix, createdAtMs: Date.now() })

    // The record moved the balance down by 350,000.
    expect(reconcileAccount('mellat', 3_900_000, [newest], [saved])?.difference).toBe(0)
  })
})

describe('«نادیده»', () => {
  it('hides exactly the ignored difference until it changes', () => {
    expect(isDifferenceIgnored({ ignored: 350_000 }, 350_000)).toBe(true)
    expect(isDifferenceIgnored({ ignored: 350_000 }, 300_000)).toBe(false)
    expect(isDifferenceIgnored(undefined, 350_000)).toBe(false)
  })

  it('shows the red block only for a real, not-ignored difference', () => {
    const base = reconcileAccount('mellat', 4_250_000, [sms('a', at(8), 1, 3_900_000)], [])

    expect(shouldShowDifference(base, undefined)).toBe(true)
    expect(shouldShowDifference(base, { ignored: 350_000 })).toBe(false)
    expect(shouldShowDifference(base, { ignored: 1 })).toBe(true)
    expect(shouldShowDifference(null, undefined)).toBe(false)
  })
})

describe('wizard range', () => {
  it('starts at the last reconciled SMS, else 90 days back', () => {
    const now = at(20)

    expect(reconcileRangeStart({ smsAt: at(1) }, now)).toBe(at(1))
    expect(reconcileRangeStart(undefined, now)).toBe(now - FIRST_RECONCILE_DAYS * 86_400_000)
  })
})

describe('digest line once per day', () => {
  const accounts = [
    { id: 'mellat', title: 'ملت', balance: 4_250_000 },
    { id: 'saman', title: 'سامان', balance: 1_000 }
  ]
  const reviewed = [
    sms('m', at(8), 1, 3_900_000),
    sms('s', at(8), 1, 1_000, { accountId: 'saman', direction: 'credit' })
  ]

  it('builds «ملت ۳۵۰ هزار اختلاف دارد» for differing accounts only', () => {
    expect(buildDigestLines(accounts, reviewed, [], {})).toEqual({
      mellat: 'ملت ۳۵۰ هزار اختلاف دارد'
    })
    expect(buildDigestLines(accounts, reviewed, [], { mellat: { ignored: 350_000 } })).toEqual({})
  })

  it('reuses the lines built today and rebuilds on another day', () => {
    const gate = { date: '2026-10-13', lines: { mellat: 'ملت ۳۵۰ هزار اختلاف دارد' } }

    expect(todaysDigestLines(gate, '2026-10-13')).toEqual(['ملت ۳۵۰ هزار اختلاف دارد'])
    expect(todaysDigestLines(gate, '2026-10-14')).toBeNull()
    expect(todaysDigestLines(undefined, '2026-10-13')).toBeNull()
  })

  it('drops an account from today’s lines after a reconciliation or «نادیده»', () => {
    const gate = { date: '2026-10-13', lines: { mellat: 'x', saman: 'y' } }

    expect(withoutDigestLine(gate, 'mellat')).toEqual({ date: '2026-10-13', lines: { saman: 'y' } })
    expect(withoutDigestLine(gate, 'none')).toBe(gate)
  })
})
