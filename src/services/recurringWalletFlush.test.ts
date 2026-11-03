import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * «ثبت همه» end to end on the REAL local mirror and the REAL outbox (queue, coalescing, flush,
 * balance merge) against an in-memory Google Sheets: the balance of the account, the sheet and
 * the history («گردش حساب») must all agree, each delta counted once.
 */
const fake = vi.hoisted(() => ({
  tabs: new Map<string, string[][]>(),
  puts: [] as { book: string; tab: string; row: number; cells: string[] }[],
  delayMs: 3
}))

vi.mock('./sheetsApi', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>()
  const rangeOf = (url: string) => {
    const [path] = url.split('?')
    const raw = decodeURIComponent(path.slice(path.indexOf('/values/') + '/values/'.length))
    const [tabPart, cells = ''] = raw.replace(/:append$/, '').split('!')
    const tab = tabPart.replace(/^'|'$/g, '').replace(/''/g, "'")

    const book = path.slice(0, path.indexOf('/values/')).split('/').pop() ?? ''

    return { key: `${book}|${tab}`, tab, cells, append: path.endsWith(':append') }
  }

  return {
    ...actual,
    apiRequest: async (url: string, init?: { method?: string; body?: string }) => {
      await new Promise(resolve => setTimeout(resolve, fake.delayMs))
      if (!url.includes('/values/') || url.includes('values:batchGet')) return {}

      const { key, tab, cells, append } = rangeOf(url)
      const rows = fake.tabs.get(key) ?? []

      if (init?.method === 'POST' && append) {
        const values = JSON.parse(init.body ?? '{}').values as string[][]

        fake.tabs.set(key, [...rows, ...values.map(row => row.map(String))])

        return {}
      }
      if (init?.method === 'PUT') {
        const [cell] = cells.split(':')
        const rowNumber = Number(cell.replace(/\D/g, ''))
        const [values] = JSON.parse(init.body ?? '{}').values as string[][][]
        const next = rows.map(row => [...row])

        next[rowNumber - 1] = values.map(String)
        fake.tabs.set(key, next)
        fake.puts.push({ book: key.split('|')[0], tab, row: rowNumber, cells: values.map(String) })

        return {}
      }
      if (!cells) return { values: rows.map(row => [...row]) }

      const [from, to = from] = cells.split(':')

      if (/^[A-Z]+$/.test(from)) return { values: rows.map(row => [row[0] ?? '']) }

      const start = Number(from.replace(/\D/g, ''))
      const end = Number(to.replace(/\D/g, ''))

      return { values: rows.slice(start - 1, end).map(row => [...row]) }
    }
  }
})
vi.mock('./sheets', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  appendRecord: vi.fn(async () => undefined)
}))
vi.mock('./recordLedger', () => ({ loadRecordLedger: async () => [] }))
vi.mock('./activityLog', () => ({ logItemActivity: vi.fn(), logActivity: vi.fn() }))
vi.mock('./openingBalanceRefresh', () => ({ refreshOpeningBalancesInBackground: vi.fn() }))
vi.mock('../utils/toast', () => ({ showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() }))

import { recurringToRow } from './recurring'
import { postReminderItems } from './recurringPost'
import { RECURRING_HEADERS } from './sheetHeaders'
import { RECURRING_SHEET } from './sheetNames'
import { flushOutbox } from './sheetSync'
import { clearStore, getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { hasPendingOutbox } from './syncOutbox'
import { fetchWalletAccounts, WALLET_HEADERS, WALLET_SHEET } from './wallet'
import { fetchLedger, WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } from './walletLedger'
import type { AppSettings, RecurringItem } from '../types'

let ID = ''
let run = 0
const TODAY = '2026-10-28'
const START = 100_000_000

const item = (id: string, type: RecurringItem['type'], amount: number): RecurringItem => ({
  id,
  createdAt: 't',
  type,
  category: id,
  subCategory: '',
  accountId: 'acc',
  amount,
  title: id,
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true
})

const ITEMS = [
  item('allowance', 'income', 38_000_000),
  item('internet', 'expense', 1_150_000),
  item('rent', 'expense', 12_000_000),
  item('wage', 'income', 18_000_000)
]
const SUM = ITEMS.reduce((sum, row) => sum + (row.type === 'income' ? 1 : -1) * row.amount, 0)

const settings = () =>
  ({
    spreadsheetId: ID,
    forms: [
      { id: 'i', type: 'income', sheetName: 'درآمد', fields: [] },
      { id: 'e', type: 'expense', sheetName: 'هزینه', fields: [] }
    ]
  } as unknown as AppSettings)

const postAll = (rows = ITEMS) =>
  postReminderItems(settings(), rows, new Set(rows.map(row => row.id)), TODAY)

async function settle(): Promise<void> {
  for (let round = 0; round < 30 && hasPendingOutbox(ID); round += 1) await flushOutbox(ID)
  await flushOutbox(ID)
}

const walletRow = (rows: string[][] | undefined) => rows?.find(row => row[0] === 'acc')
const mirrorBalance = async () =>
  (await fetchWalletAccounts(ID)).find(account => account.id === 'acc')!.balance
const sheetBalance = () => Number(walletRow(fake.tabs.get(`${ID}|${WALLET_SHEET}`))?.[3])

function seed(extraRows: RecurringItem[] = ITEMS) {
  const wallet = [WALLET_HEADERS, ['acc', 't', 'کارت', String(START)]]
  const recurring = [RECURRING_HEADERS, ...extraRows.map(recurringToRow)]

  setSheetAllRows(ID, WALLET_SHEET, wallet)
  setSheetAllRows(ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  setSheetAllRows(ID, RECURRING_SHEET, recurring)
  for (const tab of [WALLET_SHEET, WALLET_LEDGER_SHEET, RECURRING_SHEET]) {
    fake.tabs.set(
      `${ID}|${tab}`,
      (getSheetAllRows(ID, tab) ?? []).map(row => [...row])
    )
  }
}

async function expectAgreement(expected: number, lines: number) {
  const ledger = await fetchLedger(ID, 'acc')

  expect(await mirrorBalance()).toBe(expected)
  expect(sheetBalance()).toBe(expected)
  expect(ledger).toHaveLength(lines)
  expect(ledger.reduce((sum, line) => sum + line.delta, 0)).toBe(expected - START)
}

describe('«ثبت همه» keeps the balance, the sheet and the history in step', () => {
  beforeEach(() => {
    localStorage.clear()
    // A fresh book per test: a flush still running from the last one cannot touch this one.
    run += 1
    ID = `recurring-wallet-flush-${run}`
    clearStore(ID)
    fake.puts = []
    seed()
  })

  it('four items on one account, one click: every delta once', async () => {
    await postAll()
    await settle()

    await expectAgreement(START + SUM, 4)
  })

  it('a double tap (two calls at once): every delta once', async () => {
    await Promise.all([postAll(), postAll()])
    await settle()

    await expectAgreement(START + SUM, 4)
  })

  it('a record deleted while the post is still queued does not replay the others', async () => {
    const { applyWalletChanges, recordLedgerContext } = await import('./recordWallet')
    const posting = postAll()
    const refund = { accountId: 'acc', delta: -5_000_000 }

    // A record saved earlier (-5M) is deleted while «ثبت همه» is still writing.
    await applyWalletChanges(
      ID,
      refund,
      null,
      recordLedgerContext({ title: 'x', date: '1405-08-06' }, 'حذف', 'older-record')
    )
    await posting
    await settle()

    await expectAgreement(START + SUM + 5_000_000, 5)
  })
})
