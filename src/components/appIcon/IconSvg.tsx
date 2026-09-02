import type { ReactNode } from 'react'

import type { IconSvgProps } from './types'

export function IconSvg({
  width,
  height,
  strokeWidth,
  className,
  children
}: IconSvgProps & { children: ReactNode }) {
  return (
    <svg
      className={`app-icon${className ? ` ${className}` : ''}`}
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
