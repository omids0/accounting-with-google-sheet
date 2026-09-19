import { cn } from '../../../utils/cn'
import AppIcon from '../../AppIcon'
import {
  categorySelectLeadingClass,
  categorySelectPlaceholderClass,
  categorySelectSpinnerClass,
  categorySelectTriggerClass,
  customSelectChevronClass,
  customSelectTriggerClass,
  customSelectTriggerStateClass,
  customSelectValueClass
} from '../../ui/formControlStyles'

interface CategorySelectTriggerProps {
  id?: string
  ariaLabel: string
  open: boolean
  disabled: boolean
  saving: boolean
  invalid: boolean
  label: string
  isPlaceholder: boolean
  onOpen: () => void
}

export default function CategorySelectTrigger({
  id,
  ariaLabel,
  open,
  disabled,
  saving,
  invalid,
  label,
  isPlaceholder,
  onOpen
}: CategorySelectTriggerProps) {
  return (
    <button
      id={id}
      type="button"
      className={cn(
        customSelectTriggerClass,
        categorySelectTriggerClass,
        customSelectTriggerStateClass({ open, disabled: disabled || saving, invalid })
      )}
      onClick={onOpen}
      disabled={disabled || saving}
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <span className={categorySelectLeadingClass} aria-hidden="true">
        <AppIcon name="folder" size={16} strokeWidth={2} />
      </span>
      <span className={cn(customSelectValueClass, isPlaceholder && categorySelectPlaceholderClass)}>
        {label}
      </span>
      {saving ? (
        <span className={cn('spinner', categorySelectSpinnerClass)} aria-hidden="true" />
      ) : (
        <AppIcon
          name="chevron-down"
          size={12}
          strokeWidth={2.5}
          className={customSelectChevronClass(open)}
          aria-hidden
        />
      )}
    </button>
  )
}
