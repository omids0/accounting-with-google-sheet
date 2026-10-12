import { useEffect, useRef, useState } from 'react'

import { useRegisterOverlay } from '../../hooks/useRegisterOverlay'
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
  invalid?: boolean
}

export default function Select({
  value,
  onChange,
  options,
  disabled = false,
  'aria-label': ariaLabel,
  compact = false,
  className,
  invalid = false
}: SelectProps) {
  const [open, setOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find(option => option.value === value)

  const displayLabel = selected?.label ?? value

  useRegisterOverlay(open, () => setOpen(false))

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)

    return () => document.removeEventListener('mousedown', onPointerDown)
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
          customSelectTriggerStateClass({ open, compact, disabled, invalid })
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
