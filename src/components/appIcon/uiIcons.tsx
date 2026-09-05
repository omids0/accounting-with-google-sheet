import type { ReactNode } from 'react'

import { IconSvg } from './IconSvg'
import type { AppIconName, IconSvgProps } from './types'
import { appIconAccentClass, appIconBgClass } from '../ui/chartStyles'

type IconRenderer = (props: IconSvgProps) => ReactNode

export const UI_ICONS: Partial<Record<AppIconName, IconRenderer>> = {
  search: props => (
    <IconSvg {...props}>
      <circle cx="11" cy="11" r="6.25" className={appIconBgClass} stroke="none" />
      <circle cx="11" cy="11" r="6.25" />
      <path d="M20 20l-4.75-4.75" />
    </IconSvg>
  ),

  filter: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M4.5 5.5h15l-4.25 5.5v6.5l-3.25 2v-8.5L4.5 5.5Z"
        stroke="none"
      />
      <path d="M4.5 5.5h15l-4.25 5.5v6.5l-3.25 2v-8.5L4.5 5.5Z" />
      <circle cx="8.25" cy="5.5" r="1.35" className={appIconAccentClass} stroke="none" />
      <circle cx="14.75" cy="11" r="1.35" className={appIconAccentClass} stroke="none" />
      <circle cx="11.75" cy="18.5" r="1.35" className={appIconAccentClass} stroke="none" />
    </IconSvg>
  ),

  'empty-inbox': props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5"
        stroke="none"
      />
      <path d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5" />
      <path d="M4 8.5 9 13h6l5-4.5" />
      <path d="M4 8.5h16" />
      <path d="M10 13l2 2.5 2-2.5" />
    </IconSvg>
  ),

  edit: props => (
    <IconSvg {...props}>
      <path className={appIconBgClass} d="M14.5 4.5 19.5 9.5 8 21H3v-5Z" stroke="none" />
      <path d="M14.5 4.5 19.5 9.5 8 21H3v-5Z" />
      <path d="M12 20h9" />
    </IconSvg>
  ),

  folder: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M4.5 7.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-5.5L9.5 5.5H6.5a2 2 0 0 0-2 2Z"
        stroke="none"
      />
      <path d="M4.5 7.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-5.5L9.5 5.5H6.5a2 2 0 0 0-2 2Z" />
      <path d="M4.5 10.5h15" />
    </IconSvg>
  ),

  warning: props => (
    <IconSvg {...props}>
      <path className={appIconBgClass} d="M12 4 4.5 19.5h15L12 4Z" stroke="none" />
      <path d="M12 4 4.5 19.5h15L12 4Z" />
      <path d="M12 10v4.25" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </IconSvg>
  ),

  back: props => (
    <IconSvg {...props}>
      <path d="M14 6.5 8.5 12 14 17.5" />
    </IconSvg>
  ),

  menu: props => (
    <IconSvg {...props}>
      <path d="M4.5 7h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 17h15" />
    </IconSvg>
  ),

  settings: props => (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="3.1" className={appIconBgClass} stroke="none" />
      <path d="M10.2 3.8h3.6l.4 2.1a6.6 6.6 0 0 1 1.7.8l1.9-1.1 2.6 2.6-1.1 1.9c.33.53.56 1.1.72 1.7l2.1.4v3.6l-2.1.4a6.6 6.6 0 0 1-.72 1.7l1.1 1.9-2.6 2.6-1.9-1.1a6.6 6.6 0 0 1-1.7.8l-.4 2.1h-3.6l-.4-2.1a6.6 6.6 0 0 1-1.7-.8l-1.9 1.1-2.6-2.6 1.1-1.9a6.6 6.6 0 0 1-.72-1.7l-2.1-.4v-3.6l2.1-.4c.16-.57.39-1.14.72-1.7l-1.1-1.9 2.6-2.6 1.9 1.1c.52-.32 1.08-.56 1.7-.8l.4-2.1Z" />
      <circle cx="12" cy="12" r="2.6" />
    </IconSvg>
  ),

  close: props => (
    <IconSvg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconSvg>
  ),

  check: props => (
    <IconSvg {...props}>
      <path d="M5.5 12.5 9.5 16.5 18.5 7.5" />
    </IconSvg>
  ),

  'x-mark': props => (
    <IconSvg {...props}>
      <path d="M16 8 8 16" />
      <path d="m8 8 8 8" />
    </IconSvg>
  ),

  add: props => (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="8.5" className={appIconBgClass} stroke="none" />
      <path d="M12 7.5v9" />
      <path d="M7.5 12h9" />
    </IconSvg>
  ),

  refresh: props => (
    <IconSvg {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </IconSvg>
  ),

  import: props => (
    <IconSvg {...props}>
      <path d="M12 3.5v11.5" />
      <path d="m7.5 11 4.5-4.5 4.5 4.5" />
      <path d="M5 20.5h14" />
    </IconSvg>
  ),

  export: props => (
    <IconSvg {...props}>
      <path d="M12 15V3.5" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 20.5h14" />
    </IconSvg>
  ),

  pdf: props => (
    <IconSvg {...props}>
      <path
        className={appIconBgClass}
        d="M7 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z"
        stroke="none"
      />
      <path d="M7 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z" />
      <path d="M15 3.5v3.3h3.3" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16h5" />
    </IconSvg>
  ),

  trash: props => (
    <IconSvg {...props}>
      <path d="M3.5 6.5h17" />
      <path d="M8.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v1.5" />
      <path
        className={appIconBgClass}
        d="M6.5 6.5v13a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-13"
        stroke="none"
      />
      <path d="M6.5 6.5v13a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconSvg>
  ),

  calculator: props => (
    <IconSvg {...props}>
      <rect
        className={appIconBgClass}
        x="5.5"
        y="3.5"
        width="13"
        height="17"
        rx="2.2"
        stroke="none"
      />
      <rect x="5.5" y="3.5" width="13" height="17" rx="2.2" />
      <path d="M8.5 7.5h7" />
      <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 18.5h7" />
    </IconSvg>
  ),

  chart: props => (
    <IconSvg {...props}>
      <path className={appIconBgClass} d="M4.5 19.5V5.5" stroke="none" />
      <path className={appIconBgClass} d="M4.5 19.5h15" stroke="none" />
      <path d="M4.5 19.5V5.5" />
      <path d="M4.5 19.5h15" />
      <path d="M8 19.5V12" strokeWidth={2.6} />
      <path d="M12 19.5V8.5" strokeWidth={2.6} />
      <path d="M16 19.5V14" strokeWidth={2.6} />
    </IconSvg>
  ),

  'chevron-down': props => (
    <IconSvg {...props}>
      <path d="M6.5 9.5 12 15 17.5 9.5" />
    </IconSvg>
  ),

  swap: props => (
    <IconSvg {...props}>
      <path d="M7 8.5h11" />
      <path d="M15.5 6.5 18.5 8.5 15.5 10.5" />
      <path d="M17 15.5H6" />
      <path d="M8.5 13.5 5.5 15.5 8.5 17.5" />
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
  ),

  clock: props => (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" />
    </IconSvg>
  ),

  info: props => (
    <IconSvg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.5v4" />
      <circle cx="12" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
    </IconSvg>
  )
}
