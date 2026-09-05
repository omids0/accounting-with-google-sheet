import type { ReactNode } from 'react'

import { IconSvg } from './IconSvg'
import type { AppIconName, IconSvgProps } from './types'
import { appIconAccentClass, appIconBgClass } from '../ui/chartStyles'

type IconRenderer = (props: IconSvgProps) => ReactNode

export const BUSINESS_ICONS: Partial<Record<AppIconName, IconRenderer>> = {
  installments: props => (
    <IconSvg {...props}>
      <rect className={appIconBgClass} x="3" y="4" width="18" height="17" rx="3" stroke="none" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v3" />
      <path d="M16 2.5v3" />
      <rect
        x="7"
        y="12.5"
        width="3.5"
        height="3.5"
        rx="0.8"
        className={appIconAccentClass}
        stroke="none"
      />
      <rect
        x="12.25"
        y="12.5"
        width="3.5"
        height="3.5"
        rx="0.8"
        className={appIconAccentClass}
        stroke="none"
      />
      <rect
        x="7"
        y="17"
        width="3.5"
        height="3.5"
        rx="0.8"
        className={appIconAccentClass}
        stroke="none"
      />
      <path d="M12.25 17h3.5" />
    </IconSvg>
  ),

  debt: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M5 8.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        stroke="none"
      />
      <path d="M5 8.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
      <path d="M7.5 13h9" />
      <path d="M7.5 16h5.5" />
      <path d="M12 5.5v2.5" />
      <path d="M9.5 8 12 5.5 14.5 8" />
    </IconSvg>
  ),

  checks: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M7 3.5h8l4.5 4.5V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z"
        stroke="none"
      />
      <path d="M7 3.5h8l4.5 4.5V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z" />
      <path d="M15 3.5v4.5h4.5" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 15.5h4.5" />
      <circle cx="17" cy="17" r="3.25" className={appIconAccentClass} stroke="none" />
      <path d="M15.6 17l1.2 1.2 2.6-2.6" strokeWidth={2.2} />
    </IconSvg>
  ),

  dashboard: props => (
    <IconSvg {...props}>
      <rect className={appIconBgClass} x="4" y="4" width="7" height="7" rx="2" stroke="none" />
      <rect className={appIconBgClass} x="13" y="4" width="7" height="7" rx="2" stroke="none" />
      <rect className={appIconBgClass} x="4" y="13" width="7" height="7" rx="2" stroke="none" />
      <rect className={appIconBgClass} x="13" y="13" width="7" height="7" rx="2" stroke="none" />
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </IconSvg>
  ),

  receivables: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M4.5 10.5h15a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
        stroke="none"
      />
      <path d="M4.5 10.5h15a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z" />
      <path d="M8 7.5h8" />
      <path d="M10 7.5V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1.5" />
      <circle cx="12" cy="15.5" r="1.35" className={appIconAccentClass} stroke="none" />
      <path d="M12 13.5v-1" />
      <path d="M12 17.5v1.5" />
      <path d="M9.5 19.5 12 22 14.5 19.5" />
    </IconSvg>
  ),

  treasury: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M5.5 9.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        stroke="none"
      />
      <path d="M9 6.5a3 3 0 0 1 6 0" />
      <path d="M5.5 9.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="14.5" r="2.25" className={appIconAccentClass} stroke="none" />
      <path d="M12 12.25v-0.75" />
      <path d="M12 16.75v1" />
    </IconSvg>
  ),

  wallet: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M4 8.5h15.5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        stroke="none"
      />
      <path d="M4 8.5h15.5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
      <path d="M16.5 8.5V6.8A2.3 2.3 0 0 0 14.2 4.5H7" />
      <rect
        x="15.5"
        y="12.5"
        width="4"
        height="3.5"
        rx="1"
        className={appIconAccentClass}
        stroke="none"
      />
      <circle cx="17.2" cy="14.25" r="0.75" fill="currentColor" stroke="none" />
    </IconSvg>
  ),

  records: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M8 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z"
        stroke="none"
      />
      <path d="M8 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z" />
      <path d="M8 3.5V7.5h7.2" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15.5h7" />
      <path d="M8.5 19h4.5" />
    </IconSvg>
  )
}
