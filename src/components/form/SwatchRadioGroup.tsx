import { type KeyboardEvent, useRef } from 'react'

import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'

export interface SwatchOption<T extends string> {
  value: T
  label: string
  /** Any CSS `background` (a colour or a gradient). */
  background: string
}

interface SwatchRadioGroupProps<T extends string> {
  options: SwatchOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group (the visible heading's text). */
  label: string
  className?: string
}

/**
 * One-of-N colour choice with a name under every swatch (the palette picker): radio semantics,
 * one tab stop, arrows move and select like native radios (RTL-aware, row-aware).
 */
export default function SwatchRadioGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  className
}: SwatchRadioGroupProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null)

  // The swatches wrap into rows, so the shared one-axis helper (it sorts by x only) would hop
  // between rows. Left/right walk the DOM order, which follows the reading direction; up/down
  // jump one row, found from the swatches that share the first one's top.
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const group = groupRef.current
    const items = Array.from(group?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])
    const current = items.findIndex(item => item === document.activeElement)

    if (!group || current < 0) return

    const rtl = getComputedStyle(group).direction === 'rtl'
    const perRow = items.filter(item => item.offsetTop === items[0].offsetTop).length
    let next: number

    switch (event.key) {
      case 'ArrowRight':
        next = current + (rtl ? -1 : 1)
        break
      case 'ArrowLeft':
        next = current + (rtl ? 1 : -1)
        break
      case 'ArrowDown':
        next = current + perRow
        break
      case 'ArrowUp':
        next = current - perRow
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    // Sideways wraps around like a native radio group; a row jump stops at the first/last row.
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (next < 0 || next >= items.length) return
    } else {
      next = (next + items.length) % items.length
    }
    items[next].focus()

    const nextValue = items[next].dataset.value as T | undefined

    if (nextValue !== undefined && nextValue !== value) onChange(nextValue)
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={cn('grid grid-cols-5 gap-x-1.5 gap-y-1.5 md:grid-cols-10', className)}
    >
      {options.map(option => {
        const checked = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-value={option.value}
            className={cn(
              'flex min-h-[var(--touch-min)] cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-sm)]',
              'px-0.5 py-1 text-[0.7rem] leading-tight text-muted',
              checked && 'font-bold text-text'
            )}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid h-10 w-10 place-items-center rounded-full border border-border',
                'transition-shadow duration-[var(--duration-fast)]',
                checked && 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
              )}
              style={{ background: option.background }}
            >
              {checked ? (
                <span className="text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.55))]">
                  <AppIcon name="check" size={18} />
                </span>
              ) : null}
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
