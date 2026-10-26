import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dangBelowPaidMessage } from './paymentLabels'
import type { DangWithRow } from './types'
import { useDangAmountEdit } from './useDangAmountEdit'
import { updateDang } from '../../services/dang'
import { formatMoney } from '../../utils/formatMoney'
import { showError } from '../../utils/toast'

vi.mock('../../services/dang', () => ({
  updateDang: vi.fn(async () => undefined),
  sortDangs: (list: unknown[]) => list
}))
vi.mock('../../utils/authGuard', () => ({ requireSpreadsheetId: () => 'sheet-1' }))
vi.mock('../../utils/sheetError', () => ({ handleSheetError: vi.fn(() => false) }))
vi.mock('../../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

const debt = (paid: number): DangWithRow =>
  ({
    id: 'd1',
    rowNumber: 5,
    title: 'خرید',
    amount: 100,
    paid: false,
    paidAt: '',
    transactionRecordId: '',
    payments: paid ? [{ id: 'p1', amount: paid, paidAt: '2026-01-01' }] : []
  } as unknown as DangWithRow)

function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const setItems = vi.fn()

  const holder: { edit?: ReturnType<typeof useDangAmountEdit> } = {}

  const Probe = () => {
    holder.edit = useDangAmountEdit(setItems)

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return { holder: holder as { edit: ReturnType<typeof useDangAmountEdit> }, setItems }
}

beforeEach(() => vi.clearAllMocks())

describe('inline amount edit of a debt', () => {
  it('refuses an amount below the paid total with the Persian message and writes nothing', async () => {
    const { holder, setItems } = mount()

    await act(() => holder.edit.handleAmountBlur(debt(60), 40))
    expect(showError).toHaveBeenCalledWith(dangBelowPaidMessage(formatMoney(60)))
    expect(updateDang).not.toHaveBeenCalled()
    expect(setItems).not.toHaveBeenCalled()
  })

  it('takes an amount equal to the paid total and marks the debt settled', async () => {
    const { holder, setItems } = mount()

    await act(() => holder.edit.handleAmountBlur(debt(60), 60))
    expect(updateDang).toHaveBeenCalledTimes(1)

    const update = setItems.mock.calls[0][0] as (prev: DangWithRow[]) => DangWithRow[]
    const [next] = update([debt(60)])

    expect(next.amount).toBe(60)
    expect(next.paid).toBe(true)
  })

  it('reads the typed value from the edits when the dial pad passes none', async () => {
    const { holder } = mount()
    const item = debt(0)

    act(() => holder.edit.handleAmountChange(item, 250))
    await act(() => holder.edit.handleAmountBlur(item))
    expect(updateDang).toHaveBeenCalledWith('sheet-1', 5, expect.objectContaining({ amount: 250 }))
  })

  it('still wants an amount above zero', async () => {
    const { holder } = mount()

    await act(() => holder.edit.handleAmountBlur(debt(0), ''))
    expect(showError).toHaveBeenCalledWith('مبلغ باید بیشتر از صفر باشد')
    expect(updateDang).not.toHaveBeenCalled()
  })
})
