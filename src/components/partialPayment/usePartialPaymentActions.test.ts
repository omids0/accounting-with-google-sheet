import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PartialPaymentActionLabels, PartialPaymentLine } from './types'
import { usePartialPaymentActions } from './usePartialPaymentActions'
import { isLinkedForeignRecord } from '../../services/settleRecords'
import { showError, showSuccess } from '../../utils/toast'
import { ReadOnlyContext } from '../ui/readOnly'

const flow = vi.hoisted(() => ({ askUnpay: vi.fn(), askUnlink: vi.fn() }))

vi.mock('../settle/useSettleFlow', () => ({ useSettleFlow: () => flow }))
vi.mock('../../services/settleRecords', () => ({ isLinkedForeignRecord: vi.fn() }))
vi.mock('../../utils/authGuard', () => ({ requireSpreadsheetId: () => 'sheet-1' }))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn(() => false) }))
vi.mock('../../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

type Item = { id: string; rowNumber: number; amount: number; payments: PartialPaymentLine[] }

const labels = (income: boolean): PartialPaymentActionLabels => ({
  amountRequired: 'مبلغ را وارد کنید',
  overRemaining: remaining => `بیشتر از مانده (${remaining})`,
  paymentAdded: income ? 'دریافت ثبت شد' : 'پرداخت ثبت شد',
  addFailed: 'خطا در ثبت',
  titleRequired: 'عنوان الزامی است',
  alreadySettled: 'قبلاً تسویه شده',
  settled: 'تسویه شد',
  settleFailed: 'خطا در تسویه',
  paymentRemoved: income ? 'دریافت حذف شد' : 'پرداخت حذف شد',
  removeFailed: 'خطا در حذف'
})

const item = (payments: PartialPaymentLine[] = []): Item => ({
  id: 'i1',
  rowNumber: 7,
  amount: 100,
  payments
})

const remainingOf = (it: Item) => it.amount - it.payments.reduce((sum, p) => sum + p.amount, 0)

type MountOptions = { type?: 'income' | 'expense'; readOnly?: boolean; titled?: boolean }

function mount({ type = 'income', readOnly = false, titled = true }: MountOptions = {}) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const addPayment = vi.fn(async (_id: string, it: Item, payment: { amount: number }) => ({
    ...it,
    payments: [
      ...it.payments,
      { id: 'p-new', amount: payment.amount, paidAt: '1405-01-01', transactionRecordId: 'r1' }
    ]
  }))

  const removePayment = vi.fn(async (_id: string, it: Item, paymentId: string) => ({
    ...it,
    payments: it.payments.filter(p => p.id !== paymentId)
  }))

  const setItems = vi.fn()

  const useActions = () =>
    usePartialPaymentActions<Item>({
      type,
      setItems,
      sortItems: list => list,
      paymentsOf: it => it.payments,
      remainingOf,
      addPayment,
      removePayment,
      recordPrefix: 'طلب: ',
      settleCategory: () => 'طلب',
      labels: {
        ...labels(type === 'income'),
        titleRequired: titled ? 'عنوان الزامی است' : undefined
      }
    })

  const holder: { actions?: ReturnType<typeof useActions> } = {}

  const Probe = () => {
    holder.actions = useActions()

    return null
  }

  act(() =>
    createRoot(document.createElement('div')).render(
      createElement(ReadOnlyContext.Provider, { value: readOnly }, createElement(Probe))
    )
  )

  return {
    holder: holder as { actions: ReturnType<typeof useActions> },
    addPayment,
    removePayment,
    setItems
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  flow.askUnpay.mockResolvedValue(true)
  flow.askUnlink.mockResolvedValue('keep')
  vi.mocked(isLinkedForeignRecord).mockResolvedValue(false)
})

describe('handleAddPayment', () => {
  it('asks for an amount before saving', async () => {
    const { holder, addPayment } = mount()

    await act(() => holder.actions.handleAddPayment(item(), { amount: '', note: '' }))
    expect(showError).toHaveBeenCalledWith('مبلغ را وارد کنید')
    expect(addPayment).not.toHaveBeenCalled()
  })

  it('refuses an amount above the remaining and shows it', async () => {
    const { holder, addPayment } = mount()
    const paid = item([{ id: 'p1', amount: 40, paidAt: '1405-01-01' }])

    await act(() => holder.actions.handleAddPayment(paid, { amount: 61, note: '' }))
    expect(showError).toHaveBeenCalledTimes(1)
    expect(vi.mocked(showError).mock.calls[0][0]).toMatch(/^بیشتر از مانده \(.+\)$/)
    expect(addPayment).not.toHaveBeenCalled()
  })

  it('accepts exactly the remaining and keeps the row number of the item', async () => {
    const { holder, addPayment, setItems } = mount()
    const paid = item([{ id: 'p1', amount: 40, paidAt: '1405-01-01' }])

    await act(() => holder.actions.handleAddPayment(paid, { amount: 60, note: ' x ' }))
    expect(addPayment).toHaveBeenCalledWith('sheet-1', paid, { amount: 60, note: 'x' }, undefined)

    const update = setItems.mock.calls[0][0] as (prev: Item[]) => Item[]
    const next = update([paid, { ...item(), id: 'other' }])

    expect(next[0].rowNumber).toBe(7)
    expect(next[0].payments).toHaveLength(2)
    expect(next[1].id).toBe('other')
  })

  it('says «دریافت» for money in and «پرداخت» for money out', async () => {
    const income = mount({ type: 'income' })

    await act(() => income.holder.actions.handleAddPayment(item(), { amount: 10, note: '' }))
    expect(showSuccess).toHaveBeenLastCalledWith('دریافت ثبت شد')

    const expense = mount({ type: 'expense' })

    await act(() => expense.holder.actions.handleAddPayment(item(), { amount: 10, note: '' }))
    expect(showSuccess).toHaveBeenLastCalledWith('پرداخت ثبت شد')
  })
})

