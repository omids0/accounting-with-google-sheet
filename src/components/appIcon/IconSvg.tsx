import type { ReactNode } from 'react'

import type { IconSvgProps } from './types'
import { cn } from '../../utils/cn'
import { appIconClass } from '../ui/chartStyles'

export function IconSvg({
  width,
  height,
  strokeWidth,
  className,
  children
}: IconSvgProps & { children: ReactNode }) {
  return (
    <svg
      className={cn(appIconClass, className)}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}
