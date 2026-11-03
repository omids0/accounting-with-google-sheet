import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ records: [] as string[], ledger: [] as unknown[] }))

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ensureSheetWithHeaders: async () => undefined,
  fetchSheetRangeFromApi: async () => [],
  appendRecord: vi.fn(async (_id: string, _form: unknown, recordId: string) => {
    io.records.push(recordId)
  })
}))
vi.mock('./recordLedger', () => ({ loadRecordLedger: async () => io.ledger }))
vi.mock('./entryWallet', () => ({ settleEntryWallet: vi.fn(async () => undefined) }))
vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))
vi.mock('./openingBalanceRefresh', () => ({ refreshOpeningBalancesInBackground: vi.fn() }))

import type { LedgerEntry } from './recordDuplicates'
import { recurringToRow } from './recurring'
import { postReminderItems } from './recurringPost'
import { fetchRecurringItems } from './recurringSheet'
import { RECURRING_HEADERS } from './sheetHeaders'
import { RECURRING_SHEET } from './sheetNames'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import type { AppSettings, RecurringItem } from '../types'

const ID = 'recurring-post-concurrent'
const TODAY = '2026-10-28'
const MONTH = '1405-08'

const salary: RecurringItem = {
  id: 'r1',
  createdAt: 't',
  type: 'income',
  category: 'حقوق',
  subCategory: '',
  accountId: 'acc',
  amount: 65_000_000,
  title: 'حقوق',
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true
}
const rent: RecurringItem = {
  ...salary,
  id: 'r2',
  type: 'expense',
  category: 'اجاره',
  title: 'اجاره',
  amount: 10_000_000
}

const settings = {
  spreadsheetId: ID,
  forms: [
    { id: 'i', type: 'income', sheetName: 'درآمد', fields: [] },
    { id: 'e', type: 'expense', sheetName: 'هزینه', fields: [] }
  ]
} as unknown as AppSettings

const post = (
  items: RecurringItem[],
  ticked: RecurringItem[] = items,
  onDuplicate?: (item: RecurringItem) => void
) =>
  postReminderItems(settings, items, new Set(ticked.map(item => item.id)), TODAY, { onDuplicate })

beforeEach(() => {
  localStorage.clear()
  clearStore(ID)
  io.records = []
  io.ledger = []
  setSheetAllRows(ID, RECURRING_SHEET, [
    RECURRING_HEADERS,
    recurringToRow(salary),
    recurringToRow(rent)
  ])
})

describe('«ثبت همه» posts each item once', () => {
  it('a double tap (two calls at once) writes each record once', async () => {
    const [first, second] = await Promise.all([post([salary, rent]), post([salary, rent])])

    expect(first + second).toBe(2)
    expect(io.records).toHaveLength(2)
  })

  it('a call after the first finished posts nothing', async () => {
    expect(await post([salary, rent])).toBe(2)
    expect(await post([salary, rent])).toBe(0)
    expect(io.records).toHaveLength(2)
    expect((await fetchRecurringItems(ID)).map(item => item.lastPosted)).toEqual([MONTH, MONTH])
  })

  it('an item another device already posted is skipped, the rest still post', async () => {
    setSheetAllRows(ID, RECURRING_SHEET, [
      RECURRING_HEADERS,
      recurringToRow({ ...salary, lastPosted: MONTH }),
      recurringToRow(rent)
    ])

    expect(await post([salary, rent])).toBe(1)
    expect(io.records).toHaveLength(1)
  })

  it('an unticked item is marked for the month and not posted', async () => {
    expect(await post([salary, rent], [rent])).toBe(1)
    expect((await fetchRecurringItems(ID)).map(item => item.lastPosted)).toEqual([MONTH, MONTH])
  })
})

describe('an item whose payment is already a record', () => {
  const sms: LedgerEntry = {
    type: 'income',
    amount: 65_000_000,
    date: '2026-10-24',
    accountId: 'acc',
    id: 'sms-record',
    category: 'حقوق',
    title: 'حقوق',
    note: 'ثبت از پیامک'
  }

  it('is marked posted without a second record, and reported', async () => {
    io.ledger = [sms]

    const marked: string[] = []

    expect(await post([salary, rent], [salary, rent], item => marked.push(item.id))).toBe(1)
    expect(marked).toEqual(['r1'])
    expect(io.records).toHaveLength(1)
    expect((await fetchRecurringItems(ID)).map(item => item.lastPosted)).toEqual([MONTH, MONTH])
  })

  it('is recorded again when the user ticked it again (recordAnyway)', async () => {
    io.ledger = [sms]

    const marked: string[] = []
    const written = await postReminderItems(settings, [salary], new Set(['r1']), TODAY, {
      onDuplicate: item => marked.push(item.id),
      recordAnyway: new Set(['r1'])
    })

    expect(written).toBe(1)
    expect(marked).toEqual([])
    expect(io.records).toHaveLength(1)
  })

  it('the same amount four days from its day is not taken for it', async () => {
    io.ledger = [{ ...sms, date: '2026-10-27' }]

    expect(await post([salary])).toBe(1)
  })
})
