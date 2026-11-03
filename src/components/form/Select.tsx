import { useId } from 'react'
import { createPortal } from 'react-dom'

import { useAnchoredPosition } from './useAnchoredPosition'
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
  /** Id of the element that names the select (a visible label); the value is read after it. */
  'aria-labelledby'?: string
  /** Id of the trigger. `FormField` passes it; its label (`<id>-label`) then names the select. */
  id?: string
  /** Muted text shown while nothing is chosen (the value is empty and no option has it). */
  placeholder?: string
  compact?: boolean
  className?: string
  invalid?: boolean
}

/** At least one touch target tall, growing with a two-line value (a fixed height clipped it). */
const SELECT_GROWS_CLASS = 'h-auto min-h-touch-min py-1.5'

export const SELECT_EMPTY_LABEL = 'موردی نیست'

export default function Select({
  value,
  onChange,
  options,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  id,
  placeholder,
  compact = false,
  className,
  invalid = false
}: SelectProps) {
  const listbox = useSelectListbox(options, value, option => onChange(option.value))
  const { open, activeIndex } = listbox

  const menuStyle = useAnchoredPosition(listbox.triggerRef, open, () => listbox.close(false))

  const selected = options.find(option => option.value === value)

  const showPlaceholder = !selected && !value && Boolean(placeholder)

  const displayLabel = showPlaceholder ? placeholder : selected?.label ?? value

  const autoId = useId()

  const triggerId = id ?? autoId

  const valueId = `${triggerId}-value`

  // A button named by `aria-label` or a `<label>` would lose the chosen value, so the name is
  // the label followed by the value.
  const labelId = ariaLabelledBy ?? (!ariaLabel && id ? `${id}-label` : undefined)

  const labelledBy = labelId
    ? `${labelId} ${valueId}`
    : ariaLabel
    ? `${triggerId} ${valueId}`
    : undefined

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
        id={triggerId}
        type="button"
        className={cn(
          customSelectTriggerClass,
          customSelectTriggerStateClass({ open, compact, disabled, invalid }),
          !compact && SELECT_GROWS_CLASS
        )}
        onClick={() => !disabled && listbox.toggle()}
        onKeyDown={event => !disabled && listbox.onTriggerKeyDown(event)}
        disabled={disabled}
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listbox.listboxId : undefined}
      >
        <span id={valueId} className={cn(customSelectValueClass, showPlaceholder && 'text-muted')}>
          {displayLabel}
        </span>
        <AppIcon
          name="chevron-down"
          size={12}
          className={customSelectChevronClass(open)}
          aria-hidden
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listbox.listboxRef}
            id={listbox.listboxId}
            className={customSelectMenuClass}
            role="listbox"
            style={menuStyle}
            aria-label={labelId ? undefined : ariaLabel}
            aria-labelledby={labelId}
            tabIndex={-1}
            aria-activedescendant={activeIndex >= 0 ? listbox.optionId(activeIndex) : undefined}
            onKeyDown={listbox.onListKeyDown}
          >
            {options.length === 0 ? (
              <button
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={false}
                aria-disabled
                disabled
                className={customSelectOptionClass({
                  selected: false,
                  disabled: true,
                  active: false
                })}
              >
                {SELECT_EMPTY_LABEL}
              </button>
            ) : null}
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
          </div>,
          document.body
        )}
    </div>
  )
}
