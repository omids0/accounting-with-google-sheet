import { BUSINESS_ICONS } from './appIcon/businessIcons'
import { UI_ICONS } from './appIcon/uiIcons'

export type { AppIconName } from './appIcon/types'

import type { AppIconProps } from './appIcon/types'

const ICON_RENDERERS = { ...BUSINESS_ICONS, ...UI_ICONS }

export default function AppIcon({ name, size = 22, className, strokeWidth = 2 }: AppIconProps) {
  const props = { width: size, height: size, strokeWidth, className }
  const render = ICON_RENDERERS[name]

  return render ? render(props) : null
}
