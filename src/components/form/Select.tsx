import { useEffect, useRef, useState } from 'react'

import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import {
  customSelectChevronClass,
  customSelectMenuClass,
  customSelectOptionClass,
  customSelectRootClass,
  customSelectTriggerClass,
  customSelectTriggerStateClass,
  customSelectValueClass
} from '../ui/formControlStyles'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  'aria-label'?: string
  compact?: boolean
  className?: string
}

export default function Select({
  value,
  onChange,
  options,
  disabled = false,
  'aria-label': ariaLabel,
  compact = false,
  className
}: SelectProps) {
  const [open, setOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find(option => option.value === value)

  const displayLabel = selected?.label ?? value

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={customSelectRootClass({ open, className })}
      data-open={open || undefined}
    >
      <button
        type="button"
        className={cn(
          customSelectTriggerClass,
          customSelectTriggerStateClass({ open, compact, disabled })
        )}
        onClick={() => !disabled && setOpen(isOpen => !isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={customSelectValueClass}>{displayLabel}</span>
        <AppIcon
          name="chevron-down"
          size={12}
          strokeWidth={2.5}
          className={customSelectChevronClass(open)}
          aria-hidden
        />
      </button>

      {open && (
        <div className={customSelectMenuClass} role="listbox" aria-label={ariaLabel}>
          {options.map(option => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={customSelectOptionClass({
                  selected: isSelected,
                  disabled: option.disabled
                })}
                onClick={() => handleSelect(option)}
                disabled={option.disabled}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
