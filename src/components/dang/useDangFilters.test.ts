import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import type { DangWithRow } from './types'
import { useDangFilters } from './useDangFilters'

const debt = (id: string, amount: number, paid: number): DangWithRow =>
  ({
    id,
    rowNumber: 2,
    title: `بدهی ${id}`,
    category: 'سایر',
    counterparty: 'علی',
    amount,
    date: '2026-01-01',
    note: '',
    payments: paid ? [{ id: `${id}-p`, amount: paid, paidAt: '2026-01-02' }] : []
  } as unknown as DangWithRow)

const items = [debt('open', 100, 0), debt('part', 100, 40), debt('done', 100, 100)]

function mount(building = false) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const holder: { filters?: ReturnType<typeof useDangFilters> } = {}

  const Probe = () => {
    holder.filters = useDangFilters({ items, categories: [], counterparties: [], building })

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { filters: ReturnType<typeof useDangFilters> }
}

// The draft is set first and applied on the next render, like the filter modal does.
function pick(holder: { filters: ReturnType<typeof useDangFilters> }, status: 'paid' | 'unpaid') {
  act(() => holder.filters.setDraftPaymentStatus(status))
  act(() => holder.filters.applyFilters())
}

const ids = (list: DangWithRow[]) => list.map(item => item.id)

describe('debt status filter', () => {
  it('shows everything by default', () => {
    expect(ids(mount().filters.filteredItems)).toEqual(['open', 'part', 'done'])
  })

  it('«تسویه شده» keeps only fully paid debts', () => {
    const holder = mount()

    pick(holder, 'paid')
    expect(ids(holder.filters.filteredItems)).toEqual(['done'])
  })

  it('the unpaid side keeps a partly paid debt, because something is still owed', () => {
    const holder = mount()

    pick(holder, 'unpaid')
    expect(ids(holder.filters.filteredItems)).toEqual(['open', 'part'])
  })

  it('words the chip «تسویه شده» for a personal list only', () => {
    const personal = mount(false)

    pick(personal, 'paid')
    expect(personal.filters.filterChips.map(chip => chip.label).join('|')).toContain('تسویه شده')

    const building = mount(true)

    pick(building, 'paid')
    expect(building.filters.filterChips.map(chip => chip.label).join('|')).not.toContain(
      'تسویه شده'
    )
  })
})
