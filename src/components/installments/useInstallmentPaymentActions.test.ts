import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlanWithRow } from './types'
import { useInstallmentPaymentActions } from './useInstallmentPaymentActions'
import { toggleInstallmentPayment } from '../../services/installments'

vi.mock('../../services/installments', () => ({
  getInstallmentPaymentAmount: vi.fn(),
  toggleInstallmentPayment: vi.fn(),
  updateInstallmentPaymentAmount: vi.fn()
}))

vi.mock('../../utils/authGuard', () => ({ requireSpreadsheetId: () => 'sheet-1' }))

vi.mock('../../utils/sheetError', () => ({ handleSheetError: () => true }))

vi.mock('../../utils/toast', () => ({ showSuccess: vi.fn() }))

type HookResult = ReturnType<typeof useInstallmentPaymentActions>

function makePlan(id: string): PlanWithRow {
  return {
    rowNumber: 2,
    id,
    createdAt: '',
    title: id,
    amount: 1_000,
    count: 2,
    dueDay: 1,
    startDate: '2024-08-05',
    note: '',
    payments: [
      { n: 1, paid: false, paidAt: '', dueDate: '2024-09-01', amount: 1_000 },
      { n: 2, paid: false, paidAt: '', dueDate: '2024-10-01', amount: 1_000 }
    ]
  }
}

describe('useInstallmentPaymentActions toggle locking', () => {
  let container: HTMLDivElement

  let root: Root

  let hook: HookResult

  const setPlans = vi.fn()

  function Harness() {
    hook = useInstallmentPaymentActions({ setPlans })

    return null
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    root = createRoot(container)
    act(() => root.render(createElement(Harness)))
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.mocked(toggleInstallmentPayment).mockReset()
  })

  it('ignores a second toggle on the same plan while one is in flight', async () => {
    const plan = makePlan('plan-a')

    const other = makePlan('plan-b')

    let release!: () => void

    vi.mocked(toggleInstallmentPayment).mockImplementation(
      (_id, target) =>
        new Promise(resolve => {
          if (target.id === plan.id) release = () => resolve(target)
          else resolve(target)
        })
    )

    let firstToggle!: Promise<void>

    await act(async () => {
      firstToggle = hook.handleTogglePayment(plan, 0, true)
      void hook.handleTogglePayment(plan, 1, true)
    })

    expect(hook.togglingByPlan).toEqual({ [plan.id]: 0 })

    await act(async () => {
      await hook.handleTogglePayment(other, 1, true)
    })

    expect(
      vi.mocked(toggleInstallmentPayment).mock.calls.map(call => [call[1].id, call[2]])
    ).toEqual([
      [plan.id, 0],
      [other.id, 1]
    ])

    await act(async () => {
      release()
      await firstToggle
    })

    expect(hook.togglingByPlan).toEqual({})

    await act(async () => {
      const again = hook.handleTogglePayment(plan, 1, true)

      release()
      await again
    })

    expect(toggleInstallmentPayment).toHaveBeenCalledTimes(3)
  })
})
