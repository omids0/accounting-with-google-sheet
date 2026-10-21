import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readBridgePrefs, updateBridgePrefs } from './bridgePrefs'
import { bridgeReference, pocketReceivable } from './bridgeRows'
import {
  bridgeOwnCharge,
  bridgePocketExpense,
  runBridgePayments,
  settleBridgedReceivable
} from './buildingBridge'
import { getDefaultSettings, saveSettings } from './settings'
import { RECEIVABLES_SHEET, WALLET_SHEET } from './sheetNames'
import { addOutboxEntry } from './syncOutbox'
import { setWorkspaceType } from './workspace'

const { writeToWorkspace, drainWorkspace, batchFetch } = vi.hoisted(() => ({
  writeToWorkspace: vi.fn(async () => true),
  drainWorkspace: vi.fn(async () => true),
  batchFetch: vi.fn()
}))

vi.mock('./workspaceBridge', () => ({
  writeToWorkspace,
  drainWorkspace,
  drainBridgeWorkspaces: vi.fn(async () => undefined)
}))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))

const BUILDING = 'building-1'

const PERSONAL = 'personal-1'

const MANAGER_EXPENSE = {
  title: 'سرویس آسانسور',
  amount: 2_400_000,
  date: '2025-10-02',
  category: 'آسانسور',
  payer: 'manager'
}

function open(withPersonal = true): void {
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: BUILDING,
    spreadsheets: [
      ...(withPersonal ? [{ id: PERSONAL, name: 'حسابداری · شخصی', createdAt: '' }] : []),
      { id: BUILDING, name: 'حسابداری · ساختمان نرگس', createdAt: '', kind: 'building' as const }
    ]
  })
  setWorkspaceType(BUILDING, 'building')
}

beforeEach(() => {
  localStorage.clear()
  writeToWorkspace.mockReset()
  writeToWorkspace.mockResolvedValue(true)
  drainWorkspace.mockReset()
  drainWorkspace.mockResolvedValue(true)
  batchFetch.mockReset()
  open()
})

