import { cn } from '../../utils/cn'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name; the switch has no visible text of its own. */
  label: string
  disabled?: boolean
  className?: string
}

/**
 * The off track mixes the muted text colour into the surface, so it keeps >= 3:1 against the
 * surface in light and dark (the border token is ~1.3:1 and nearly invisible in dark). The
 * thumb takes the surface colour. An invisible ::after answers taps in a 44 x 44 px box.
 */
const trackOffClass = 'bg-[color-mix(in_srgb,var(--color-muted)_75%,var(--color-surface))]'
const hitAreaClass = [
  'after:absolute after:left-1/2 after:top-1/2 after:h-touch-min after:w-touch-min',
  'after:-translate-x-1/2 after:-translate-y-1/2 after:content-[""]'
].join(' ')

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
        hitAreaClass,
        checked ? 'bg-primary' : trackOffClass,
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block size-5 rounded-full bg-surface shadow-sm',
          'transition-transform duration-(--duration-normal) ease-out',
          checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
