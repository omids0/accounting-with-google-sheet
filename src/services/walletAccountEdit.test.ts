import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ enqueue: vi.fn(), fetchRange: vi.fn() }))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))
vi.mock('./sheetSync', () => ({ enqueueSheetWrite: mocks.enqueue, queueOutboxWrite: vi.fn() }))

const { WALLET_HEADERS, WALLET_SHEET, fetchWalletAccounts } = await import('./wallet')
const { saveEditedWalletAccount } = await import('./walletAccountEdit')
const { mergeQueuedWalletRow } = await import('./walletRowMerge')
const { WALLET_LEDGER_HEADERS, WALLET_LEDGER_SHEET } = await import('./walletLedger')
const { clearStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'wallet-account-edit'

const accountRow = (id: string, balance: number, title = id) => [id, 't', title, String(balance)]

/** The sheet as other devices left it. */
let remote: string[][] = []

const queued = () =>
  mocks.enqueue.mock.calls.map(
    ([, op]) =>
      op as {
        row: string[]
        expectedRow?: string[]
        writeOptions?: { mergeBalance?: boolean }
      }
  )

const payload = (over: { title?: string; balance?: number } = {}) => ({
  title: over.title ?? 'ملت',
  balance: over.balance ?? 100e6,
  note: '',
  accountKind: 'bank' as const,
  bankId: '',
  cardNumber: '',
  cardHolder: '',
  cardColor: '',
  cardColorPrimary: '',
  cardColorSecondary: '',
  accountNumber: '',
  iban: ''
})

describe('saving the account edit form', () => {
  let editing: Awaited<ReturnType<typeof fetchWalletAccounts>>[number]

  beforeEach(async () => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.enqueue.mockClear()
    mocks.fetchRange.mockReset()
    mocks.fetchRange.mockImplementation(async (_id: string, _tab: string, suffix?: string) => {
      if (suffix === 'A:A') return remote.map(row => [row[0] ?? ''])

      const n = Number(suffix?.split(':')[0])

      return remote[n - 1] ? [remote[n - 1]] : []
    })
    remote = [WALLET_HEADERS, accountRow('a', 95e6, 'ملت')]
    setSheetAllRows(SHEET_ID, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
    // This device's copy of the wallet tab (another device already moved the account to 94M).
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, accountRow('a', 100e6, 'ملت')])
    // What the form opened with: balance 100M.
    editing = (await fetchWalletAccounts(SHEET_ID))[0]
  })

  it('a title-only edit is a balance change of 0: the balance another device set survives', async () => {
    const { balanceSet } = await saveEditedWalletAccount(
      SHEET_ID,
      editing,
      payload({ title: 'ملت جدید' })
    )
    const [write] = queued()

    expect(balanceSet).toBe(false)
    expect(write.writeOptions).toEqual({ mergeBalance: true })
    expect(write.row[2]).toBe('ملت جدید')

    // The sheet now holds 94M (device A paid 6M): the queued write re-bases onto it.
    const remote = accountRow('a', 94e6, 'ملت')
    const merged = mergeQueuedWalletRow(write.row, write.expectedRow, remote)

    expect(merged?.row[3]).toBe('94000000')
    expect(merged?.row[2]).toBe('ملت جدید')
  })

  it('uses the balance the local copy holds now, not the form copy that may be older', async () => {
    setSheetAllRows(SHEET_ID, WALLET_SHEET, [WALLET_HEADERS, accountRow('a', 94e6, 'ملت')])

    await saveEditedWalletAccount(SHEET_ID, editing, payload({ title: 'x' }))

    const [write] = queued()

    expect(write.row[3]).toBe('94000000')
    expect(write.expectedRow?.[3]).toBe('94000000')
    expect(mergeQueuedWalletRow(write.row, write.expectedRow, accountRow('a', 90e6))?.row[3]).toBe(
      '90000000'
    )
  })

  it('a changed balance field is a manual correction: written as the typed number', async () => {
    const { balanceSet } = await saveEditedWalletAccount(
      SHEET_ID,
      editing,
      payload({ balance: 80e6 })
    )
    const [write] = queued()

    expect(balanceSet).toBe(true)
    expect(write.writeOptions).toBeUndefined()
    expect(write.row[3]).toBe('80000000')
  })

  it('N9: the «اصلاح دستی» ledger line is the real change on the fresh balance (95M -> 80M, not 100M -> 80M)', async () => {
    await saveEditedWalletAccount(SHEET_ID, editing, payload({ balance: 80e6 }))

    const ledger = mocks.enqueue.mock.calls
      .map(([, op]) => op as { sheetName: string; row: string[] })
      .filter(op => op.sheetName === WALLET_LEDGER_SHEET)

    expect(ledger).toHaveLength(1)
    expect(ledger[0].row[4]).toBe('-15000000')
    expect(ledger[0].row[5]).toBe('80000000')
  })

  it('N9: an account another device deleted is not written over', async () => {
    remote = [WALLET_HEADERS]
    await expect(
      saveEditedWalletAccount(SHEET_ID, editing, payload({ balance: 80e6 }))
    ).rejects.toThrow('پیدا نشد')
    expect(queued()).toHaveLength(0)
  })

  it('an untouched balance writes no ledger line at all', async () => {
    await saveEditedWalletAccount(SHEET_ID, editing, payload({ title: 'x' }))
    expect(
      mocks.enqueue.mock.calls.filter(([, op]) => op.sheetName === WALLET_LEDGER_SHEET)
    ).toHaveLength(0)
  })
})
