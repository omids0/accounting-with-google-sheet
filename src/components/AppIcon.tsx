import { cn } from '../utils/cn'
import { APP_ICON_COMPONENTS } from './appIcon/iconMap'
import { appIconClass } from './ui/chartStyles'

export type { AppIconName } from './appIcon/types'

import type { AppIconProps } from './appIcon/types'

export default function AppIcon({ name, size = 22, className }: AppIconProps) {
  const Icon = APP_ICON_COMPONENTS[name]

  return Icon ? (
    <Icon size={size} weight="regular" className={cn(appIconClass, className)} aria-hidden />
  ) : null
}
