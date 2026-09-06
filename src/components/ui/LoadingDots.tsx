import {
  loadingDotClass,
  loadingDotDelayClasses,
  loadingDotsClass,
  loadingDotsToneClass
} from './displayStyles'
import { cn } from '../../utils/cn'

export type LoadingDotsTone = 'light' | 'primary' | 'danger'

type LoadingDotsProps = {
  tone?: LoadingDotsTone
  className?: string
}

export default function LoadingDots({ tone = 'light', className }: LoadingDotsProps) {
  return (
    <span className={cn(loadingDotsClass, className)} aria-hidden="true">
      {loadingDotDelayClasses.map(delayClass => (
        <span
          key={delayClass}
          className={cn(loadingDotClass, loadingDotsToneClass(tone), delayClass)}
        />
      ))}
    </span>
  )
}
