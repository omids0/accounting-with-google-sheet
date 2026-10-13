import AppIcon from './AppIcon'
import { cx } from '../utils/cn'

const stepButtonClass = cx(
  'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-[1rem] text-text',
  'disabled:cursor-default disabled:opacity-40'
)

/**
 * Previous · «مهر ۱۴۰۵» · next. The previous button sits on the right
 * in RTL, so it points right; icons, not the bidi-mirrored ‹ › glyphs.
 */
export default function PeriodStepper({
  label,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  previousDisabled = false,
  nextDisabled = false
}: {
  label: string
  onPrevious: () => void
  onNext: () => void
  previousLabel: string
  nextLabel: string
  previousDisabled?: boolean
  nextDisabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={stepButtonClass}
        onClick={onPrevious}
        disabled={previousDisabled}
        aria-label={previousLabel}
      >
        <AppIcon name="chevron-right" size={16} />
      </button>
      <span
        className="min-w-[5.5rem] text-center text-[0.82rem] font-semibold text-text"
        aria-live="polite"
      >
        {label}
      </span>
      <button
        type="button"
        className={stepButtonClass}
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={nextLabel}
      >
        <AppIcon name="chevron-left" size={16} />
      </button>
    </div>
  )
}