describe('handleSettle', () => {
  it('needs a title only when the labels ask for one', async () => {
    const titled = mount()

    await act(() => titled.holder.actions.handleSettle(item(), { title: ' ', note: '' }))
    expect(showError).toHaveBeenCalledWith('عنوان الزامی است')
    expect(titled.addPayment).not.toHaveBeenCalled()

    const untitled = mount({ titled: false })

    await act(() => untitled.holder.actions.handleSettle(item(), { title: '', note: '' }))
    expect(untitled.addPayment).toHaveBeenCalledTimes(1)
  })

  it('pays the whole remaining with the settle category', async () => {
    const { holder, addPayment } = mount()
    const paid = item([{ id: 'p1', amount: 40, paidAt: '1405-01-01' }])

    await act(() => holder.actions.handleSettle(paid, { title: ' t ', note: 'n' }))
    expect(addPayment).toHaveBeenCalledWith(
      'sheet-1',
      paid,
      { amount: 60, title: 't', category: 'طلب', note: 'n' },
      undefined
    )
    expect(showSuccess).toHaveBeenCalledWith('تسویه شد')
  })

  it('refuses an item that is already settled', async () => {
    const { holder, addPayment } = mount()
    const done = item([{ id: 'p1', amount: 100, paidAt: '1405-01-01' }])

    await act(() => holder.actions.handleSettle(done, { title: 't', note: '' }))
    expect(showError).toHaveBeenCalledWith('قبلاً تسویه شده')
    expect(addPayment).not.toHaveBeenCalled()
  })
})

describe('handleRemovePayment', () => {
  const linked = item([{ id: 'p1', amount: 40, paidAt: '1405-01-01', transactionRecordId: 'r1' }])

  it('stops when the unpay question is declined', async () => {
    flow.askUnpay.mockResolvedValue(false)

    const { holder, removePayment } = mount()

    await act(() => holder.actions.handleRemovePayment(linked, 'p1'))
    expect(flow.askUnpay).toHaveBeenCalledWith(true)
    expect(removePayment).not.toHaveBeenCalled()
  })

  it('asks about a record the user already had and passes the answer on', async () => {
    vi.mocked(isLinkedForeignRecord).mockResolvedValue(true)
    flow.askUnlink.mockResolvedValue('delete')

    const { holder, removePayment } = mount({ type: 'expense' })

    await act(() => holder.actions.handleRemovePayment(linked, 'p1'))
    expect(isLinkedForeignRecord).toHaveBeenCalledWith('sheet-1', 'expense', 'r1', 'طلب: ')
    expect(removePayment).toHaveBeenCalledWith('sheet-1', linked, 'p1', 'delete')
    expect(showSuccess).toHaveBeenCalledWith('پرداخت حذف شد')
  })

  it('stops when the unlink question is closed', async () => {
    vi.mocked(isLinkedForeignRecord).mockResolvedValue(true)
    flow.askUnlink.mockResolvedValue(null)

    const { holder, removePayment } = mount()

    await act(() => holder.actions.handleRemovePayment(linked, 'p1'))
    expect(removePayment).not.toHaveBeenCalled()
  })

  it('does not ask the unlink question when the record is the app own', async () => {
    const { holder, removePayment } = mount()

    await act(() => holder.actions.handleRemovePayment(linked, 'p1'))
    expect(flow.askUnlink).not.toHaveBeenCalled()
    expect(removePayment).toHaveBeenCalledWith('sheet-1', linked, 'p1', undefined)
    expect(showSuccess).toHaveBeenCalledWith('دریافت حذف شد')
  })
})

describe('read-only role', () => {
  it('changes nothing', async () => {
    const { holder, addPayment, removePayment } = mount({ readOnly: true })

    await act(async () => {
      await holder.actions.handleAddPayment(item(), { amount: 10, note: '' })
      await holder.actions.handleSettle(item(), { title: 't', note: '' })
      await holder.actions.handleRemovePayment(item(), 'p1')
    })
    expect(addPayment).not.toHaveBeenCalled()
    expect(removePayment).not.toHaveBeenCalled()
    expect(flow.askUnpay).not.toHaveBeenCalled()
  })
})
