import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlanWithRow } from './types'
import { useInstallmentPlanReveal } from './useInstallmentPlanReveal'
import { jalaliToIso } from '../../utils/jalaliDate'

// React's act() only waits for effects when this flag is set.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type HookResult = ReturnType<typeof useInstallmentPlanReveal>

const iso = (month: number, day: number) => jalaliToIso(1405, month, day)

const planDue = (id: string, ...dues: string[]): PlanWithRow => ({
  rowNumber: 2,
  id,
  createdAt: '',
  title: id,
  amount: 1_000,
  count: dues.length,
  dueDay: 1,
  startDate: dues[0],
  note: '',
  payments: dues.map((dueDate, index) => ({
    n: index + 1,
    paid: false,
    paidAt: '',
    dueDate,
    amount: 1_000
  }))
})

describe('useInstallmentPlanReveal', () => {
  const abanRange = { start: iso(8, 1), end: iso(8, 30) }

  const showRange = vi.fn()

  let container: HTMLDivElement

  let root: Root

  let hook: HookResult

  // One component for the whole test, so its state (the saved plan to reveal) survives re-renders.
  let current: { plans: PlanWithRow[]; highlightId: string | null }

  function Harness() {
    hook = useInstallmentPlanReveal(current.plans, abanRange, current.highlightId, showRange)

    return null
  }

  function render(plans: PlanWithRow[], highlightId: string | null = null) {
    current = { plans, highlightId }
    act(() => root.render(createElement(Harness)))
  }

  beforeEach(() => {
    showRange.mockClear()
    container = document.createElement('div')
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
  })

  it('counts the plans with no due date in the period', () => {
    render([planDue('in', iso(8, 10)), planDue('out', iso(9, 20), iso(10, 20))])

    expect(hook.hiddenPlanCount).toBe(1)
  })

  it('widens the period to a saved plan once it is in the list, and only once', () => {
    const saved = planDue('new', iso(9, 20), iso(10, 20))

    render([])
    act(() => hook.revealPlan('new'))
    expect(showRange).not.toHaveBeenCalled()

    render([saved])
    expect(showRange).toHaveBeenCalledTimes(1)
    expect(showRange).toHaveBeenCalledWith({ start: iso(9, 20), end: iso(10, 20) })

    render([saved, planDue('other', iso(11, 1))])
    expect(showRange).toHaveBeenCalledTimes(1)
  })

  it('leaves the period alone for a saved plan that is already visible', () => {
    render([planDue('new', iso(8, 10))])
    act(() => hook.revealPlan('new'))

    expect(showRange).not.toHaveBeenCalled()
  })

  it('does not count a finished plan outside the period', () => {
    const finished = planDue('done', iso(5, 10))

    finished.payments = finished.payments.map(payment => ({ ...payment, paid: true }))
    render([finished])

    expect(hook.hiddenPlanCount).toBe(0)
  })

  it('shows the hidden plans while keeping the current period', () => {
    render([planDue('a', iso(9, 20)), planDue('b', iso(12, 5))])
    act(() => hook.showAllPlans())

    expect(showRange).toHaveBeenCalledWith({ start: iso(8, 1), end: iso(12, 5) })
  })
})
