import { useEffect, useRef } from 'react'

import type { CustomForm } from '../types'
import { recordsTypeSegmentClass, recordsTypeSegmentScrollClass } from './ui/recordsStyles'
import { cn } from '../utils/cn'

export type TransactionTypeSegmentOption = {
  id: string
  label: string
  tone?: 'income' | 'expense'
}

export function transactionTypeOptionsFromForms(
  forms: CustomForm[],
  { includeAll = false }: { includeAll?: boolean } = {}
): TransactionTypeSegmentOption[] {
  const options: TransactionTypeSegmentOption[] = []

  if (includeAll) {
    options.push({ id: 'all', label: 'همه' })
  }

  for (const form of forms) {
    options.push({
      id: form.id,
      label: form.name,
      tone: form.type === 'income' ? 'income' : form.type === 'expense' ? 'expense' : undefined
    })
  }

  return options
}

/**
 * A filter row: each choice is a toggle button (`aria-pressed`) in a labelled group. It is not
 * a tablist because no tabpanel follows it, so there is nothing for arrow keys or `aria-controls`
 * to point at; Tab reaches every choice.
 */
export default function TransactionTypeSegment({
  options,
  value,
  onChange,
  className,
  ariaLabel = 'نوع تراکنش'
}: {
  options: TransactionTypeSegmentOption[]
  value: string
  onChange: (id: string) => void
  className?: string
  ariaLabel?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)

  const scrollable = options.length > 3

  // Keep the selected tab in view when the row scrolls sideways.
  useEffect(() => {
    if (!scrollable) return

    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-pressed="true"]')

    if (!list || !tab) return

    // Horizontal only: scrollIntoView would also scroll the page vertically.
    const listBox = list.getBoundingClientRect()
    const tabBox = tab.getBoundingClientRect()

    if (tabBox.left < listBox.left) list.scrollLeft -= listBox.left - tabBox.left + 8
    else if (tabBox.right > listBox.right) list.scrollLeft += tabBox.right - listBox.right + 8
  }, [scrollable, value])

  // A mouse wheel only scrolls vertically and the scrollbar is hidden, so without this a desktop
  // user could never reach the tabs off the edge. Native listener: React's onWheel is passive.
  useEffect(() => {
    const list = listRef.current

    if (!scrollable || !list) return

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return

      const rtl = getComputedStyle(list).direction === 'rtl'
      const step = event.deltaY * (event.deltaMode === 1 ? 16 : 1) * (rtl ? -1 : 1)
      const max = list.scrollWidth - list.clientWidth
      const next = list.scrollLeft + step
      const [low, high] = rtl ? [-max, 0] : [0, max]

      // At either end let the page scroll as usual.
      if (next === list.scrollLeft || (step < 0 ? list.scrollLeft <= low : list.scrollLeft >= high))
        return

      event.preventDefault()
      list.scrollTo({ left: Math.min(high, Math.max(low, next)), behavior: 'instant' })
    }

    list.addEventListener('wheel', onWheel, { passive: false })

    return () => list.removeEventListener('wheel', onWheel)
  }, [scrollable])

  if (options.length <= 1) return null

  return (
    <div
      ref={listRef}
      className={cn(
        recordsTypeSegmentClass,
        scrollable && recordsTypeSegmentScrollClass,
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(option => {
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            className={cn(
              isActive && 'active',
              isActive && option.tone === 'income' && 'income',
              isActive && option.tone === 'expense' && 'expense'
            )}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
