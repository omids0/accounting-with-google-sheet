import { useCallback } from 'react'

import { useAppThemeMode } from '../../hooks/useAppThemeMode'
import type { ThemeMode } from '../../types'
import { applyTheme, updateTheme } from '../../utils/theme'
import AppIcon from '../AppIcon'
import {
  appMenuHeaderThemeBtnClass,
  appMenuHeaderThemeClass,
  appMenuHeaderThemeThumbClass,
  appMenuHeaderThemeWrapClass
} from '../ui/sidebarMenuStyles'

export default function LayoutThemeToggle() {
  const mode = useAppThemeMode()
  const isDark = mode === 'dark'

  const setMode = useCallback(
    (next: ThemeMode) => {
      if (next === mode) return

      updateTheme(next)
      applyTheme(next)
    },
    [mode]
  )

  return (
    <div className={appMenuHeaderThemeWrapClass}>
      <div className={appMenuHeaderThemeClass} role="group" aria-label="حالت نمایش">
        <span className={appMenuHeaderThemeThumbClass(isDark)} aria-hidden="true" />
        <button
          type="button"
          className={appMenuHeaderThemeBtnClass(!isDark)}
          onClick={() => setMode('light')}
          aria-pressed={!isDark}
          aria-label="لایت مود"
          title="لایت مود"
        >
          <AppIcon name="sun" size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={appMenuHeaderThemeBtnClass(isDark)}
          onClick={() => setMode('dark')}
          aria-pressed={isDark}
          aria-label="نایت مود"
          title="نایت مود"
        >
          <AppIcon name="moon" size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
