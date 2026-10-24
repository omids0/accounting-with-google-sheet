import {
  spinnerRingClass,
  spinnerSizeClass,
  spinnerStillDotsClass,
  spinnerWrapClass,
  type SpinnerSize
} from './busyStyles'
import LoadingDots from './LoadingDots'
import { cn } from '../../utils/cn'

interface SpinnerProps {
  size?: SpinnerSize
  /** What a screen reader says; ignored when `decorative`. */
  label?: string
  /** Next to text that already says what is happening (a button, a row): hidden from readers. */
  decorative?: boolean
  className?: string
}

/**
 * A turning ring in the current text color, so it reads on the page, a card or a primary button
 * alike. With reduced motion the ring is replaced by three still dots (a turning ring that does
 * not turn looks frozen).
 */
export default function Spinner({
  size = 'md',
  label = 'در حال بارگذاری',
  decorative = false,
  className
}: SpinnerProps) {
  return (
    <span
      className={cn(spinnerWrapClass, className)}
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative || undefined}
    >
      <svg
        className={cn(spinnerSizeClass[size], spinnerRingClass)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" opacity="0.22" />
        <path
          d="M21.5 12A9.5 9.5 0 0 0 12 2.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className={spinnerStillDotsClass} aria-hidden="true">
        <LoadingDots tone="current" />
      </span>
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  )
}
