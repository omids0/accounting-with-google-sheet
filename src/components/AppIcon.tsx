import { APP_ICON_SVGS } from './appIcon/iconMap'
import type { AppIconProps } from './appIcon/types'
import { appIconClass } from './ui/chartStyles'
import { cn } from '../utils/cn'

export type { AppIconName } from './appIcon/types'

const PATH_DATA = / d="([^"]+)"/g

const pathCache = new Map<string, string[]>()

/** Phosphor Regular files hold only `<path d>` elements, so their `d` values are the whole icon. */
function iconPaths(svg: string): string[] {
  let paths = pathCache.get(svg)

  if (!paths) {
    paths = Array.from(svg.matchAll(PATH_DATA), match => match[1])
    pathCache.set(svg, paths)
  }

  return paths
}

export default function AppIcon({ name, size = 22, className }: AppIconProps) {
  const svg = APP_ICON_SVGS[name]

  if (!svg) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      className={cn(appIconClass, className)}
      aria-hidden
    >
      {iconPaths(svg).map(d => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
