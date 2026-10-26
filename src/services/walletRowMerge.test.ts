import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WalletAccount } from '../types'
import type * as SheetsApiModule from './sheetsApi'
import { mergedBalance, mergeQueuedWalletRow } from './walletRowMerge'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))

const { executeOutboxOperation } = await import('./sheetsOutboxApi')
const { createRowGuardSession } = await import('./sheetsRowGuard')
const { RowEditConflictError } = await import('./rowConflict')
const { WALLET_HEADERS } = await import('./sheetHeaders')
const { WALLET_SHEET } = await import('./sheetNames')
const { accountToRow } = await import('./wallet')
const { clearStore, getSheetRow, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'wallet-flush-merge'

const account = (over: Partial<WalletAccount> = {}): WalletAccount => ({
  id: 'acc',
  createdAt: 't',
  title: 'ملت',
  balance: 100_000_000,
  note: '',
  accountKind: '',
  bankId: '',
  cardNumber: '',
  cardHolder: '',
  cardColor: '',
  cardColorPrimary: '',
  cardColorSecondary: '',
  accountNumber: '',
  iban: '',
  ...over
})

const row = (over: Partial<WalletAccount> = {}) => accountToRow(account(over))

describe('mergeQueuedWalletRow', () => {
  it('adds this write’s change to the balance the sheet holds now', () => {
    const merged = mergeQueuedWalletRow(row({ balance: 96e6 }), row(), row({ balance: 94e6 }))

    expect(merged?.row[3]).toBe('90000000')
    expect(merged?.balanceOnly).toBe(true)
  })

  it('keeps every other cell of this write', () => {
    const merged = mergeQueuedWalletRow(
      row({ balance: 96e6, title: 'عنوان من' }),
      row(),
      row({ balance: 94e6 })
    )

    expect(merged?.row[2]).toBe('عنوان من')
    expect(merged?.row[3]).toBe('90000000')
  })

  it('is not a balance-only difference when the account itself was edited', () => {
    const merged = mergeQueuedWalletRow(
      row({ balance: 96e6 }),
      row(),
      row({ balance: 94e6, title: 'عنوان آنها' })
    )

    expect(merged?.balanceOnly).toBe(false)
  })

  it('ignores the writer cell when telling a balance move from an edit', () => {
    const header = [...WALLET_HEADERS, 'ثبت‌کننده']

    const merged = mergeQueuedWalletRow(
      [...row({ balance: 96e6 }), 'me@x.com'],
      [...row(), 'me@x.com'],
      [...row({ balance: 94e6 }), 'sara@x.com'],
      header.length - 1
    )

    expect(merged?.balanceOnly).toBe(true)
  })

  it('sends the write as queued when the sheet balance did not move', () => {
    const mine = row({ balance: 96e6 })

    expect(mergeQueuedWalletRow(mine, row(), row())?.row).toBe(mine)
  })

  it('has nothing to merge without a base or a current row', () => {
    expect(mergeQueuedWalletRow(row(), undefined, row())).toBeNull()
    expect(mergeQueuedWalletRow(row(), row(), undefined)).toBeNull()
  })

  it('does not collect float noise on fractional balances', () => {
    // 22415915.6 - 10931882.3 = 11484033.299999999 in binary floating point.
    const base = row({ balance: 22_415_915.6 })
    const mine = row({ balance: 11_484_033.3 })
    const current = row({ balance: 22_415_915.6 + 0.1 })

    expect(mergedBalance(base, mine, current)).toBe(11_484_033.4)
    expect(mergeQueuedWalletRow(mine, base, current)?.row[3]).toBe('11484033.4')
  })

  it('moves a balance that the sheet has under a negative change too', () => {
    expect(mergedBalance(row(), row({ balance: 104e6 }), row({ balance: 90e6 }))).toBe(94e6)
  })
})

let remote: string[][] = []

const puts: string[][] = []

function install() {
  apiRequest.mockImplementation(async (_url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'PUT') {
      const written = JSON.parse(init.body ?? '{}').values[0].map(String) as string[]

      puts.push(written)
      remote = [remote[0], written]

      return {}
    }

    return { values: remote }
  })
}

const send = (mine: string[], base: string[] | undefined, mergeBalance = true) =>
  executeOutboxOperation(
    SHEET_ID,
    {
      type: 'update',
      sheetName: WALLET_SHEET,
      rowNumber: 2,
      row: mine,
      expectedRow: base,
      writeOptions: mergeBalance ? { mergeBalance: true } : undefined
    },
    { session: createRowGuardSession() }
  )

describe('a queued wallet write is re-based on the account row when it is sent', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    apiRequest.mockReset()
    puts.length = 0
    install()
  })

  it('A pays 6M, stale B pays 4M: 90M, not 96M', async () => {
    remote = [WALLET_HEADERS, row({ balance: 94e6 })]
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, row({ balance: 96e6 })])

    await send(row({ balance: 96e6 }), row())

    expect(puts[0][3]).toBe('90000000')
    // The mirror shows what the sheet now holds.
    expect(getSheetRow(SHEET_ID, WALLET_SHEET, 2)?.[3]).toBe('90000000')
  })

  it('another account that only moved the balance is not a «کدام بماند؟» conflict', async () => {
    remote = [
      [...WALLET_HEADERS, 'ثبت‌کننده'],
      [...row({ balance: 94e6 }), 'sara@example.com']
    ]

    await send([...row({ balance: 96e6 }), ''], [...row(), ''])

    expect(puts[0][3]).toBe('90000000')
  })

  it('another account that edited the account itself still asks', async () => {
    remote = [
      [...WALLET_HEADERS, 'ثبت‌کننده'],
      [...row({ title: 'عنوان آنها' }), 'sara@example.com']
    ]

    await expect(send([...row({ balance: 96e6 }), ''], [...row(), ''])).rejects.toBeInstanceOf(
      RowEditConflictError
    )
    expect(puts).toHaveLength(0)
  })

  it('a balance written as absolute (bank SMS, manual correction) overwrites', async () => {
    remote = [WALLET_HEADERS, row({ balance: 94e6 })]

    await send(row({ balance: 77e6 }), row(), false)

    expect(puts[0][3]).toBe('77000000')
  })

  it('a write queued by an older build (no base) goes out unchanged', async () => {
    remote = [WALLET_HEADERS, row({ balance: 94e6 })]

    await send(row({ balance: 96e6 }), undefined)

    expect(puts[0][3]).toBe('96000000')
  })

  it('a rename that does not touch the balance keeps the sheet balance', async () => {
    remote = [WALLET_HEADERS, row({ balance: 94e6 })]

    await send(row({ title: 'نام تازه' }), row())

    expect(puts[0][2]).toBe('نام تازه')
    expect(puts[0][3]).toBe('94000000')
  })
})
