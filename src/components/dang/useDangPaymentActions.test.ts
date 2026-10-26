import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DangWithRow } from './types'
import { dangPaymentRecordIds, useDangPaymentActions } from './useDangPaymentActions'
import { addDangPayment, removeDangPayment, settleRestOfDang } from '../../services/dangPayments'
import { showError } from '../../utils/toast'

const flow = vi.hoisted(() => ({ askUnpay: vi.fn(), askUnlink: vi.fn() }))

vi.mock('../settle/useSettleFlow', () => ({ useSettleFlow: () => flow }))
vi.mock('../../services/settleRecords', () => ({ isLinkedForeignRecord: vi.fn(async () => false) }))
vi.mock('../../services/dang', () => ({ sortDangs: (list: unknown[]) => list }))
vi.mock('../../services/dangPayments', () => ({
  addDangPayment: vi.fn(async (_s: string, dang: DangWithRow) => dang),
  settleRestOfDang: vi.fn(async (_s: string, dang: DangWithRow) => dang),
  removeDangPayment: vi.fn(async (_s: string, dang: DangWithRow) => dang)
}))
vi.mock('../../utils/authGuard', () => ({ requireSpreadsheetId: () => 'sheet-1' }))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn(() => false) }))
vi.mock('../../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

const debt = (id = 'd1', recordIds: string[] = []): DangWithRow =>
  ({
    id,
    rowNumber: 3,
    title: 'خرید',
    amount: 100,
    payments: recordIds.map((recordId, index) => ({
      id: `${id}-p${index}`,
      amount: 10,
      paidAt: '2026-01-01',
      transactionRecordId: recordId
    }))
  } as unknown as DangWithRow)

function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const holder: { actions?: ReturnType<typeof useDangPaymentActions> } = {}

  const Probe = () => {
    holder.actions = useDangPaymentActions(vi.fn())

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { actions: ReturnType<typeof useDangPaymentActions> }
}

beforeEach(() => {
  vi.clearAllMocks()
  flow.askUnpay.mockResolvedValue(true)
})

describe('personal debt payments', () => {
  it('pays a piece through addDangPayment with just amount and note', async () => {
    const holder = mount()
    const item = debt()

    await act(() => holder.actions.handleAddPayment(item, { amount: 30, note: ' قسط ' }))
    expect(addDangPayment).toHaveBeenCalledWith(
      'sheet-1',
      item,
      { amount: 30, note: 'قسط' },
      undefined
    )
    expect(settleRestOfDang).not.toHaveBeenCalled()
  })

  it('settles the rest through settleRestOfDang and needs no title', async () => {
    const holder = mount()
    const item = debt()

    await act(() => holder.actions.handleSettle(item, { title: '', note: '' }))
    expect(settleRestOfDang).toHaveBeenCalledWith('sheet-1', item, '', undefined)
    expect(showError).not.toHaveBeenCalled()
  })

  it('refuses more than what is left and says how much is left', async () => {
    const holder = mount()
    const item = debt('d1', ['r1', 'r2'])

    await act(() => holder.actions.handleAddPayment(item, { amount: 95, note: '' }))
    expect(showError).toHaveBeenCalledTimes(1)
    expect(vi.mocked(showError).mock.calls[0][0]).toMatch(/^مبلغ پرداخت نمی‌تواند بیشتر از مانده/)
    expect(addDangPayment).not.toHaveBeenCalled()
  })

  it('takes a payment back through removeDangPayment after asking', async () => {
    const holder = mount()
    const item = debt('d1', ['r1'])

    await act(() => holder.actions.handleRemovePayment(item, 'd1-p0'))
    expect(flow.askUnpay).toHaveBeenCalledWith(true)
    expect(removeDangPayment).toHaveBeenCalledWith('sheet-1', item, 'd1-p0', undefined)
  })
})

describe('dangPaymentRecordIds', () => {
  it('lists the record of every payment of every debt and skips empty cells', () => {
    expect(dangPaymentRecordIds([debt('a', ['r1', '']), debt('b', ['r2']), debt('c')])).toEqual([
      'r1',
      'r2'
    ])
  })
})
