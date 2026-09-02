import { useEffect, useRef, useState } from 'react'

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

  const rootClass = [
    'custom-select',
    compact && 'custom-select--compact',
    open && 'custom-select--open',
    disabled && 'custom-select--disabled',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setOpen(isOpen => !isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="custom-select-value">{displayLabel}</span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map(option => {
            const isSelected = option.value === value

            const optionClass = [
              'custom-select-option',
              isSelected && 'is-selected',
              option.disabled && 'is-disabled'
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={optionClass}
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
