import type { ReactNode } from 'react'

import { IconSvg } from './IconSvg'
import type { AppIconName, IconSvgProps } from './types'
import { appIconAccentClass, appIconBgClass } from '../ui/chartStyles'

type IconRenderer = (props: IconSvgProps) => ReactNode

export const THEME_ICONS: Partial<Record<AppIconName, IconRenderer>> = {
  sun: props => (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="3.75" className={appIconAccentClass} stroke="none" />
      <circle cx="12" cy="12" r="3.75" />
      <path d="M12 3.25v2.1M12 18.65v2.1M4.35 12H2.25M21.75 12h-2.1M6.05 6.05l1.48 1.48M16.47 16.47l1.48 1.48M17.95 6.05l-1.48 1.48M7.53 16.47l-1.48 1.48" />
    </IconSvg>
  ),

  moon: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M14.75 4.25a7.25 7.25 0 1 0 3 13.5A6.25 6.25 0 0 1 14.75 4.25Z"
        stroke="none"
      />
      <path d="M14.75 4.25a7.25 7.25 0 1 0 3 13.5A6.25 6.25 0 0 1 14.75 4.25Z" />
    </IconSvg>
  )
}
