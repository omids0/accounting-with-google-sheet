import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateBridgePrefs } from './bridgePrefs'
import { isBridgedDang, toggleBuildingDangPaid } from './buildingDangBridge'
import type { Dang } from '../types'

const { toggleDangPaid, settleBridgedReceivable } = vi.hoisted(() => ({
  toggleDangPaid: vi.fn(),
  settleBridgedReceivable: vi.fn(async () => undefined)
}))

vi.mock('./dang', () => ({ toggleDangPaid }))
vi.mock('./buildingBridge', () => ({ settleBridgedReceivable }))

const dang = {
  id: 'exp-rec-1',
  rowNumber: 2,
  title: 'سرویس آسانسور',
  amount: 2_400_000,
  counterparty: 'مدیر',
  paid: false
} as Dang & { rowNumber: number }

const OPTIONS = { date: '2025-10-12', walletAccount: 'fund-1', walletApply: 'بله' as const }

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  localStorage.clear()
  toggleDangPaid.mockReset()
  toggleDangPaid.mockResolvedValue({ ...dang, paid: true })
  settleBridgedReceivable.mockReset()
  settleBridgedReceivable.mockResolvedValue(undefined)
})

describe('isBridgedDang', () => {
  it('is true only for the debt of an expense that was written to the personal sheet', () => {
    expect(isBridgedDang(dang)).toBe(false)

    updateBridgePrefs({ sent: { 'rec-1': 'personal-1' } })

    expect(isBridgedDang(dang)).toBe(true)
    expect(isBridgedDang({ id: 'hand-made-debt' })).toBe(false)
  })
})

describe('toggleBuildingDangPaid', () => {
  it('repays in the building and pays the bridged receivable into the chosen account', async () => {
    updateBridgePrefs({ sent: { 'rec-1': 'personal-1' } })

    const updated = await toggleBuildingDangPaid('b1', dang, true, {
      ...OPTIONS,
      bridgeAccount: 'mine-1'
    })

    await flush()

    expect(updated.paid).toBe(true)
    expect(settleBridgedReceivable).toHaveBeenCalledWith('rec-1', {
      amount: 2_400_000,
      date: '2025-10-12',
      account: 'mine-1'
    })
  })

  it('leaves the personal sheet alone for a debt that was never bridged', async () => {
    await toggleBuildingDangPaid('b1', dang, true, { ...OPTIONS, bridgeAccount: 'mine-1' })
    await flush()

    expect(settleBridgedReceivable).not.toHaveBeenCalled()
  })

  it('does not roll the repayment back when the bridge part fails', async () => {
    updateBridgePrefs({ sent: { 'rec-1': 'personal-1' } })
    settleBridgedReceivable.mockRejectedValueOnce(new Error('personal sheet unreachable'))

    await expect(
      toggleBuildingDangPaid('b1', dang, true, { ...OPTIONS, bridgeAccount: '' })
    ).resolves.toMatchObject({ paid: true })
    await flush()

    expect(toggleDangPaid).toHaveBeenCalledTimes(1)
  })

  it('does not touch the personal sheet when a repayment is taken back', async () => {
    updateBridgePrefs({ sent: { 'rec-1': 'personal-1' } })

    await toggleBuildingDangPaid('b1', { ...dang, paid: true }, false)

    expect(settleBridgedReceivable).not.toHaveBeenCalled()
  })
})
