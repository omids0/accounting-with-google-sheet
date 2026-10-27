import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BANK_SMS_PREFS_KEY } from './bankSmsPrefs'
import type { ConfirmableSms } from './bankSmsQueue'
import { NO_RECONCILE_LINKS, type ReconcileLinks } from './bankSmsReconcileMatch'
import type { LedgerEntry } from './recordDuplicates'
import type { Dang } from '../types'
import { toIsoDate } from '../utils/jalaliDate'

const SHEET_ID = 'test-reconcile-links'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./bankSmsApply', () => ({ dismissSms: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./settings', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getSettings: () => ({ spreadsheetId: SHEET_ID })
}))

const { matchSmsToRecords, reconcileAccount } = await import('./bankSmsReconcile')
const { localReconcileLinks } = await import('./bankSmsReconcileData')
const { coverSmsPart } = await import('./bankSmsCoverage')
const { dangToRow } = await import('./dangRow')
const { DANG_HEADERS } = await import('./sheetHeaders')
const { DANG_SHEET } = await import('./sheetNames')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')
const { setWorkspaceType } = await import('./workspace')

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour, 0).getTime()
const dayIso = (day: number) => toIsoDate(new Date(2026, 9, day))

function sms(id: string, receivedAt: number, amount: number, balance: number | null) {
  return {
    sms: { id, sender: 'mellat', body: '', receivedAt, source: 'inbox' },
    result: {
      kind: 'matched',
      templateId: 't',
      accountId: 'mellat',
      direction: 'debit',
      unit: 'toman',
      amount,
      balance,
      ref: ''
    },
    amount,
    balance
  } as ConfirmableSms
}

const record = (id: string, patch: Partial<LedgerEntry> & { date: string }): LedgerEntry => ({
  id,
  type: 'expense',
  amount: 0,
  accountId: 'mellat',
  createdAtMs: null,
  ...patch
})

const linksFor = (partial: Partial<ReconcileLinks>): ReconcileLinks => ({
  ...NO_RECONCILE_LINKS,
  ...partial
})
const debtPayment = new Map([['pay', { kind: 'dang', noun: 'بدهی', title: 'وام دوست' }]])

describe('matchSmsToRecords: a debt or receivable payment record', () => {
  const payment = record('pay', { amount: 5_000_000, date: dayIso(6) })
  const links = linksFor({ linked: debtPayment })

  it('matches the SMS two days later, which a plain record would not', () => {
    const one = [sms('s1', at(8), 5_000_000, null)]

    expect(matchSmsToRecords(one, [payment], 'mellat').missingSms).toHaveLength(1)

    const match = matchSmsToRecords(one, [payment], 'mellat', links)

    expect(match.missingSms).toEqual([])
    expect(match.unmatchedRecords).toEqual([])
    expect(match.smsTimeOf.get(payment)).toBe(at(8))
  })

  it('stops at 3 days, needs the exact amount, and ignores other accounts', () => {
    const far = record('pay', { amount: 5_000_000, date: dayIso(4) })
    const five = [sms('s', at(8), 5_000_000, null)]
    const four = [sms('s', at(8), 4_000_000, null)]

    expect(matchSmsToRecords(five, [far], 'mellat', links).missingSms).toHaveLength(1)
    expect(matchSmsToRecords(four, [payment], 'mellat', links).missingSms).toHaveLength(1)
    expect(matchSmsToRecords(four, [payment], 'mellat', links).unmatchedRecords).toHaveLength(1)
    expect(matchSmsToRecords(five, [payment], 'other', links).unmatchedRecords).toEqual([])
  })

  it('a same-day plain record is taken first, the payment stays for its own SMS', () => {
    const plain = record('plain', { amount: 5_000_000, date: dayIso(8) })
    const match = matchSmsToRecords(
      [sms('s1', at(8), 5_000_000, null), sms('s2', at(9), 5_000_000, null)],
      [payment, plain],
      'mellat',
      links
    )

    expect(match.missingSms).toEqual([])
    expect(match.smsTimeOf.get(plain)).toBe(at(8))
    expect(match.smsTimeOf.get(payment)).toBe(at(9))
  })

  it('does not use a payment an SMS already covered a part of as a second exact match', () => {
    const covered = linksFor({ linked: debtPayment, coverage: new Map([['pay', 1_000_000]]) })
    const match = matchSmsToRecords(
      [sms('s1', at(8), 5_000_000, null)],
      [payment],
      'mellat',
      covered
    )

    expect(match.missingSms).toHaveLength(1)
  })
})

