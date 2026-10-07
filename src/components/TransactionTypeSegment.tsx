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
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]')

    if (!list || !tab) return

    // Horizontal only: scrollIntoView would also scroll the page vertically.
    const listBox = list.getBoundingClientRect()
    const tabBox = tab.getBoundingClientRect()

    if (tabBox.left < listBox.left) list.scrollLeft -= listBox.left - tabBox.left + 8
    else if (tabBox.right > listBox.right) list.scrollLeft += tabBox.right - listBox.right + 8
  }, [scrollable, value])

  if (options.length <= 1) return null

  return (
    <div
      ref={listRef}
      className={cn(
        recordsTypeSegmentClass,
        scrollable && recordsTypeSegmentScrollClass,
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(option => {
        const isActive = value === option.id

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
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
