import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import CardDeleteButton from './CardDeleteButton'
import CardEditButton from './CardEditButton'
import CardExpandButton from './CardExpandButton'

function labelsOf(...elements: ReturnType<typeof createElement>[]): string[] {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  const root = createRoot(container)

  act(() => root.render(createElement('div', null, ...elements)))
  const labels = [...container.querySelectorAll('button')].map(
    button => button.getAttribute('aria-label') ?? ''
  )

  act(() => root.unmount())

  return labels
}

describe('card action buttons name their item', () => {
  const onClick = vi.fn()

  it('reads «ویرایش» and «حذف» with the item name', () => {
    expect(
      labelsOf(
        createElement(CardEditButton, { onClick, itemLabel: 'چک ۱۲۳' }),
        createElement(CardDeleteButton, { onClick, itemLabel: 'چک ۱۲۳' })
      )
    ).toEqual(['ویرایش چک ۱۲۳', 'حذف چک ۱۲۳'])
  })

  it('lets a button swap the verb but still names the item', () => {
    expect(
      labelsOf(createElement(CardEditButton, { onClick, label: 'تنظیم', itemLabel: 'دارایی' }))
    ).toEqual(['تنظیم دارایی'])
  })

  it('names the item on the expand button in both states', () => {
    expect(
      labelsOf(
        createElement(CardExpandButton, { onClick, expanded: false, itemLabel: 'بانک ملی' }),
        createElement(CardExpandButton, { onClick, expanded: true, itemLabel: 'بانک ملی' })
      )
    ).toEqual(['نمایش جزئیات بانک ملی', 'بستن جزئیات بانک ملی'])
  })
})

describe('empty item names', () => {
  it('leaves no trailing space', () => {
    expect(labelsOf(createElement(CardEditButton, { onClick: vi.fn(), itemLabel: '' }))).toEqual([
      'ویرایش'
    ])
  })
})
