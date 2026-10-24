import { type KeyboardEvent, useRef } from 'react'

import { cn } from '../../utils/cn'
import { moveFocusWithArrows } from '../../utils/keyboardNav'
import { recordsTypeSegmentClass } from '../ui/recordsStyles'

export interface SegmentedRadioOption<T extends string> {
  value: T
  label: string
}

interface SegmentedRadioProps<T extends string> {
  options: SegmentedRadioOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group (the visible heading's text). */
  label: string
  className?: string
  /** Locks the choice (it stays visible, dimmed). */
  disabled?: boolean
}

/**
 * One-of-N choice that applies at once (text size, theme): the segment look of
 * the type tabs, radio semantics, arrows move and select like native radios.
 */
export default function SegmentedRadio<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  disabled
}: SegmentedRadioProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const items = Array.from(
      groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []
    )

    if (!moveFocusWithArrows(event, items, { axis: 'horizontal' })) return

    const next = (document.activeElement as HTMLElement | null)?.dataset.value as T | undefined

    if (next !== undefined && next !== value) onChange(next)
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn(recordsTypeSegmentClass, 'mb-0', disabled && 'opacity-60', className)}
    >
      {options.map(option => {
        const checked = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            tabIndex={checked ? 0 : -1}
            data-value={option.value}
            className={cn(checked && 'active')}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
