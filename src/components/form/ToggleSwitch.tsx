import { cn } from '../../utils/cn'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name; the switch has no visible text of its own. */
  label: string
  disabled?: boolean
  className?: string
}

/** On/off switch for settings rows that apply at once (no separate save button). */
export default function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
  className
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-none items-center rounded-full border-0 p-0.5',
        'transition-colors duration-(--duration-normal) ease-out',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-primary' : 'bg-border',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block size-5 rounded-full bg-white shadow-sm',
          'transition-transform duration-(--duration-normal) ease-out',
          checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
