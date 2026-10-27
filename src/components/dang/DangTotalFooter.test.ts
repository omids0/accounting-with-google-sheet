import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import DangTotalFooter from './DangTotalFooter'
import type { DangWithRow } from './types'

const card = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }))

vi.mock('../StatCard', () => ({
  default: (props: Record<string, unknown>) => {
    card.props = props

    return null
  }
}))

const debt = (id: string, amount: number, paid = 0): DangWithRow =>
  ({
    id,
    rowNumber: 2,
    amount,
    payments: paid ? [{ id: `${id}-p`, amount: paid, paidAt: '2026-01-01' }] : []
  } as unknown as DangWithRow)

function render(props: {
  items: DangWithRow[]
  filteredItems?: DangWithRow[]
  filtered?: boolean
  building?: boolean
}) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  card.props = null
  act(() =>
    createRoot(document.createElement('div')).render(
      createElement(DangTotalFooter, {
        items: props.items,
        filteredItems: props.filteredItems ?? props.items,
        filtered: props.filtered ?? false,
        building: props.building ?? false
      })
    )
  )

  return card.props as Record<string, unknown> | null
}

describe('DangTotalFooter', () => {
  it('sums what is still owed, not the full amounts', () => {
    const shown = render({ items: [debt('a', 100, 40), debt('b', 50), debt('c', 70, 70)] })

    expect(shown?.amount).toBe(110)
    expect(shown?.label).toBe('مانده پرداخت نشده')
  })

  it('stays visible at zero for a personal list', () => {
    const shown = render({ items: [debt('c', 70, 70)] })

    expect(shown?.amount).toBe(0)
  })

  it('says «فیلتر شده» and sums the filtered rows when a filter narrows the list', () => {
    const items = [debt('a', 100), debt('b', 50)]
    const shown = render({ items, filteredItems: [items[1]] })

    expect(shown?.amount).toBe(50)
    expect(shown?.label).toBe('مانده پرداخت نشده (فیلتر شده)')
  })

  it('says «فیلتر شده» for a filter that keeps every row', () => {
    const items = [debt('a', 100)]

    expect(render({ items, filtered: true })?.label).toBe('مانده پرداخت نشده (فیلتر شده)')
  })

  it('keeps the building footer as it was: plain label, hidden at zero', () => {
    const items = [debt('a', 100), debt('b', 50, 50)]

    const open = render({ items, filteredItems: [items[0]], building: true })

    expect(open?.label).toBe('مانده پرداخت نشده')
    expect(open?.amount).toBe(100)
    expect(render({ items, filteredItems: [items[1]], building: true })).toBeNull()
  })
})
