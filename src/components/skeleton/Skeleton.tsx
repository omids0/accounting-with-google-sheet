import type { CSSProperties } from 'react'

import { skeletonClass } from '../ui/skeletonStyles'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  style?: CSSProperties
}

export function Skeleton({
  width,
  height,
  className = '',
  variant = 'text',
  style
}: SkeletonProps) {
  return (
    <span
      className={skeletonClass(variant, className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}
