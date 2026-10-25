import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import DataTable, { type DataTableColumn, type DataTableProps } from './DataTable'

type Row = { id: string; amount: number }

const data: Row[] = Array.from({ length: 120 }, (_, i) => ({ id: `r${i}`, amount: i }))
const columns: DataTableColumn<Row>[] = [
  { id: 'amount', header: 'مبلغ', sortValue: row => row.amount, cell: row => String(row.amount) }
]

function mount(props: Partial<DataTableProps<Row>>) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div')

  act(() =>
    createRoot(host).render(
      createElement(DataTable<Row>, {
        label: 'تست',
        rows: data,
        columns,
        rowKey: row => row.id,
        ...props
      })
    )
  )

  return host
}

const rowCount = (host: HTMLElement) => host.querySelectorAll('tbody tr[data-highlight-id]').length

describe('DataTable windowed', () => {
  it('renders every row unless windowed', () => {
    expect(rowCount(mount({}))).toBe(120)
  })

  it('renders 50 rows and a «نمایش بیشتر» footer with the count', () => {
    const host = mount({ windowed: true })

    expect(rowCount(host)).toBe(50)
    expect(host.textContent).toContain('نمایش بیشتر')
    expect(host.textContent).toContain('۵۰ از ۱۲۰ مورد')
  })

  it('includes a deep-link target and an open row beyond the first 50', () => {
    const host = mount({ windowed: true, mustInclude: ['r70'], expandedKey: 'r110' })

    expect(host.querySelector('[data-highlight-id="r70"]')).not.toBeNull()
    expect(host.querySelector('[data-highlight-id="r110"]')).not.toBeNull()
    expect(rowCount(host)).toBe(120)
  })
})
