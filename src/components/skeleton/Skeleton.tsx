import type { CSSProperties } from 'react'

import { cn } from '../../utils/cn'
import {
  skeletonClass,
  skeletonGlowClass,
  skeletonProgressFillClass,
  skeletonProgressTrackClass,
  skeletonShineClass
} from '../ui/skeletonStyles'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  style?: CSSProperties
  shimmer?: boolean
}

export function Skeleton({
  width,
  height,
  className = '',
  variant = 'text',
  style,
  shimmer = true
}: SkeletonProps) {
  return (
    <span
      className={skeletonClass(variant, className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
    >
      {shimmer ? (
        <>
          <span className={skeletonShineClass} aria-hidden="true" />
          <span className={skeletonGlowClass} aria-hidden="true" />
        </>
      ) : null}
    </span>
  )
}

export function SkeletonProgressFill({ width = '45%' }: { width?: string }) {
  return (
    <div className={cn(skeletonProgressTrackClass, 'skeleton-progress')} aria-hidden="true">
      <div className={skeletonProgressFillClass} style={{ width }}>
        <span className={skeletonShineClass} aria-hidden="true" />
        <span className={skeletonGlowClass} aria-hidden="true" />
      </div>
    </div>
  )
}
