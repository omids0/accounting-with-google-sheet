import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PartialPaymentLine } from './types'
import { usePartialPaymentActions } from './usePartialPaymentActions'
import { showSuccess } from '../../utils/toast'

const flow = vi.hoisted(() => ({ askUnpay: vi.fn(), askUnlink: vi.fn() }))

vi.mock('../settle/useSettleFlow', () => ({ useSettleFlow: () => flow }))
vi.mock('../../services/settleRecords', () => ({ isLinkedForeignRecord: vi.fn(async () => false) }))
vi.mock('../../utils/authGuard', () => ({ requireSpreadsheetId: () => 'sheet-1' }))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn(() => false) }))
vi.mock('../../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

type Item = { id: string; rowNumber: number; amount: number; payments: PartialPaymentLine[] }

const item: Item = { id: 'i1', rowNumber: 7, amount: 100, payments: [] }

/** Mounts the hook with services that wait for `release()`, like a slow sheet write. */
function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  let release = () => {}

  const gate = new Promise<void>(resolve => {
    release = resolve
  })

  const addPayment = vi.fn(async (_id: string, it: Item, _payment: { amount: number }) => {
    await gate

    return it
  })

  const removePayment = vi.fn(async (_id: string, it: Item) => it)

  const holder: { actions?: ReturnType<typeof usePartialPaymentActions<Item>> } = {}

  const Probe = () => {
    holder.actions = usePartialPaymentActions<Item>({
      type: 'expense',
      setItems: vi.fn(),
      sortItems: list => list,
      paymentsOf: it => it.payments,
      remainingOf: it => it.amount,
      addPayment,
      removePayment,
      recordPrefix: 'بدهی: ',
      labels: {
        amountRequired: 'مبلغ را وارد کنید',
        overRemaining: remaining => `بیشتر از مانده (${remaining})`,
        paymentAdded: 'پرداخت ثبت شد',
        addFailed: 'خطا در ثبت',
        alreadySettled: 'قبلاً تسویه شده',
        settled: 'تسویه شد',
        settleFailed: 'خطا در تسویه',
        paymentRemoved: 'پرداخت حذف شد',
        removeFailed: 'خطا در حذف'
      }
    })

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return {
    actions: () => holder.actions as NonNullable<typeof holder.actions>,
    addPayment,
    removePayment,
    release: () => release()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  flow.askUnpay.mockResolvedValue(true)
  flow.askUnlink.mockResolvedValue('keep')
})

describe('one write at a time', () => {
  it('ignores a second payment that lands before the first one finished', async () => {
    const { actions, addPayment, release } = mount()

    await act(async () => {
      const first = actions().handleAddPayment(item, { amount: 10, note: '' })
      const second = actions().handleAddPayment(item, { amount: 10, note: '' })

      await second
      release()
      await first
    })
    expect(addPayment).toHaveBeenCalledTimes(1)
    expect(showSuccess).toHaveBeenCalledTimes(1)
  })

  it('blocks a settle and a take-back while a payment is being written', async () => {
    const { actions, addPayment, removePayment, release } = mount()

    await act(async () => {
      const first = actions().handleAddPayment(item, { amount: 10, note: '' })

      await actions().handleSettle(item, { title: 't', note: '' })
      await actions().handleRemovePayment(item, 'p1')
      release()
      await first
    })
    expect(addPayment).toHaveBeenCalledTimes(1)
    expect(removePayment).not.toHaveBeenCalled()
    expect(flow.askUnpay).not.toHaveBeenCalled()
  })

  it('writes again once the previous write is done, also after a failure', async () => {
    const { actions, addPayment, release } = mount()

    release()
    addPayment.mockRejectedValueOnce(new Error('offline'))
    await act(() => actions().handleAddPayment(item, { amount: 10, note: '' }))
    await act(() => actions().handleAddPayment(item, { amount: 10, note: '' }))
    await act(() => actions().handleAddPayment(item, { amount: 10, note: '' }))
    expect(addPayment).toHaveBeenCalledTimes(3)
  })
})