describe('bridgePocketExpense (Bridge A)', () => {
  it('writes nothing while the tick is off', async () => {
    await expect(bridgePocketExpense('rec-1', MANAGER_EXPENSE)).resolves.toBe(false)

    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('queues a receivable of the building in the personal spreadsheet when ticked', async () => {
    updateBridgePrefs({ pocket: true })

    await expect(bridgePocketExpense('rec-1', MANAGER_EXPENSE)).resolves.toBe(true)

    expect(writeToWorkspace).toHaveBeenCalledTimes(1)

    const [target, operation] = writeToWorkspace.mock.calls[0] as unknown as [
      string,
      { sheetName: string; row: string[] }
    ]

    expect(target).toBe(PERSONAL)
    expect(operation.sheetName).toBe(RECEIVABLES_SHEET)
    expect(operation.row.slice(2, 7)).toEqual([
      'سرویس آسانسور · ساختمان نرگس',
      'ساختمان نرگس',
      'طلب',
      '2400000',
      '2025-10-02'
    ])
    expect(operation.row[11]).toBe(bridgeReference('rec-1'))
  })

  it('writes the receivable once per expense, even when the expense is saved again', async () => {
    updateBridgePrefs({ pocket: true })

    await bridgePocketExpense('rec-1', MANAGER_EXPENSE)
    await expect(bridgePocketExpense('rec-1', MANAGER_EXPENSE)).resolves.toBe(false)

    expect(writeToWorkspace).toHaveBeenCalledTimes(1)
    expect(readBridgePrefs().sent).toEqual({ 'rec-1': PERSONAL })
  })

  it('ignores an expense the fund paid or another member fronted', async () => {
    updateBridgePrefs({ pocket: true })

    await bridgePocketExpense('rec-1', { ...MANAGER_EXPENSE, payer: 'fund' })
    await bridgePocketExpense('rec-2', { ...MANAGER_EXPENSE, payer: 'member-7' })

    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('does nothing without a personal spreadsheet on this device', async () => {
    open(false)
    updateBridgePrefs({ pocket: true })

    await expect(bridgePocketExpense('rec-1', MANAGER_EXPENSE)).resolves.toBe(false)

    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('never fails the expense when the personal write fails', async () => {
    updateBridgePrefs({ pocket: true })
    writeToWorkspace.mockRejectedValueOnce(new Error('offline'))

    await expect(bridgePocketExpense('rec-1', MANAGER_EXPENSE)).resolves.toBe(true)

    // Remembered as sent: the entry waits in the personal outbox, a second save adds none.
    expect(readBridgePrefs().sent['rec-1']).toBe(PERSONAL)
  })
})

describe('bridgeOwnCharge (Bridge B)', () => {
  it('queues the personal expense «خانه › شارژ»', async () => {
    await expect(
      bridgeOwnCharge({ unitNumber: '۳', amount: 1_200_000, date: '2025-10-02' })
    ).resolves.toBe(true)

    const [target, operation] = writeToWorkspace.mock.calls[0] as unknown as [
      string,
      { type: string; sheetName: string }
    ]

    expect(target).toBe(PERSONAL)
    expect(operation.type).toBe('append')
  })

  it('does not throw when the write fails: the payment in the building stays', async () => {
    writeToWorkspace.mockRejectedValueOnce(new Error('boom'))

    await expect(
      bridgeOwnCharge({ unitNumber: '۳', amount: 1_200_000, date: '2025-10-02' })
    ).resolves.toBe(true)
  })

  it('bridges one payment once when it is identified, however often it is offered', async () => {
    const input = { unitNumber: '۳', amount: 1_200_000, date: '2025-10-02', paymentKey: 'rec-9' }

    await expect(bridgeOwnCharge(input)).resolves.toBe(true)
    await expect(bridgeOwnCharge(input)).resolves.toBe(false)
    await expect(bridgeOwnCharge({ ...input, paymentKey: 'rec-10' })).resolves.toBe(true)

    expect(writeToWorkspace).toHaveBeenCalledTimes(2)
    expect(Object.keys(readBridgePrefs().sent)).toEqual(['own:rec-9', 'own:rec-10'])
  })

  it('writes nothing for an amount of zero', async () => {
    await expect(bridgeOwnCharge({ unitNumber: '۳', amount: 0, date: '2025-10-02' })).resolves.toBe(
      false
    )
  })
})

describe('settleBridgedReceivable', () => {
  const receivableRow = pocketReceivable({
    recordId: 'rec-1',
    building: 'ساختمان نرگس',
    title: 'سرویس',
    amount: 2_400_000,
    date: '2025-10-02',
    email: ''
  })

  const tabs = () =>
    new Map([
      [
        RECEIVABLES_SHEET,
        [
          ['شناسه'],
          [
            receivableRow.id,
            '',
            receivableRow.title,
            receivableRow.debtor,
            'طلب',
            '2400000',
            '2025-10-02',
            receivableRow.note,
            '[]',
            '',
            '',
            bridgeReference('rec-1')
          ]
        ]
      ],
      [WALLET_SHEET, [['شناسه'], ['acc-1', '', 'ملت', '0']]]
    ])

  const settle = { amount: 2_400_000, date: '2025-10-12', account: 'acc-1' }

  it('ignores a debt that was never bridged', async () => {
    await settleBridgedReceivable('rec-1', settle)

    expect(batchFetch).not.toHaveBeenCalled()
    expect(readBridgePrefs().payments).toEqual([])
  })

  it('reads the personal sheet directly and queues the payment writes there', async () => {
    updateBridgePrefs({ sent: { 'rec-1': PERSONAL } })
    batchFetch.mockResolvedValue(tabs())

    await settleBridgedReceivable('rec-1', settle)

    expect(batchFetch).toHaveBeenCalledWith(PERSONAL, [RECEIVABLES_SHEET, WALLET_SHEET])
    expect(writeToWorkspace).toHaveBeenCalledTimes(1)
    const [target, operations] = writeToWorkspace.mock.calls[0] as unknown as [string, unknown[]]

    expect(target).toBe(PERSONAL)
    expect(operations).toHaveLength(4)
    expect(readBridgePrefs().payments).toEqual([])
    // The account is the default of the next settlement.
    expect(readBridgePrefs().account).toBe('acc-1')
  })

  it('keeps the payment waiting when the personal sheet cannot be read', async () => {
    updateBridgePrefs({ sent: { 'rec-1': PERSONAL } })
    batchFetch.mockRejectedValueOnce(new Error('offline'))

    await expect(settleBridgedReceivable('rec-1', settle)).resolves.toBeUndefined()

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readBridgePrefs().payments).toHaveLength(1)

    batchFetch.mockResolvedValue(tabs())
    await runBridgePayments()

    expect(writeToWorkspace).toHaveBeenCalledTimes(1)
    expect(readBridgePrefs().payments).toEqual([])
  })

  it('waits for the receivable itself to reach the sheet first', async () => {
    updateBridgePrefs({ sent: { 'rec-1': PERSONAL } })
    addOutboxEntry(PERSONAL, {
      type: 'append',
      sheetName: RECEIVABLES_SHEET,
      row: Array.from({ length: 12 }, (_, index) => (index === 11 ? bridgeReference('rec-1') : ''))
    })

    await settleBridgedReceivable('rec-1', settle)

    expect(drainWorkspace).toHaveBeenCalledWith(PERSONAL)
    expect(batchFetch).not.toHaveBeenCalled()
    expect(readBridgePrefs().payments).toHaveLength(1)
  })

  it('drops the payment when the receivable is gone from the personal sheet', async () => {
    updateBridgePrefs({ sent: { 'rec-1': PERSONAL } })
    batchFetch.mockResolvedValue(new Map([[RECEIVABLES_SHEET, [['شناسه']]]]))

    await settleBridgedReceivable('rec-1', settle)

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readBridgePrefs().payments).toEqual([])
  })
})
