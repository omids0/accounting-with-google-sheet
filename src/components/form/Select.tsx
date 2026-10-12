import { useSelectListbox } from './useSelectListbox'
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
  const listbox = useSelectListbox(options, value, option => onChange(option.value))
  const { open, activeIndex } = listbox

  const selected = options.find(option => option.value === value)

  const displayLabel = selected?.label ?? value

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    listbox.close(true)
  }

  return (
    <div
      ref={listbox.rootRef}
      className={customSelectRootClass({ open, className })}
      data-open={open || undefined}
    >
      <button
        ref={listbox.triggerRef}
        type="button"
        className={cn(
          customSelectTriggerClass,
          customSelectTriggerStateClass({ open, compact, disabled, invalid })
        )}
        onClick={() => !disabled && listbox.toggle()}
        onKeyDown={event => !disabled && listbox.onTriggerKeyDown(event)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listbox.listboxId : undefined}
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
        <div
          ref={listbox.listboxRef}
          id={listbox.listboxId}
          className={customSelectMenuClass}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? listbox.optionId(activeIndex) : undefined}
          onKeyDown={listbox.onListKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                id={listbox.optionId(index)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                className={customSelectOptionClass({
                  selected: isSelected,
                  disabled: option.disabled,
                  active: index === activeIndex
                })}
                // Keeps focus on the listbox, which owns the keyboard.
                onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => !option.disabled && listbox.setActiveIndex(index)}
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
