import type { ReactNode } from 'react'

import { Skeleton } from './Skeleton'
import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'

/**
 * A chart card with a fixed-height plot area, shown while a chart is deferred or its lazy chunk
 * loads, so the page does not jump when the chart arrives. `children` is the real header when
 * the chart's own header is known up front.
 */
export function ChartCardSkeleton({
  height = 168,
  hideTitle = false,
  className,
  children
}: {
  /** Height of the plot area in px; match the chart it stands in for. */
  height?: number
  hideTitle?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(cardClassName(), 'pointer-events-none', className)}
      role="status"
      aria-busy="true"
      aria-label="در حال بارگذاری نمودار"
    >
      {children}
      {hideTitle || children ? null : <Skeleton width="40%" height="1rem" className="mb-3" />}
      <Skeleton variant="rect" width="100%" height={height} />
    </div>
  )
}