describe('matchSmsToRecords: SMS that are parts of one payment', () => {
  it('maps every part to the record and keeps the newest SMS time', () => {
    const big = record('pay', { amount: 20_000_000, date: dayIso(7) })
    const parts = [sms('s1', at(8), 10_000_000, null), sms('s2', at(9), 10_000_000, null)]
    const partOf = new Map([
      ['s1', 'pay'],
      ['s2', 'pay']
    ])
    const match = matchSmsToRecords([...parts], [big], 'mellat', linksFor({ parts: partOf }))

    expect(match.missingSms).toEqual([])
    expect(match.unmatchedRecords).toEqual([])
    expect(match.smsTimeOf.get(big)).toBe(at(9))
    expect(matchSmsToRecords(parts, [big], 'mellat').missingSms).toHaveLength(2)
  })

  it('falls back to the plain rules when the record is gone', () => {
    const match = matchSmsToRecords(
      [sms('s1', at(8), 10_000_000, null)],
      [],
      'mellat',
      linksFor({ parts: new Map([['s1', 'gone']]) })
    )

    expect(match.missingSms).toHaveLength(1)
  })
})

describe('the wizard path: reconcileAccount with the local links', () => {
  const dang = {
    id: 'd1',
    createdAt: 't',
    title: 'وام دوست',
    category: 'خانه',
    counterparty: 'رضا',
    amount: 30_000_000,
    date: '2026-10-01',
    note: '',
    paid: false,
    paidAt: '',
    payments: [
      { id: 'p1', amount: 5_000_000, paidAt: dayIso(11), note: '', transactionRecordId: 'pay' },
      { id: 'p2', amount: 20_000_000, paidAt: dayIso(7), note: '', transactionRecordId: 'big' }
    ]
  } as Dang

  beforeEach(() => {
    localStorage.removeItem(BANK_SMS_PREFS_KEY)
    clearStore(SHEET_ID)
    setWorkspaceType(SHEET_ID, 'personal')
    setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, dangToRow(dang)])
  })

  it('shows no false difference for a payment dated days from its SMS or split into two SMS', async () => {
    await coverSmsPart('s2', 'big', 10_000_000)
    await coverSmsPart('s3', 'big', 10_000_000)

    const all = [
      sms('s1', at(8), 5_000_000, 100_000_000),
      sms('s2', at(9), 10_000_000, 90_000_000),
      sms('s3', at(10), 10_000_000, 80_000_000)
    ]
    const records = [
      record('pay', { amount: 5_000_000, date: dayIso(11) }),
      record('big', { amount: 20_000_000, date: dayIso(7) })
    ]
    const links = localReconcileLinks(all, records)

    expect(links.linked.has('pay')).toBe(true)
    expect(links.parts.get('s2')).toBe('big')

    // The bank shows 80M after the newest SMS and the app holds 80M.
    const result = reconcileAccount('mellat', 80_000_000, all, records, links)

    expect(result?.match.missingSms).toEqual([])
    expect(result?.match.unmatchedRecords).toEqual([])
    expect(result?.difference).toBe(0)

    // Without the links the payment dated after the newest SMS looks like money that moved later
    // (a false 5M difference) and every SMS is listed as missing.
    const plain = reconcileAccount('mellat', 80_000_000, all, records)

    expect(plain?.difference).toBe(5_000_000)
    expect(plain?.match.missingSms).toHaveLength(3)
    expect(plain?.match.unmatchedRecords).toHaveLength(2)
  })
})
