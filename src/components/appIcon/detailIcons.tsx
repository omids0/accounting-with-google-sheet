import type { ReactNode } from 'react'

import { IconSvg } from './IconSvg'
import type { AppIconName, IconSvgProps } from './types'

type IconRenderer = (props: IconSvgProps) => ReactNode

/** Small inline-action and app-lock icons: reveal/hide values, open a location, lock. */
export const DETAIL_ICONS: Partial<Record<AppIconName, IconRenderer>> = {
  eye: props => (
    <IconSvg {...props}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </IconSvg>
  ),

  'eye-off': props => (
    <IconSvg {...props}>
      <path d="M9.9 5.75A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4" />
      <path d="M6.3 7.3C3.9 8.9 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.4 9.4 0 0 0 4.7-1.3" />
      <path d="M10 10a2.75 2.75 0 0 0 4 4" />
      <path d="m3.5 3.5 17 17" />
    </IconSvg>
  ),

  'map-pin': props => (
    <IconSvg {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </IconSvg>
  ),

  lock: props => (
    <IconSvg {...props}>
      <rect x="6.5" y="10.5" width="11" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </IconSvg>
  ),

  fingerprint: props => (
    <IconSvg {...props}>
      <path d="M12 3.5a6.5 6.5 0 0 0-6.5 6.5" />
      <path d="M5.5 10v1.5a6.5 6.5 0 0 0 13 0V10" />
      <path d="M8 10.5v2a4 4 0 0 0 8 0v-2" />
      <path d="M9.5 13v1.5a2.5 2.5 0 0 0 5 0V13" />
      <path d="M12 15.5v2" />
    </IconSvg>
  )
}
